// content.js — v3 final (message-driven, no top-level await)

// ---------- Utility ----------
function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
}

function getLabelText(input) {
  let label = '';
  if (input.id) {
    const l = document.querySelector('label[for="' + input.id + '"]');
    if (l) label = l.innerText;
  }
  if (!label && input.closest('label')) label = input.closest('label').innerText;
  if (!label) label = input.getAttribute('aria-label') || '';
  if (!label) label = input.getAttribute('placeholder') || '';
  if (!label) label = input.name || input.id || '';
  return normalize(label);
}

function matchFieldFuzzy(input, fieldKey, aliases) {
  const clues = [
    input.name, input.id, input.placeholder,
    input.getAttribute('aria-label'), getLabelText(input)
  ].filter(Boolean);

  const aliasList = aliases[fieldKey] || [];
  for (const clue of clues) {
    if (typeof window.fuzzyMatch === 'function') {
      const r = window.fuzzyMatch(clue, aliasList, 0.72);
      if (r && r.alias) return { matched: true, score: r.score, clue: clue, alias: r.alias };
    } else {
      for (const a of aliasList) {
        if (normalize(clue).includes(normalize(a))) {
          return { matched: true, score: 1, clue: clue, alias: a };
        }
      }
    }
  }
  return { matched: false, score: 0 };
}

async function fillInput(input, value) {
  if (!value) return false;
  if (input.type === 'file') return false;

  if (input.type === 'date' || /date/i.test(input.name || '') || /date/i.test(input.id || '')) {
    if (typeof window.setDateField === 'function') {
      const r = await window.setDateField(input, new Date(value));
      if (r.success) input.style.backgroundColor = '#d4edda';
      return r.success;
    }
  }

  if (input.tagName === 'SELECT') {
    const opts = Array.from(input.options);
    const match = opts.find(function (o) {
      return normalize(o.text).includes(normalize(value)) ||
             normalize(o.value) === normalize(value);
    });
    if (match) {
      input.value = match.value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.style.backgroundColor = '#d4edda';
      return true;
    }
    return false;
  }

  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.style.backgroundColor = '#d4edda';
  return true;
}

function buildFieldSelector(input) {
  if (input.id) return '#' + CSS.escape(input.id);
  if (input.name) return '[name="' + CSS.escape(input.name) + '"]';
  return null;
}

let autoLearnAttached = false;

function attachAutoLearn() {
  if (autoLearnAttached) return;
  autoLearnAttached = true;

  document.addEventListener('change', async function (e) {
    const input = e.target;
    if (!input || !input.matches('input, select, textarea')) return;
    if (!input.dataset.egramFilled && input.value) {
      const sel = buildFieldSelector(input);
      if (!sel) return;
      const hostname = location.hostname;
      const data = await chrome.storage.local.get('learnedMappings');
      const learnedMappings = data.learnedMappings || {};
      learnedMappings[hostname] = learnedMappings[hostname] || {};
      const label = getLabelText(input);
      if (label) {
        learnedMappings[hostname][sel] = { label: label, value: input.value, ts: Date.now() };
        await chrome.storage.local.set({ learnedMappings: learnedMappings });
      }
    }
  }, true);

  const observer = new MutationObserver(function () {
    document.querySelectorAll('input[style*="d4edda"], select[style*="d4edda"]').forEach(function (el) {
      el.dataset.egramFilled = '1';
    });
  });
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style'] });
}

async function applyLearnedMappings(profile) {
  const hostname = location.hostname;
  const data = await chrome.storage.local.get('learnedMappings');
  const learnedMappings = data.learnedMappings || {};
  const siteMap = learnedMappings[hostname] || {};
  const fields = profile.fields || {};
  const keys = Object.keys(fields);

  for (const sel in siteMap) {
    if (!Object.prototype.hasOwnProperty.call(siteMap, sel)) continue;
    const info = siteMap[sel];
    const el = document.querySelector(sel);
    if (!el) continue;
    for (const key of keys) {
      const aliasList = [key].concat(window.FIELD_ALIASES && window.FIELD_ALIASES[key] ? window.FIELD_ALIASES[key] : []);
      const r = (typeof window.fuzzyMatch === 'function')
        ? window.fuzzyMatch(info.label, aliasList, 0.72)
        : { alias: null };
      if (r.alias && fields[key]) {
        await fillInput(el, fields[key]);
        break;
      }
    }
  }
}

// ---------- Main fill ----------
async function fillVoucher(vendor, profile) {
  attachAutoLearn();
  await applyLearnedMappings(profile);

  const fields = Object.assign({}, profile.fields || {}, vendor || {});
  const aliases = window.FIELD_ALIASES || {};
  const filled = [];
  const missed = [];

  const inputs = document.querySelectorAll(
    'input:not([type=hidden]):not([type=file]):not([type=submit]):not([type=button]), select, textarea'
  );

  for (const input of inputs) {
    if (input.disabled || input.readOnly) continue;
    let matchedKey = null;
    for (const key of Object.keys(fields)) {
      const r = matchFieldFuzzy(input, key, aliases);
      if (r.matched) { matchedKey = key; break; }
    }
    if (matchedKey) {
      const ok = await fillInput(input, fields[matchedKey]);
      if (ok) filled.push(matchedKey);
      else {
        missed.push(matchedKey);
        input.style.backgroundColor = '#fff3cd';
      }
    }
  }

  return { success: filled.length > 0, filled: filled, missed: missed };
}

// ---------- Message listener (only entry point) ----------
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === 'fillSingle') {
    (async function () {
      try {
        const result = await fillVoucher({}, msg.profile);
        sendResponse(result);
      } catch (err) {
        sendResponse({ success: false, error: err.message, filled: [], missed: [] });
      }
    })();
    return true;
  }

  if (msg.action === 'fillVoucher') {
    (async function () {
      try {
        const data = await chrome.storage.local.get(['profiles']);
        const profile = (data.profiles || []).find(function (p) { return p.id === msg.profileId; }) || {};
        const result = await fillVoucher(msg.vendor, profile);
        sendResponse(result);
      } catch (err) {
        sendResponse({ success: false, error: err.message, filled: [], missed: [] });
      }
    })();
    return true;
  }

  return true;
});