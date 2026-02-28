// 拦截 fetch/XHR，匹配规则 → 改 URL → 放行，请求头全部保留
// 运行在 MAIN world，拦截器立即生效，规则由 injector.js 通过事件传入

let matchers = [];

function match(url) {
    for (const m of matchers) if (m.test(url)) return m.rewrite(url);
    return null;
}

// 拦截 fetch
const _fetch = window.fetch;
window.fetch = function (input, init) {
    const url = input instanceof Request ? input.url : String(input);
    const to = match(url);
    if (!to) return _fetch.call(this, input, init);
    console.log('[Redirect]', url, '→', to);
    return _fetch.call(this, input instanceof Request ? new Request(to, input) : to, init);
};

// 拦截 XHR
const _open = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...args) {
    const to = match(String(url));
    if (!to) return _open.call(this, method, url, ...args);
    console.log('[Redirect]', url, '→', to);
    return _open.call(this, method, to, ...args);
};

// 接收规则（由 injector.js 从 isolated world 传入）
window.addEventListener('__redirect_init__', e => {
    const rules = JSON.parse(e.detail);
    matchers = rules.map(r => {
        const re = r.isRegex ? new RegExp(r.from) : null;
        return {
            test: url => re ? re.test(url) : url.startsWith(r.from),
            rewrite: url => re ? url.replace(re, r.to) : r.to + url.slice(r.from.length)
        };
    });
    console.log('[Redirect] 已加载', rules.length, '条规则');
}, { once: true });
