const express = require('express');
const cors = require('cors');
const config = require('./src/config');
const aiRoutes = require('./src/routes/aiRoutes');
const authRoutes = require('./src/routes/authRoutes');
const controllerRoutes = require('./src/routes/controllerRoutes');
const { aiRateLimiter } = require('./src/middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '1mb' }));

// Health check reports only safe AI configuration metadata. Never expose the API key.
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    aiConfigured: config.aiConfigured,
    provider: config.aiProvider,
    model: config.openrouterModel,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/controller', controllerRoutes);
app.use('/api/ai', aiRateLimiter, aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Nexa Learn backend running on http://localhost:${config.port}`);
  if (!config.aiConfigured) {
    console.warn('⚠ OpenRouter AI is not configured — AI endpoints will return 503 until a valid OPENROUTER_API_KEY is provided.');
  }
});
