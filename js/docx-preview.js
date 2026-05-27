// ============================================================
//  BioXape Dashboard — docx-preview.js
//  Converts .docx files to HTML preview using Mammoth.js
//  Mammoth CDN loaded in HTML: https://unpkg.com/mammoth/mammoth.browser.min.js
// ============================================================

// ── Convert local .docx File object to HTML ─────────────────
async function previewDocxFile(file, targetEl) {
  if (!file || !targetEl) return;
  if (!file.name.endsWith('.docx')) {
    targetEl.innerHTML = `<div class="alert alert-error">Only .docx files are supported.</div>`;
    return;
  }

  targetEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:24px;color:#7a9e8c;">
    <div class="spinner"></div><span>Converting document...</span></div>`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    if (result.messages.length) {
      console.warn('Mammoth warnings:', result.messages);
    }

    const wordCount = (result.value.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
    const readTime  = Math.max(1, Math.ceil(wordCount / 200));

    targetEl.innerHTML = `
      <div class="docx-preview-wrap">
        <div class="docx-preview-toolbar">
          <span>📄 ${file.name}</span>
          <span>${wordCount.toLocaleString()} words · ~${readTime} min read</span>
        </div>
        <div class="docx-preview-body">${result.value}</div>
      </div>`;

    // Return metadata for saving
    return { html: result.value, wordCount, readTime };
  } catch (err) {
    console.error('Mammoth error:', err);
    targetEl.innerHTML = `<div class="alert alert-error">
      Failed to preview document: ${err.message}. 
      Please make sure this is a valid .docx file.</div>`;
    return null;
  }
}

// ── Convert .docx from URL (already uploaded to Cloudinary) ─
async function previewDocxUrl(url, targetEl) {
  if (!url || !targetEl) return;
  targetEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:24px;color:#7a9e8c;">
    <div class="spinner"></div><span>Loading document preview...</span></div>`;
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    const wordCount = (result.value.replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;
    const readTime  = Math.max(1, Math.ceil(wordCount / 200));

    targetEl.innerHTML = `
      <div class="docx-preview-wrap">
        <div class="docx-preview-toolbar">
          <span>📄 Document Preview</span>
          <span>${wordCount.toLocaleString()} words · ~${readTime} min read</span>
        </div>
        <div class="docx-preview-body">${result.value}</div>
      </div>`;

    return { html: result.value, wordCount, readTime };
  } catch (err) {
    targetEl.innerHTML = `<div class="alert alert-error">
      Could not load document preview. <a href="${url}" target="_blank">Download file instead</a></div>`;
    return null;
  }
}

// ── Drag & Drop Upload Zone ──────────────────────────────────
function initUploadZone(zoneId, inputId, previewId, onFileSelected) {
  const zone    = document.getElementById(zoneId);
  const input   = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('dragover');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelected(file, zone, preview, onFileSelected);
  });

  input.addEventListener('change', () => {
    const file = input.files[0];
    if (file) handleFileSelected(file, zone, preview, onFileSelected);
  });
}

async function handleFileSelected(file, zone, previewEl, callback) {
  if (!file.name.endsWith('.docx')) {
    showToast('Please upload a .docx file only', 'error');
    return;
  }
  if (file.size > 20 * 1024 * 1024) {
    showToast('File size must be under 20MB', 'error');
    return;
  }

  zone.innerHTML = `
    <div class="upload-zone-icon">📄</div>
    <div class="upload-zone-text" style="font-weight:600;color:#27a363">${file.name}</div>
    <div class="upload-zone-hint">${(file.size / 1024 / 1024).toFixed(2)} MB · Click to change</div>`;

  if (previewEl) {
    const meta = await previewDocxFile(file, previewEl);
    if (callback) callback(file, meta);
  } else {
    if (callback) callback(file, null);
  }
}
