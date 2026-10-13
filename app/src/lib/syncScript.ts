// Script de synchronisation lancé par TOI depuis instagram.com (favori « Synchroniser Mémoire »).
// Il lit tes derniers enregistrements comme le fait la page Instagram quand tu défiles (même requête,
// même rythme), puis les transmet à l'onglet relais de Mémoire. Aucun mot de passe, aucune action
// sur ton compte (pas de like, pas d'abonnement, rien n'est publié).
export function syncSource(appUrl: string) {
  const origin = new URL(appUrl).origin
  return `(async()=>{
  if(!/instagram\\.com$/.test(location.hostname)){alert('Ouvre instagram.com (connecté) puis relance « Synchroniser Mémoire ».');return;}
  const APP=${JSON.stringify(origin)};
  const relay=window.open(${JSON.stringify(appUrl + 'relay')},'memoire-relay');
  if(!relay){alert('Autorise les fenêtres pop-up pour instagram.com puis réessaie.');return;}
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const csrf=(document.cookie.match(/csrftoken=([^;]+)/)||[])[1];
  const H={'X-IG-App-ID':'936619743392459','X-CSRFToken':csrf,'X-Requested-With':'XMLHttpRequest'};
  const AI=/\\b(ai|ia|gpt|chatgpt|openai|claude|gemini|llm|prompts?|midjourney|sora|veo|kling|runway|higgsfield|flux|comfy|n8n|agents?|automati\\w*|github|open ?source|repo|cursor|copilot|nvidia|deepseek|grok|mistral|perplexity|elevenlabs|heygen|vibe ?cod\\w*|no-?code|lovable|bolt|figma|saas|api|python|code|coding|developer|tools?|outils?|intelligence artificielle|hugging ?face|ollama|mcp|seedance|suno|chatbot|yapay zeka)\\b/i;
  let account=null;try{const r=await fetch('/api/v1/accounts/current_user/?edit=true',{headers:H,credentials:'include'});account=(await r.json()).user?.username||null;}catch(e){}
  const pages=Number(prompt('Combien de pages de 21 enregistrements lire ? (1 = les plus récents)','2')||0);
  if(!pages){relay.close();return;}
  const onlyAi=confirm('Garder uniquement les contenus IA / code ?\\nOK = IA seulement, Annuler = tout');
  const items=[];let next=null;
  for(let p=0;p<pages;p++){
    const r=await fetch('/api/v1/feed/saved/posts/'+(next?'?max_id='+encodeURIComponent(next):''),{headers:H,credentials:'include'});
    if(r.status!==200){alert('Instagram a répondu '+r.status+'. Réessaie plus tard.');break;}
    const j=await r.json();items.push(...(j.items||[]).map(i=>i.media));next=j.next_max_id;
    if(!j.more_available||!next)break;await sleep(3000+Math.random()*3000);
  }
  const keep=items.filter(m=>!onlyAi||AI.test((m.caption?.text||'')+' '+(m.user?.username||'')));
  const ready=new Promise(res=>{const f=e=>{if(e.origin===APP&&e.data?.type==='memoire-ready'){removeEventListener('message',f);res();}};addEventListener('message',f);});
  const acks=[];addEventListener('message',e=>{if(e.origin===APP&&e.data?.type==='memoire-ack')acks.push(e.data);});
  await Promise.race([ready,sleep(30000)]);
  const now=Date.now();let sent=0;
  for(const [k,m] of keep.entries()){
    let info=m;
    try{const r=await fetch('/api/v1/media/'+m.pk+'/info/',{headers:H,credentials:'include'});if(r.ok)info=(await r.json()).items?.[0]||m;}catch(e){}
    let transcript='';
    if(info.video_subtitles_uri){try{transcript=(await (await fetch(info.video_subtitles_uri)).text()).replace(/WEBVTT/,'').replace(/^\\d+\\s*$/gm,'').replace(/[\\d:.,]+ --> [\\d:.,]+[^\\n]*/g,' ').replace(/\\s+/g,' ').trim();}catch(e){}}
    const isVideo=info.media_type===2;const kind=isVideo?'reel':'p';
    const imgs=(info.image_versions2?.candidates||info.carousel_media?.[0]?.image_versions2?.candidates||[]);
    const img=imgs.find(c=>c.width<=720)||imgs[0];
    const vids=(info.video_versions||[]).slice().sort((a,b)=>a.width-b.width);
    const vid=vids.find(v=>v.width>=540)||vids[vids.length-1];
    let thumb=null,video=null;
    try{if(img)thumb=await (await fetch(img.url)).blob();}catch(e){}
    try{if(vid&&AI.test((info.caption?.text||'')+' '+transcript))video=await (await fetch(vid.url)).blob();}catch(e){}
    relay.postMessage({type:'memoire-item',item:{url:'https://www.instagram.com/'+kind+'/'+info.code+'/',account,
      media_type:isVideo?'video':info.media_type===8?'carousel':'image',author:info.user?.username,author_name:info.user?.full_name,
      caption:info.caption?.text||'',transcript,duration:info.video_duration||null,taken_at:new Date(info.taken_at*1000).toISOString(),
      saved_at:new Date(now-k*1000).toISOString(),is_ai:AI.test((info.caption?.text||'')+' '+transcript)},thumb,video},APP);
    sent++;await sleep(2500+Math.random()*2500);
  }
  relay.postMessage({type:'memoire-done',sent},APP);
})();`
}

export function bookmarklet(appUrl: string) {
  return 'javascript:' + encodeURIComponent(syncSource(appUrl).replace(/\n\s*/g, ''))
}
