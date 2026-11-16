# Rate dispatcher (Cloudflare Worker)

Triggers the "Update gold rate" workflow every hour, 9:00 am - 8:00 pm IST.

## One-time setup
1. GitHub -> Settings -> Developer settings -> Personal access tokens -> Fine-grained tokens -> Generate.
   - Repository access: only `pearl-jewellers.github.io`
   - Permissions: **Actions: Read and write**
   - Set a long expiry and note the date; renew before it expires.
2. In this folder:
   ```
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN     # paste the token
   npx wrangler deploy
   ```
3. Cloudflare dashboard -> Workers -> pearl-rate-dispatcher -> Triggers: confirm the cron shows.

The `schedule:` in `.github/workflows/update-rates.yml` stays as a backup.
