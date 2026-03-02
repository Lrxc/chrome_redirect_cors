document.addEventListener('DOMContentLoaded', async () => {
  const $ = id => document.getElementById(id);
  const esc = t => t.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  let rules = [], editIdx = -1;
  const modal = $('addModal'), form = { type: $('matchType'), cors: $('corsEnabled'), name: $('ruleName'), from: $('fromUrl'), to: $('toUrl') };

  // 加载数据
  rules = (await chrome.runtime.sendMessage({ action: 'getConfig' })).rules || [];
  render();

  // 事件绑定
  $('openAddModal').onclick = () => openModal(-1);
  $('closeModal').onclick = $('cancelAdd').onclick = closeModal;
  $('addBtn').onclick = save;
  form.type.onchange = updateHint;
  form.to.addEventListener('keypress', e => { if (e.key === 'Enter') save(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
  });

  // 规则列表点击委托
  $('rulesList').onclick = async e => {
    const item = e.target.closest('.rule-item');
    if (!item) return;
    const i = +item.dataset.i, btn = e.target.closest('button');
    if (!btn) return;

    if (btn.classList.contains('toggle')) {
      const res = await chrome.runtime.sendMessage({ action: 'toggleRule', index: i });
      if (res?.success) { rules = res.rules; render(); }
    } else if (btn.classList.contains('edit')) {
      openModal(i);
    } else if (btn.classList.contains('del') && confirm('确定删除？')) {
      const res = await chrome.runtime.sendMessage({ action: 'deleteRule', index: i });
      if (res?.success) { rules = res.rules; render(); }
    }
  };

  function openModal(i) {
    editIdx = i;
    const r = i >= 0 ? rules[i] : null;
    $('modalTitle').textContent = r ? '✏️ 编辑规则' : '➕ 添加新规则';
    $('addBtn').textContent = r ? '保存' : '添加';
    form.type.checked = r?.isRegex || false;
    form.cors.checked = r?.cors !== false;
    form.name.value = r?.name || '';
    form.from.value = r?.from || '';
    form.to.value = r?.to || '';
    updateHint();
    modal.classList.add('show');
    form.name.focus();
  }

  function closeModal() {
    modal.classList.remove('show');
    form.name.value = form.from.value = form.to.value = '';
    form.type.checked = false;
    form.cors.checked = true;
  }

  function updateHint() {
    const isRegex = form.type.checked;
    form.from.placeholder = isRegex ? '正则: ^https://(.+)\\.example\\.com' : '前缀: https://api.example.com';
    form.to.placeholder = isRegex ? '目标: http://localhost/$1' : '目标: http://localhost:8080';
  }

  async function save() {
    const name = form.name.value.trim(), from = form.from.value.trim(), to = form.to.value.trim();
    if (!name || !from || !to) return alert('请填写完整信息');
    if (form.type.checked) try { new RegExp(from); } catch (e) { return alert('正则错误: ' + e.message); }

    const rule = { name, from, to, isRegex: form.type.checked, cors: form.cors.checked, enabled: editIdx >= 0 ? rules[editIdx].enabled : true };
    const res = await chrome.runtime.sendMessage({ action: 'saveRule', index: editIdx, rule });
    if (res?.success) { rules = res.rules; closeModal(); render(); }
  }

  function render() {
    $('ruleCount').textContent = rules.length;
    $('rulesList').innerHTML = rules.length ? rules.map((r, i) => {
      const on = r.enabled !== false;
      return `<div class="rule-item${on ? '' : ' disabled'}" data-i="${i}">
        <div class="rule-info">
          ${r.name ? `<span class="rule-name">${esc(r.name)}</span>` : ''}
          <span class="rule-type ${r.isRegex ? 'regex' : 'prefix'}">${r.isRegex ? '正则' : '前缀'}</span>
          ${r.cors !== false ? '<span class="rule-type" style="background:#e8f5e9;color:#2e7d32">CORS</span>' : '<span class="rule-type" style="background:#f5f5f5;color:#bbb">CORS</span>'}
          <span class="rule-from" title="${esc(r.from)}">${esc(r.from)}</span>
          <span class="rule-arrow">→</span>
          <span class="rule-to" title="${esc(r.to)}">${esc(r.to)}</span>
        </div>
        <div class="rule-actions">
          <button class="btn-icon ${on ? 'btn-warning' : 'btn-success'} toggle" title="${on ? '禁用' : '启用'}">${on ? '⏸' : '▶'}</button>
          <button class="btn-icon btn-secondary edit" title="编辑">✏️</button>
          <button class="btn-icon btn-danger del" title="删除">🗑️</button>
        </div>
      </div>`;
    }).join('') : '<div class="empty-state"><div class="icon">📭</div><p>暂无重定向规则</p></div>';
  }
});
