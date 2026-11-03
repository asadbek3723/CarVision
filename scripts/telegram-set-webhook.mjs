// One-time: register the Telegram webhook. Usage:
//   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/telegram-set-webhook.mjs https://your-domain.com
// Reads secrets from the environment only; nothing is stored in the repo.
const base = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!base || !token || !secret) {
  console.error('Usage: TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... node scripts/telegram-set-webhook.mjs https://domain');
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    url: `${base.replace(/\/$/, '')}/api/v1/webhooks/telegram`,
    secret_token: secret,
    allowed_updates: ['callback_query'],
    drop_pending_updates: true,
  }),
});
const json = await res.json();
console.log(json.ok ? 'Webhook set.' : `Failed: ${json.description}`);
process.exit(json.ok ? 0 : 1);
