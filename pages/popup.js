document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('redirectToggle');
  const { enabled } = await chrome.runtime.sendMessage({ action: 'getConfig' });
  toggle.checked = enabled;
  toggle.onchange = () => chrome.runtime.sendMessage({ action: 'setEnabled', enabled: toggle.checked });
  document.getElementById('editBtn').onclick = () => chrome.runtime.openOptionsPage();
});
