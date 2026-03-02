// injector.js — isolated world
// 传递规则给 MAIN world + 双向转发代理请求

(async () => {
    const cfg = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (!cfg?.enabled) return;

    const rules = (cfg.rules || []).filter(r => r.enabled !== false);
    if (!rules.length) return;

    // 传递规则给 MAIN world
    // 使用轮询确保 intercept.js 已注册监听器
    const detail = JSON.stringify(rules);
    const dispatch = () => window.dispatchEvent(new CustomEvent('__redirect_init__', { detail }));

    // 立即尝试 + 延迟重试，确保 MAIN world 能接收到
    dispatch();
    setTimeout(dispatch, 0);
    setTimeout(dispatch, 50);
    setTimeout(dispatch, 200);

    // 监听代理请求
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
