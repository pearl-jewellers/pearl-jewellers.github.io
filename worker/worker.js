// Cloudflare Worker (free tier)
//   GET /          -> live gold rate from pearl.webbyz.com
//   GET /reviews   -> 5-star Google reviews (needs secret GOOGLE_API_KEY, see README-SETUP.md)
const H = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=30",
};
const json = (o, status = 200, h = H) => new Response(JSON.stringify(o), { status, headers: h });

async function rates() {
  const res = await fetch("https://pearl.webbyz.com/", { cf: { cacheTtl: 30 } });
  const html = await res.text();
  const num = re => { const m = html.match(re); return m ? Number(m[1].replace(/,/g, "")) : null; };
  const g1 = num(/1 Gram<\/p>\s*<span[^>]*>\s*₹\s*([\d,]+)/);
  const g8 = num(/8 Grams<\/p>\s*<span[^>]*>\s*₹\s*([\d,]+)/);
  const ch = html.match(/<b>\s*([↑↓][^<]*)<\/b>/);
  const dt = html.match(/Last Update\s*:\s*([\d-]+)/);
  if (!g1 || !g8) throw new Error("parse failed");
  return { g1, g8, change: ch ? ch[1].trim() : "", date: dt ? dt[1] : "" };
}

// Google Places API (New). Place is found once by text search near the shop, then cached.
async function reviews(env) {
  if (!env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY not set");
  const key = env.GOOGLE_API_KEY;
  let id = env.PLACE_ID || "ChIJ03SZagPrpzsR4Ogq6vB2X90"; // Pearl Jewellers place id
  if (!id) {
    const s = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": "places.id" },
      body: JSON.stringify({
        textQuery: "Pearl Jewellers Kechery",
        locationBias: { circle: { center: { latitude: 10.6191728, longitude: 76.1223088 }, radius: 500 } },
      }),
    }).then(r => r.json());
    id = s.places && s.places[0] && s.places[0].id;
    if (!id) throw new Error("place not found");
  }
  const p = await fetch(`https://places.googleapis.com/v1/places/${id}`, {
    headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "rating,userRatingCount,reviews" },
  }).then(r => r.json());
  return {
    rating: p.rating, total: p.userRatingCount,
    reviews: (p.reviews || []).map(r => ({
      rating: r.rating, time: r.publishTime || "",
      text: (r.text && r.text.text) || "",
      author: (r.authorAttribution && r.authorAttribution.displayName) || "Google user",
      when: r.relativePublishTimeDescription || "",
    })).filter(r => r.text),
  };
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    try {
      if (path.endsWith("/reviews")) return json(await reviews(env), 200, { ...H, "Cache-Control": "public, max-age=3600" });
      return json(await rates());
    } catch (e) {
      return json({ error: String(e) }, 502);
    }
  },
};
