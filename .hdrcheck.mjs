import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
for (const w of [320, 360, 375, 390, 412]) {
  const p = await b.newPage({ viewport: { width: w, height: 700 } });
  await p.goto('http://localhost:4173/hdr.html');
  const r = await p.evaluate(() => {
    const q = id => document.getElementById(id).getBoundingClientRect();
    return { rowH: Math.round(q('row').height), titleH: Math.round(q('title').height), todayRight: Math.round(q('today').right), rightLeft: Math.round(q('right').left), leftRight: Math.round(q('left').right), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  console.log(w, JSON.stringify(r));
  if (w === 360) await p.screenshot({ path: 'hdr360.png', clip: { x: 0, y: 0, width: 360, height: 50 } });
}
await b.close();
