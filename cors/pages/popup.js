document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('toggle');
  const res = await chrome.runtime.sendMessage({ action: 'getConfig' });
  toggle.checked = res?.enabled || false;

  toggle.addEventListener('change', e => {
    chrome.runtime.sendMessage({ action: 'setEnabled', enabled: e.target.checked });
  });
});
