// CORS Proxy - 代理脚本

(function() {
  'use strict';

  let enabled = false;
  let configLoaded = false;
  let reqId = 0;
  const pending = new Map();
  const waiting = [];

  const waitConfig = () => new Promise(r => configLoaded ? r() : waiting.push(r));

  // 是否需要代理（跨域请求）
  const shouldProxy = url => {
    if (!enabled) return false;
    try { return new URL(url).origin !== location.origin; } catch { return false; }
  };

  // 消息监听
  window.addEventListener('message', e => {
    if (e.source !== window || !e.data) return;

    if (e.data.type === 'CORS_CONFIG') {
      enabled = e.data.enabled;
      configLoaded = true;
      waiting.forEach(r => r());
      waiting.length = 0;
      console.log(`%c[CORS] ${enabled ? '已启用' : '已禁用'}`, enabled ? 'color:#4CAF50;font-weight:bold' : 'color:#9E9E9E');
    }

    if (e.data.type === 'CORS_RESPONSE') {
      const p = pending.get(e.data.id);
      if (p) { p.resolve(e.data.response); pending.delete(e.data.id); }
    }
  });

  window.postMessage({ type: 'CORS_GET_CONFIG' }, '*');

  // 代理请求
  const proxy = (url, method, headers, body) => new Promise((resolve, reject) => {
    const id = ++reqId;
    pending.set(id, { resolve, reject });
    setTimeout(() => pending.has(id) && (pending.delete(id), reject(new Error('Timeout'))), 60000);
    window.postMessage({ type: 'CORS_REQUEST', id, url, method, headers, body }, '*');
  });

  const b64ToBuffer = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;

  const log = (type, method, url, extra = '') => {
    const color = type === 'req' ? '#FF9800' : '#4CAF50';
    console.log(`%c[CORS] %c${method} %c${url}${extra}`, 'color:#2196F3;font-weight:bold', `color:${color};font-weight:bold`, 'color:#333');
  };

  // 覆盖 fetch
  const _fetch = window.fetch;
  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : input.url;
    if (!configLoaded) await waitConfig();
    if (!shouldProxy(url)) return _fetch.call(window, input, init);

    const method = init.method || 'GET';
    const headers = {};
    if (init.headers) {
      init.headers instanceof Headers ? init.headers.forEach((v, k) => headers[k] = v) : Object.assign(headers, init.headers);
    }
    const body = init.body ? (typeof init.body === 'string' ? init.body : JSON.stringify(init.body)) : null;

    log('req', method, url);
    const res = await proxy(url, method, headers, body);
    if (res.error && !res.status) throw new Error(res.error);
    log('res', method, url, ` ${res.status}`);

    const resBody = res.headers?.['x-binary'] === 'true' ? b64ToBuffer(res.body) : res.body;
    const response = new Response(resBody, { status: res.status, statusText: res.statusText, headers: res.headers });
    Object.defineProperty(response, 'url', { value: url });
    return response;
  };

  // 覆盖 XMLHttpRequest
  const _XHR = window.XMLHttpRequest;
  window.XMLHttpRequest = class extends _XHR {
    constructor() { super(); this._p = { headers: {}, url: '', method: 'GET', async: true }; }
    open(method, url, async = true) { Object.assign(this._p, { method, url, async, headers: {} }); }
    setRequestHeader(k, v) { this._p.headers[k] = v; }

    send(body) {
      (async () => {
        if (!configLoaded) await waitConfig();
        const { method, url, headers, async: isAsync } = this._p;

        if (!shouldProxy(url)) {
          super.open(method, url, isAsync);
          Object.entries(headers).forEach(([k, v]) => super.setRequestHeader(k, v));
          super.send(body);
          return;
        }

        log('req', method, url);

        try {
          const res = await proxy(url, method, headers, body);
          if (res.error && !res.status) { this.dispatchEvent(new Event('error')); this.dispatchEvent(new Event('loadend')); return; }

          log('res', method, url, ` ${res.status}`);
          const data = res.headers?.['x-binary'] === 'true' ? b64ToBuffer(res.body) : res.body;

          Object.defineProperties(this, {
            status: { value: res.status }, statusText: { value: res.statusText },
            responseURL: { value: url }, response: { value: data },
            responseText: { value: typeof data === 'string' ? data : '' }, readyState: { value: 4 }
          });

          this.dispatchEvent(new Event('readystatechange'));
          this.dispatchEvent(new Event('load'));
          this.dispatchEvent(new Event('loadend'));
        } catch { this.dispatchEvent(new Event('error')); this.dispatchEvent(new Event('loadend')); }
      })();
    }
  };

  console.log('%c[CORS Proxy] 已加载', 'color:#2196F3');
})();
