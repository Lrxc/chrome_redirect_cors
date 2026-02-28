// 获取规则配置，传递给 MAIN world 的 intercept.js
(async () => {
    const cfg = await chrome.runtime.sendMessage({ action: 'getConfig' });
    if (!cfg?.enabled) return;

    const rules = (cfg.rules || []).filter(r => r.enabled !== false);
    if (!rules.length) return;

    window.dispatchEvent(new CustomEvent('__redirect_init__', { detail: JSON.stringify(rules) }));
})();
