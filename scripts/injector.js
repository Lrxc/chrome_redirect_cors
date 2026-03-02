// injector.js — isolated world
// 传递规则给 MAIN world + 双向转发代理请求

(async () => {
    const cfg = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (!cfg?.enabled) return;

    const rules = (cfg.rules || []).filter(r => r.enabled !== false);
    if (!rules.length) return;

    window.dispatchEvent(new CustomEvent('__redirect_init__', { detail: JSON.stringify(rules) }));

    window.addEventListener('message', async e => {
        if (e.data?.type !== '__redir_req__') return;
        const { id, url, method, headers, body } = e.data;
        try {
            const resp = await chrome.runtime.sendMessage({ action: 'proxyRequest', url, method, headers, body });
            window.postMessage({ type: '__redir_resp__', id, ...resp }, '*');
        } catch (err) {
            window.postMessage({ type: '__redir_resp__', id, error: err.message }, '*');
        }
    });
})();
