// API de Mémoire : ajout rapide de liens, import depuis Instagram, résumé IA.
// Authentification : soit la session de l'appli (Authorization: Bearer <jwt>),
// soit le jeton personnel (x-ingest-token) utilisé par le raccourci iPhone.
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Caller = { owner: string | null };

async function authenticate(req: Request, db: SupabaseClient): Promise<Caller | null> {
  const token = req.headers.get("x-ingest-token") ?? new URL(req.url).searchParams.get("token");
  if (token) {
    const { data: t } = await db.from("ingest_tokens").select("owner").eq("token", token).maybeSingle();
    return t ? { owner: t.owner } : null;
  }
  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return null;
  const { data, error } = await db.auth.getUser(jwt);
  if (error || !data.user) return null;
  return { owner: data.user.id };
}

// ---------- Normalisation des liens ----------
const IG_RE = /instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]+)/i;

export function normalize(raw: string) {
  const m = raw.match(/https?:\/\/\S+/);
  const url = (m ? m[0] : raw).trim().replace(/[)\].,]+$/, "");
  const ig = url.match(IG_RE);
  if (ig) {
    const kind = ig[1].toLowerCase().startsWith("reel") ? "reel" : ig[1].toLowerCase();
    return { url: `https://www.instagram.com/${kind}/${ig[2]}/`, source: "instagram", shortcode: ig[2], kind };
  }
  let source = "web";
  if (/tiktok\.com/i.test(url)) source = "tiktok";
  else if (/youtu\.?be/i.test(url)) source = "youtube";
  else if (/github\.com/i.test(url)) source = "github";
  else if (/(x|twitter)\.com/i.test(url)) source = "x";
  return { url: url.split("#")[0], source, shortcode: null as string | null, kind: null as string | null };
}

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#039;|&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

// Page d'intégration publique d'Instagram : aucune connexion à un compte.
async function fetchInstagramEmbed(kind: string, code: string) {
  const res = await fetch(`https://www.instagram.com/${kind === "reel" ? "reel" : "p"}/${code}/embed/captioned/`, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36", "Accept-Language": "fr-FR,fr;q=0.9" },
  });
  if (!res.ok) return {};
  const html = await res.text();
  const caption = html.match(/<div class="Caption">([\s\S]*?)<div class="CaptionComments">/)?.[1];
  const author = html.match(/class="UsernameText">([^<]+)</)?.[1] ?? html.match(/"username":"([\w.]+)"/)?.[1];
  const img = html.match(/class="EmbeddedMediaImage"[^>]*src="([^"]+)"/)?.[1];
  const video = html.match(/"video_url":"([^"]+)"/)?.[1]?.replace(/\\u0026/g, "&").replace(/\\\//g, "/");
  let text = caption ? decode(caption).trim() : undefined;
  if (text && author && text.startsWith(author)) text = text.slice(author.length).trim();
  return {
    caption: text,
    author,
    thumb: img ? decode(img) : undefined,
    video,
    media_type: video || /"is_video":true|Reel|VideoPlayer/i.test(html) ? "video" : "image",
  };
}

async function fetchOpenGraph(url: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 MemoireBot" } });
    const html = (await res.text()).slice(0, 200_000);
    const meta = (p: string) =>
      html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]+content=["']([^"']+)`, "i"))?.[1];
    return {
      title: meta("og:title") ?? html.match(/<title>([^<]+)/i)?.[1],
      caption: meta("og:description") ?? meta("description"),
      thumb: meta("og:image"),
    };
  } catch {
    return {};
  }
}

