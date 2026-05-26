/* ============================================
   MetaKbab — script.js
   All processing is 100% local, in-browser.
   No data ever leaves the user's device.
   ============================================ */

'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  files: [],       // { id, file, thumb, metaTags, status: 'pending'|'processing'|'done', cleanedBlob }
  nextId: 1,
};

// ── DOM refs ───────────────────────────────────────────────────────────────
const html         = document.documentElement;
const themeToggle  = document.getElementById('themeToggle');
const uploadZone   = document.getElementById('uploadZone');
const fileInput    = document.getElementById('fileInput');
const browseBtn    = document.getElementById('browseBtn');
const optionsPanel = document.getElementById('optionsPanel');
const customFields = document.getElementById('customFields');
const photoQueue   = document.getElementById('photoQueue');
const photoGrid    = document.getElementById('photoGrid');
const queueCount   = document.getElementById('queueCount');
const clearAllBtn  = document.getElementById('clearAllBtn');
const actionBar    = document.getElementById('actionBar');
const actionSummary= document.getElementById('actionSummary');
const cleanBtn     = document.getElementById('cleanBtn');
const downloadBtn  = document.getElementById('downloadBtn');
const progressWrap = document.getElementById('progressWrap');
const progressBar  = document.getElementById('progressBar');
const progressLabel= document.getElementById('progressLabel');

// ── Theme ──────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('mkTheme');
  const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  html.setAttribute('data-theme', saved || preferred);
}

themeToggle.addEventListener('click', () => {
  const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('mkTheme', next);
});

// ── Drag & Drop ────────────────────────────────────────────────────────────
uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
['dragleave', 'dragend'].forEach(ev =>
  uploadZone.addEventListener(ev, () => uploadZone.classList.remove('drag-over'))
);
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  handleFiles([...e.dataTransfer.files]);
});
uploadZone.addEventListener('click', e => {
  if (e.target === browseBtn || browseBtn.contains(e.target)) return;
  fileInput.click();
});
browseBtn.addEventListener('click', e => {
  e.stopPropagation();
  fileInput.click();
});
fileInput.addEventListener('change', () => {
  handleFiles([...fileInput.files]);
  fileInput.value = '';
});

// ── File handling ──────────────────────────────────────────────────────────
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/tiff'];

function handleFiles(files) {
  const valid = files.filter(f => ALLOWED.includes(f.type));
  if (!valid.length) return;

  valid.forEach(file => {
    const id = state.nextId++;
    const entry = { id, file, thumb: null, metaTags: [], status: 'pending', cleanedBlob: null };
    state.files.push(entry);
    generateThumb(entry);
  });

  renderUI();
}

function generateThumb(entry) {
  const reader = new FileReader();
  reader.onload = e => {
    entry.thumb = e.target.result;
    detectMetaTags(entry);
    renderPhotoCard(entry);
  };
  reader.readAsDataURL(entry.file);
}

// Quick heuristic EXIF tag detection (no lib needed for display)
function detectMetaTags(entry) {
  const tags = [];
  const reader = new FileReader();
  reader.onload = e => {
    const arr = new Uint8Array(e.target.result);
    const str = String.fromCharCode(...arr.slice(0, 65535));

    if (str.includes('GPS') || str.includes('\x02\x00\x00\x00')) tags.push({ label: 'GPS', type: 'gps' });
    if (str.includes('Make') || str.includes('Model') || str.includes('Canon') ||
        str.includes('Nikon') || str.includes('Apple') || str.includes('Samsung'))
      tags.push({ label: 'Device', type: 'device' });
    if (str.includes('DateTime') || str.includes('Date'))
      tags.push({ label: 'Date', type: 'date' });
    if (str.includes('Software'))
      tags.push({ label: 'Software', type: 'device' });

    // JPEG EXIF marker
    if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF)
      entry.isJpeg = true;

    entry.metaTags = tags;
    renderPhotoCard(entry);
  };
  reader.readAsArrayBuffer(entry.file.slice(0, 65535));
}

