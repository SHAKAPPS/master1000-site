// Builds the static legal site from appstore/legal/*.md — run: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const legal = path.join(here, 'legal');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** minimal markdown → HTML for these simple documents */
function md2html(md) {
  const lines = md.split('\n');
  const out = [];
  let inList = false;
  const closeList = () => { if (inList) { out.push('</ul>'); inList = false; } };
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/([a-z]+@master1000\.app)/g, '<a href="mailto:$1">$1</a>');
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); continue; }
    if (line.startsWith('## ')) { closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# ')) { closeList(); out.push(`<h1>${inline(line.slice(2))}</h1>`); continue; }
    if (line.startsWith('- ')) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${inline(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    if (/^Last updated:/.test(line)) { out.push(`<p class="updated">${inline(line)}</p>`); continue; }
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

const CSS = `
  :root { --bg:#0B0C13; --card:#12141F; --text:#F2F3F8; --muted:#9CA1BC; --lime:#9CD63E; --purple:#8B7CF6; --border:#23273A; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:'Outfit',-apple-system,'Segoe UI',Roboto,sans-serif; line-height:1.65; }
  .wrap { max-width:760px; margin:0 auto; padding:48px 22px 80px; }
  nav { display:flex; align-items:center; gap:18px; margin-bottom:44px; flex-wrap:wrap; }
  nav .brand { display:flex; align-items:center; gap:10px; font-weight:800; font-size:18px; color:var(--text); text-decoration:none; margin-inline-end:auto; }
  nav a { color:var(--muted); text-decoration:none; font-weight:600; font-size:14px; }
  nav a:hover, nav a.on { color:var(--lime); }
  .mark { width:34px; height:26px; background:var(--lime); border-radius:8px; position:relative; display:flex; align-items:center; justify-content:center; color:#12141F; font-weight:800; font-size:11px; }
  .mark::after { content:''; position:absolute; inset-inline-start:5px; bottom:-6px; border:6px solid transparent; border-top-color:var(--lime); border-inline-start-color:var(--lime); }
  h1 { font-size:30px; font-weight:800; letter-spacing:-.01em; margin-bottom:6px; }
  .updated { color:var(--muted); font-size:13px; margin-bottom:26px; }
  h2 { font-size:17px; font-weight:800; margin:30px 0 8px; color:var(--lime); }
  p { margin:10px 0; color:#D5D8E4; font-size:15px; }
  ul { margin:10px 0 10px 22px; color:#D5D8E4; font-size:15px; }
  li { margin:5px 0; }
  a { color:var(--purple); }
  strong { color:var(--text); }
  footer { margin-top:56px; padding-top:20px; border-top:1px solid var(--border); color:var(--muted); font-size:12.5px; }
  .hero { text-align:center; padding:40px 0 10px; }
  .hero h1 { font-size:40px; }
  .hero p { font-size:17px; color:var(--muted); max-width:460px; margin:14px auto; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-top:34px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:18px; padding:22px; text-decoration:none; transition:border-color .15s; }
  .card:hover { border-color:var(--lime); }
  .card h3 { color:var(--text); font-size:16px; font-weight:800; margin-bottom:6px; }
  .card p { font-size:13px; margin:0; }
`;

function page(title, active, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Master 1000</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<nav>
  <a class="brand" href="index.html"><span class="mark">1000</span> Master 1000</a>
  <a href="privacy.html"${active === 'privacy' ? ' class="on"' : ''}>Privacy Policy</a>
  <a href="terms.html"${active === 'terms' ? ' class="on"' : ''}>Terms of Use</a>
</nav>
${body}
<footer>© ${new Date().getFullYear()} Master 1000 · <a href="mailto:support@master1000.app">support@master1000.app</a></footer>
</div>
</body>
</html>`;
}

const privacy = md2html(fs.readFileSync(path.join(legal, 'PRIVACY_POLICY.md'), 'utf8'));
const terms = md2html(fs.readFileSync(path.join(legal, 'TERMS_OF_USE.md'), 'utf8'));

const home = `
<div class="hero">
  <h1>Master the 1,000 sentences<br>natives actually use.</h1>
  <p>Master 1000 is a language-learning app for iPhone: real sentences, Smart Recall reviews, and AI-scored speaking practice in 23 languages. The first 100 sentences are free forever.</p>
</div>
<div class="cards">
  <a class="card" href="privacy.html"><h3>Privacy Policy</h3><p>What we collect, why, and your rights.</p></a>
  <a class="card" href="terms.html"><h3>Terms of Use</h3><p>The rules of the service and your subscription.</p></a>
  <a class="card" href="mailto:support@master1000.app"><h3>Support</h3><p>support@master1000.app — we answer fast.</p></a>
</div>`;

fs.writeFileSync(path.join(here, 'index.html'), page('Learn languages fast', 'home', home));
fs.writeFileSync(path.join(here, 'privacy.html'), page('Privacy Policy', 'privacy', privacy));
fs.writeFileSync(path.join(here, 'terms.html'), page('Terms of Use', 'terms', terms));
console.log('built: index.html, privacy.html, terms.html');
