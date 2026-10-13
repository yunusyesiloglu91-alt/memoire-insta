# Mémoire

Ton espace privé pour retrouver tout ce que tu enregistres sur Instagram (et ailleurs), avec un résumé IA de chaque contenu et un « souvenir » qui remonte à chaque ouverture.

## Lancer l'appli sur l'ordi

```bash
npm --prefix app install
npm --prefix app run dev
```

Puis ouvre http://localhost:3000 dans Chrome et connecte-toi avec ton email (lien magique, pas de mot de passe). Seul l'email autorisé dans la table `allowed_emails` peut entrer.

## Comment ça marche

| Partie | Où |
|---|---|
| Interface (React, Tailwind, Framer Motion) | `app/` |
| Base de données, connexion, stockage privé des vidéos | Supabase, projet `memoire-insta` (schéma : `supabase/schema.sql`) |
| Ajout de liens, import, résumé IA (Claude) | `supabase/functions/api/index.ts` |
| Synchro Instagram (favori à glisser) | `app/src/lib/syncScript.ts` |
| Résumés des 69 premiers posts IA | `data/` (local uniquement, hors du dépôt) |

### Ajouter des contenus
- **Coller un lien** n'importe où dans l'appli (Ctrl+V), ou bouton « Ajouter ».
- **Android** : installer l'appli (Chrome → Installer), puis Instagram → Partager → Mémoire.
- **iPhone** : raccourci « Mémoire » (instructions dans Réglages).
- **Synchro Instagram** : glisser le bouton « Synchroniser Mémoire » (Réglages) dans les favoris, puis cliquer dessus sur instagram.com. Fonctionne pour chaque compte.

### Résumés automatiques
Les nouveaux liens sont résumés par Claude si le secret `ANTHROPIC_API_KEY` est défini dans Supabase (Edge Functions → Secrets). Sans clé, le contenu est enregistré avec sa légende et tu peux cliquer « Résumer à nouveau » plus tard.

### Sécurité du compte Instagram
L'appli ne se connecte jamais à Instagram et ne stocke aucun mot de passe. La synchro tourne dans ton propre navigateur, lit uniquement tes enregistrements, au rythme d'un défilement normal, et ne fait aucune action (pas de like, pas d'abonnement). Le risque zéro absolu reste l'export officiel (Paramètres → Télécharger vos informations).

## Mettre à jour le site en ligne

```bash
npm --prefix app run deploy
```

Construit l'appli et la publie sur la branche `gh-pages` (GitHub Pages).
