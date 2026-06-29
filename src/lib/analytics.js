// src/lib/analytics.js
// Minimal Amplitude client instrumentation (no server required)
const AMPLITUDE_API_KEY = '5097ded1de8a5a5fa83776e7319f43dc';
const CLIENT_ID_KEY = 'camellia_client_id';

function getOrCreateClientId() {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('id_' + Math.random().toString(36).slice(2));
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch (e) {
    if (!window.__camellia_fallback_id) {
      window.__camellia_fallback_id = 'id_' + Math.random().toString(36).slice(2);
    }
    return window.__camellia_fallback_id;
  }
}

// Wait for window.amplitude to appear, polling up to `timeoutMs`.
function waitForAmplitude(timeoutMs = 5000, intervalMs = 200) {
  return new Promise(resolve => {
    const start = Date.now();
    const check = () => {
      if (typeof window !== 'undefined' && window.amplitude && window.amplitude.getInstance) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(check, intervalMs);
    };
    check();
  });
}

// If CDN loads after app init, keep retrying in background and init when available.
function backgroundRetryInit(retryMs = 2000, maxRetries = 15) {
  let attempts = 0;
  const id = setInterval(() => {
    attempts += 1;
    if (typeof window !== 'undefined' && window.amplitude && window.amplitude.getInstance) {
      try { initAmplitude(); } catch (e) { console.warn('analytics background init failed', e); }
      clearInterval(id);
    } else if (attempts >= maxRetries) {
      clearInterval(id);
      console.warn('analytics: Amplitude SDK not found after background retries');
    }
  }, retryMs);
}

export async function initAmplitude() {
  const clientId = getOrCreateClientId();

  const ready = await waitForAmplitude(5000, 200);
  if (!ready) {
    console.warn('analytics: Amplitude SDK not found immediately; will retry in background');
    // Start background retries but don't block app startup
    backgroundRetryInit();
    return null;
  }

  try {
    const am = window.amplitude.getInstance();
    am.init(AMPLITUDE_API_KEY);
    am.setUserId(clientId);
    am.setUserProperties({ camellia_client_id: clientId });
    console.info('analytics: Amplitude initialized (clientId:', clientId, ')');
    return am;
  } catch (e) {
    console.warn('analytics: Amplitude init failed', e);
    return null;
  }
}

export function trackAccountCreated(properties = {}) {
  try {
    const am = (typeof window !== 'undefined' && window.amplitude && window.amplitude.getInstance) ? window.amplitude.getInstance() : null;
    const eventProps = Object.assign({ onboarding: true }, properties);
    console.debug('analytics: trackAccountCreated', eventProps);
    if (am) {
      am.logEvent('account_created', eventProps);
      console.debug('analytics: account_created logged to Amplitude');
    } else {
      console.debug('analytics: amplitude unavailable — event queued in console', eventProps);
    }
  } catch (e) {
    console.warn('analytics: trackAccountCreated error', e);
  }
}

export function trackClickedPayAndMaybeRedirect(redirectUrl) {
  try {
    const am = (typeof window !== 'undefined' && window.amplitude && window.amplitude.getInstance) ? window.amplitude.getInstance() : null;
    const eventProps = { onboarding_step: 'payment' };
    console.debug('analytics: trackClickedPay', eventProps);

    if (am) {
      let callbackCalled = false;
      const done = () => {
        if (callbackCalled) return;
        callbackCalled = true;
        console.debug('analytics: click event callback done — redirecting:', redirectUrl);
        if (redirectUrl) window.location.href = redirectUrl;
      };
      try {
        // amplitude.logEvent sometimes accepts a callback — best-effort
        am.logEvent('clicked_pay', eventProps, done);
        // safety fallback in case callback isn't invoked
        setTimeout(done, 1200);
        console.debug('analytics: clicked_pay logged to Amplitude');
      } catch (e) {
        try { am.logEvent('clicked_pay', eventProps); console.debug('analytics: clicked_pay fallback log'); } catch (err) { console.warn('analytics: clicked_pay final fallback failed', err); }
        setTimeout(() => { if (redirectUrl) window.location.href = redirectUrl; }, 300);
      }
    } else {
      console.debug('analytics: amplitude unavailable — clicked_pay event (console only)', eventProps);
      if (redirectUrl) window.location.href = redirectUrl;
    }
  } catch (e) {
    console.warn('analytics: trackClickedPay error', e);
    if (redirectUrl) window.location.href = redirectUrl;
  }
}
