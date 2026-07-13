// Builds the Master 1000 static site (bilingual legal pages) — run: node build.mjs
// Sources of truth: legal/src/*.md (from the legal package). Placeholders are
// replaced here; the script FAILS if any [PLACEHOLDER] survives into output.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, 'legal', 'src');
const SITE = 'https://master1000-site.onrender.com';

// ── placeholder resolution (operator-confirmed 2026-07-13) ──
const COMMON = {
  '[COMPANY NAME]': 'Shaked Yizhak',
  '[CITY AND POSTAL CODE]': 'Vardon, 79535',
  '[עיר ומיקוד]': 'ורדון, 79535',
  '[PHONE NUMBER]': '+972-53-220-6866',
  '[COMPANY / BUSINESS REGISTRATION NUMBER]': 'Individual operator (Shaked Yizhak)',
  '[TERMS URL]': `${SITE}/terms`,
  '[PRIVACY POLICY URL]': `${SITE}/privacy`,
};
const EN = {
  ...COMMON,
  '[EU REPRESENTATIVE DETAILS]': 'Not appointed; contact the controller at the details above.',
  '[UK REPRESENTATIVE DETAILS]': 'Not appointed; contact the controller at the details above.',
  '[ANALYTICS PROVIDER]': 'None currently in use (no analytics provider)',
  '[CRASH REPORTING PROVIDER]': 'None currently in use (no crash-reporting provider)',
  'The current providers must be listed here before publication: **None currently in use (no analytics provider)** and **None currently in use (no crash-reporting provider)**.':
    'The App currently uses no third-party analytics or crash-reporting tools; this section will be updated before any such tool is introduced.',
};
const HE = {
  ...COMMON,
  '[COMPANY / BUSINESS REGISTRATION NUMBER]': 'עוסק יחיד (שקד יצחק)',
  '[EU REPRESENTATIVE DETAILS]': 'לא מונה; ניתן לפנות אלינו בפרטי הקשר שלעיל.',
  '[UK REPRESENTATIVE DETAILS]': 'לא מונה; ניתן לפנות אלינו בפרטי הקשר שלעיל.',
  '[ANALYTICS PROVIDER]': 'לא בשימוש כרגע (אין ספק אנליטיקה)',
  '[CRASH REPORTING PROVIDER]': 'לא בשימוש כרגע (אין ספק דיווח קריסות)',
};

