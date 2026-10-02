const config = require('../config');
const { httpError } = require('../utils/httpError');

const REQUEST_TIMEOUT_MS = 45000;

function providerError(status, code, message) {
  const err = httpError(status, message, code);
  err.provider = 'openrouter';
  return err;
}

/**
 * Existing AI service entry point retained for route/controller compatibility.
 * The implementation now proxies requests to OpenRouter instead of Ollama.
 */
async function callOpenAI({ system, messages, maxTokens = 1024, temperature }) {
  if (config.aiProvider !== 'openrouter') {
    throw providerError(
      503,
      'AI_PROVIDER_UNSUPPORTED',
      'The configured AI provider is not supported. Set AI_PROVIDER=openrouter.'
    );
  }

  if (!config.aiConfigured) {
    throw providerError(
      503,
      'AI_NOT_CONFIGURED',
      'AI service is not configured. Add a valid OPENROUTER_API_KEY to the backend environment.'
    );
  }

  const inputMessages = [
    {
      role: 'system',
      content: typeof system === 'string' ? system : '',
    },
    ...(Array.isArray(messages) ? messages : []).map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: typeof m.content === 'string' ? m.content : String(m.content ?? ''),
    })),
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let response;

    try {
      response = await fetch(`${config.openrouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.openrouterApiKey}`,
        },
        body: JSON.stringify({
          model: config.openrouterModel,
          messages: inputMessages,
          ...(Number.isFinite(maxTokens) ? { max_tokens: maxTokens } : {}),
          ...(Number.isFinite(temperature) ? { temperature } : {}),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err?.name === 'AbortError') {
        throw providerError(
          504,
          'AI_TIMEOUT',
          'The AI service took too long to respond. Please try again.'
        );
      }

      console.error('[OpenRouter NETWORK ERROR]', err?.name || 'network_error');
      throw providerError(
        502,
        'AI_NETWORK_ERROR',
        'Could not reach the AI service. Please try again.'
      );
    }

    let data = null;
    try {
      data = await response.json();
    } catch {
      if (!response.ok) {
        throw providerError(
          response.status >= 500 ? 502 : response.status,
          response.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR',
          response.status === 429
            ? 'The AI service is rate-limited. Please try again shortly.'
            : 'The AI service returned an invalid error response.'
        );
      }

      throw providerError(
        502,
        'AI_INVALID_RESPONSE',
        'The AI service returned an invalid response.'
      );
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.error('[OpenRouter AUTH ERROR]', response.status);
        throw providerError(
          502,
          'AI_AUTH_ERROR',
          'The AI service rejected the configured API key. Check OPENROUTER_API_KEY in the backend environment.'
        );
      }

      if (response.status === 429) {
        console.error('[OpenRouter RATE LIMIT]', response.status);
        throw providerError(
          429,
          'AI_RATE_LIMITED',
          'The AI service is rate-limited. Please try again shortly.'
        );
      }

      if (response.status === 400 || response.status === 404) {
        console.error('[OpenRouter MODEL ERROR]', response.status);
        throw providerError(
          502,
          'AI_MODEL_ERROR',
          'The configured AI model could not process this request. Check OPENROUTER_MODEL.'
        );
      }

      console.error('[OpenRouter API ERROR]', response.status);
      throw providerError(
        response.status >= 500 ? 502 : response.status,
        'AI_PROVIDER_ERROR',
        'The AI service returned an error. Please try again.'
      );
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      console.error('[OpenRouter INVALID RESPONSE] missing choices[0].message.content');
      throw providerError(
        502,
        'AI_INVALID_RESPONSE',
        'The AI service returned an unexpected response.'
      );
    }

    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  callOpenAI,
};
