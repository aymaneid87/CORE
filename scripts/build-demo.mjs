// يبني النسخة التجريبية كصفحة واحدة مستقلة: dist/mizan-demo.html
// نفس شاشات البرنامج ونفس محرك المقايسة، بس البيانات في المتصفح بدل Supabase.
// التشغيل: npm run build:demo
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = f => path.join(root, 'demo', f);
mkdirSync(path.join(root, 'dist'), { recursive: true });

const REACT = '18.3.1';

const aliases = {
  name: 'demo-aliases',
  setup(b) {
    b.onResolve({ filter: /^react$/ }, () => ({ path: 'React', namespace: 'global' }));
    b.onResolve({ filter: /^react-dom(\/client)?$/ }, () => ({ path: 'ReactDOM', namespace: 'global' }));
    b.onResolve({ filter: /^react\/jsx-runtime$/ }, () => ({ path: demo('jsx-runtime-shim.js') }));
    b.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: demo('navigation-shim.js') }));
    b.onResolve({ filter: /lib\/supabase\/client$/ }, () => ({ path: demo('local-db.js') }));
    b.onResolve({ filter: /^@supabase\// }, a => ({ errors: [{ text: `النسخة التجريبية مش المفروض تستورد ${a.path}` }] }));
    b.onLoad({ filter: /.*/, namespace: 'global' }, a => ({ contents: `module.exports = window.${a.path};`, loader: 'js' }));
  },
};

const result = await build({
  entryPoints: [demo('main.js')],
  bundle: true,
  write: false,
  format: 'iife',
  minify: true,
  target: ['es2020'],
  loader: { '.js': 'jsx' },
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [aliases],
  logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const cssOut = path.join(root, 'dist', 'demo.css');
execFileSync(path.join(root, 'node_modules', '.bin', 'tailwindcss'), [
  '-c', path.join(root, 'tailwind.config.js'),
  '-i', path.join(root, 'app', 'globals.css'),
  '-o', cssOut,
  '--content', `${root}/app/**/*.js,${root}/demo/**/*.js`,
  '--minify',
], { stdio: 'pipe' });
const css = readFileSync(cssOut, 'utf8');

// الشعار بيتضمّن جوه الصفحة (data URI) عشان الصفحة المستقلة مش بتحمّل صور من برّه
const logoPath = path.join(root, 'public', 'brand', 'logo.png');
let logoData = null;
try { logoData = `data:image/png;base64,${readFileSync(logoPath).toString('base64')}`; } catch { console.warn('⚠ مفيش شعار في public/brand/logo.png — هيظهر اسم الشركة بدله'); }

const html = `<title>Core Innovation مقايسات</title>
<script>window.__BRAND_LOGO__ = ${JSON.stringify(logoData)};</script>
<style>
:root { color-scheme: light; }
${css}
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700;800;900&family=Tajawal:wght@400;500;700;900&family=Poppins:wght@500;600;700&display=swap">
<div id="root" dir="rtl" lang="ar"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react/${REACT}/umd/react.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/${REACT}/umd/react-dom.production.min.js"></script>
<script>${js}</script>
`;
const out = path.join(root, 'dist', 'mizan-demo.html');
writeFileSync(out, html);
console.log(`✓ ${path.relative(root, out)} — ${(html.length / 1024).toFixed(0)} KB`);
