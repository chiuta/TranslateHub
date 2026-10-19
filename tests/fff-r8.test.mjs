// Teste pentru funcțiile noi din TranslateHub 1.1.0 (runda 8): scanare PII înainte de trimitere către api.anthropic.com,
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

// 1. pornire curată + indicator
{ const {ctx,p,errs,reqs}=await open({lang:'en'});
  ok(errs.length===0,'pornire fără erori/CSP: '+errs.join(' | '));
  ok(reqs.length===0,'0 cereri de rețea la pornire: '+reqs.join(','));
  ok(await p.evaluate(()=>document.querySelector('meta[name=application-version]').content==='1.2.0'),'versiune 1.2.0 în meta');
  ok((await p.textContent('#app-version-label+*,#app-version')).includes('1.2.0')||(await p.evaluate(()=>document.body.textContent.includes('v 1.2.0 · 2026-10-19'))),'versiune vizibilă');
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'fără depășire orizontală 1280');
  const c=await p.textContent('#c5-chip'); ok(/↗/.test(c)&&c.includes('api.anthropic.com'),'indicator: '+c);
  ok((await p.getAttribute('#c5-chip','title')||'').includes('api.anthropic.com'),'indicator are explicație');
  await axe(p,'start 1280');
  await p.evaluate(()=>{document.documentElement.lang='de';}); await p.waitForTimeout(200);
  ok(/Übersetzen|übersetzt|Taste/i.test(await p.textContent('#c5-chip'))||/api\.anthropic/.test(await p.textContent('#c5-chip')),'indicator în de');
  ok((await p.textContent('#c5-pii-t')).length>10,'etichetă PII tradusă (de)');
  await p.evaluate(()=>{document.documentElement.lang='hu';}); await p.waitForTimeout(200);
  ok((await p.textContent('#c5-pii-t')).toLowerCase().includes('személyes'),'etichetă PII în hu: '+await p.textContent('#c5-pii-t'));
  await ctx.close(); }

// 2. PII înainte de trimitere
{ const {ctx,p,errs,bodies}=await open();
  const txt='Scrie-i lui ion.popescu@example.com. IBAN: RO49AAAA1B31007593840000, CNP 1800101221144';
  await p.fill('#tr-source','Salut, ce faci?'); await p.click('#translate-btn'); await p.waitForTimeout(900);
  ok(await p.locator('dialog.fff-pii').count()===0,'text curat: fără dialog'); ok(bodies.length===1,'text curat trimis: '+bodies.length);
  await p.fill('#tr-source',txt); await p.click('#translate-btn'); await p.waitForSelector('dialog.fff-pii[open]',{timeout:3000});
  ok(await p.locator('dialog.fff-pii li').count()>=2,'dialogul listează elementele');
  ok(bodies.length===1,'nimic trimis cât timp dialogul e deschis');
  await axe(p,'dialog PII');
  const btns=await p.locator('dialog.fff-pii button').allTextContents(); ok(btns.length>=3,'butoane: '+btns.join('|'));
  // mascare
  await p.locator('dialog.fff-pii button').filter({hasText:/Maschează|Mask/i}).first().click(); await p.waitForTimeout(1200);
  ok(bodies.length===2,'după mascare se trimite: '+bodies.length);
  ok(!bodies[1].includes('ion.popescu@example.com')&&!bodies[1].includes('RO49AAAA1B31007593840000'),'datele NU apar în cerere');
  ok(!(await p.inputValue('#tr-source')).includes('ion.popescu'),'câmpul sursă a fost mascat');
  // continuă
  await p.fill('#tr-source',txt); await p.click('#translate-btn'); await p.waitForSelector('dialog.fff-pii[open]');
  await p.locator('dialog.fff-pii button').filter({hasText:/Continuă fără|Continue without/i}).first().click(); await p.waitForTimeout(1200);
  ok(bodies.length===3&&bodies[2].includes('ion.popescu@example.com'),'„continuă” trimite originalul');
  // anulare
  await p.fill('#tr-source',txt); await p.click('#translate-btn'); await p.waitForSelector('dialog.fff-pii[open]');
  await p.keyboard.press('Escape'); await p.waitForTimeout(700);
  ok(bodies.length===3,'anulare: nimic trimis'); ok((await p.inputValue('#tr-source'))===txt,'anulare: textul rămâne');
  // Ctrl+Enter trece prin același control
  await p.focus('#tr-source'); await p.keyboard.press('Control+Enter'); await p.waitForSelector('dialog.fff-pii[open]',{timeout:3000});
  ok(bodies.length===3,'Ctrl+Enter: tot dialog'); await p.keyboard.press('Escape');
  // verificare oprită
  await p.uncheck('#c5-pii'); await p.waitForTimeout(100);
  ok(await p.evaluate(()=>localStorage.getItem('th_piiguard'))==='0','opțiunea se păstrează');
  await p.click('#translate-btn'); await p.waitForTimeout(1200);
  ok(await p.locator('dialog.fff-pii').count()===0&&bodies.length===4,'verificarea oprită: trimitere directă');
  ok(realErrs(errs).length===0,'fără erori JS: '+errs.join('|'));
  await ctx.close(); }

