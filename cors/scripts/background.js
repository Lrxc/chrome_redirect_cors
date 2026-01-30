// CORS Proxy - Background Service Worker

let enabled = false;

// 初始化
chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);

async function init() {
  const data = await chrome.storage.local.get('corsEnabled');
  enabled = data.corsEnabled || false;
  updateIcon();
}

// 消息处理
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.action === 'getConfig') {
    respond({ enabled });
  } else if (msg.action === 'setEnabled') {
    enabled = msg.enabled;
    chrome.storage.local.set({ corsEnabled: enabled });
    updateIcon();
    respond({ success: true });
  } else if (msg.action === 'proxyRequest') {
    proxyRequest(msg).then(respond);
    return true;
  }
});

// 代理请求
async function proxyRequest({ url, method = 'GET', headers = {}, body }) {
  try {
    const opts = { method, headers, mode: 'cors', credentials: 'omit' };
    if (body && !['GET', 'HEAD'].includes(method)) opts.body = body;

    const res = await fetch(url, opts);
    const resHeaders = {};
    res.headers.forEach((v, k) => resHeaders[k] = v);

    const type = res.headers.get('content-type') || '';
    let resBody;
    if (type.includes('json') || type.includes('text')) {
      resBody = await res.text();
    } else {
      resBody = btoa(String.fromCharCode(...new Uint8Array(await res.arrayBuffer())));
      resHeaders['x-binary'] = 'true';
    }

    return { ok: res.ok, status: res.status, statusText: res.statusText, headers: resHeaders, body: resBody };
  } catch (e) {
    return { error: e.message, ok: false, status: 0, statusText: 'Network Error' };
  }
}

async function updateIcon() {
  const color = enabled ? '#4CAF50' : '#9E9E9E';
  const imageData = {};

  for (const size of [16, 32, 48, 128]) {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');

    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.2);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = 'white';
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = ctx.lineJoin = 'round';

    const p = size * 0.25, m = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(p, m);
    ctx.lineTo(size - p, m);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(m, p);
    ctx.lineTo(m, size - p);
    ctx.stroke();

    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  await chrome.action.setIcon({ imageData });
}
