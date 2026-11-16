// Fallback updater run by GitHub Actions: writes rates.json from pearl.webbyz.com
import { writeFileSync, readFileSync } from "node:fs";
const html = await (await fetch("https://pearl.webbyz.com/")).text();
const num = re => { const m = html.match(re); return m ? Number(m[1].replace(/,/g, "")) : null; };
const g1 = num(/1 Gram<\/p>\s*<span[^>]*>\s*₹\s*([\d,]+)/);
const g8 = num(/8 Grams<\/p>\s*<span[^>]*>\s*₹\s*([\d,]+)/);
if (!g1 || !g8) { console.error("parse failed"); process.exit(1); }
const ch = html.match(/<b>\s*([↑↓][^<]*)<\/b>/);
const dt = html.match(/Last Update\s*:\s*([\d-]+)/);
const next = { g1, g8, change: ch ? ch[1].trim() : "", date: dt ? dt[1] : "" };
let prev = {};
try { prev = JSON.parse(readFileSync("rates.json", "utf8")); } catch {}
// Only bump the timestamp when something changed, so unchanged runs don't create commits
const same = ["g1", "g8", "change", "date"].every(k => prev[k] === next[k]);
next.updated = same && prev.updated ? prev.updated : new Date().toISOString();
writeFileSync("rates.json", JSON.stringify(next) + "\n");
console.log({ g1, g8 });
