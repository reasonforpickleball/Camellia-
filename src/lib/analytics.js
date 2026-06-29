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

export function initAmplitude() {
  const clientId = getOrCreateClientId();
  if (typeof window !== 'undefined' && window.amplitude && window.amplitude.getInstance) {
    const am = window.amplitude.getInstance();
    try {
      am.init(AMPLITUDE_API_KEY);
      am.setUserId(clientId);
      am.setUserProperties({ camellia_client_id: clientId });
    } catch (e) {
      // ignore init errors
      console.warn('Amplitude init failed', e);
    }
    return am;
  }
  // CDN may not have loaded yet; consumers should call initAmplitude again after load if needed
  return null;
}

export function trackAccountCreated(properties = {}) {
  const am = (typeof window !== 'undefined' && window.amplitude && window.amplitude.getInstance) ? window.amplitude.getInstance() : null;
  const eventProps = Object.assign({ onboarding: true }, properties);
  if (am) {
    try { am.logEvent('account_created', eventProps); } catch (e) { /* swallow */ }
  } else {
    // graceful fallback for environments without amplitude loaded
    console.log('[analytics:event] account_created', eventProps);
  }
}

export function trackClickedPayAndMaybeRedirect(redirectUrl) {
  const am = (typeof window !== 'undefined' && window.amplitude && window.amplitude.getInstance) ? window.amplitude.getInstance() : null;
  const eventProps = { onboarding_step: 'payment' };

  if (am) {
    let callbackCalled = false;
    const done = () => {
      if (callbackCalled) return;
      callbackCalled = true;
      if (redirectUrl) window.location.href = redirectUrl;
    };
    try {
      // amplitude.logEvent sometimes accepts a callback — best-effort
      am.logEvent('clicked_pay', eventProps, done);
      // safety fallback in case callback isn't invoked
      setTimeout(done, 1000);
    } catch (e) {
      try { am.logEvent('clicked_pay', eventProps); } catch (err) { }
      setTimeout(() => { if (redirectUrl) window.location.href = redirectUrl; }, 300);
    }
  } else {
    console.log('[analytics:event] clicked_pay', eventProps);
    if (redirectUrl) window.location.href = redirectUrl;
  }
}
