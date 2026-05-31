// ============================================================
//  BioXape Dashboard — Config & Constants
//  FILE: js/config.js
//  Edit API_BASE to match your Render backend URL
// ============================================================

const CONFIG = {
  API_BASE:      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : 'https://bioxape-backend.onrender.com/api',
  BLOG_URL:      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '../index.html'
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
  'CRISPR & Gene Editing',
  'Biopharmaceuticals',
  'Synthetic Biology',
  'Genomics & Sequencing',
  'Agricultural Biotech',
  'Bioinformatics',
  'Clinical Trials',
  'Protein Engineering',
  'Microbiome',
  'Lab Tools & Reviews',
  'Regulatory',
  'Medical Biotech',
  'Industry News',
  'Interviews'
];

// ── API Helpers ──────────────────────────────────────────────

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
      window.location.href = '/index.html';
      return null;
    }
    return data;
  } catch (err) {
    console.error('API error:', endpoint, err.message);
    showToast('Network error. Please check your connection.', 'error');
    return null;
  }
}

// ── Auth Helpers ─────────────────────────────────────────────

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
    window.location.href = '/index.html';
    return false;
  }
  const role = getUserRole();
  if (![ROLES.ADMIN, ROLES.EDITOR, ROLES.AUTHOR].includes(role)) {
    console.warn("requireAuth: Invalid user role:", role);
    clearAuth();
    window.location.href = '/index.html';
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
  if (role === ROLES.ADMIN)  window.location.href = '/admin.html';
  else if (role === ROLES.EDITOR) window.location.href = '/editor.html';
  else if (role === ROLES.AUTHOR) window.location.href = '/author.html';
  else {
    console.warn("Unknown or invalid user role:", role);
    clearAuth();
    window.location.href = '/index.html';
  }
}

// ── UI Helpers ───────────────────────────────────────────────

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

// Fill sidebar user info
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

// Toast animation styles
const toastStyle = document.createElement('style');
toastStyle.textContent = `
  @keyframes slideIn  { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes slideOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(20px); } }
`;
document.head.appendChild(toastStyle);
