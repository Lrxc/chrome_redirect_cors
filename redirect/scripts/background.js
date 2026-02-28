// Redirect - Background Service Worker

const getConfig = async () => {
  const d = await chrome.storage.local.get(['redirectEnabled', 'redirectRules']);
  return { enabled: d.redirectEnabled ?? false, rules: d.redirectRules ?? [] };
};

// 消息处理
chrome.runtime.onMessage.addListener((msg, _, respond) => {
  (async () => {
    let { enabled, rules } = await getConfig();

    switch (msg.action) {
      case 'getConfig':
        return respond({ enabled, rules });
      case 'setEnabled':
        enabled = msg.enabled;
        break;
      case 'saveRule':
        msg.index >= 0 ? (rules[msg.index] = msg.rule) : rules.push(msg.rule);
        break;
      case 'deleteRule':
        rules.splice(msg.index, 1);
        break;
      case 'toggleRule':
        if (rules[msg.index]) rules[msg.index].enabled = !rules[msg.index].enabled;
        break;
      default:
        return respond({ success: false });
    }

    await chrome.storage.local.set({ redirectEnabled: enabled, redirectRules: rules });
    refresh(enabled, rules);
    respond({ success: true, rules });
  })();
  return true;
});

// 刷新图标和角标
async function refresh(enabled, rules) {
  const count = enabled ? rules.filter(r => r.enabled !== false).length : 0;
  chrome.action.setBadgeText({ text: count ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });

  // 动态图标：绿色启用 / 灰色禁用
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
    ctx.lineWidth = size * 0.1;
    ctx.lineCap = ctx.lineJoin = 'round';
    const p = size * 0.25;
    const a = size * 0.15;

    ctx.beginPath();
    ctx.moveTo(p, size / 2);
    ctx.lineTo(size - p, size / 2);
    ctx.moveTo(size - p - a, size / 2 - a);
    ctx.lineTo(size - p, size / 2);
    ctx.lineTo(size - p - a, size / 2 + a);
    ctx.stroke();

    imageData[size] = ctx.getImageData(0, 0, size, size);
  }

  chrome.action.setIcon({ imageData });
}

// 初始化
const init = async () => {
  const { enabled, rules } = await getConfig();
  refresh(enabled, rules);
};

chrome.runtime.onInstalled.addListener(init);
chrome.runtime.onStartup.addListener(init);
