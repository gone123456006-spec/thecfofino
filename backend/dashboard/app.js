// ═══════════════════════════════════════════════════════════════════
//  Finovert Admin Dashboard — app.js
// ═══════════════════════════════════════════════════════════════════

// Always use the same backend that serves this dashboard
const API = window.location.origin + '/api';
let TOKEN = localStorage.getItem('finovert_token') || null;
let currentTab = 'overview';

// Auto-refresh so new call bookings appear without manual refresh (every 30s when on Overview or Call Bookings)
const AUTO_REFRESH_MS = 30000;
let autoRefreshTimer = null;

function startAutoRefresh() {
  if (autoRefreshTimer) return;
  autoRefreshTimer = setInterval(() => {
    if (!TOKEN) return;
    if (currentTab === 'overview') loadOverview();
    else if (currentTab === 'bookings') loadBookings();
  }, AUTO_REFRESH_MS);
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// ─── UTILS ─────────────────────────────────────────────────────────

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtMoney(n) {
  if (!n && n !== 0) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

function statusBadge(s) {
  const label = (s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return `<span class="badge badge-${s || 'pending'}">${label}</span>`;
}

function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3500);
}

const debounce = (fn, delay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
  const res = await fetch(API + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function openNotificationModal(userId) {
  document.getElementById('notification-modal-user-id').value = userId;
  document.getElementById('notification-modal-title').value = '';
  document.getElementById('notification-modal-body').value = '';
  const stepEl = document.getElementById('notification-modal-min-step');
  if (stepEl) stepEl.value = '';
  openModal('notification-modal');
}

async function submitNotificationToUser() {
  const userId = document.getElementById('notification-modal-user-id').value;
  const title = document.getElementById('notification-modal-title').value.trim();
  const body = document.getElementById('notification-modal-body').value.trim();

  if (!userId) return;
  if (!title) return showToast('Please enter a title.', 'error');
  if (!body) return showToast('Please enter a message.', 'error');

  try {
    const stepEl = document.getElementById('notification-modal-min-step');
    const minStepRaw = stepEl && stepEl.value !== '' ? stepEl.value : undefined;
    const payload = { userId, title, body };
    if (minStepRaw !== undefined) payload.minStepIndex = Number(minStepRaw);

    await apiFetch('/notifications/admin/send', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    closeModal('notification-modal');
    showToast('Notification sent to user.', 'success');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ─── CHAT (Admin <-> User) ─────────────────────────────────────────────

let chatPollTimer = null;
let currentChatUserId = null;
let lastSentChat = { userId: null, text: '', atMs: 0 };

function startChatPolling(userId) {
  if (chatPollTimer) clearInterval(chatPollTimer);
  currentChatUserId = userId;

  // Load immediately
  void loadChatMessages().catch(() => {});

  chatPollTimer = setInterval(() => {
    void loadChatMessages().catch(() => {});
  }, 5000);
}

function stopChatPolling() {
  if (chatPollTimer) {
    clearInterval(chatPollTimer);
    chatPollTimer = null;
  }
  currentChatUserId = null;
}

function closeChatModal() {
  stopChatPolling();
  closeModal('chat-modal');
}

async function loadChatMessages() {
  const userId = currentChatUserId;
  if (!userId) return;

  const box = document.getElementById('chat-modal-messages');
  if (!box) return;
  box.innerHTML = '<div class="loading-msg" style="margin-top: 20px;">Loading messages…</div>';

  try {
    const data = await apiFetch(`/messages/admin/user/${encodeURIComponent(userId)}`);
    const messages = data.messages || [];

    if (!messages.length) {
      box.innerHTML = '<div style="color:var(--text3);font-size:13px;padding:6px 2px;">No messages yet.</div>';
      return;
    }

    let didTick = false;
    box.innerHTML = messages
      .map((m) => {
        const isAdmin = m.fromRole === 'admin';
        const align = isAdmin ? 'flex-end' : 'flex-start';
        const bubbleBg = isAdmin ? 'rgba(59,130,246,0.12)' : 'rgba(16,185,129,0.10)';
        const bubbleBorder = isAdmin ? 'rgba(59,130,246,0.35)' : 'rgba(16,185,129,0.30)';
        const who = isAdmin ? 'Admin' : 'User';
        const text = String(m.text ?? '');

        const mText = text.trim();
        const msgTimeMs = Date.parse(String(m.time ?? ''));
        const shouldTick =
          isAdmin &&
          lastSentChat.userId === userId &&
          lastSentChat.text.trim() === mText &&
          !Number.isNaN(msgTimeMs) &&
          Date.now() - msgTimeMs < 15000;

        if (shouldTick) didTick = true;

        const tickHtml = shouldTick ? `<div class="chat-sent-tick"><i class="fa-solid fa-check"></i></div>` : '';

        return `
          <div style="display:flex;justify-content:${align};margin:8px 0;">
            <div style="max-width: 78%;background:${bubbleBg};border:1px solid ${bubbleBorder};padding:10px 12px;border-radius:14px;position:relative;">
              <div style="font-size:11px;color:var(--text3);margin-bottom:4px;">${who}</div>
              <div style="white-space:pre-wrap;word-break:break-word;font-size:13px;">${text}</div>
              ${tickHtml}
            </div>
          </div>
        `;
      })
      .join('');

    if (didTick) {
      lastSentChat = { userId: null, text: '', atMs: 0 };
    }
  } catch (err) {
    box.innerHTML = `<div class="loading-msg" style="color:var(--danger);margin-top:20px;">Error: ${err.message}</div>`;
  }
}

function openChatModal(userId) {
  currentChatUserId = userId;
  document.getElementById('chat-modal-user-id').value = userId;
  document.getElementById('chat-modal-text').value = '';
  openModal('chat-modal');
  startChatPolling(userId);
}

async function submitChatMessage() {
  const userId = document.getElementById('chat-modal-user-id').value;
  const text = document.getElementById('chat-modal-text').value.trim();
  if (!userId) return;
  if (!text) return showToast('Please type a message.', 'error');

  try {
    await apiFetch('/messages/admin/send', {
      method: 'POST',
      body: JSON.stringify({ userId, text }),
    });
    document.getElementById('chat-modal-text').value = '';
    lastSentChat = { userId, text, atMs: Date.now() };
    await loadChatMessages();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ─── TIME ──────────────────────────────────────────────────────────

function updateTime() {
  const el = document.getElementById('topbar-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateTime, 1000);
updateTime();

// ─── AUTH ──────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errEl = document.getElementById('login-error');
  document.getElementById('login-btn-text').classList.add('hidden');
  document.getElementById('login-btn-loader').classList.remove('hidden');
  btn.disabled = true;
  errEl.classList.add('hidden');
  try {
    const data = await apiFetch('/admin/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    TOKEN = data.token;
    localStorage.setItem('finovert_token', TOKEN);
    document.getElementById('sidebar-username').textContent = data.username || 'Admin';
    showApp();
  } catch (err) {
    errEl.textContent = err.message || 'Invalid credentials';
    errEl.classList.remove('hidden');
  } finally {
    document.getElementById('login-btn-text').classList.remove('hidden');
    document.getElementById('login-btn-loader').classList.add('hidden');
    btn.disabled = false;
  }
}

function handleLogout() {
  TOKEN = null;
  stopAutoRefresh();
  localStorage.removeItem('finovert_token');
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

async function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  await loadOverview();
  startAutoRefresh();
}

// ─── INIT ──────────────────────────────────────────────────────────

(async function init() {
  if (!TOKEN) return;
  try {
    const d = await apiFetch('/admin/verify');
    document.getElementById('sidebar-username').textContent = d.admin?.username || 'Admin';
    showApp();
  } catch {
    TOKEN = null;
    localStorage.removeItem('finovert_token');
  }
})();

// ─── TAB SWITCHING ─────────────────────────────────────────────────

const TAB_TITLES = {
  overview: 'Overview',
  registrations: 'Company Registrations',
  bookings: 'Call Bookings',
  customers: 'All Customers',
  appusers: 'App Users',
  'payment-settings': 'Razorpay · App fee',
};

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById('topbar-title').textContent = TAB_TITLES[tab] || tab;
  if (tab === 'overview') loadOverview();
  if (tab === 'registrations') loadRegistrations();
  if (tab === 'bookings') loadBookings();
  if (tab === 'customers') loadCustomers();
  if (tab === 'appusers') loadAppUsers();
  if (tab === 'payment-settings') loadRazorpayAppSettings();
}

function refreshCurrentTab() {
  switchTab(currentTab);
}

// ─── OVERVIEW ──────────────────────────────────────────────────────

async function loadOverview() {
  try {
    const [statsRes, regsRes, booksRes] = await Promise.all([
      apiFetch('/registrations/stats'),
      apiFetch('/registrations?limit=5'),
      apiFetch('/bookings?limit=5'),
    ]);
    const s = statsRes.stats;
    document.getElementById('stat-total-reg').textContent = s.total ?? '—';
    document.getElementById('stat-pending').textContent = s.pending ?? '—';
    document.getElementById('stat-completed').textContent = s.completed ?? '—';
    document.getElementById('stat-revenue').textContent = fmtMoney(s.totalRevenue);
    document.getElementById('stat-bookings').textContent = booksRes.total ?? '—';
    document.getElementById('stat-unpaid').textContent = s.unpaid ?? '—';

    // Update sidebar badges
    if (s.pending > 0) {
      const b = document.getElementById('nav-reg-badge');
      b.textContent = s.pending; b.classList.remove('hidden');
    }
    const bookBadge = document.getElementById('nav-book-badge');
    if (booksRes.total > 0) {
      bookBadge.textContent = booksRes.total;
      bookBadge.classList.remove('hidden');
    } else {
      bookBadge.classList.add('hidden');
    }

    // Recent registrations
    const regList = document.getElementById('recent-regs-list');
    regList.innerHTML = regsRes.registrations.length === 0
      ? '<div class="loading-msg">No registrations yet</div>'
      : regsRes.registrations.map(r => `
        <div class="recent-item" onclick="openRegModal('${r._id}')">
          <div class="recent-item-icon stat-blue" style="background:rgba(59,130,246,0.12);color:#3b82f6;font-size:13px">
            <i class="fa-solid fa-building"></i>
          </div>
          <div>
            <div class="recent-item-name">${r.proposedName1}</div>
            <div class="recent-item-sub">${r.caseId ? r.caseId + ' · ' : ''}${r.businessType} · ${r.companyEmail || r.companyMobile || ''}</div>
          </div>
          <div class="recent-item-right">
            ${statusBadge(r.status)}
            <div style="font-size:11px;color:var(--text3);margin-top:3px">${fmtDate(r.createdAt)}</div>
          </div>
        </div>`).join('');

    // Recent bookings
    const bookList = document.getElementById('recent-books-list');
    bookList.innerHTML = booksRes.bookings.length === 0
      ? '<div class="loading-msg">No bookings yet</div>'
      : booksRes.bookings.map(b => `
        <div class="recent-item" onclick="openStatusModal('${b._id}','booking')">
          <div class="recent-item-icon" style="background:rgba(20,184,166,0.12);color:#14b8a6;font-size:13px">
            <i class="fa-solid fa-phone"></i>
          </div>
          <div>
            <div class="recent-item-name">${b.name}</div>
            <div class="recent-item-sub">${b.mobile} · ${b.purpose}</div>
          </div>
          <div class="recent-item-right">
            ${statusBadge(b.status)}
            <div style="font-size:11px;color:var(--text3);margin-top:3px">${fmtDate(b.createdAt)}</div>
          </div>
        </div>`).join('');
  } catch (err) {
    showToast('Failed to load overview: ' + err.message, 'error');
  }
}

// ─── REGISTRATIONS ─────────────────────────────────────────────────

async function loadRegistrations() {
  const wrap = document.getElementById('reg-table-wrap');
  wrap.innerHTML = '<div class="loading-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading…</div>';
  try {
    const search = document.getElementById('reg-search')?.value || '';
    const status = document.getElementById('reg-filter-status')?.value || '';
    const payment = document.getElementById('reg-filter-payment')?.value || '';
    let q = '?';
    if (search) q += `search=${encodeURIComponent(search)}&`;
    if (status) q += `status=${status}&`;
    if (payment) q += `paymentStatus=${payment}&`;
    const data = await apiFetch('/registrations' + q);
    if (!data.registrations.length) {
      wrap.innerHTML = '<div class="loading-msg">No registrations found</div>'; return;
    }
    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Case ID</th>
            <th>Company Name</th>
            <th>Business Type</th>
            <th>Contact</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Amount</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.registrations.map(r => `
            <tr>
              <td><code style="font-size:11px;background:var(--bg3);padding:4px 6px;border-radius:4px">${r.caseId || '—'}</code></td>
              <td><strong>${r.proposedName1}</strong><br><span style="color:var(--text3);font-size:11px">${r.proposedName2 || ''}</span></td>
              <td>${r.businessType}</td>
              <td>${r.companyEmail || '—'}<br><span style="color:var(--text3)">${r.companyMobile || '—'}</span></td>
              <td>${statusBadge(r.status)}</td>
              <td>${statusBadge(r.paymentStatus)}</td>
              <td>${r.paymentAmount ? fmtMoney(r.paymentAmount) : '—'}</td>
              <td>${fmtDate(r.createdAt)}</td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-outline" onclick="openRegModal('${r._id}')"><i class="fa-solid fa-eye"></i> View</button>
                  <button class="btn btn-primary" onclick="openStatusModal('${r._id}','registration')"><i class="fa-solid fa-pen"></i></button>
                  <button class="btn btn-success" onclick="openPaymentModal('${r._id}')"><i class="fa-solid fa-indian-rupee-sign"></i></button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="padding:12px 16px;color:var(--text3);font-size:12px;border-top:1px solid var(--border)">
        Showing ${data.registrations.length} of ${data.total} records
      </div>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="loading-msg" style="color:var(--danger)">Error: ${err.message}</div>`;
  }
}

// ─── REGISTRATIONS DETAIL MODAL ────────────────────────────────────

function hasDoc(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.startsWith('data:');
}
function isPdfDataUrl(dataUrl) {
  return typeof dataUrl === 'string' && dataUrl.indexOf('application/pdf') !== -1;
}
function docImgHtml(regId, dirIndex, label, dataUrl, docType, downloadName) {
  if (!hasDoc(dataUrl)) return `<div class="detail-item"><div class="detail-label">${label}</div><div class="detail-value">—</div></div>`;
  const ext = isPdfDataUrl(dataUrl) ? 'pdf' : 'jpg';
  const safeName = (downloadName || 'file') + '.' + ext;
  const apiPath = '/registrations/' + regId + '/directors/' + dirIndex + '/' + docType;
  const imgPart = isPdfDataUrl(dataUrl) ? '' : `<img data-doc-src="${apiPath}" alt="${label}" class="doc-preview-img" />`;
  return `
    <div class="detail-item" style="grid-column:1/-1">
      <div class="detail-label">${label}</div>
      <div class="detail-value doc-preview-wrap">
        ${imgPart}
        <a href="#" data-doc-download="${apiPath}" data-doc-filename="${safeName}" class="btn btn-outline btn-download"><i class="fa-solid fa-download"></i> Download ${label}</a>
      </div>
    </div>`;
}
function loadDocImages(container) {
  if (!TOKEN || !container) return;
  container.querySelectorAll('img[data-doc-src]').forEach(function (img) {
    const path = img.getAttribute('data-doc-src');
    fetch(API + path, { headers: { 'Authorization': 'Bearer ' + TOKEN } })
      .then(function (r) {
        if (!r.ok) throw new Error('Not found');
        return r.blob();
      })
      .then(function (blob) {
        img.src = URL.createObjectURL(blob);
        img.removeAttribute('data-doc-src');
      })
      .catch(function () {
        img.style.display = 'none';
      });
  });
  container.querySelectorAll('a[data-doc-download]').forEach(function (a) {
    a.onclick = function (e) {
      e.preventDefault();
      const path = a.getAttribute('data-doc-download');
      const filename = a.getAttribute('data-doc-filename');
      fetch(API + path, { headers: { 'Authorization': 'Bearer ' + TOKEN } })
        .then(function (r) { if (!r.ok) throw new Error(); return r.blob(); })
        .then(function (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
          URL.revokeObjectURL(url);
        });
    };
  });
}

async function openRegModal(id) {
  if (!id) return;
  const modalBody = document.getElementById('modal-reg-body');
  const modalTitle = document.getElementById('modal-company-name');
  if (!modalBody || !modalTitle) return;
  openModal('reg-modal');
  modalBody.innerHTML = '<div class="loading-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading…</div>';
  try {
    const data = await apiFetch('/registrations/' + id);
    const r = data.registration;
    if (!r) {
      modalBody.innerHTML = '<div class="loading-msg" style="color:var(--danger)">Registration not found.</div>';
      return;
    }
    modalTitle.textContent = r.proposedName1 || 'Company details';
    document.getElementById('modal-reg-body').innerHTML = `
      <div class="section-title"><i class="fa-solid fa-building"></i> Company details</div>
      <div class="detail-grid">
        ${r.caseId ? `<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Case ID</div><div class="detail-value"><code style="font-size:14px;background:var(--bg3);padding:6px 10px;border-radius:6px">${r.caseId}</code></div></div>` : ''}
        <div class="detail-item"><div class="detail-label">Proposed Name 1</div><div class="detail-value">${r.proposedName1 || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Proposed Name 2</div><div class="detail-value">${r.proposedName2 || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Proposed Name 3</div><div class="detail-value">${r.proposedName3 || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Business Type</div><div class="detail-value">${r.businessType || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Company Email</div><div class="detail-value">${r.companyEmail || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Company Mobile</div><div class="detail-value">${r.companyMobile || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Capital</div><div class="detail-value">${r.capitalStructure || '—'}</div></div>
        <div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Registered Address</div><div class="detail-value" style="white-space:normal">${r.registeredAddress || '—'}</div></div>
        <div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Business Activity</div><div class="detail-value" style="white-space:normal">${r.businessActivity || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Submitted</div><div class="detail-value">${fmt(r.createdAt)}</div></div>
      </div>

      <div class="section-title"><i class="fa-solid fa-wallet"></i> Status & payment</div>
      <div class="detail-grid">
        <div class="detail-item"><div class="detail-label">Status</div><div class="detail-value">${statusBadge(r.status)}</div></div>
        <div class="detail-item"><div class="detail-label">Payment Status</div><div class="detail-value">${statusBadge(r.paymentStatus)}</div></div>
        <div class="detail-item"><div class="detail-label">Amount Paid</div><div class="detail-value">${fmtMoney(r.paymentAmount)}</div></div>
        <div class="detail-item"><div class="detail-label">Payment Method</div><div class="detail-value">${r.paymentMethod || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Payment Ref</div><div class="detail-value">${r.paymentReference || '—'}</div></div>
        <div class="detail-item"><div class="detail-label">Paid At</div><div class="detail-value">${fmt(r.paidAt)}</div></div>
        ${r.adminNotes ? `<div class="detail-item" style="grid-column:1/-1"><div class="detail-label">Admin Notes</div><div class="detail-value" style="white-space:normal;color:var(--warning)">${r.adminNotes}</div></div>` : ''}
      </div>

      <div class="section-title"><i class="fa-solid fa-users"></i> Directors (${r.directors?.length || 0})</div>
      ${(r.directors || []).map((d, i) => `
        <div class="director-card">
          <strong>Director ${i + 1}: ${d.name}</strong>
          <div class="detail-grid" style="margin-top:10px">
            <div class="detail-item"><div class="detail-label">PAN</div><div class="detail-value">${d.pan || '—'}</div></div>
            <div class="detail-item"><div class="detail-label">Aadhaar</div><div class="detail-value">${d.aadhaar || '—'}</div></div>
            <div class="detail-item"><div class="detail-label">Shareholding</div><div class="detail-value">${d.shareholding ? d.shareholding + '%' : '—'}</div></div>
            ${docImgHtml(r._id, i, 'PAN Card', d.panFileUri, 'pan', 'director-' + (i + 1) + '-pan')}
            ${docImgHtml(r._id, i, 'Aadhaar Front', d.aadhaarFrontFileUri, 'aadhaar-front', 'director-' + (i + 1) + '-aadhaar-front')}
            ${docImgHtml(r._id, i, 'Aadhaar Back', d.aadhaarBackFileUri, 'aadhaar-back', 'director-' + (i + 1) + '-aadhaar-back')}
          </div>
        </div>`).join('')}

      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-primary" onclick="closeModal('reg-modal');openStatusModal('${r._id}','registration')">Update Status</button>
        <button class="btn btn-success" onclick="closeModal('reg-modal');openPaymentModal('${r._id}')">Update Payment</button>
      </div>
    `;
    loadDocImages(document.getElementById('modal-reg-body'));
  } catch (err) {
    if (modalBody) modalBody.innerHTML = '<div class="loading-msg" style="color:var(--danger)">Error: ' + (err.message || 'Failed to load') + '</div>';
  }
}

// ─── BOOKINGS ──────────────────────────────────────────────────────

async function loadBookings() {
  const wrap = document.getElementById('book-table-wrap');
  wrap.innerHTML = '<div class="loading-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading…</div>';
  try {
    const search = document.getElementById('book-search')?.value || '';
    const status = document.getElementById('book-filter-status')?.value || '';
    let q = '?';
    if (search) q += `search=${encodeURIComponent(search)}&`;
    if (status) q += `status=${status}&`;
    const data = await apiFetch('/bookings' + q);
    // Update Call Bookings nav badge
    const bookBadge = document.getElementById('nav-book-badge');
    if (data.total > 0) {
      bookBadge.textContent = data.total;
      bookBadge.classList.remove('hidden');
    } else {
      bookBadge.classList.add('hidden');
    }

    if (!data.bookings.length) {
      wrap.innerHTML = '<div class="loading-msg">No bookings found</div>'; return;
    }
    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Mobile</th>
            <th>Purpose</th>
            <th>Details</th>
            <th>Status</th>
            <th>Scheduled</th>
            <th>Booked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.bookings.map(b => `
            <tr>
              <td><strong>${b.name}</strong></td>
              <td>${b.mobile}</td>
              <td>${b.purpose}</td>
              <td style="color:var(--text3);max-width:180px;overflow:hidden;text-overflow:ellipsis">${b.details || '—'}</td>
              <td>${statusBadge(b.status)}</td>
              <td>${b.scheduledAt ? fmt(b.scheduledAt) : '—'}</td>
              <td>${fmtDate(b.createdAt)}</td>
              <td>
                <button class="btn btn-primary" onclick="openStatusModal('${b._id}','booking')"><i class="fa-solid fa-pen"></i> Update</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="padding:12px 16px;color:var(--text3);font-size:12px;border-top:1px solid var(--border)">
        Showing ${data.bookings.length} of ${data.total} records
      </div>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="loading-msg" style="color:var(--danger)">Error: ${err.message}</div>`;
  }
}

// ─── CUSTOMERS ─────────────────────────────────────────────────────

async function loadCustomers() {
  const wrap = document.getElementById('cust-table-wrap');
  wrap.innerHTML = '<div class="loading-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading…</div>';
  try {
    const search = document.getElementById('cust-search')?.value || '';
    let q = search ? `?search=${encodeURIComponent(search)}&limit=100` : '?limit=100';
    const data = await apiFetch('/registrations' + q);
    if (!data.registrations.length) {
      wrap.innerHTML = '<div class="loading-msg">No customers found</div>'; return;
    }
    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Type</th>
            <th>Email</th>
            <th>Mobile</th>
            <th>Directors</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Revenue</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${data.registrations.map(r => `
            <tr style="cursor:pointer" onclick="openRegModal('${r._id}')">
              <td><strong>${r.proposedName1}</strong></td>
              <td>${r.businessType}</td>
              <td>${r.companyEmail || '—'}</td>
              <td>${r.companyMobile || '—'}</td>
              <td>${r.directors?.length || 0}</td>
              <td>${statusBadge(r.status)}</td>
              <td>${statusBadge(r.paymentStatus)}</td>
              <td>${r.paymentAmount ? fmtMoney(r.paymentAmount) : '—'}</td>
              <td>${fmtDate(r.createdAt)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="padding:12px 16px;color:var(--text3);font-size:12px;border-top:1px solid var(--border)">
        ${data.total} total customers
      </div>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="loading-msg" style="color:var(--danger)">Error: ${err.message}</div>`;
  }
}

// ─── STATUS MODAL ──────────────────────────────────────────────────

async function openStatusModal(id, type) {
  document.getElementById('status-modal-id').value = id;
  document.getElementById('status-modal-type').value = type;
  document.getElementById('status-modal-notes').value = '';

  const sel = document.getElementById('status-modal-select');
  const schedDiv = document.getElementById('status-modal-schedule');

  if (type === 'registration') {
    sel.innerHTML = `
      <option value="pending">Pending</option>
      <option value="Submitted">Submitted</option>
      <option value="Initiated">Initiated</option>
      <option value="Filed">Filed</option>
      <option value="Approved">Approved</option>
      <option value="rejected">Rejected</option>
    `;
    schedDiv.classList.add('hidden');
    try {
      const data = await apiFetch('/registrations/' + id);
      const r = data.registration;
      sel.value = r.status || 'pending';
      document.getElementById('status-modal-notes').value = r.adminNotes || '';
    } catch (_) { }
  } else {
    sel.innerHTML = `
      <option value="pending">Pending</option>
      <option value="confirmed">Confirmed</option>
      <option value="completed">Completed</option>
      <option value="cancelled">Cancelled</option>
    `;
    schedDiv.classList.remove('hidden');
    try {
      const data = await apiFetch('/bookings/' + id);
      const b = data.booking;
      if (b) {
        sel.value = b.status || 'pending';
        document.getElementById('status-modal-notes').value = b.adminNotes || '';
        const dateEl = document.getElementById('status-modal-date');
        if (dateEl && b.scheduledAt) dateEl.value = new Date(b.scheduledAt).toISOString().slice(0, 16);
      }
    } catch (_) { }
  }
  openModal('status-modal');
}

async function submitStatusUpdate() {
  const id = document.getElementById('status-modal-id').value;
  const type = document.getElementById('status-modal-type').value;
  const status = document.getElementById('status-modal-select').value;
  const adminNotes = document.getElementById('status-modal-notes').value;
  const scheduledAt = document.getElementById('status-modal-date')?.value;

  try {
    const body = { status, adminNotes };
    if (type === 'booking' && scheduledAt) body.scheduledAt = scheduledAt;

    const path = type === 'registration'
      ? `/registrations/${id}/status`
      : `/bookings/${id}/status`;

    await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
    closeModal('status-modal');
    showToast('Status updated successfully!', 'success');
    refreshCurrentTab();
    if (type === 'registration' && id) {
      openRegModal(id);
    }
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ─── PAYMENT MODAL ─────────────────────────────────────────────────

async function openPaymentModal(id) {
  document.getElementById('payment-modal-id').value = id;
  const amtInput = document.getElementById('payment-amount');
  const refInput = document.getElementById('payment-ref');
  const methodInput = document.getElementById('payment-method');
  const statusInput = document.getElementById('payment-status-select');

  // Set defaults
  amtInput.value = '';
  refInput.value = '';
  methodInput.value = '';
  statusInput.value = 'unpaid';

  try {
    const data = await apiFetch('/registrations/' + id);
    const r = data.registration;
    if (r) {
      if (r.paymentAmount !== undefined) amtInput.value = r.paymentAmount;
      if (r.paymentReference) refInput.value = r.paymentReference;
      if (r.paymentMethod) methodInput.value = r.paymentMethod;
      if (r.paymentStatus) statusInput.value = r.paymentStatus;
    }
  } catch (err) {
    console.warn('Failed to pre-fill payment modal:', err);
  }

  openModal('payment-modal');
}

// ─── RAZORPAY APP CHECKOUT SETTINGS (dashboard-managed amount) ─────────────

async function loadRazorpayAppSettings() {
  const statusEl = document.getElementById('rzp-app-status');
  if (!statusEl) return;
  statusEl.textContent = 'Loading…';
  try {
    const res = await fetch(API + '/payments/public-config');
    const d = await res.json();
    if (!d.ok) throw new Error(d.error || 'Failed to load');
    document.getElementById('rzp-app-amount').value = d.companyRegistrationRazorpayAmountINR ?? 1;
    document.getElementById('rzp-app-title').value = d.companyRegistrationProductTitle || '';
    document.getElementById('rzp-app-desc').value = d.companyRegistrationProductDescription || '';
    statusEl.textContent = d.razorpayConfigured
      ? 'Razorpay is configured on the server (keys present).'
      : 'Warning: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET may be missing in server .env — app checkout will fail.';
  } catch (err) {
    statusEl.textContent = 'Could not load settings: ' + err.message;
  }
}

async function saveRazorpayAppSettings() {
  const companyRegistrationRazorpayAmountINR = Number(document.getElementById('rzp-app-amount').value);
  const companyRegistrationProductTitle = document.getElementById('rzp-app-title').value.trim();
  const companyRegistrationProductDescription = document.getElementById('rzp-app-desc').value.trim();
  if (!Number.isFinite(companyRegistrationRazorpayAmountINR) || companyRegistrationRazorpayAmountINR < 1) {
    showToast('Amount must be at least ₹1.', 'error');
    return;
  }
  try {
    await apiFetch('/payments/admin-settings', {
      method: 'PATCH',
      body: JSON.stringify({
        companyRegistrationRazorpayAmountINR,
        companyRegistrationProductTitle,
        companyRegistrationProductDescription,
      }),
    });
    showToast('Razorpay app checkout settings saved.', 'success');
    loadRazorpayAppSettings();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function submitPaymentUpdate() {
  const id = document.getElementById('payment-modal-id').value;
  const paymentStatus = document.getElementById('payment-status-select').value;
  const paymentAmount = document.getElementById('payment-amount').value;
  const paymentMethod = document.getElementById('payment-method').value;
  const paymentReference = document.getElementById('payment-ref').value;

  try {
    await apiFetch(`/registrations/${id}/payment`, {
      method: 'PATCH',
      body: JSON.stringify({ paymentStatus, paymentAmount: Number(paymentAmount), paymentMethod, paymentReference }),
    });
    closeModal('payment-modal');
    showToast('Payment updated successfully!', 'success');
    refreshCurrentTab();
    if (id) openRegModal(id);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ─── APP USERS ────────────────────────────────────────────────

async function loadAppUsers() {
  const wrap = document.getElementById('appuser-table-wrap');
  wrap.innerHTML = '<div class="loading-msg"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading…</div>';
  try {
    const search = document.getElementById('appuser-search')?.value || '';
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    const data = await apiFetch('/users' + q);

    const badge = document.getElementById('nav-users-badge');
    if (data.total > 0) { badge.textContent = data.total; badge.classList.remove('hidden'); }

    if (!data.users.length) {
      wrap.innerHTML = '<div class="loading-msg">No app users yet. Users appear here after signing in with Google or mobile.</div>';
      return;
    }
    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Mobile</th>
            <th>Name</th>
            <th>Email</th>
            <th>Verified</th>
            <th>Last Login</th>
            <th>Registered</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${data.users.map((u, i) => `
            <tr>
              <td style="color:var(--text3)">${i + 1}</td>
              <td><strong>${u.mobile}</strong></td>
              <td>${u.name || '<span style="color:var(--text3)">—</span>'}</td>
              <td>${u.email || '<span style="color:var(--text3)">—</span>'}</td>
              <td>${u.isVerified
        ? '<span class="badge badge-completed"><i class="fa-solid fa-check"></i> Verified</span>'
        : '<span class="badge badge-pending">Unverified</span>'}</td>
              <td>${u.lastLoginAt ? fmt(u.lastLoginAt) : '—'}</td>
              <td>${fmtDate(u.createdAt)}</td>
              <td>
                <div style="display:flex;gap:10px;align-items:center;">
                  <button class="btn btn-primary" onclick="openNotificationModal('${u._id}')"
                    title="Send notification to this user">
                    <i class="fa-solid fa-paper-plane"></i>
                  </button>
                  <button class="btn btn-success" onclick="openChatModal('${u._id}')"
                    title="Chat with this user">
                    <i class="fa-solid fa-comment-dots"></i>
                  </button>
                  <button class="btn btn-danger" onclick="deleteUser('${u._id}')" title="Delete user">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="padding:12px 16px;color:var(--text3);font-size:12px;border-top:1px solid var(--border)">
        ${data.total} total app users
      </div>
    `;
  } catch (err) {
    wrap.innerHTML = `<div class="loading-msg" style="color:var(--danger)">Error: ${err.message}</div>`;
  }
}

async function wipeAllAppData() {
  if (!TOKEN) return;
  if (!confirm(
    'Delete ALL app data?\n\nThis removes every registration, booking, app user, notification, and chat message. Razorpay fee settings stay as they are.\n\nThis cannot be undone.',
  )) return;
  const typed = window.prompt('Type DELETE in capital letters to confirm:');
  if (typed !== 'DELETE') {
    if (typed !== null) showToast('Confirmation text did not match. Nothing was deleted.', 'error');
    return;
  }
  try {
    const data = await apiFetch('/admin/wipe-all-data', { method: 'POST', body: '{}' });
    const d = data.deleted || {};
    showToast(
      `Deleted: Reg ${d.registrations ?? 0}, Bookings ${d.bookings ?? 0}, Users ${d.users ?? 0}, Notifications ${d.notifications ?? 0}, Messages ${d.messages ?? 0}`,
      'success',
    );
    await loadOverview();
    if (currentTab === 'registrations') await loadRegistrations();
    if (currentTab === 'bookings') await loadBookings();
    if (currentTab === 'customers') await loadCustomers();
    if (currentTab === 'appusers') await loadAppUsers();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to delete this user?')) return;
  try {
    await apiFetch(`/users/${id}`, { method: 'DELETE' });
    showToast('User deleted.', 'success');
    loadAppUsers();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
