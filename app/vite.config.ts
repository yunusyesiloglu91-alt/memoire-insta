import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// En ligne, l'appli vit sous https://<compte>.github.io/memoire-insta/ ; en local à la racine.
// Port 3000 : c'est l'adresse de retour par défaut des liens de connexion Supabase.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  server: { port: 3000, strictPort: true },
  preview: { port: 3000, strictPort: true },
})