function resolve(md, map) {
  let out = md;
  for (const [from, to] of Object.entries(map)) out = out.split(from).join(to);
  return out;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function stripFrontmatterAndWrapper(md) {
  let t = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  t = t.replace(/^\s*<div dir="rtl">\s*$/m, '').replace(/^\s*<\/div>\s*$/m, '');
  return t;
}

/** markdown → HTML: headings, bold, links, ul/ol, tables, paragraphs */
function md2html(md) {
  const inline = (t) => esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|\s)((?:https?:\/\/)[^\s<]+)/g, '$1<a href="$2">$2</a>')
    .replace(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, '<a href="mailto:$1">$1</a>');

  const lines = md.split('\n');
  const out = [];
  let list = null; // 'ul' | 'ol'
  let table = null; // array of rows
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const closeTable = () => {
    if (!table) return;
    const [head, ...rows] = table;
    out.push('<div class="tablewrap"><table>');
    out.push('<thead><tr>' + head.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>');
    for (const r of rows) out.push('<tr>' + r.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>');
    out.push('</tbody></table></div>');
    table = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\|/.test(line.trim())) {
      closeList();
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // separator row
      (table ??= []).push(cells);
      continue;
    }
    closeTable();
    if (!line.trim()) { closeList(); continue; }
    const h = line.match(/^(#{1,3}) (.*)$/);
    if (h) { closeList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }
    const li = line.match(/^(?:[-*]|(\d+)\.) (.*)$/);
    if (li) {
      const kind = li[1] ? 'ol' : 'ul';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inline(li[2])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  closeTable();
  return out.join('\n');
}

const CSS = `
  :root { --bg:#0B0C13; --card:#12141F; --text:#F2F3F8; --muted:#9CA1BC; --lime:#9CD63E; --purple:#8B7CF6; --border:#23273A; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { background:var(--bg); color:var(--text); font-family:'Outfit','Heebo',-apple-system,'Segoe UI',Roboto,sans-serif; line-height:1.7; }
  .wrap { max-width:840px; margin:0 auto; padding:44px 22px 80px; }
  nav { display:flex; align-items:center; gap:16px; margin-bottom:40px; flex-wrap:wrap; }
  nav .brand { display:flex; align-items:center; gap:10px; font-weight:800; font-size:18px; color:var(--text); text-decoration:none; margin-inline-end:auto; }
  nav a { color:var(--muted); text-decoration:none; font-weight:600; font-size:14px; }
  nav a:hover, nav a.on, nav a:focus-visible { color:var(--lime); outline:none; }
  a:focus-visible { outline:2px solid var(--lime); outline-offset:2px; border-radius:4px; }
  .mark { width:34px; height:26px; background:var(--lime); border-radius:8px; position:relative; display:flex; align-items:center; justify-content:center; color:#12141F; font-weight:800; font-size:11px; }
  .mark::after { content:''; position:absolute; inset-inline-start:5px; bottom:-6px; border:6px solid transparent; border-top-color:var(--lime); border-inline-start-color:var(--lime); }
  h1 { font-size:29px; font-weight:800; letter-spacing:-.01em; margin:6px 0 14px; }
  h2 { font-size:18px; font-weight:800; margin:32px 0 8px; color:var(--lime); }
  h3 { font-size:15.5px; font-weight:800; margin:22px 0 6px; }
  p { margin:10px 0; color:#D5D8E4; font-size:15px; }
  ul, ol { margin:10px 0; padding-inline-start:24px; color:#D5D8E4; font-size:15px; }
  li { margin:5px 0; }
  a { color:var(--purple); }
  strong { color:var(--text); }
  .tablewrap { overflow-x:auto; margin:14px 0; border:1px solid var(--border); border-radius:12px; }
  table { border-collapse:collapse; width:100%; min-width:560px; font-size:13.5px; }
  th, td { text-align:start; padding:10px 12px; border-bottom:1px solid var(--border); color:#D5D8E4; vertical-align:top; }
  th { color:var(--text); background:var(--card); font-weight:700; }
  tr:last-child td { border-bottom:none; }
  .langswitch { display:inline-block; margin-bottom:8px; font-weight:700; font-size:13px; }
  footer { margin-top:56px; padding-top:20px; border-top:1px solid var(--border); color:var(--muted); font-size:12.5px; line-height:2; }
  footer a { color:var(--muted); margin-inline-end:14px; }
  footer a:hover { color:var(--lime); }
  .hero { text-align:center; padding:40px 0 10px; }
  .hero h1 { font-size:40px; }
  .hero p { font-size:17px; color:var(--muted); max-width:460px; margin:14px auto; }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-top:34px; }
  .card { background:var(--card); border:1px solid var(--border); border-radius:18px; padding:22px; text-decoration:none; transition:border-color .15s; }
  .card:hover { border-color:var(--lime); }
  .card h3 { color:var(--text); font-size:16px; font-weight:800; margin:0 0 6px; }
  .card p { font-size:13px; margin:0; }
`;

const FOOTER_LINKS = `
  <a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Use</a><a href="/he/privacy">מדיניות פרטיות</a><a href="/he/terms">תנאי שימוש</a><a href="/support.html">Support</a>
  <br>© ${new Date().getFullYear()} Shaked Yizhak (Master 1000) · <a href="mailto:Shaked54321@gmail.com">Shaked54321@gmail.com</a>`;

function page({ title, desc, lang, dir, canonical, active, langSwitch, body }) {
  const fonts = lang === 'he'
    ? 'family=Heebo:wght@400;600;800&family=Outfit:wght@400;600;800'
    : 'family=Outfit:wght@400;600;800';
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?${fonts}&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<div class="wrap">
<nav>
  <a class="brand" href="/"><span class="mark">1000</span> Master 1000</a>
  <a href="/privacy"${active === 'privacy' ? ' class="on"' : ''}>Privacy</a>
  <a href="/terms"${active === 'terms' ? ' class="on"' : ''}>Terms</a>
  <a href="/support.html"${active === 'support' ? ' class="on"' : ''}>Support</a>
</nav>
${langSwitch ? `<a class="langswitch" href="${langSwitch.href}" lang="${langSwitch.lang}" dir="${langSwitch.dir}">${langSwitch.label}</a>` : ''}
${body}
<footer>${FOOTER_LINKS}</footer>
</div>
</body>
</html>`;
}

const read = (f) => fs.readFileSync(path.join(src, f), 'utf8');
const write = (rel, html) => {
  const p = path.join(here, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html);
};

const docs = [
  {
    file: 'privacy-policy-en.md', map: EN, out: 'privacy/index.html', lang: 'en', dir: 'ltr', active: 'privacy',
    title: 'Privacy Policy — Master 1000', desc: 'How Master 1000 collects, uses, and protects your personal information.',
    canonical: `${SITE}/privacy`, langSwitch: { href: '/he/privacy', label: 'עברית ←', lang: 'he', dir: 'rtl' },
  },
  {
    file: 'terms-of-use-en.md', map: EN, out: 'terms/index.html', lang: 'en', dir: 'ltr', active: 'terms',
    title: 'Terms of Use — Master 1000', desc: 'The terms that govern your use of Master 1000, including subscriptions.',
    canonical: `${SITE}/terms`, langSwitch: { href: '/he/terms', label: 'עברית ←', lang: 'he', dir: 'rtl' },
  },
  {
    file: 'privacy-policy-he.md', map: HE, out: 'he/privacy/index.html', lang: 'he', dir: 'rtl', active: 'privacy',
    title: 'מדיניות פרטיות — Master 1000', desc: 'כיצד Master 1000 אוספת, משתמשת ומגינה על המידע האישי שלך.',
    canonical: `${SITE}/he/privacy`, langSwitch: { href: '/privacy', label: '→ English', lang: 'en', dir: 'ltr' },
  },
  {
    file: 'terms-of-use-he.md', map: HE, out: 'he/terms/index.html', lang: 'he', dir: 'rtl', active: 'terms',
    title: 'תנאי שימוש — Master 1000', desc: 'התנאים החלים על השימוש ב-Master 1000, כולל מנויים.',
    canonical: `${SITE}/he/terms`, langSwitch: { href: '/terms', label: '→ English', lang: 'en', dir: 'ltr' },
  },
];

const written = [];
for (const d of docs) {
  const md = resolve(stripFrontmatterAndWrapper(read(d.file)), d.map);
  const html = page({ ...d, body: md2html(md) });
  // both shapes serve the full page: Render's clean URL `/privacy` maps to
  // privacy.html, while `/privacy/` maps to privacy/index.html — a redirect
  // stub at privacy.html would meta-refresh onto itself in a loop.
  write(d.out, html);
  const flat = d.out.replace('/index.html', '.html');
  write(flat, html);
  written.push(d.out, flat);
}

// ── home + support ──
const home = `
<div class="hero">
  <h1>Master the 1,000 sentences<br>natives actually use.</h1>
  <p>Master 1000 is a language-learning app for iPhone: real sentences, Smart Recall reviews, and AI-scored speaking practice in 23 languages. The first 100 sentences are free forever.</p>
</div>
<div class="cards">
  <a class="card" href="/privacy"><h3>Privacy Policy</h3><p>What we collect, why, and your rights.</p></a>
  <a class="card" href="/terms"><h3>Terms of Use</h3><p>The rules of the service and your subscription.</p></a>
  <a class="card" href="/support.html"><h3>Support</h3><p>We answer fast.</p></a>
</div>`;
write('index.html', page({
  title: 'Master 1000 — Learn any language, fast!', desc: 'Master the 1,000 sentences natives actually use. Free to start.',
  lang: 'en', dir: 'ltr', canonical: `${SITE}/`, active: 'home', body: home,
}));
written.push('index.html');

const support = `
<h1>Support</h1>
<p>We usually reply within one business day.</p>
<h2>Contact us</h2>
<p>Email: Shaked54321@gmail.com — include your device model, iOS version, and a short description (screenshots help).</p>
<h2>How do I manage or cancel my subscription?</h2>
<p>Subscriptions are handled by Apple. Open <strong>Settings → your name → Subscriptions</strong> on your iPhone, or use "Restore Purchases" inside the app's Premium screen. Deleting the app or your account does not cancel an Apple subscription.</p>
<h2>Speak mode can't hear me</h2>
<p>Make sure the app has microphone permission (<strong>Settings → Master 1000 → Microphone</strong>), hold the mic button while you speak, and release when you finish. In Auto mode, wait for the chime before speaking.</p>
<h2>How do I delete my account and data?</h2>
<p>Profile → Settings → Delete account, or email Shaked54321@gmail.com. See our <a href="/privacy">Privacy Policy</a> for details and timelines.</p>
<h2>My progress didn't sync</h2>
<p>Progress syncs when you're signed in with an account. Guest-mode progress lives only on your device — create an account from Profile to keep it safe.</p>`;
write('support.html', page({
  title: 'Support — Master 1000', desc: 'Get help with Master 1000: subscriptions, microphone, account deletion, sync.',
  lang: 'en', dir: 'ltr', canonical: `${SITE}/support.html`, active: 'support', body: md2htmlNoop(support),
}));
written.push('support.html');
function md2htmlNoop(html) { return html; } // support body is already HTML

// ── validation: no unresolved placeholders in any public output ──
const offenders = [];
for (const rel of ['privacy/index.html', 'terms/index.html', 'he/privacy/index.html', 'he/terms/index.html', 'index.html', 'support.html']) {
  const html = fs.readFileSync(path.join(here, rel), 'utf8');
  const m = html.match(/\[(?:[A-Z][A-Z /-]{3,}|עיר ומיקוד)\]/g);
  if (m) offenders.push(`${rel}: ${[...new Set(m)].join(', ')}`);
}
if (offenders.length) {
  console.error('UNRESOLVED PLACEHOLDERS:\n' + offenders.join('\n'));
  process.exit(1);
}
console.log('built:', written.join(', '));
