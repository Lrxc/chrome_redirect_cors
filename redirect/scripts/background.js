// Redirect - Background Service Worker

const RULE_START = 1000;
const RESOURCE_TYPES = ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'media', 'websocket', 'other'];

// 初始化
chrome.runtime.onInstalled.addListener(refresh);
chrome.runtime.onStartup.addListener(refresh);

// 加载配置
const getConfig = async () => {
  const d = await chrome.storage.local.get(['redirectEnabled', 'redirectRules']);
  return { enabled: d.redirectEnabled ?? false, rules: d.redirectRules ?? [] };
};

// 保存并刷新
const saveAndRefresh = async (enabled, rules) => {
  await chrome.storage.local.set({ redirectEnabled: enabled, redirectRules: rules });
  await refresh();
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
        if (rules[msg.index]) rules[msg.index].enabled = rules[msg.index].enabled === false;
        break;
      default:
        return respond({ success: false });
    }
    
    await saveAndRefresh(enabled, rules);
    respond({ success: true, rules });
  })();
  return true;
});

// 刷新规则和图标
async function refresh() {
  const { enabled, rules } = await getConfig();
  
  // 应用规则
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeIds = existing.filter(r => r.id >= RULE_START).map(r => r.id);
  const activeRules = enabled ? rules.filter(r => r.enabled !== false) : [];
  
  const addRules = activeRules.map((r, i) => ({
    id: RULE_START + i,
    priority: 1,
    action: { type: 'redirect', redirect: { regexSubstitution: r.isRegex ? r.to : r.to + '\\1' } },
    condition: { regexFilter: r.isRegex ? r.from : '^' + r.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(.*)', resourceTypes: RESOURCE_TYPES }
  }));
  
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: removeIds, addRules });
  
  // 更新图标
  await chrome.action.setBadgeText({ text: activeRules.length ? String(activeRules.length) : '' });
  await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
  
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
    const p = size * 0.25, a = size * 0.15;
    ctx.beginPath();
    ctx.moveTo(p, size / 2);
    ctx.lineTo(size - p, size / 2);
    ctx.moveTo(size - p - a, size / 2 - a);
    ctx.lineTo(size - p, size / 2);
    ctx.lineTo(size - p - a, size / 2 + a);
    ctx.stroke();
    imageData[size] = ctx.getImageData(0, 0, size, size);
  }
  await chrome.action.setIcon({ imageData });
}
