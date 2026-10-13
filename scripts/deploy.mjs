// Construit l'appli pour GitHub Pages et publie le dossier dist/ sur la branche gh-pages.
// Usage : npm --prefix app run deploy
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const app = path.join(root, 'app')
const dist = path.join(app, 'dist')
const remote = execSync('git remote get-url origin', { cwd: root }).toString().trim()
const repo = remote.replace(/\.git$/, '').split('/').pop()
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, BASE_PATH: `/${repo}/`, MSYS_NO_PATHCONV: '1' } })

run('npm run build', app)
run('git init -q -b gh-pages', dist)
run('git add -A', dist)
run('git -c user.name=deploy -c user.email=deploy@localhost commit -q -m "Publication du site"', dist)
run(`git push -q -f ${remote} gh-pages`, dist)
console.log(`\nEn ligne : https://<compte>.github.io/${repo}/`)