async function githubContext(text: string) {
  const repos = [...new Set([...text.matchAll(/github\.com\/([\w.-]+\/[\w.-]+)/gi)].map((m) => m[1].replace(/\.git$/, "")))];
  const out: string[] = [];
  for (const repo of repos.slice(0, 2)) {
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/readme`, { headers: { Accept: "application/vnd.github.raw" } });
      if (r.ok) out.push(`README de ${repo} :\n${(await r.text()).slice(0, 6000)}`);
    } catch { /* lien privé ou introuvable */ }
  }
  return out.join("\n\n");
}

async function storeRemote(db: SupabaseClient, path: string, url: string, contentType: string) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const { error } = await db.storage.from("media").upload(path, await r.arrayBuffer(), { contentType, upsert: true });
  return error ? null : path;
}

// ---------- Résumé par Claude ----------
const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_ai", "category", "title", "summary", "use_for", "how_to", "links", "prompts", "tags"],
  properties: {
    is_ai: { type: "boolean" },
    category: {
      type: "string",
      enum: ["Outil IA", "Repo GitHub", "Prompts", "Vidéo IA", "Image IA", "3D", "Agent & Automatisation", "Code & Dev", "Design & UI", "Business", "Apprendre", "Autre"],
    },
    title: { type: "string" },
    summary: { type: "string" },
    use_for: { type: "string" },
    how_to: { type: "array", items: { type: "string" } },
    links: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["label", "url"], properties: { label: { type: "string" }, url: { type: "string" } } },
    },
    prompts: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
  },
};

const SYSTEM = `Tu ranges les publications qu'un utilisateur francophone a enregistrées (surtout des contenus IA) pour qu'il s'en souvienne et s'en serve plus tard.
À partir de la légende, de la transcription et des éventuels README, réponds en français :
- title : nom de l'outil, du repo ou du sujet (court, sans emoji).
- summary : 2-3 phrases claires sur ce que c'est et ce que ça fait. Si la légende dit seulement « commente X pour le lien », déduis l'outil de la transcription ; si c'est impossible, dis-le franchement.
- use_for : à quoi ça peut lui servir concrètement, en une phrase.
- how_to : 2 à 5 étapes courtes pour l'utiliser (site à ouvrir, commande à lancer…). Vide si rien d'actionnable.
- links : seulement des liens présents dans le texte ou évidents (site officiel d'un outil nommé, repo GitHub cité). N'invente pas d'URL.
- prompts : les prompts complets s'ils figurent dans le texte, sinon liste vide.
- tags : 3 à 6 mots-clés en minuscules.
- is_ai : vrai si le contenu concerne l'IA, le code ou des outils numériques liés à l'IA.`;

async function summarize(row: Record<string, unknown>, extra: string) {
  if (!ANTHROPIC_KEY) return null;
  const client = new Anthropic({ apiKey: ANTHROPIC_KEY });
  const content = [
    `Lien : ${row.url}`,
    row.author ? `Auteur : @${row.author}` : "",
    row.caption ? `Légende :\n${row.caption}` : "",
    row.transcript ? `Transcription de la vidéo :\n${row.transcript}` : "",
    extra,
  ].filter(Boolean).join("\n\n");
  // fallbacks "default" : si une requête est refusée par les garde-fous, l'API la relance sur un modèle de repli.
  const res = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SUMMARY_SCHEMA } },
    messages: [{ role: "user", content }],
  } as Anthropic.Beta.MessageCreateParamsNonStreaming);
  if (res.stop_reason === "refusal") return null;
  const text = res.content.find((b) => b.type === "text");
  return text && "text" in text ? JSON.parse(text.text) : null;
}

async function enrich(db: SupabaseClient, id: string) {
  const { data: row } = await db.from("saves").select("*").eq("id", id).single();
  if (!row) return;
  const patch: Record<string, unknown> = {};
  try {
    if (row.source === "instagram" && row.shortcode && (!row.caption || !row.thumb_path)) {
      const kind = row.url.includes("/reel/") ? "reel" : "p";
      const e = await fetchInstagramEmbed(kind, row.shortcode);
      if (e.caption && !row.caption) patch.caption = e.caption;
      if (e.author && !row.author) patch.author = e.author;
      if (e.media_type && row.media_type === "link") patch.media_type = e.media_type;
      if (e.thumb && !row.thumb_path) patch.thumb_path = await storeRemote(db, `${id}/thumb.jpg`, e.thumb, "image/jpeg");
      if (e.video && !row.video_path) patch.video_path = await storeRemote(db, `${id}/video.mp4`, e.video, "video/mp4");
    } else if (row.source !== "instagram" && !row.caption) {
      const og = await fetchOpenGraph(row.url);
      if (og.caption) patch.caption = decode(og.caption);
      if (og.title && !row.title) patch.title = decode(og.title);
      if (og.thumb && !row.thumb_path) patch.thumb_path = await storeRemote(db, `${id}/thumb.jpg`, og.thumb, "image/jpeg");
    }
    const merged = { ...row, ...patch };
    const extra = await githubContext(`${row.url}\n${merged.caption ?? ""}`);
    const s = await summarize(merged, extra);
    if (s) Object.assign(patch, s, { status: "ready" });
    else patch.status = ANTHROPIC_KEY ? "error" : "ready";
  } catch (err) {
    console.error("enrich", id, err);
    patch.status = "error";
  }
  await db.from("saves").update(patch).eq("id", id);
}

// ---------- Routes ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const caller = await authenticate(req, db);
  if (!caller) return json({ error: "Non autorisé" }, 401);

  const params = new URL(req.url).searchParams;
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : Object.fromEntries(params);
  const action = body.action ?? (body.url || body.text ? "add" : "");

  if (action === "add") {
    const raw = String(body.url || body.text || "");
    if (!/https?:\/\//.test(raw)) return json({ error: "Aucun lien trouvé" }, 400);
    const n = normalize(raw);
    const { data: existing } = await db.from("saves").select("id,title").eq("url", n.url).maybeSingle();
    if (existing) return json({ ok: true, id: existing.id, duplicate: true, title: existing.title });
    const { data, error } = await db.from("saves").insert({
      owner: caller.owner, url: n.url, source: n.source, shortcode: n.shortcode,
      media_type: n.kind === "reel" ? "video" : "link", account: body.account ?? null,
      note: body.note ?? "",
    }).select("id").single();
    if (error) return json({ error: error.message }, 500);
    EdgeRuntime.waitUntil(enrich(db, data.id));
    return json({ ok: true, id: data.id });
  }

  if (action === "enrich") {
    if (!body.id) return json({ error: "id manquant" }, 400);
    const { data: row } = await db.from("saves").select("id,owner").eq("id", body.id).maybeSingle();
    if (!row || (row.owner !== caller.owner)) return json({ error: "Introuvable" }, 404);
    await db.from("saves").update({ status: "pending" }).eq("id", body.id);
    EdgeRuntime.waitUntil(enrich(db, body.id));
    return json({ ok: true });
  }

  if (action === "import") {
    // Lot venant du relais (synchro Instagram) : crée les nouveaux enregistrements, complète les existants
    // et renvoie des URL d'envoi signées pour la miniature et la vidéo manquantes.
    const items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
    const results = [];
    for (const it of items) {
      const n = normalize(String(it.url));
      const details = {
        author: it.author ?? null, author_name: it.author_name ?? null, caption: it.caption ?? null,
        transcript: it.transcript || null, duration: it.duration ?? null, taken_at: it.taken_at ?? null,
        media_type: it.media_type ?? "link",
      };
      const { data: found } = await db.from("saves").select("id,owner,summary,thumb_path,video_path").eq("url", n.url).maybeSingle();
      let row = found;
      if (found) {
        if (found.owner && found.owner !== caller.owner) { results.push({ url: n.url, error: "Introuvable" }); continue; }
        const patch = Object.fromEntries(Object.entries(details).filter(([, v]) => v !== null && v !== ""));
        await db.from("saves").update(patch).eq("id", found.id);
      } else {
        const { data, error } = await db.from("saves").insert({
          ...details, owner: caller.owner, url: n.url, source: n.source, shortcode: n.shortcode,
          account: it.account ?? null, is_ai: !!it.is_ai, status: ANTHROPIC_KEY ? "pending" : "ready", ...(it.saved_at ? { saved_at: it.saved_at } : {}),
        }).select("id,owner,summary,thumb_path,video_path").single();
        if (error) { results.push({ url: n.url, error: error.message }); continue; }
        row = data;
      }
      const uploads: Record<string, { path: string; token: string }> = {};
      for (const [kind, file, has] of [["thumb", "thumb.jpg", row!.thumb_path], ["video", "video.mp4", row!.video_path]] as const) {
        if (!it[`want_${kind}`] || has) continue;
        const s = await db.storage.from("media").createSignedUploadUrl(`${row!.id}/${file}`, { upsert: true });
        if (s.data) uploads[kind] = { path: s.data.path, token: s.data.token };
      }
      if (!row!.summary && ANTHROPIC_KEY) EdgeRuntime.waitUntil(enrich(db, row!.id));
      results.push({ url: n.url, id: row!.id, created: !found, uploads });
    }
    return json({ ok: true, results });
  }

  if (action === "uploaded") {
    // Le relais confirme qu'un fichier est arrivé dans le stockage.
    const { data: row } = await db.from("saves").select("id,owner").eq("id", body.id).maybeSingle();
    if (!row || (row.owner !== caller.owner)) return json({ error: "Introuvable" }, 404);
    const patch: Record<string, string> = {};
    if (body.thumb) patch.thumb_path = `${row.id}/thumb.jpg`;
    if (body.video) patch.video_path = `${row.id}/video.mp4`;
    await db.from("saves").update(patch).eq("id", row.id);
    return json({ ok: true });
  }

  return json({ error: "Action inconnue" }, 400);
});
