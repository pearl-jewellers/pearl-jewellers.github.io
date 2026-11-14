// ===== Configuration =====
// After deploying worker/worker.js to Cloudflare (free), paste its URL here for true live (1 min) rates.
const RATE_API = "";            // e.g. "https://pearl-rate.YOURNAME.workers.dev"
const FALLBACK_JSON = "rates.json"; // updated by the GitHub Action
const REFRESH_MS = 60 * 1000;

const $ = id => document.getElementById(id);
const fmt = n => "₹ " + Number(n).toLocaleString("en-IN");
let last = null;

async function getRates() {
  if (RATE_API) {
    try {
      const r = await fetch(RATE_API, { cache: "no-store" });
      if (r.ok) return { ...(await r.json()), source: "live" };
    } catch (e) { /* fall through */ }
  }
  const r = await fetch(FALLBACK_JSON + "?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error("no rates");
  return { ...(await r.json()), source: "cached" };
}

let show = function (d) {
  const changed = last && (last.g1 !== d.g1);
  $("rate1").textContent = fmt(d.g1);
  $("rate8").textContent = fmt(d.g8);
  $("tickerRate").textContent = fmt(d.g1);
  $("rateDate").textContent = d.date || "-";
  $("tickerTime").textContent = d.date || "";
  $("rateStatus").textContent = d.source === "live" ? "live" : "latest available";
  const c = $("change");
  c.textContent = d.change || "";
  c.className = "change " + (/↑|increase/i.test(d.change || "") ? "up" : /↓|decrease/i.test(d.change || "") ? "down" : "");
  if (changed) ["rate1", "rate8"].forEach(i => {
    const el = $(i); el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  });
  last = d;
}

async function refresh() {
  try { show(await getRates()); calc(); }
  catch (e) { if (!last) $("rateStatus").textContent = "unavailable – please call us"; }
}
refresh();
setInterval(refresh, REFRESH_MS);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });

// Mobile menu
const burger = $("burger"), menu = $("menu");
burger.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
menu.querySelectorAll("a").forEach(a => a.addEventListener("click", () => menu.classList.remove("open")));
$("yr").textContent = new Date().getFullYear();

// ===== Enquiry -> WhatsApp =====
const OWNER_WA = "919446145802";
$("enqForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target, v = n => f.elements[n].value.trim();
  let bad = null;
  for (const n of ["name", "mobile", "subject", "message"]) {
    const el = f.elements[n]; const empty = !v(n);
    el.classList.toggle("bad", empty); if (empty && !bad) bad = el;
  }
  const err = $("enqErr");
  if (bad) { err.textContent = "Please fill all the fields marked *."; bad.focus(); return; }
  if (!/^(\+?91)?[6-9]\d{9}$/.test(v("mobile").replace(/[\s-]/g, ""))) {
    err.textContent = "Please enter a valid 10-digit mobile number.";
    f.elements.mobile.classList.add("bad"); f.elements.mobile.focus(); return;
  }
  err.textContent = "";
  const text = `*New Website Enquiry – Pearl Jewellers*\n\n*Name:* ${v("name")}\n*Mobile:* ${v("mobile")}\n*Subject:* ${v("subject")}\n*Message:* ${v("message")}`;
  window.open(`https://wa.me/${OWNER_WA}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  f.reset();
});

// ===== Google reviews: latest 5 five-star reviews that have a comment =====
// Served by the Worker (/reviews) using a Google Places API key; see worker/worker.js.
function emptyReviews() {
  $("revGrid").innerHTML = '<div class="rev-empty"><div class="big">★★★★★</div><p>Our customers love us on Google. Tap below to read their reviews.</p></div>';
}
async function loadReviews() {
  if (!RATE_API) return emptyReviews();
  try {
    const r = await fetch(RATE_API.replace(/\/+$/, "") + "/reviews", { cache: "no-store" });
    if (!r.ok) return emptyReviews();
    const d = await r.json();
    const list = (d.reviews || [])
      .filter(x => x.rating === 5 && x.text && x.text.trim())
      .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
      .slice(0, 5);
    if (!list.length) return emptyReviews();
    if (d.rating) $("revSummary").textContent = "★ " + d.rating + " on Google · " + d.total + " reviews";
    const grid = $("revGrid"); grid.innerHTML = "";
    list.forEach(x => {   // textContent only: no HTML injection
      const c = document.createElement("div"); c.className = "rev";
      const st = document.createElement("div"); st.className = "stars"; st.textContent = "★★★★★";
      const p = document.createElement("p"); p.textContent = "“" + x.text + "”";
      const sm = document.createElement("small"); sm.textContent = "— " + x.author + (x.when ? ", " + x.when : "");
      c.append(st, p, sm); grid.append(c);
    });
  } catch (e) { emptyReviews(); }
}
loadReviews();

// ===== Interactivity =====
// Scroll reveal
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
document.querySelectorAll(".rate-card,.grid figure,.about .two>*,.visit-grid>*,form,.rev-grid,.title,.calc,.deal").forEach(el => { el.classList.add("reveal"); io.observe(el); });

// Active nav link
const links = [...document.querySelectorAll("nav a[href^='#']")];
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
links.forEach(a => { const s = document.querySelector(a.getAttribute("href")); if (s) spy.observe(s); });

// Back to top
const toTop = $("toTop");
addEventListener("scroll", () => toTop.classList.toggle("show", scrollY > 600), { passive: true });
toTop.onclick = () => scrollTo({ top: 0, behavior: "smooth" });

// Lightbox for collections
const lb = $("lb");
document.querySelectorAll(".grid figure").forEach(f => f.addEventListener("click", () => {
  $("lbImg").src = f.querySelector("img").src; $("lbCap").textContent = f.querySelector("figcaption").textContent; lb.classList.add("show");
}));
lb.addEventListener("click", e => { if (e.target !== $("lbImg")) lb.classList.remove("show"); });
addEventListener("keydown", e => { if (e.key === "Escape") lb.classList.remove("show"); });

// 3D tilt on rate cards (mouse only)
document.querySelectorAll(".rate-card").forEach(c => {
  c.addEventListener("mousemove", e => {
    const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    c.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
  });
  c.addEventListener("mouseleave", () => c.style.transform = "");
});

// Gold value estimator (1 gram rate x weight)
function calc() {
  const g = parseFloat($("calcG").value);
  $("calcOut").textContent = last && g > 0 ? fmt(Math.round(g * last.g1)) : "—";
}
$("calcG").addEventListener("input", calc);
const _show = show; show = d => { _show(d); calc(); };

// Open / closed badge (India time, Mon–Sat 10:00–20:00)
function openNow() {
  const t = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const open = t.getDay() !== 0 && t.getHours() >= 10 && t.getHours() < 20;
  const b = $("openNow"); b.textContent = open ? "Open now" : "Closed now"; b.className = "openNow " + (open ? "open" : "closed");
}
openNow(); setInterval(openNow, 60000);
