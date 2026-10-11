// popup.js

let currentTab = null;
let isActive = false;
let profilesList = [];

document.addEventListener('DOMContentLoaded', async function () {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];

  if (!currentTab || !currentTab.url || currentTab.url.indexOf('egramswaraj.gov.in') === -1) {
    document.getElementById('notEgram').classList.remove('hidden');
    return;
  }

  document.getElementById('mainPanel').classList.remove('hidden');

  const state = await chrome.runtime.sendMessage({ action: 'getState', tabId: currentTab.id });
  isActive = state && state.active;
  renderToggle();

  document.getElementById('toggleBtn').onclick = async function () {
    isActive = !isActive;

    await chrome.runtime.sendMessage({
      action: 'setState',
      tabId: currentTab.id,
      active: isActive
    });

    if (isActive) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['aliases.js', 'fuzzy.js', 'datePicker.js', 'content.js']
        });
      } catch (e) {
        alert('Activation failed: ' + e.message);
        isActive = false;
        await chrome.runtime.sendMessage({
          action: 'setState',
          tabId: currentTab.id,
          active: false
        });
      }
    } else {
      chrome.tabs.reload(currentTab.id);
    }

    renderToggle();
  };

  const data = await chrome.storage.local.get(['profiles']);
  profilesList = data.profiles || [];
  const sel = document.getElementById('profileSelect');
  sel.innerHTML = '';
  profilesList.forEach(function (p) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = (p.role ? '[' + p.role + '] ' : '') + (p.name || 'Unnamed');
    sel.appendChild(o);
  });

  document.getElementById('openOptions').onclick = function () {
    chrome.runtime.openOptionsPage();
  };

  document.getElementById('fillBtn').onclick = function () {
    const profile = profilesList.find(function (p) { return p.id === sel.value; });
    if (!profile) return alert('Create a profile first.');

    chrome.tabs.sendMessage(currentTab.id, {
      action: 'fillSingle',
      profile: profile
    }, function (r) {
      if (chrome.runtime.lastError) {
        alert('Extension not active on this page. Toggle ON first.');
        return;
      }
      alert(r ? 'Filled: ' + r.filled.length + ', Missed: ' + r.missed.length : 'No response');
    });
  };

  document.getElementById('csvFile').onchange = async function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const vendors = parseCSV(text);
    await chrome.storage.local.set({ pendingVendors: vendors });
    document.getElementById('startBatch').disabled = false;
    document.getElementById('batchStatus').textContent = 'Loaded ' + vendors.length + ' vendors.';
  };

  document.getElementById('startBatch').onclick = async function () {
    const d = await chrome.storage.local.get('pendingVendors');
    const vendors = d.pendingVendors || [];
    if (!vendors.length) return;

    await chrome.runtime.sendMessage({
      action: 'startBatch',
      vendors: vendors,
      profileId: sel.value,
      concurrency: 1
    });
    document.getElementById('batchStatus').textContent = 'Batch started. See tabs opening.';
  };
});

function renderToggle() {
  const btn = document.getElementById('toggleBtn');
  const panel = document.getElementById('activePanel');
  if (isActive) {
    btn.textContent = 'ON';
    btn.className = 'toggle on';
    panel.classList.remove('hidden');
  } else {
    btn.textContent = 'OFF';
    btn.className = 'toggle off';
    panel.classList.add('hidden');
  }
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(function (h) { return h.trim(); });
  return lines.slice(1).map(function (line) {
    const vals = line.split(',').map(function (v) { return v.trim(); });
    const obj = {};
    headers.forEach(function (h, i) { obj[h] = vals[i] || ''; });
    return obj;
  });
}