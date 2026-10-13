// Génère les icônes PNG de l'appli à partir de public/icon.svg.
import sharp from 'sharp'
const svg = 'app/public/icon.svg'
await sharp(svg).resize(192, 192).png().toFile('app/public/icon-192.png')
await sharp(svg).resize(512, 512).png().toFile('app/public/icon-512.png')
// Version « maskable » : marge de sécurité pour les icônes rondes d'Android.
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#a855f7' } })
  .composite([{ input: await sharp(svg).resize(400, 400).png().toBuffer(), top: 56, left: 56 }]).png().toFile('app/public/icon-maskable.png')
console.log('icônes ok')
