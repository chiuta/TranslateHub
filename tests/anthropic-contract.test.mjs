// TranslateHub — contractul cu API-ul Anthropic (Etapa 9): versiunea API și modelele vin din nucleul AI comun (FFF.ai), nu din cod scris de mână;
// temperature/top_p/top_k nu se trimit (eliminate în 2026-10-21 → 400). Rulare: node tests/anthropic-contract.test.mjs
import fs from "node:fs"; import path from "node:path"; import {fileURLToPath} from "node:url"; import {createRequire} from "node:module";
const require = createRequire(process.env.PW_ROOT || import.meta.url); const {chromium} = require("playwright");
const HERE = path.dirname(fileURLToPath(import.meta.url)), FILE = path.resolve(HERE, "..", "index.html");
let pass = 0, fail = 0; const check = (n, c, x) => { if (c) { pass++; console.log("  ok   " + n); } else { fail++; console.log("  FAIL " + n + (x === undefined ? "" : " " + JSON.stringify(x).slice(0, 300))); } };
// 1. static: în afara copiei nucleului AI nu există literal anthropic-version / opțiune version / model retras / sampling către Anthropic
const html = fs.readFileSync(FILE, "utf8");
const own = html.replace(/<script id="fff-mod-ai">[\s\S]*?<\/script>/, "").replace(/<script type="application\/json" id="fff-info">[\s\S]*?<\/script>/, "");
check("nucleul AI e încorporat (fff-mod-ai)", /<script id="fff-mod-ai">/.test(html));
check("niciun literal anthropic-version cu dată în codul aplicației", !/anthropic-version['"]?\s*[:=]\s*['"]\d{4}-\d\d-\d\d/.test(own));
check("apelul propriu folosește FFF.ai (anthropicHeaders sau run/stream)", /FFF\.ai\.(anthropicHeaders|run|stream)\(/.test(own));
check("niciun id de model retras scris ca valoare activă", !/["'](claude-3-[a-z0-9-]+|claude-sonnet-4-20250514|claude-sonnet-4-5-20250929|claude-opus-4-1-20250805)["']\s*[,;)}\]]/.test(own.split("\n").filter(l => !/retras|retired|migrat|înlocuit/i.test(l)).join("\n")));
// 2. runtime: valori centrale
const b = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"]});
const ctx = await b.newContext({serviceWorkers: "block"}); await ctx.route(/^https?:/, r => r.abort());
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(String(e)));
await p.goto("file://" + FILE); await p.waitForTimeout(1200);
const core = await p.evaluate(() => { const h = FFF.ai.anthropicHeaders("sk-ant-x"); return {v: FFF.ai.ANTHROPIC_VERSION, hv: h["anthropic-version"], key: h["x-api-key"], dd: h["anthropic-dangerous-direct-browser-access"], def: FFF.ai.MODELS.default, mig: FFF.ai.migrateModel("claude-sonnet-4-20250514"), empty: FFF.ai.migrateModel("")}; });
check("FFF.ai.ANTHROPIC_VERSION = 2026-10-21 și antetele îl folosesc", core.v === "2026-10-21" && core.hv === "2026-10-21" && core.key === "sk-ant-x" && core.dd === "true", core);
check("model retras → înlocuitor; model gol → implicit", core.mig === "claude-sonnet-5-5" && core.empty === core.def, core);
const th = await p.evaluate(() => { sessionStorage.setItem("th_apikey", "sk-ant-th"); sessionStorage.setItem("th_model", "claude-3-haiku-20240307"); const h = buildHeaders(); const retired = getModel(); sessionStorage.setItem("th_model", "claude-opus-5-5"); const keep = getModel(); sessionStorage.removeItem("th_model"); return {h, retired, keep, def: getModel()}; });
check("TranslateHub: buildHeaders = antetele nucleului (versiune, cheie, acces din browser)", th.h["anthropic-version"] === "2026-10-21" && th.h["x-api-key"] === "sk-ant-th" && th.h["anthropic-dangerous-direct-browser-access"] === "true", th.h);
check("TranslateHub: getModel înlocuiește un model retras, păstrează unul activ, implicit = nucleu", th.retired === "claude-haiku-5-5" && th.keep === "claude-opus-5-5" && th.def === "claude-sonnet-5-5", th);
check("0 erori JS la pornire", errs.length === 0, errs);
await b.close(); console.log(`\n${pass} ok, ${fail} eșuate`); process.exit(fail ? 1 : 0);
