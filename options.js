// options.js

async function loadProfiles() {
  const data = await chrome.storage.local.get('profiles');
  const profiles = data.profiles || [];
  const container = document.getElementById('profiles');
  container.innerHTML = '';

  profiles.forEach(function (p, i) {
    const div = document.createElement('div');
    div.className = 'profile';
    div.innerHTML =
      '<label>Profile Name <input class="name" type="text" value="' + escapeHtml(p.name || '') + '"></label>' +
      '<label>Role <input class="role" type="text" value="' + escapeHtml(p.role || 'Maker') + '"></label>' +
      '<label>Username <input class="user" type="text" value="' + escapeHtml(p.username || '') + '"></label>' +
      '<label>Password <input class="pass" type="password" value=""></label>' +
      '<label>Fields (JSON) <textarea class="fields" rows="8">' + escapeHtml(JSON.stringify(p.fields || {}, null, 2)) + '</textarea></label>' +
      '<button class="save">Save</button> ' +
      '<button class="delete">Delete</button>' +
      '<hr>';
    container.appendChild(div);

    div.querySelector('.save').onclick = async function () {
      const d = await chrome.storage.local.get('profiles');
      const all = d.profiles || [];
      try {
        all[i] = Object.assign({}, all[i], {
          name: div.querySelector('.name').value,
          role: div.querySelector('.role').value,
          username: div.querySelector('.user').value,
          fields: JSON.parse(div.querySelector('.fields').value)
        });
      } catch (e) {
        alert('Invalid JSON in Fields: ' + e.message);
        return;
      }
      const pw = div.querySelector('.pass').value;
      if (pw) all[i].encryptedPassword = await encrypt(pw);
      await chrome.storage.local.set({ profiles: all });
      alert('Saved.');
    };

    div.querySelector('.delete').onclick = async function () {
      const d = await chrome.storage.local.get('profiles');
      const all = d.profiles || [];
      all.splice(i, 1);
      await chrome.storage.local.set({ profiles: all });
      loadProfiles();
    };
  });
}

document.getElementById('addProfile').onclick = async function () {
  const d = await chrome.storage.local.get('profiles');
  const all = d.profiles || [];
  all.push({
    id: Date.now().toString(),
    name: 'New Profile',
    role: 'Maker',
    username: '',
    fields: {
      vendorName: '',
      amount: '',
      scheme: '',
      workName: '',
      billNo: '',
      voucherDate: new Date().toISOString().slice(0, 10)
    }
  });
  await chrome.storage.local.set({ profiles: all });
  loadProfiles();
};

// ---------- AES-256-GCM Encryption ----------
async function getKey() {
  const d = await chrome.storage.local.get('vaultSalt');
  let salt = d.vaultSalt;
  if (!salt) {
    salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
    await chrome.storage.local.set({ vaultSalt: salt });
  }
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('egram-master-key'),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: 250000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(plaintext) {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    new TextEncoder().encode(plaintext)
  );
  return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

loadProfiles();