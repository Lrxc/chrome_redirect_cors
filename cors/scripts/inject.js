// CORS Proxy - Content Script

(function() {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('scripts/proxy.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  const sendConfig = cfg => window.postMessage({ type: 'CORS_CONFIG', enabled: cfg?.enabled || false }, '*');

  const safeSendMessage = (msg, callback) => {
    try {
      chrome.runtime.sendMessage(msg, res => {
        if (chrome.runtime.lastError) return;
        callback?.(res);
      });
    } catch (e) {}
  };

  safeSendMessage({ action: 'getConfig' }, sendConfig);

  window.addEventListener('message', e => {
    if (e.source !== window) return;
    if (e.data?.type === 'CORS_GET_CONFIG') {
      safeSendMessage({ action: 'getConfig' }, sendConfig);
    }
    if (e.data?.type === 'CORS_REQUEST') {
      const { id, url, method, headers, body } = e.data;
      try {
        chrome.runtime.sendMessage({ action: 'proxyRequest', url, method, headers, body })
          .then(res => window.postMessage({ type: 'CORS_RESPONSE', id, response: res }, '*'))
          .catch(() => window.postMessage({ type: 'CORS_RESPONSE', id, response: { error: 'Extension context invalidated', ok: false, status: 0 } }, '*'));
      } catch (e) {
        window.postMessage({ type: 'CORS_RESPONSE', id, response: { error: 'Extension context invalidated', ok: false, status: 0 } }, '*');
      }
    }
  });

  try {
    chrome.runtime.onMessage.addListener(msg => {
      if (msg.action === 'configChanged') sendConfig({ enabled: msg.enabled });
    });
  } catch (e) {}
})();