// 3. istoric local
{ const {ctx,p,errs,bodies}=await open();
  ok(await p.evaluate(()=>localStorage.getItem('th_hist'))===null,'implicit nu se salvează');
  await p.fill('#tr-source','Bună ziua, doresc o cameră dublă pentru două nopți.'); await p.click('#translate-btn'); await p.waitForTimeout(1200);
  ok(await p.evaluate(()=>localStorage.getItem('th_hist'))===null,'cu opțiunea oprită nu se scrie nimic');
  await p.check('#c5-hist'); ok(await p.evaluate(()=>localStorage.getItem('th_savehist'))==='1','opțiunea se păstrează');
  await p.fill('#tr-source','Bună ziua, doresc o cameră dublă pentru două nopți.'); await p.click('#translate-btn'); await p.waitForTimeout(1200);
  await p.fill('#tr-source','Unde este gara? Mă grăbesc spre aeroport.'); await p.click('#translate-btn'); await p.waitForTimeout(1200);
  const h=await p.evaluate(()=>JSON.parse(localStorage.getItem('th_hist')||'[]')); ok(h.length===2,'2 intrări salvate: '+h.length);
  ok(h[0]&&h[0].out.includes('Traducere de test'),'rezultatul real al API-ului e salvat');
  await p.click('#c5-histbtn'); await p.waitForSelector('dialog.c5-dlg[open]'); await axe(p,'istoric');
  ok(await p.locator('dialog.c5-dlg li.c5-li').count()===2,'istoric listează 2');
  await p.fill('dialog.c5-dlg input[type=search]','gara'); await p.waitForTimeout(250);
  ok(await p.locator('dialog.c5-dlg li.c5-li').count()===1,'căutare „gara” => 1');
  ok(await p.locator('dialog.c5-dlg mark').count()>=1,'termeni evidențiați');
  await p.fill('dialog.c5-dlg input[type=search]','camera'); await p.waitForTimeout(250);
  ok(await p.locator('dialog.c5-dlg li.c5-li').count()>=1,'căutare tolerantă la diacritice/formă: „camera” găsește „cameră”');
  await p.fill('dialog.c5-dlg input[type=search]','zzqqxx'); await p.waitForTimeout(250);
  ok(await p.locator('dialog.c5-dlg li.c5-li').count()===0,'fără rezultate');
  await p.fill('dialog.c5-dlg input[type=search]','gara'); await p.waitForTimeout(250);
  // reia textul sursă
  await p.locator('dialog.c5-dlg details summary').first().click();
  await p.locator('dialog.c5-dlg button').filter({hasText:/Reia/}).first().click(); await p.waitForTimeout(300);
  ok((await p.inputValue('#tr-source')).includes('gara'),'„Reia textul sursă” repune sursa în câmp');
  // export Markdown tot
  await p.click('#c5-histbtn'); await p.waitForSelector('dialog.c5-dlg[open]');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.locator('dialog.c5-dlg button').filter({hasText:/Exportă tot/}).click()]);
  const md=fs.readFileSync(await dl.path(),'utf8'); ok(/gara/.test(md)&&/cameră/.test(md),'export Markdown conține intrările');
  // PII în istoric
  await p.evaluate(()=>{ const l=JSON.parse(localStorage.getItem('th_hist')); l[0].src+=' Scrieți la test.user@example.org'; localStorage.setItem('th_hist',JSON.stringify(l)); });
  await p.keyboard.press('Escape'); await p.click('#c5-histbtn'); await p.waitForSelector('dialog.c5-dlg[open]');
  await p.locator('dialog.c5-dlg button').filter({hasText:/Caută date personale/}).click(); await p.waitForTimeout(400);
  await p.locator('dialog.c5-dlg').last().locator('button').filter({hasText:/^Da$/}).click(); await p.waitForTimeout(600);
  ok(!(await p.evaluate(()=>localStorage.getItem('th_hist'))).includes('test.user@example.org'),'datele personale din istoric au fost mascate');
  // copie kit: fără cheia API
  const keys=await p.evaluate(async()=>{ const b=await FFF.bundle.export({encrypt:false,returnOnly:true}).catch(()=>null); return b; });
  const idx=await p.evaluate(()=>FFF.store.indexKeys());
  ok(idx.includes('th_hist'),'cheia th_hist e indexată în copie: '+idx.join(','));
  ok(!idx.some(k=>/apikey/i.test(k)),'cheia API nu e în localStorage/copie');
  ok(await p.evaluate(()=>!Object.keys(localStorage).some(k=>/apikey/i.test(k))),'cheia API doar în sessionStorage');
  // ștergere
  await p.keyboard.press('Escape'); await p.click('#c5-histbtn'); await p.waitForSelector('dialog.c5-dlg[open]');
  await p.locator('dialog.c5-dlg details summary').first().click();
  await p.locator('dialog.c5-dlg button').filter({hasText:/^Șterge$/}).first().click(); await p.waitForTimeout(500);
  ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('th_hist')||'[]').length)===1,'ștergerea unei intrări');
  ok(realErrs(errs).length===0,'fără erori JS în istoric: '+errs.join('|'));
  await ctx.close(); }

// 4. 360x740 întunecat
{ const {ctx,p,errs}=await open({vp:{width:360,height:740},scheme:'dark'});
  ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'fără depășire orizontală 360');
  await p.click('#c5-histbtn'); await p.waitForSelector('dialog.c5-dlg[open]'); await axe(p,'istoric 360 întunecat');
  ok(await p.evaluate(()=>document.querySelector('dialog.c5-dlg').getBoundingClientRect().width<=360),'dialog încape la 360');
  await p.keyboard.press('Escape'); await axe(p,'start 360 întunecat');
  ok(errs.length===0,'0 erori: '+errs.join('|'));
  await ctx.close(); }

await browser.close();
console.log(`\nTranslateHub fff-r8: ${pass} reușite, ${fail} eșuate`); process.exit(fail?1:0);
