// Teste 1.3.10 (23 oct. 2026): sanitizerul pentru textul juridic tradus elimină <noscript>/<template> (mXSS), ținte tactile ≥44 px pe ecrane tactile.
// Rulare: node tests/audit-1310.test.mjs (Playwright din /opt/node-tools, Chromium local, rețea blocată)
import {createRequire} from "module"; import {fileURLToPath} from "url"; import path from "path";
const require=createRequire("/opt/node-tools/package.json"); const {chromium}=require("playwright");
const URL_='file://'+path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../index.html');
let pass=0,fail=0; const ok=(c,m,i)=>{ if(c){pass++;console.log('  ok   '+m);} else {fail++;console.log('  FAIL '+m+(i===undefined?'':' '+JSON.stringify(i)));} };
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
async function open(touch){ const ctx=await browser.newContext({viewport:{width:390,height:800},hasTouch:touch,isMobile:touch}); await ctx.route(/^https?:/,r=>r.abort()); const p=await ctx.newPage(); await p.goto(URL_); await p.waitForTimeout(1500); return {ctx,p}; }
{ const {ctx,p}=await open(false);
  const out=await p.evaluate(()=>[
    sanitizeLegalHTML('<noscript><a title="</noscript><img src=x onerror=1>">x</a></noscript><p>ok</p>'),
    sanitizeLegalHTML('<template><img src=x onerror=1></template><p onclick="1">ok</p>')]);
  ok(!/noscript|template/i.test(out.join('')),'sanitizeLegalHTML: fără <noscript>/<template>',out);
  ok(/<p>ok<\/p>/.test(out[0])&&/<p>ok<\/p>/.test(out[1]),'sanitizeLegalHTML: păstrează conținutul inofensiv și scoate on*',out);
  await ctx.close(); }
{ const {ctx,p}=await open(true);
  const r=await p.evaluate(()=>{ const s=[...document.querySelectorAll('.tag-chip,.go-btn,.copy-btn,.clear-btn,.search-nav,.ui-lang-btn,.footer-legal-btn')].filter(x=>{const b=x.getBoundingClientRect();return b.width&&b.height&&(b.height<43.5)}); return {small:s.slice(0,5).map(x=>x.className+':'+Math.round(x.getBoundingClientRect().height)), ov:document.documentElement.scrollWidth}; });
  ok(r.small.length===0,'ecran tactil: controalele principale ≥44 px înălțime',r);
  ok(r.ov<=390,'ecran tactil: fără depășire orizontală',r);
  await ctx.close(); }
await browser.close(); console.log(`\n${pass} ok, ${fail} eșuate`); process.exit(fail?1:0);
