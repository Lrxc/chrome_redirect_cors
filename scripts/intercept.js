// intercept.js — MAIN world
// 拦截 fetch/XHR，根据规则的 cors 设置决定：
//   cors=true  → 通过 background service worker 代理（绕过 CORS/PNA）
//   cors=false → 直接修改请求 URL（不代理）

let matchers = [];
let nextId = 0;
const pending = new Map();

// 匹配规则，返回 { url, cors } 或 null
function match(url) {
    for (const m of matchers) {
        if (m.test(url)) return { url: m.rewrite(url), cors: m.cors };
    }
    return null;
}

function toPlainHeaders(h) {
    if (!h) return {};
    if (h instanceof Headers) { const o = {}; h.forEach((v, k) => o[k] = v); return o; }
    return typeof h === 'object' ? { ...h } : {};
}

async function toText(body) {
    if (body == null) return null;
    if (typeof body === 'string') return body;
    try { return await new Response(body).text(); } catch { return null; }
}

function logReq(tag, method, url, headers, body) {
    console.groupCollapsed(`[Redirect] ➡️ ${tag}${method} ${url}`);
    console.log('Headers:', headers);
    if (body) { try { console.log('Body:', JSON.parse(body)); } catch { console.log('Body:', body); } }
    console.groupEnd();
}

function logResp(tag, method, url, resp, ms) {
    if (resp.error) {
        console.error(`[Redirect] ❌ ${tag}${method} ${url} — ${resp.error} (${ms}ms)`);
    } else {
        console.groupCollapsed(`[Redirect] ✅ ${tag}${method} ${url} — ${resp.status} (${ms}ms)`);
        try { console.log('Response:', JSON.parse(resp.body)); } catch { console.log('Response:', resp.body); }
        console.groupEnd();
    }
}

function sendProxy(id, url, method, headers, body) {
    window.postMessage({ type: '__redir_req__', id, url, method, headers, body }, '*');
}

// 接收代理响应
window.addEventListener('message', e => {
    if (e.data?.type !== '__redir_resp__') return;
    const cb = pending.get(e.data.id);
    if (cb) { pending.delete(e.data.id); cb(e.data); }
});

// ============================== fetch ==============================
const _fetch = window.fetch;
window.fetch = async function (input, init = {}) {
    const rawUrl = input instanceof Request ? input.url : String(input);
    // 确保 URL 是绝对路径（相对路径转为绝对）
    const url = new URL(rawUrl, location.href).href;
    const hit = match(url);
    if (!hit) return _fetch.call(this, input, init);

    const { url: to, cors } = hit;
    const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

    // 不走代理：直接改 URL
    if (!cors) {
        console.log(`[Redirect] ${method} ${url} → ${to}`);
        return _fetch.call(this, input instanceof Request ? new Request(to, input) : to, init);
    }

    // 走代理
    const id = ++nextId;
    const headers = toPlainHeaders(init.headers || (input instanceof Request ? input.headers : null));
    let rawBody = init.body ?? null;
    if (!rawBody && input instanceof Request && !['GET', 'HEAD'].includes(method)) {
        try { rawBody = await input.clone().text(); } catch { rawBody = null; }
    }
    const body = await toText(rawBody);
    const t0 = performance.now();

    logReq('', method, to, headers, body);

    return new Promise((resolve, reject) => {
        pending.set(id, resp => {
            logResp('', method, to, resp, (performance.now() - t0).toFixed(0));
            if (resp.error) return reject(new TypeError('Network request failed: ' + resp.error));
            resolve(new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: resp.headers || {} }));
        });
        sendProxy(id, to, method, headers, body);
    });
};

// ============================== XHR ==============================
const _open = XMLHttpRequest.prototype.open;
const _send = XMLHttpRequest.prototype.send;
const _setHeader = XMLHttpRequest.prototype.setRequestHeader;

XMLHttpRequest.prototype.open = function (method, url, async, user, pass) {
    const absUrl = new URL(String(url), location.href).href;
    const hit = match(absUrl);
    if (hit) {
        this.__redir = { url: hit.url, cors: hit.cors, method: method.toUpperCase(), headers: {} };
        if (!hit.cors) {
            // 不走代理：直接用新 URL 调用原始 open
            _open.call(this, method, hit.url, async, user, pass);
        }
    } else {
        this.__redir = null;
        _open.call(this, method, url, async, user, pass);
    }
};

XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
    (this.__redir?.cors) ? (this.__redir.headers[k] = v) : _setHeader.call(this, k, v);
};

XMLHttpRequest.prototype.send = function (body) {
    if (!this.__redir) return _send.call(this, body);

    const { url, cors, method, headers } = this.__redir;

    // 不走代理：直接发送（URL 已在 open 中修改）
    if (!cors) {
        console.log(`[Redirect] XHR ${method} → ${url}`);
        return _send.call(this, body);
    }

    // 走代理
    const id = ++nextId;
    const xhr = this;
    const rtype = xhr.responseType || 'text';
    const b = typeof body === 'string' ? body : null;
    const t0 = performance.now();

    logReq('XHR ', method, url, headers, b);

    pending.set(id, resp => {
        const ms = (performance.now() - t0).toFixed(0);
        const ok = !resp.error;
        logResp('XHR ', method, url, resp, ms);

        let parsed = ok ? (resp.body ?? '') : '';
        if (ok && rtype === 'json') { try { parsed = JSON.parse(resp.body); } catch { parsed = null; } }

        const defs = { readyState: 4, status: ok ? resp.status : 0, statusText: ok ? (resp.statusText || '') : '', responseText: ok ? (resp.body ?? '') : '', response: ok ? parsed : '' };
        for (const [k, v] of Object.entries(defs)) Object.defineProperty(xhr, k, { value: v, configurable: true });

        if (ok && resp.headers) {
            xhr.getAllResponseHeaders = () => Object.entries(resp.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n');
            xhr.getResponseHeader = n => resp.headers[n.toLowerCase()] ?? null;
        }

        xhr.dispatchEvent(new Event('readystatechange'));
        xhr.dispatchEvent(new ProgressEvent(ok ? 'load' : 'error'));
        xhr.dispatchEvent(new ProgressEvent('loadend'));
    });

    sendProxy(id, url, method, headers, b);
};

// ============================== 初始化 ==============================
window.addEventListener('__redirect_init__', e => {
    matchers = JSON.parse(e.detail).map(r => {
        const re = r.isRegex ? new RegExp(r.from) : null;
        return {
            cors: r.cors !== false,
            test: url => re ? re.test(url) : url.startsWith(r.from),
            rewrite: url => re ? url.replace(re, r.to) : r.to + url.slice(r.from.length)
        };
    });
    const corsCount = matchers.filter(m => m.cors).length;
    console.log(`[Redirect] 已加载 ${matchers.length} 条规则（${corsCount} 条启用 CORS 代理）`);
}, { once: true });
