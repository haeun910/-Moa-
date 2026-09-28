import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const w of [320, 360, 375]) {
  const p = await b.newPage({ viewport: { width: w, height: 200 } });
  await p.goto('http://localhost:4173/h.html');
  console.log(w, await p.evaluate(() => { const t = document.getElementById('title'); return t.scrollWidth > t.clientWidth ? 'truncated' : 'ok'; }));
}
await b.close();
