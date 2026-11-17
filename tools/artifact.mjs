// Packs dist/ into a single self-contained HTML page (inline CSS + JS) for sharing as one file.
import fs from 'fs';
import path from 'path';
const out = process.argv[2] || 'dist/megamall-standalone.html';
const html = fs.readFileSync('dist/index.html', 'utf8');
const css = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(path.join('dist/assets', f), 'utf8')).join('\n');
const js = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join('dist/assets', f), 'utf8')).join('\n');
if (js.includes('</script')) throw new Error('bundle contains </script');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replace(/<script[^>]*src=[^>]*><\/script>/g, '').replace(/<link[^>]*>/g, '');
const page = `<title>MEGAMALL Explorer</title>
<style>
:root { color-scheme: dark; }
html, body { height: 100%; background: #0b0d12; color: #f4f1ea; }
${css}
</style>
${body.trim()}
<script type="module">
${js}
</script>
`;
fs.writeFileSync(out, page);
console.log(out, (page.length / 1024).toFixed(0) + ' KB');
