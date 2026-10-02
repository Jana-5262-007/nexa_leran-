require('dotenv').config();

const aiProvider = String(process.env.AI_PROVIDER || 'openrouter').trim().toLowerCase();
const openrouterApiKey = String(process.env.OPENROUTER_API_KEY || '').trim();
const openrouterBaseUrl = String(
  process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
).replace(/\/$/, '');
const openrouterModel = String(
  process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
).trim();
const corsOrigin = String(process.env.CORS_ORIGIN || '*').trim();
const port = parseInt(process.env.PORT, 10) || 5001;

// Treat the documented placeholder as an unconfigured key. Never log or expose
// the actual value of OPENROUTER_API_KEY.
const aiConfigured =
  aiProvider === 'openrouter' &&
  Boolean(openrouterApiKey) &&
  openrouterApiKey !== 'YOUR_NEW_KEY_HERE';

module.exports = {
  port,
  aiProvider,
  openrouterApiKey,
  openrouterBaseUrl,
  openrouterModel,
  corsOrigin,
  aiConfigured,
};
