// ============================================================
//  BioXape Dashboard — Central Core Script (dashboard-core.js)
//  Integrates: config.js, auth.js, notifications.js, and docx-preview.js
// ============================================================

// ── 1. CONFIG & CONSTANTS ────────────────────────────────────
const CONFIG = {
  API_BASE:      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || !window.location.hostname
    ? 'http://localhost:5000/api' 
    : 'https://bioxape-backend.onrender.com/api',
  BLOG_URL:      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:' || !window.location.hostname
    ? 'index.html'
    : 'https://www.bioxape.com',
  DASHBOARD_URL: window.location.origin,
  GOOGLE_CLIENT_ID: '775909460532-rnu253qk8csj4kjfmeb95ghf3cfhjje0.apps.googleusercontent.com',
  RAZORPAY_KEY:  '',   // filled in by backend /api/subscribe/create response
  TOKEN_KEY:     'bioxape_token',
  USER_KEY:      'bioxape_user',
  POLL_INTERVAL: 30000  // 30 seconds — notification polling interval
};

const ROLES = { ADMIN: 'admin', EDITOR: 'editor', AUTHOR: 'author' };

const POST_STATUS = {
  DRAFT:          'draft',
  SUBMITTED:      'submitted',
  EDITOR_REVIEW:  'editor_review',
  CHANGES_NEEDED: 'changes_needed',
  ADMIN_REVIEW:   'admin_review',
  APPROVED:       'approved',
  PUBLISHED:      'published',
  REJECTED:       'rejected'
};

const STATUS_LABELS = {
  draft:          'Draft',
  submitted:      'Submitted',
  editor_review:  'Editor Review',
  changes_needed: 'Changes Needed',
  admin_review:   'Admin Review',
  approved:       'Approved',
  published:      'Published',
  rejected:       'Rejected'
};

const CONTENT_TYPES = [
  { value: 'article',          label: 'Article / Blog Post' },
  { value: 'research_summary', label: 'Research Paper Summary' },
  { value: 'product_review',   label: 'Product Review' },
  { value: 'interview',        label: 'Expert Interview' },
  { value: 'news',             label: 'News & Industry Update' }
];

const CATEGORIES = [
  'Genomics & Gene Editing',
  'Biopharmaceuticals & Drug Discovery',
  'Bioinformatics',
  'Synthetic Biology & Protein Engineering',
  'Industrial Biotechnology',
  'Agricultural Biotechnology',
  'Clinical Trials & Industry News'
];

// ── 2. API & AUTH HELPERS ────────────────────────────────────
async function apiCall(endpoint, method = 'GET', body = null, isFormData = false) {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY);
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  try {
    const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, opts);
    const data = await res.json();
    if (res.status === 401) {
      clearAuth();
      window.location.href = 'login.html';
      return null;
    }
    return data;
  } catch (err) {
    console.error('API error:', endpoint, err.message);
    showToast('Network error. Please check your connection.', 'error');
    return null;
  }
}

function getToken()    { return localStorage.getItem(CONFIG.TOKEN_KEY); }
function getUser()     {
  try {
    const u = localStorage.getItem(CONFIG.USER_KEY);
    return u ? JSON.parse(u) : null;
  } catch (e) {
    console.warn("Invalid user object in localStorage, clearing auth.");
    clearAuth();
    return null;
  }
}
function setAuth(token, user) {
  localStorage.setItem(CONFIG.TOKEN_KEY, token);
  localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(user));
}
function clearAuth() {
  localStorage.removeItem(CONFIG.TOKEN_KEY);
  localStorage.removeItem(CONFIG.USER_KEY);
}
function isLoggedIn()  { return !!getToken() && !!getUser(); }
function getUserRole() { const u = getUser(); return u ? u.role : null; }

function requireAuth(requiredRole = null) {
  if (!isLoggedIn()) {
    clearAuth();
    window.location.href = 'login.html';
    return false;
  }
  const role = getUserRole();
  if (![ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR].includes(role)) {
    console.warn("requireAuth: Invalid user role:", role);
    clearAuth();
    window.location.href = 'login.html';
    return false;
  }
  if (requiredRole && role !== requiredRole && role !== ROLES.ADMIN) {
    redirectByRole();
    return false;
  }
  return true;
}

