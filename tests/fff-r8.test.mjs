// (actualizat 2026-10-19 la conținutul real al aplicației; vezi nota de mai jos) Teste kit pentru TranslateHub, ex-r8: scanare PII înainte de trimitere către api.anthropic.com,
// istoric local opțional și căutabil, indicator „ce pleacă”, copie .fff.json fără cheia API. Rulează: node tests/fff-r8.test.mjs
// Rețea blocată; singurul „server” este un răspuns HTTP de test pentru api.anthropic.com (aplicația nu simulează nicio traducere).
import {createRequire} from "module"; import {fileURLToPath} from "url"; import path from "path"; import fs from "fs";
const require=createRequire("/opt/node-tools/package.json"); const {chromium}=require("playwright");
const here=path.dirname(fileURLToPath(import.meta.url)); const URL_='file://'+path.resolve(here,'../index.html');
const AXE=process.env.FFF_AXE||'/tmp/claude-0/-home-claude/78529928-3825-51c3-b9bd-0e81655ab6bc/scratchpad/sweep/node_modules/axe-core/axe.min.js';
let pass=0,fail=0; const ok=(c,m)=>{ if(c){pass++;} else {fail++; console.log('FAIL:',m);} };
const browser=await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
async function open(opts={}){
  const ctx=await browser.newContext({viewport:opts.vp||{width:1280,height:800},colorScheme:opts.scheme||'light',locale:'ro-RO',acceptDownloads:true});
  const reqs=[], bodies=[];
  await ctx.route(/^https?:/, r=>{ const u=r.request().url(); reqs.push(u);
    if(u.startsWith('https://api.anthropic.com/v1/messages')){ bodies.push(r.request().postData()||'');
      return r.fulfill({status:200,contentType:'text/event-stream',headers:{'access-control-allow-origin':'*'},body:'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Traducere de test."}}\n\n'}); }
    return r.abort(); });
  const p=await ctx.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push('pageerror '+e.message)); p.on('console',m=>{ if(m.type()==='error'||/Content Security/i.test(m.text())) errs.push('console '+m.text()); });
  await p.addInitScript({content:fs.readFileSync(AXE,'utf8')});
  await p.addInitScript(()=>{ try{ sessionStorage.setItem('th_apikey','sk-ant-test'); }catch(e){} });
  if(opts.init) await p.addInitScript(opts.init);
  await p.goto(URL_); await p.waitForTimeout(opts.wait||3600);
  if(opts.lang!=='en'){ await p.evaluate(()=>{document.documentElement.lang='ro';}); await p.waitForTimeout(250); }
  return {ctx,p,errs,reqs,bodies};
}
async function axe(p,label){
  await p.waitForTimeout(100);
  const r=await p.evaluate(async()=>await axe.run(document,{resultTypes:['violations']}));
  ok(r.violations.length===0,`axe ${label}: `+r.violations.map(v=>v.id+' '+v.nodes.map(n=>n.target).join('|').slice(0,160)).join('; '));
}
const realErrs=e=>e.filter(x=>!/Failed to fetch|net::|NetworkError/i.test(x));

// Notă: indicatorul „ce pleacă” (#c5-chip), verificarea PII la trimitere și panoul de istoric local (c5-*) nu există în index.html
// (versiunea curentă; în pagină a rămas doar CSS-ul c5-*). Testul verifică ce conține aplicația efectiv: kitul (core, label, bundle, pii, search),
// copia .fff.json, accesibilitatea și limbile.
const PII_TXT='Scrie-i lui ion.popescu@example.com. IBAN RO49AAAA1B31007593840000, CNP 1800101221144';
// 1. pornire curată
{ const {ctx,p,errs,reqs}=await open({lang:'en'});
  ok(errs.length===0,'pornire fără erori/CSP: '+errs.join(' | '));
  ok(reqs.length===0,'0 cereri de rețea la pornire: '+reqs.join(','));
  ok(await p.evaluate(()=>document.documentElement.getAttribute('lang')!==null),'html[lang] prezent');
  ok(await p.evaluate(()=>document.querySelector('meta[name=application-version]').content==='1.2.0'),'versiune 1.2.0 în meta');
  ok(await p.evaluate(()=>document.body.textContent.includes('v 1.2.0 · 2026-10-19')),'versiune vizibilă în pagină');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'fără depășire orizontală 1280');
  ok(await p.evaluate(()=>!!(window.FFF&&FFF.pii&&FFF.search&&FFF.bundle&&FFF.label)),'kit încărcat (pii, search, bundle, label)');
  await axe(p,'start 1280');
  await ctx.close(); }

// 2. FFF.pii (API-ul kitului): detectare + mascare locală
{ const {ctx,p}=await open({lang:'en'});
  const r=await p.evaluate(t=>{ const f=FFF.pii.scan(t); const m=FFF.pii.mask(t,f); return {n:f.length,types:f.map(x=>x.type),m}; },PII_TXT);
  ok(r.n>=2,'FFF.pii.scan găsește cel puțin 2 elemente: '+JSON.stringify(r.types));
  ok(!r.m.includes('ion.popescu@example.com')&&!r.m.includes('RO49AAAA1B31007593840000'),'FFF.pii.mask ascunde e-mailul și IBAN-ul');
  await ctx.close(); }

// 3. eticheta „Transparență” + copia .fff.json
{ const {ctx,p,errs}=await open({lang:'en'});
  await p.evaluate(()=>FFF.label.open()); await p.waitForTimeout(300);
  ok(await p.locator('dialog.fff-dlg[open]').count()===1,'dialogul „Transparență” se deschide');
  await axe(p,'dialog Transparență');
  await p.keyboard.press('Escape'); await p.waitForTimeout(150);
  const b=await p.evaluate(()=>FFF.bundle.build());
  ok(b&&b.format==='fff-bundle'&&b.app==='translatehub'&&typeof b.data==='object','copia .fff.json se construiește pentru translatehub: '+(b&&b.app));
  ok(realErrs(errs).length===0,'fără erori JS: '+errs.join('|'));
  await ctx.close(); }

// 4. mobil + întunecat
{ const {ctx,p}=await open({vp:{width:360,height:740},scheme:'dark',lang:'en'});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)<=0,'fără depășire orizontală 360');
  await axe(p,'start 360 întunecat');
  await p.evaluate(()=>FFF.label.open()); await p.waitForTimeout(300);
  await axe(p,'dialog Transparență 360 întunecat');
  const w=await p.evaluate(()=>document.querySelector('dialog.fff-dlg').getBoundingClientRect().width); ok(w<=360,'dialog încape la 360: '+w);
  await ctx.close(); }

// 5. limbi
{ const {ctx,p,errs}=await open({lang:'en'});
  for(const l of ['ro','en','fr','it','es','pt','de','hu']){ await p.evaluate(x=>{document.documentElement.lang=x;},l); await p.waitForTimeout(150); }
  ok(realErrs(errs).length===0,'schimbarea limbii fără erori: '+errs.join('|'));
  await ctx.close(); }

await browser.close();
console.log(`\nTranslateHub fff-r8: ${pass} reușite, ${fail} eșuate`); process.exit(fail?1:0);