// ── Render UI ──────────────────────────────────────────────────────────────
function renderUI() {
  const hasFiles = state.files.length > 0;
  optionsPanel.style.display = hasFiles ? 'block' : 'none';
  photoQueue.style.display   = hasFiles ? 'block' : 'none';
  actionBar.style.display    = hasFiles ? 'block' : 'none';
  queueCount.textContent     = state.files.length;

  const done  = state.files.filter(f => f.status === 'done').length;
  const total = state.files.length;
  actionSummary.textContent = done > 0
    ? `${done} of ${total} photos cleaned`
    : `${total} photo${total !== 1 ? 's' : ''} ready`;

  const allDone = done === total && total > 0;
  downloadBtn.style.display = allDone ? 'inline-flex' : 'none';
  cleanBtn.style.display    = allDone ? 'none' : 'inline-flex';
}

function renderPhotoCard(entry) {
  let card = document.getElementById(`card-${entry.id}`);
  if (!card) {
    card = document.createElement('div');
    card.className = 'photo-card';
    card.id = `card-${entry.id}`;
    photoGrid.appendChild(card);
  }

  const name = entry.file.name.length > 18
    ? entry.file.name.slice(0, 15) + '…'
    : entry.file.name;
  const size = formatBytes(entry.file.size);

  const statusIcon = entry.status === 'done' ? '✓'
    : entry.status === 'processing' ? '⟳' : '○';
  const statusClass = entry.status === 'done' ? 'done'
    : entry.status === 'processing' ? 'processing' : '';

  const tags = entry.metaTags.map(t =>
    `<span class="meta-tag ${t.type}">${t.label}</span>`
  ).join('');

  card.innerHTML = `
    <button class="photo-remove" data-id="${entry.id}" title="Remove">✕</button>
    <img class="photo-thumb" src="${entry.thumb || ''}" alt="${entry.file.name}" loading="lazy" />
    <div class="photo-status ${statusClass}">${statusIcon}</div>
    <div class="photo-info">
      <div class="photo-name" title="${entry.file.name}">${name}</div>
      <div class="photo-size">${size}</div>
    </div>
    ${tags ? `<div class="photo-meta-tags">${tags}</div>` : ''}
  `;

  card.querySelector('.photo-remove').addEventListener('click', () => removeFile(entry.id));
}

function removeFile(id) {
  state.files = state.files.filter(f => f.id !== id);
  const card = document.getElementById(`card-${id}`);
  if (card) card.remove();
  renderUI();
}

clearAllBtn.addEventListener('click', () => {
  state.files = [];
  photoGrid.innerHTML = '';
  renderUI();
});

// ── Mode selector ──────────────────────────────────────────────────────────
document.querySelectorAll('input[name="cleanMode"]').forEach(radio => {
  radio.addEventListener('change', () => {
    customFields.style.display = radio.value === 'custom' ? 'block' : 'none';
  });
});

function getMode() {
  return document.querySelector('input[name="cleanMode"]:checked')?.value || 'strip';
}

// ── Core: strip metadata via canvas ───────────────────────────────────────
function stripViaCanvas(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img  = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      }, outType, 0.95);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Fake random EXIF data injected as comment (harmless, shows intent) ─────
function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomLatLng() {
  return {
    lat: (Math.random() * 170 - 85).toFixed(6),
    lng: (Math.random() * 360 - 180).toFixed(6),
  };
}

