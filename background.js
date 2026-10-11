// background.js

const activeTabs = new Set();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'getState') {
    sendResponse({ active: activeTabs.has(msg.tabId) });
    return true;
  }

  if (msg.action === 'setState') {
    if (msg.active) activeTabs.add(msg.tabId);
    else activeTabs.delete(msg.tabId);
    sendResponse({ active: msg.active });
    return true;
  }

  if (msg.action === 'startBatch') {
    startBatch(msg.vendors || [], msg.profileId, msg.concurrency || 1);
    sendResponse({ started: true });
    return true;
  }

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  activeTabs.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === 'loading') activeTabs.delete(tabId);
});

// ---------- Simple sequential batch runner ----------
async function startBatch(vendors, profileId, concurrency) {
  const data = await chrome.storage.local.get(['profiles']);
  const profile = (data.profiles || []).find(p => p.id === profileId);
  if (!profile) return;

  const queue = vendors.slice();
  const results = [];

  const runOne = async (vendor) => {
    let tab;
    try {
      tab = await chrome.tabs.create({
        url: 'https://egramswaraj.gov.in/',
        active: false
      });

      await waitForTab(tab.id);
      await new Promise(r => setTimeout(r, 1500));

      // Inject scripts on demand into this tab
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['aliases.js', 'fuzzy.js', 'datePicker.js', 'content.js']
      });

      const resp = await sendMessage(tab.id, {
        action: 'fillVoucher',
        vendor,
        profileId
      });

      results.push({
        vendor: vendor.vendorName || '',
        amount: vendor.amount || '',
        status: resp && resp.success ? 'filled' : 'failed',
        error: resp && resp.error ? resp.error : null,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      results.push({
        vendor: vendor.vendorName || '',
        status: 'failed',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      if (tab) setTimeout(() => chrome.tabs.remove(tab.id).catch(() => {}), 2000);
    }
  };

  for (const v of queue) {
    await runOne(v);
  }

  await chrome.storage.local.set({
    lastBatchResults: results,
    lastBatchTime: new Date().toISOString()
  });
}

function waitForTab(tabId) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function sendMessage(tabId, msg) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => {
      if (chrome.runtime.lastError) resolve({ success: false, error: chrome.runtime.lastError.message });
      else resolve(response || { success: false, error: 'No response' });
    });
  });
}