function redirectByRole() {
  const role = getUserRole();
  if (role === ROLES.ADMIN)  window.location.href = 'admin.html';
  else if (role === ROLES.EDITOR) window.location.href = 'editor.html';
  else if (role === ROLES.AUTHOR) window.location.href = 'author.html';
  else {
    console.warn("Unknown or invalid user role:", role);
    clearAuth();
    window.location.href = 'login.html';
  }
}

// ── 3. AUTHENTICATION & LOGIN PROCESS ────────────────────────
function initGoogleAuth() {
  if (!window.google) return;
  google.accounts.id.initialize({
    client_id: CONFIG.GOOGLE_CLIENT_ID,
    callback: handleGoogleResponse,
    auto_select: false,
    cancel_on_tap_outside: true
  });
  const btnEl = document.getElementById('google-signin-btn');
  if (btnEl) {
    google.accounts.id.renderButton(btnEl, {
      theme: 'outline', size: 'large', width: 400,
      text: 'signin_with', shape: 'rectangular'
    });
  }
}

async function handleGoogleResponse(response) {
  showPageLoader('Signing you in...');
  const result = await apiCall('/auth/google', 'POST', { credential: response.credential });
  hidePageLoader();
  if (!result || !result.success) {
    showToast(result?.message || 'Google sign-in failed', 'error');
    return;
  }
  setAuth(result.token, result.user);
  showToast(`Welcome, ${result.user.name}!`, 'success');
  setTimeout(redirectByRole, 800);
}

