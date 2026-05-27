// ============================================================
//  BioXape Dashboard — notifications.js
//  Bell icon, unread count, dropdown, polling
// ============================================================

let notifPollTimer = null;

// ── Fetch unread count and update bell ──────────────────────
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

// ── Fetch and render notifications dropdown ─────────────────
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

// ── Mark single notification as read ────────────────────────
async function markRead(id, el) {
  await apiCall(`/notify/${id}/read`, 'PUT');
  el.classList.remove('unread');
  el.querySelector('.notif-dot')?.classList.add('read');
  fetchUnreadCount();
}

// ── Mark all as read ─────────────────────────────────────────
async function markAllRead() {
  await apiCall('/notify/read-all', 'PUT');
  document.querySelectorAll('.notif-item').forEach(el => {
    el.classList.remove('unread');
    el.querySelector('.notif-dot')?.classList.add('read');
  });
  const badge = document.getElementById('notif-count');
  if (badge) badge.classList.add('hidden');
}

// ── Toggle dropdown ──────────────────────────────────────────
function toggleNotifDropdown() {
  const dropdown = document.getElementById('notif-dropdown');
  if (!dropdown) return;
  const isOpen = dropdown.classList.toggle('open');
  if (isOpen) {
    fetchNotifications();
    fetchUnreadCount();
  }
}

// ── Start polling ────────────────────────────────────────────
function startNotifPolling() {
  fetchUnreadCount();
  notifPollTimer = setInterval(fetchUnreadCount, CONFIG.POLL_INTERVAL);
}

function stopNotifPolling() {
  if (notifPollTimer) clearInterval(notifPollTimer);
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) return;

  const bell = document.getElementById('notif-bell');
  if (bell) bell.addEventListener('click', toggleNotifDropdown);

  const readAllBtn = document.getElementById('notif-read-all');
  if (readAllBtn) readAllBtn.addEventListener('click', markAllRead);

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    const dropdown = document.getElementById('notif-dropdown');
    const bell = document.getElementById('notif-bell');
    if (dropdown?.classList.contains('open') &&
        !dropdown.contains(e.target) &&
        !bell?.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  });

  startNotifPolling();
});
