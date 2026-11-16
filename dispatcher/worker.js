// Cloudflare Worker (free tier): triggers the "Update gold rate" GitHub workflow on time.
// GitHub's own `schedule:` is best-effort and often late/skipped; an API dispatch starts within seconds.
// Cron triggers are in wrangler.toml. Secret needed: GITHUB_TOKEN (see README.md).
const REPO = "pearl-jewellers/pearl-jewellers.github.io";
const WORKFLOW = "update-rates.yml";

async function dispatch(env) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "pearl-rate-dispatcher",
    },
    body: JSON.stringify({ ref: "main" }),
  });
  if (res.status !== 204) throw new Error(`dispatch failed: ${res.status} ${await res.text()}`);
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(dispatch(env));
  },
  // Visiting the worker URL does nothing, so it can't be abused to spam runs.
  async fetch() {
    return new Response("ok");
  },
};