async function handleEmailLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn      = document.getElementById('login-btn');

  if (!email || !password) { showToast('Please enter email and password', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Signing in...';

  const result = await apiCall('/auth/login', 'POST', { email, password });

  btn.disabled = false;
  btn.textContent = 'Sign In';

  if (!result || !result.success) {
    showToast(result?.message || 'Login failed', 'error');
    return;
  }
  setAuth(result.token, result.user);
  showToast(`Welcome back, ${result.user.name}!`, 'success');
  setTimeout(redirectByRole, 800);
}

async function logout() {
  await apiCall('/auth/logout', 'POST');
  clearAuth();
  window.location.href = 'login.html';
}

async function handleChangePassword(e) {
  e.preventDefault();
  const current  = document.getElementById('current-password').value;
  const newPass  = document.getElementById('new-password').value;
  const confirm  = document.getElementById('confirm-password').value;

  if (newPass !== confirm) { showToast('Passwords do not match', 'error'); return; }
  if (newPass.length < 8)  { showToast('Password must be at least 8 characters', 'error'); return; }

  const result = await apiCall('/auth/change-password', 'PUT', { currentPassword: current, newPassword: newPass });
  if (result?.success) {
    showToast('Password changed successfully', 'success');
    e.target.reset();
  } else {
    showToast(result?.message || 'Failed to change password', 'error');
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const formData = new FormData();
  formData.append('name',  document.getElementById('profile-name').value);
  formData.append('phone', document.getElementById('profile-phone').value);
  formData.append('bio',   document.getElementById('profile-bio').value);

  const twitterVal     = document.getElementById('profile-twitter');
  const linkedinVal    = document.getElementById('profile-linkedin');
  const researchgateVal= document.getElementById('profile-researchgate');

  if (twitterVal)      formData.append('twitter',      twitterVal.value);
  if (linkedinVal)     formData.append('linkedin',     linkedinVal.value);
  if (researchgateVal) formData.append('researchgate', researchgateVal.value);

  const photoFile = document.getElementById('profile-photo')?.files[0];
  if (photoFile) formData.append('photo', photoFile);

  const result = await apiCall('/auth/update-profile', 'PUT', formData, true);
  if (result?.success) {
    setAuth(getToken(), result.user);
    showToast('Profile updated successfully', 'success');
    fillSidebarUser();
  } else {
    showToast(result?.message || 'Failed to update profile', 'error');
  }
}

// ── 4. NOTIFICATIONS POLLING & EVENTS ────────────────────────
let notifPollTimer = null;

async function fetchUnreadCount() {
  const result = await apiCall('/notify/unread-count');
  if (!result?.success) return;
  const badge = document.getElementById('notif-count');
  if (!badge) return;
  if (result.count > 0) {
    badge.textContent = result.count > 99 ? '99+' : result.count;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function fetchNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  list.innerHTML = `<div class="notif-empty"><div class="spinner" style="margin:0 auto"></div></div>`;

  const result = await apiCall('/notify');
  if (!result?.success) {
    list.innerHTML = `<div class="notif-empty">Failed to load notifications</div>`;
    return;
  }

  if (!result.data.length) {
    list.innerHTML = `<div class="notif-empty">🔔 No notifications yet</div>`;
    return;
  }

  list.innerHTML = result.data.map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}"
         onclick="markRead('${n._id}', this)"
         data-post="${n.postId || ''}">
      <div class="notif-dot ${n.read ? 'read' : ''}"></div>
      <div>
        <div class="notif-item-msg">${n.message}</div>
        <div class="notif-item-time">${timeAgo(n.createdAt)}</div>
      </div>
    </div>`).join('');
}

async function markRead(id, el) {
  await apiCall(`/notify/${id}/read`, 'PUT');
  el.classList.remove('unread');
  el.querySelector('.notif-dot')?.classList.add('read');
  fetchUnreadCount();
}

async function markAllRead() {
  await apiCall('/notify/read-all', 'PUT');
  document.querySelectorAll('.notif-item').forEach(el => {
    el.classList.remove('unread');
    el.querySelector('.notif-dot')?.classList.add('read');
  });
  const badge = document.getElementById('notif-count');
  if (badge) badge.classList.add('hidden');
}

function toggleNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;
  const isOpen = dropdown.classList.toggle('open');
  if (isOpen) {
    fetchNotifications();
    fetchUnreadCount();
  } else {
    markAllRead();
  }
}

function startNotifPolling() {
  fetchUnreadCount();
  notifPollTimer = setInterval(fetchUnreadCount, CONFIG.POLL_INTERVAL);
}

function stopNotifPolling() {
  if (notifPollTimer) clearInterval(notifPollTimer);
}

// ── 5. MAMMOTH.JS DOCX UTILITIES ──────────────────────────────
async function previewDocxFile(file, targetEl) {
  if (!file || !targetEl) return;
  if (!file.name.endsWith('.docx')) {
    targetEl.innerHTML = `<div class="alert alert-error">Only .docx files are supported.</div>`;
    return;
  }

  targetEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:24px;color:#7a9e8c;">
    <div class="spinner"></div><span>Converting document...</span></div>`;

  try {
    if (typeof mammoth === 'undefined') {
      throw new Error('Mammoth.js library is not loaded. Please verify your internet connection or check if CDN is blocked.');
    }
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

    return { html: result.value, wordCount, readTime };
  } catch (err) {
    console.error('Mammoth error:', err);
    targetEl.innerHTML = `<div class="alert alert-error">
      Failed to preview document: ${err.message}. 
      Please make sure this is a valid .docx file.</div>`;
    return null;
  }
}

async function previewDocxUrl(url, targetEl) {
  if (!url || !targetEl) return;
  targetEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;padding:24px;color:#7a9e8c;">
    <div class="spinner"></div><span>Loading document preview...</span></div>`;
  try {
    if (typeof mammoth === 'undefined') {
      throw new Error('Mammoth.js library is not loaded. Please verify your internet connection or check if CDN is blocked.');
    }
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

// ── 6. DYNAMIC UI FORMATTERS & HELPERS ───────────────────────
function showToast(message, type = 'success', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
  }
  const colors = {
    success: '#27a363', error: '#dc2626', info: '#2563eb', warning: '#d97706'
  };
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const toast = document.createElement('div');
  toast.style.cssText = `display:flex;align-items:center;gap:10px;padding:12px 18px;
    background:${colors[type]};color:#fff;border-radius:10px;font-size:13.5px;
    font-weight:500;box-shadow:0 4px 16px rgba(0,0,0,.15);
    animation:slideIn .25s ease;max-width:340px;`;
  toast.innerHTML = `<span style="font-weight:700">${icons[type]}</span>${message}`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOut .25s ease'; setTimeout(() => toast.remove(), 250); }, duration);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return formatDate(dateStr);
}

function statusBadge(status) {
  const cls = 'badge badge-' + status.replace('_', '-');
  return `<span class="${cls}">${STATUS_LABELS[status] || status}</span>`;
}

function roleBadge(role) {
  return `<span class="badge badge-${role}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function showPageLoader(message = 'Loading...') {
  const loader = document.getElementById('page-loader');
  const msg = document.getElementById('loader-msg');
  if (msg) msg.textContent = message;
  if (loader) {
    loader.classList.remove('d-none');
    loader.style.display = 'flex';
  }
}

function hidePageLoader() {
  const loader = document.getElementById('page-loader');
  if (loader) {
    loader.classList.add('d-none');
    loader.style.display = 'none';
  }
}

function setInnerLoading(el, text = 'Loading...') {
  if (!el) return;
  el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;padding:40px;gap:12px;color:#7a9e8c;">
    <div class="spinner"></div><span>${text}</span></div>`;
}

function emptyState(icon, title, text, btnHtml = '') {
  return `<div class="empty-state">
    <div class="empty-state-icon">${icon}</div>
    <div class="empty-state-title">${title}</div>
    <div class="empty-state-text">${text}</div>
    ${btnHtml ? `<div style="margin-top:18px">${btnHtml}</div>` : ''}
  </div>`;
}

function fillSidebarUser() {
  const user = getUser();
  if (!user) return;
  const av  = document.getElementById('sidebar-user-av');
  const nm  = document.getElementById('sidebar-user-name');
  const em  = document.getElementById('sidebar-user-email');
  const rb  = document.getElementById('sidebar-role-badge');
  if (av) {
    if (user.photoUrl) {
      av.innerHTML = `<img src="${user.photoUrl}" alt="${user.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover"/>`;
      av.style.background = 'none';
    } else {
      av.textContent = initials(user.name);
    }
  }
  if (nm) nm.textContent = user.name || 'User';
  if (em) em.textContent = user.email || '';
  if (rb) {
    const roleStr = user.role || '';
    rb.textContent = roleStr.toUpperCase();
    rb.className = roleStr ? `sidebar-role-badge role-${roleStr}` : 'sidebar-role-badge';
  }
}

// ── 7. CENTRAL DOMContentLoaded SETUP ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Common elements setup
  const loginForm   = document.getElementById('login-form');
  const profileForm = document.getElementById('profile-form');
  const passForm    = document.getElementById('change-password-form');
  const logoutBtns  = document.querySelectorAll('.btn-logout');

  if (loginForm)   loginForm.addEventListener('submit', handleEmailLogin);
  if (profileForm) profileForm.addEventListener('submit', handleUpdateProfile);
  if (passForm)    passForm.addEventListener('submit', handleChangePassword);
  logoutBtns.forEach(btn => btn.addEventListener('click', logout));

  // Init Google auth if on login page
  if (document.getElementById('google-signin-btn')) {
    if (window.google) initGoogleAuth();
    else window.addEventListener('load', initGoogleAuth);
  }

  // Redirect if already logged in and on login page
  if (document.body.dataset.page === 'login' && isLoggedIn()) redirectByRole();

  // Notification listeners if logged in
  if (isLoggedIn()) {
    const bell = document.getElementById('notif-bell');
    if (bell) bell.addEventListener('click', toggleNotifDropdown);

    const readAllBtn = document.getElementById('notif-read-all');
    if (readAllBtn) readAllBtn.addEventListener('click', markAllRead);

    document.addEventListener('click', e => {
      const dropdown = document.getElementById('notif-dropdown');
      const bell = document.getElementById('notif-bell');
      if (dropdown?.classList.contains('open') &&
          !dropdown.contains(e.target) &&
          !bell?.contains(e.target)) {
        dropdown.classList.remove('open');
        markAllRead();
      }
    });

    startNotifPolling();
  }
});

// Toast CSS Injection
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideIn  { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes slideOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(20px); } }
`;
document.head.appendChild(toastStyle);