function randomDate() {
  const d = new Date(Date.now() - Math.random() * 5 * 365 * 86400000);
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

const FAKE_MAKES  = ['Sony', 'Fujifilm', 'Nikon', 'Canon', 'Leica', 'Olympus', 'Pentax'];
const FAKE_MODELS = ['X-T5', 'Z6 III', 'EOS R6', 'A7 IV', 'M11', 'OM-5', 'K-3 III'];

// For "randomize" and "custom" modes we still strip via canvas (safest),
// then append a tiny JPEG comment block with the fake data.
// This is transparent to viewers but defeats forensic linking.

async function processFile(entry, mode) {
  const stripped = await stripViaCanvas(entry.file);

  if (mode === 'strip' || mode === 'keep') {
    // keep mode: canvas already drops GPS with everything else;
    // true selective keep would need a full EXIF parser — future feature
    return stripped;
  }

  if (mode === 'randomize') {
    const pos = randomLatLng();
    const meta = {
      Make: randomChoice(FAKE_MAKES),
      Model: randomChoice(FAKE_MODELS),
      DateTime: randomDate(),
      GPSLatitude: pos.lat,
      GPSLongitude: pos.lng,
      Software: 'MetaKbab',
    };
    return appendJpegComment(stripped, JSON.stringify(meta));
  }

  if (mode === 'custom') {
    const meta = {};
    const make  = document.getElementById('customMake').value.trim();
    const model = document.getElementById('customModel').value.trim();
    const artist= document.getElementById('customArtist').value.trim();
    const date  = document.getElementById('customDate').value;
    const lat   = document.getElementById('customLat').value.trim();
    const lng   = document.getElementById('customLng').value.trim();
    if (make)  meta.Make   = make;
    if (model) meta.Model  = model;
    if (artist)meta.Artist = artist;
    if (date)  meta.DateTime = date.replace('T', ' ');
    if (lat)   meta.GPSLatitude  = lat;
    if (lng)   meta.GPSLongitude = lng;
    meta.Software = 'MetaKbab';
    return appendJpegComment(stripped, JSON.stringify(meta));
  }

  return stripped;
}

// Append a JPEG COM (comment) segment — totally spec-compliant, harmless
function appendJpegComment(blob, comment) {
  return new Promise(resolve => {
    blob.arrayBuffer().then(buf => {
      const enc  = new TextEncoder().encode(comment);
      const len  = enc.length + 2; // 2 bytes length field
      const com  = new Uint8Array(4 + enc.length);
      com[0] = 0xFF; com[1] = 0xFE;           // COM marker
      com[2] = (len >> 8) & 0xFF;
      com[3] = len & 0xFF;
      com.set(enc, 4);

      // Insert after SOI (first 2 bytes FF D8)
      const src    = new Uint8Array(buf);
      const output = new Uint8Array(src.length + com.length);
      output.set(src.slice(0, 2), 0);
      output.set(com, 2);
      output.set(src.slice(2), 2 + com.length);

      resolve(new Blob([output], { type: 'image/jpeg' }));
    });
  });
}

// ── Clean all ──────────────────────────────────────────────────────────────
cleanBtn.addEventListener('click', async () => {
  const mode    = getMode();
  const pending = state.files.filter(f => f.status === 'pending');
  if (!pending.length) return;

  cleanBtn.disabled = true;
  progressWrap.style.display = 'block';

  let done = 0;
  for (const entry of pending) {
    entry.status = 'processing';
    renderPhotoCard(entry);

    try {
      entry.cleanedBlob = await processFile(entry, mode);
      entry.status = 'done';
    } catch (err) {
      console.error('Error processing', entry.file.name, err);
      entry.status = 'pending';
    }

    done++;
    const pct = Math.round((done / pending.length) * 100);
    progressBar.style.width  = pct + '%';
    progressLabel.textContent = pct + '%';
    renderPhotoCard(entry);
    renderUI();
  }

  cleanBtn.disabled = false;
  setTimeout(() => { progressWrap.style.display = 'none'; }, 800);
  renderUI();
});

// ── Download ZIP ───────────────────────────────────────────────────────────
downloadBtn.addEventListener('click', async () => {
  const cleaned = state.files.filter(f => f.status === 'done' && f.cleanedBlob);
  if (!cleaned.length) return;

  downloadBtn.disabled = true;
  downloadBtn.innerHTML = '<span class="btn-icon">⏳</span> Packing…';

  const zip = new JSZip();
  const folder = zip.folder('metakbab-cleaned');

  cleaned.forEach(entry => {
    const ext  = entry.file.type === 'image/png' ? '.png' : '.jpg';
    const base = entry.file.name.replace(/\.[^.]+$/, '');
    folder.file(`${base}_clean${ext}`, entry.cleanedBlob);
  });

  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const url = URL.createObjectURL(zipBlob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = 'metakbab-cleaned.zip';
  a.click();
  URL.revokeObjectURL(url);

  downloadBtn.disabled = false;
  downloadBtn.innerHTML = '<span class="btn-icon">⬇️</span> Download ZIP';
});

// ── Utils ──────────────────────────────────────────────────────────────────
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Init ───────────────────────────────────────────────────────────────────
initTheme();
