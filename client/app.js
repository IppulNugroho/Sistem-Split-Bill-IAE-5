/* ═══════════════════════════════════════════════════════════════
   Split Bill App — Main Application
   Router · Views · State · Event Handling
   ═══════════════════════════════════════════════════════════════ */

import * as api from './graphql.js';

/* ── State ────────────────────────────────────────────────────── */
const state = {
  bills: [],
  currentBill: null,
  loading: false,
  currentView: 'dashboard',
};

/* ── Helpers ──────────────────────────────────────────────────── */

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Selamat Pagi', emoji: '☀️' };
  if (h < 17) return { text: 'Selamat Siang', emoji: '🌤️' };
  if (h < 21) return { text: 'Selamat Sore', emoji: '🌅' };
  return { text: 'Selamat Malam', emoji: '🌙' };
}

function getTodayStr() {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function getTodayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

function avatarClass(index) {
  return `avatar-${(index % 8) + 1}`;
}

function getInitials(name) {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function stagger(selector, baseDelay = 60) {
  const els = document.querySelectorAll(selector);
  els.forEach((el, i) => {
    el.style.animationDelay = `${i * baseDelay}ms`;
  });
}

/* ── Toast ────────────────────────────────────────────────────── */
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✓', error: '✕', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || '●'}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

/* ── Router ───────────────────────────────────────────────────── */

function getRoute() {
  const hash = location.hash || '#/';
  if (hash.startsWith('#/bill/')) {
    return { view: 'detail', id: hash.replace('#/bill/', '') };
  }
  return { view: 'dashboard' };
}

function navigate(hash) {
  location.hash = hash;
}

async function handleRoute() {
  const route = getRoute();
  const content = document.getElementById('main-view');

  if (route.view === 'detail') {
    state.currentView = 'detail';
    await renderBillDetail(content, route.id);
    updateNavActive();
  } else {
    state.currentView = 'dashboard';
    await renderDashboard(content);
    updateNavActive();
  }
}

function updateNavActive() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === state.currentView);
  });
}


/* ── Dashboard View ───────────────────────────────────────────── */

async function renderDashboard(container) {
  const greeting = getGreeting();

  container.innerHTML = `
    <div class="page-enter">
      <div class="page-header">
        <div class="page-header-top">
          <div>
            <div class="page-greeting">${greeting.emoji} ${greeting.text}</div>
            <h1 class="page-title">Kelola <span class="highlight">Split Bill</span></h1>
            <p class="page-subtitle">Atur tagihan dan pembagian biaya dengan mudah</p>
          </div>
          <div class="page-date">
            📅 ${getTodayStr()}
          </div>
        </div>
      </div>

      <div class="stats-grid" id="stats-grid">
        ${renderStatsSkeleton()}
      </div>

      <div class="section-header">
        <h2 class="section-title">Daftar Tagihan</h2>
        <span class="section-badge" id="bills-count">Memuat...</span>
      </div>

      <div class="bills-grid" id="bills-grid">
        ${renderBillsSkeleton()}
      </div>
    </div>
  `;

  // Fetch data
  try {
    state.bills = await api.getBills();
    renderStats();
    renderBillsList();
  } catch (err) {
    showToast('Gagal memuat data: ' + err.message, 'error');
    document.getElementById('bills-grid').innerHTML = renderErrorState(err.message);
  }
}

function renderStats() {
  const bills = state.bills;
  const totalBills = bills.length;
  const totalAmount = bills.reduce((s, b) => s + b.totalAmount, 0);
  const collectedAmount = bills.reduce((s, b) => {
    return s + b.participants.filter(p => p.isPaid).reduce((ps, p) => ps + p.amountOwed, 0);
  }, 0);
  const remainingAmount = totalAmount - collectedAmount;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card animate-in">
      <div class="stat-icon">📋</div>
      <div class="stat-label">Total Tagihan</div>
      <div class="stat-value">${totalBills}</div>
    </div>
    <div class="stat-card animate-in">
      <div class="stat-icon">💰</div>
      <div class="stat-label">Terkumpul</div>
      <div class="stat-value">${formatCurrency(collectedAmount)}</div>
    </div>
    <div class="stat-card animate-in">
      <div class="stat-icon">💸</div>
      <div class="stat-label">Sisa Belum Bayar</div>
      <div class="stat-value">${formatCurrency(remainingAmount)}</div>
    </div>
  `;
  stagger('.stat-card.animate-in');
}

function renderBillsList() {
  const bills = state.bills;
  document.getElementById('bills-count').textContent = `${bills.length} tagihan`;

  if (bills.length === 0) {
    document.getElementById('bills-grid').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">🧾</div>
        <h3>Belum Ada Tagihan</h3>
        <p>Mulai dengan membuat tagihan pertama. Klik tombol "+" di pojok kanan bawah.</p>
        <button class="btn btn-primary" onclick="document.getElementById('fab-create').click()">
          ＋ Buat Tagihan
        </button>
      </div>
    `;
    return;
  }

  document.getElementById('bills-grid').innerHTML = bills.map((bill, i) => {
    const paidAmount = bill.participants.filter(p => p.isPaid).reduce((s, p) => s + p.amountOwed, 0);
    const pct = bill.totalAmount > 0 ? Math.min(100, Math.round((paidAmount / bill.totalAmount) * 100)) : 0;
    const totalP = bill.participants.length;
    const paidCount = bill.participants.filter(p => p.isPaid).length;
    const isFullyPaid = paidAmount >= bill.totalAmount;

    return `
      <div class="bill-card animate-in" onclick="location.hash='#/bill/${bill.id}'" style="animation-delay:${i * 70}ms">
        <div class="bill-card-header">
          <div>
            <div class="bill-card-title">${bill.title}</div>
            <div class="bill-card-date">📅 ${formatDate(bill.date)}</div>
          </div>
          <div class="bill-card-amount">${formatCurrency(bill.totalAmount)}</div>
        </div>
        <div class="bill-progress">
          <div class="bill-progress-bar">
            <div class="bill-progress-fill" style="width:${pct}%"></div>
          </div>
          <div class="bill-progress-label">
            <span>${formatCurrency(paidAmount)} terkumpul</span>
            <span>${pct}%</span>
          </div>
        </div>
        <div class="bill-card-meta">
          <div class="bill-card-meta-item">
            <span class="meta-icon">👥</span>
            ${paidCount}/${totalP} peserta lunas
          </div>
          <div class="bill-card-meta-item">
            <span class="meta-icon">${isFullyPaid ? '✅' : '⏳'}</span>
            ${isFullyPaid ? 'Lunas' : 'Berjalan'}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderStatsSkeleton() {
  return Array(3).fill(`
    <div class="stat-card">
      <div class="skeleton skeleton-circle" style="margin-bottom:12px"></div>
      <div class="skeleton skeleton-line" style="width:80px;height:10px;margin-bottom:8px"></div>
      <div class="skeleton skeleton-line" style="width:120px;height:28px"></div>
    </div>
  `).join('');
}

function renderBillsSkeleton() {
  return Array(3).fill(`
    <div class="skeleton skeleton-card"></div>
  `).join('');
}

function renderErrorState(message) {
  return `
    <div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon">⚠️</div>
      <h3>Oops, Terjadi Kesalahan</h3>
      <p>${message}</p>
      <button class="btn btn-secondary" onclick="handleRoute()">🔄 Coba Lagi</button>
    </div>
  `;
}


/* ── Bill Detail View ─────────────────────────────────────────── */

async function renderBillDetail(container, billId) {
  container.innerHTML = `
    <div class="page-enter">
      <div class="breadcrumb">
        <a href="#/" id="breadcrumb-home">Dashboard</a>
        <span class="breadcrumb-sep">›</span>
        <span>Detail Tagihan</span>
      </div>
      <div class="loading-center"><div class="spinner"></div></div>
    </div>
  `;

  try {
    const bill = await api.getBill(billId);
    state.currentBill = bill;
    renderBillDetailContent(container, bill);
  } catch (err) {
    showToast('Gagal memuat detail: ' + err.message, 'error');
    container.innerHTML = `
      <div class="breadcrumb">
        <a href="#/">Dashboard</a>
        <span class="breadcrumb-sep">›</span>
        <span>Error</span>
      </div>
      ${renderErrorState(err.message)}
    `;
  }
}

function renderBillDetailContent(container, bill) {
  const paidCount = bill.participants.filter(p => p.isPaid).length;
  const totalP = bill.participants.length;
  const paidAmount = bill.participants.filter(p => p.isPaid).reduce((s, p) => s + p.amountOwed, 0);
  const unpaidParticipantAmount = bill.participants.filter(p => !p.isPaid).reduce((s, p) => s + p.amountOwed, 0);
  const totalParticipantAmount = bill.participants.reduce((s, p) => s + p.amountOwed, 0);
  const remainingFromBill = bill.totalAmount - paidAmount;
  const unassignedAmount = bill.totalAmount - totalParticipantAmount;

  // Percentage based on AMOUNT, not participant count
  const pct = bill.totalAmount > 0 ? Math.min(100, Math.round((paidAmount / bill.totalAmount) * 100)) : 0;

  // SVG ring chart calculations
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  // Ring color: green if 100%, gradient otherwise
  const ringColor = pct >= 100 ? '#00e676' : '';

  container.innerHTML = `
    <div class="page-enter">
      <div class="breadcrumb">
        <a href="#/" id="breadcrumb-home">Dashboard</a>
        <span class="breadcrumb-sep">›</span>
        <span>${bill.title}</span>
      </div>

      <div class="detail-grid">
        <!-- Left Column -->
        <div>
          <div class="bill-info-card">
            <div class="bill-info-header">
              <h1 class="bill-info-title">${bill.title}</h1>
              <div class="bill-info-actions">
                <button class="btn btn-secondary btn-sm" id="btn-edit-bill" title="Edit Tagihan">✏️ Edit</button>
                <button class="btn btn-danger btn-sm" id="btn-delete-bill" title="Hapus Tagihan">🗑️</button>
              </div>
            </div>
            <div class="bill-info-detail">
              <div class="bill-info-item">
                <span class="bill-info-label">Total Tagihan</span>
                <span class="bill-info-value amount">${formatCurrency(bill.totalAmount)}</span>
              </div>
              <div class="bill-info-item">
                <span class="bill-info-label">Terkumpul</span>
                <span class="bill-info-value" style="color:var(--success)">${formatCurrency(paidAmount)}</span>
              </div>
              <div class="bill-info-item">
                <span class="bill-info-label">Tanggal</span>
                <span class="bill-info-value">📅 ${formatDate(bill.date)}</span>
              </div>
              <div class="bill-info-item">
                <span class="bill-info-label">Peserta</span>
                <span class="bill-info-value">👥 ${totalP} orang</span>
              </div>
            </div>
          </div>

          <!-- Participants Section -->
          <div class="participants-section">
            <div class="section-header">
              <h2 class="section-title">Peserta</h2>
              <button class="btn btn-primary btn-sm" id="btn-add-participant">＋ Tambah</button>
            </div>

            <div id="add-participant-container"></div>

            <div id="participants-list">
              ${renderParticipants(bill)}
            </div>
          </div>
        </div>

        <!-- Right Column — Summary -->
        <div class="summary-card">
          <h3 class="summary-title">Ringkasan Pembayaran</h3>

          <div class="ring-chart">
            <svg viewBox="0 0 140 140">
              <defs>
                <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="${pct >= 100 ? '#00e676' : '#6c5ce7'}"/>
                  <stop offset="100%" stop-color="${pct >= 100 ? '#00e676' : '#a855f7'}"/>
                </linearGradient>
              </defs>
              <circle class="ring-bg" cx="70" cy="70" r="${radius}"/>
              <circle class="ring-fill" cx="70" cy="70" r="${radius}"
                stroke-dasharray="${circumference}"
                stroke-dashoffset="${offset}"/>
            </svg>
            <div class="ring-center">
              <div class="ring-percent" ${pct >= 100 ? 'style="color:var(--success)"' : ''}>${pct}%</div>
              <div class="ring-label">terbayar</div>
            </div>
          </div>

          <div class="summary-stats">
            <div class="summary-stat-row">
              <span class="summary-stat-label">
                <span class="summary-stat-dot paid"></span>
                Sudah Bayar
              </span>
              <span class="summary-stat-value" style="color:var(--success)">${formatCurrency(paidAmount)}</span>
            </div>
            <div class="summary-stat-row">
              <span class="summary-stat-label">
                <span class="summary-stat-dot unpaid"></span>
                Sisa Tagihan
              </span>
              <span class="summary-stat-value" style="color:${remainingFromBill > 0 ? 'var(--warning)' : 'var(--success)'}">${formatCurrency(remainingFromBill > 0 ? remainingFromBill : 0)}</span>
            </div>
            ${unassignedAmount > 0 ? `
            <div class="summary-stat-row">
              <span class="summary-stat-label">
                <span class="summary-stat-dot" style="background:var(--danger)"></span>
                Belum Dibagi
              </span>
              <span class="summary-stat-value" style="color:var(--danger)">${formatCurrency(unassignedAmount)}</span>
            </div>` : ''}
            <div class="summary-stat-row" style="border-top:1px solid var(--glass-border);padding-top:var(--space-md);margin-top:var(--space-sm)">
              <span class="summary-stat-label">Peserta Lunas</span>
              <span class="summary-stat-value">${paidCount}/${totalP}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind events
  document.getElementById('btn-edit-bill').addEventListener('click', () => openEditBillModal(bill));
  document.getElementById('btn-delete-bill').addEventListener('click', () => openConfirmDeleteBill(bill));
  document.getElementById('btn-add-participant').addEventListener('click', toggleAddParticipantForm);
  bindParticipantEvents(bill);
}

function renderParticipants(bill) {
  if (bill.participants.length === 0) {
    return `
      <div class="empty-state" style="padding:var(--space-xl)">
        <div class="empty-state-icon" style="font-size:2.5rem">👤</div>
        <h3 style="font-size:1.1rem">Belum Ada Peserta</h3>
        <p style="font-size:0.85rem">Tambahkan peserta untuk membagi tagihan ini.</p>
      </div>
    `;
  }

  return bill.participants.map((p, i) => `
    <div class="participant-card animate-in" style="animation-delay:${i * 60}ms" data-pid="${p.id}">
      <div class="participant-avatar ${avatarClass(i)}">${getInitials(p.name)}</div>
      <div class="participant-info">
        <div class="participant-name">${p.name}</div>
        <div class="participant-amount">${formatCurrency(p.amountOwed)}</div>
      </div>
      <div class="participant-status ${p.isPaid ? 'paid' : 'unpaid'}">
        <label class="toggle-switch" title="Toggle status bayar">
          <input type="checkbox" ${p.isPaid ? 'checked' : ''} data-toggle-paid="${p.id}">
          <span class="toggle-track"></span>
          <span class="toggle-thumb"></span>
        </label>
        <span>${p.isPaid ? 'Lunas' : 'Belum'}</span>
      </div>
      <div class="participant-actions">
        <button class="btn btn-ghost btn-icon btn-sm" data-edit-participant="${p.id}" title="Edit">✏️</button>
        <button class="btn btn-danger btn-icon btn-sm" data-remove-participant="${p.id}" title="Hapus">✕</button>
      </div>
    </div>
  `).join('');
}

function bindParticipantEvents(bill) {
  // Toggle paid status
  document.querySelectorAll('[data-toggle-paid]').forEach(toggle => {
    toggle.addEventListener('change', async (e) => {
      const pid = e.target.dataset.togglePaid;
      try {
        await api.updateParticipant(bill.id, pid, { isPaid: e.target.checked });
        showToast(e.target.checked ? 'Ditandai lunas ✓' : 'Ditandai belum bayar', 'success');
        // Refresh the detail view
        const content = document.getElementById('main-view');
        await renderBillDetail(content, bill.id);
      } catch (err) {
        showToast('Gagal update status: ' + err.message, 'error');
        e.target.checked = !e.target.checked;
      }
    });
  });

  // Remove participant
  document.querySelectorAll('[data-remove-participant]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pid = e.currentTarget.dataset.removeParticipant;
      const p = bill.participants.find(p => p.id === pid);
      openConfirmDeleteParticipant(bill, p);
    });
  });

  // Edit participant
  document.querySelectorAll('[data-edit-participant]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const pid = e.currentTarget.dataset.editParticipant;
      const p = bill.participants.find(p => p.id === pid);
      openEditParticipantModal(bill, p);
    });
  });
}


/* ── Add Participant Form ─────────────────────────────────────── */

function toggleAddParticipantForm() {
  const container = document.getElementById('add-participant-container');

  if (container.children.length > 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="add-participant-form">
      <div class="add-participant-form form-row-3">
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Nama</label>
          <input type="text" class="form-input" id="input-pname" placeholder="Nama peserta">
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label class="form-label">Jumlah (Rp)</label>
          <input type="number" class="form-input" id="input-pamount" placeholder="50000" min="0">
        </div>
        <button class="btn btn-primary" id="btn-submit-participant" style="height:46px;margin-top:auto">Tambah</button>
      </div>
    </div>
  `;

  document.getElementById('btn-submit-participant').addEventListener('click', submitAddParticipant);
  document.getElementById('input-pname').focus();

  // Enter key support
  container.querySelectorAll('input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAddParticipant();
    });
  });
}

async function submitAddParticipant() {
  const name = document.getElementById('input-pname').value.trim();
  const amount = parseFloat(document.getElementById('input-pamount').value);

  if (!name) { showToast('Nama peserta harus diisi', 'warning'); return; }
  if (isNaN(amount) || amount <= 0) { showToast('Jumlah harus lebih dari 0', 'warning'); return; }

  const btn = document.getElementById('btn-submit-participant');
  btn.disabled = true;
  btn.textContent = '...';

  try {
    await api.addParticipant(state.currentBill.id, name, amount);
    showToast(`${name} ditambahkan ✓`, 'success');
    const content = document.getElementById('main-view');
    await renderBillDetail(content, state.currentBill.id);
  } catch (err) {
    showToast('Gagal menambah peserta: ' + err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Tambah';
  }
}


/* ── Modals ────────────────────────────────────────────────────── */

function openModal(id) {
  const overlay = document.getElementById(id);
  overlay.classList.add('active');
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id);
  });
  // Close on Escape
  const handler = (e) => {
    if (e.key === 'Escape') { closeModal(id); document.removeEventListener('keydown', handler); }
  };
  document.addEventListener('keydown', handler);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}


/* ── Create Bill Modal ────────────────────────────────────────── */

function openCreateBillModal() {
  const overlay = document.getElementById('modal-bill');
  overlay.querySelector('.modal-title').textContent = 'Buat Tagihan Baru';
  document.getElementById('input-bill-title').value = '';
  document.getElementById('input-bill-amount').value = '';
  document.getElementById('input-bill-date').value = getTodayISO();
  document.getElementById('btn-save-bill').textContent = 'Buat Tagihan';
  document.getElementById('btn-save-bill').onclick = submitCreateBill;
  openModal('modal-bill');
  document.getElementById('input-bill-title').focus();
}

async function submitCreateBill() {
  const title = document.getElementById('input-bill-title').value.trim();
  const amount = parseFloat(document.getElementById('input-bill-amount').value);
  const date = document.getElementById('input-bill-date').value;

  if (!title) { showToast('Judul tagihan harus diisi', 'warning'); return; }
  if (isNaN(amount) || amount <= 0) { showToast('Jumlah harus lebih dari 0', 'warning'); return; }
  if (!date) { showToast('Tanggal harus diisi', 'warning'); return; }

  const btn = document.getElementById('btn-save-bill');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    const bill = await api.createBill(title, amount, date);
    showToast(`Tagihan "${title}" dibuat ✓`, 'success');
    closeModal('modal-bill');
    navigate(`#/bill/${bill.id}`);
  } catch (err) {
    showToast('Gagal membuat tagihan: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Buat Tagihan';
  }
}


/* ── Edit Bill Modal ──────────────────────────────────────────── */

function openEditBillModal(bill) {
  const overlay = document.getElementById('modal-bill');
  overlay.querySelector('.modal-title').textContent = 'Edit Tagihan';
  document.getElementById('input-bill-title').value = bill.title;
  document.getElementById('input-bill-amount').value = bill.totalAmount;
  document.getElementById('input-bill-date').value = bill.date;
  document.getElementById('btn-save-bill').textContent = 'Simpan Perubahan';
  document.getElementById('btn-save-bill').onclick = () => submitEditBill(bill.id);
  openModal('modal-bill');
}

async function submitEditBill(billId) {
  const title = document.getElementById('input-bill-title').value.trim();
  const totalAmount = parseFloat(document.getElementById('input-bill-amount').value);
  const date = document.getElementById('input-bill-date').value;

  if (!title) { showToast('Judul tagihan harus diisi', 'warning'); return; }
  if (isNaN(totalAmount) || totalAmount <= 0) { showToast('Jumlah harus lebih dari 0', 'warning'); return; }

  const btn = document.getElementById('btn-save-bill');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    await api.updateBill(billId, { title, totalAmount, date });
    showToast('Tagihan diperbarui ✓', 'success');
    closeModal('modal-bill');
    const content = document.getElementById('main-view');
    await renderBillDetail(content, billId);
  } catch (err) {
    showToast('Gagal memperbarui: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Perubahan';
  }
}


/* ── Edit Participant Modal ───────────────────────────────────── */

function openEditParticipantModal(bill, participant) {
  const overlay = document.getElementById('modal-participant');
  document.getElementById('input-edit-pname').value = participant.name;
  document.getElementById('input-edit-pamount').value = participant.amountOwed;
  document.getElementById('btn-save-participant').onclick = () => submitEditParticipant(bill.id, participant.id);
  openModal('modal-participant');
  document.getElementById('input-edit-pname').focus();
}

async function submitEditParticipant(billId, participantId) {
  const name = document.getElementById('input-edit-pname').value.trim();
  const amountOwed = parseFloat(document.getElementById('input-edit-pamount').value);

  if (!name) { showToast('Nama harus diisi', 'warning'); return; }
  if (isNaN(amountOwed) || amountOwed <= 0) { showToast('Jumlah harus lebih dari 0', 'warning'); return; }

  const btn = document.getElementById('btn-save-participant');
  btn.disabled = true;

  try {
    await api.updateParticipant(billId, participantId, { name, amountOwed });
    showToast('Peserta diperbarui ✓', 'success');
    closeModal('modal-participant');
    const content = document.getElementById('main-view');
    await renderBillDetail(content, billId);
  } catch (err) {
    showToast('Gagal memperbarui: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}


/* ── Confirm Delete Bill ──────────────────────────────────────── */

function openConfirmDeleteBill(bill) {
  document.getElementById('confirm-message').textContent = `Apakah Anda yakin ingin menghapus tagihan "${bill.title}"? Semua data peserta juga akan dihapus.`;
  document.getElementById('btn-confirm-yes').onclick = async () => {
    try {
      await api.deleteBill(bill.id);
      showToast(`Tagihan "${bill.title}" dihapus`, 'success');
      closeModal('modal-confirm');
      navigate('#/');
    } catch (err) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };
  openModal('modal-confirm');
}


/* ── Confirm Delete Participant ───────────────────────────────── */

function openConfirmDeleteParticipant(bill, participant) {
  document.getElementById('confirm-message').textContent = `Hapus peserta "${participant.name}" dari tagihan ini?`;
  document.getElementById('btn-confirm-yes').onclick = async () => {
    try {
      await api.removeParticipant(bill.id, participant.id);
      showToast(`${participant.name} dihapus`, 'success');
      closeModal('modal-confirm');
      const content = document.getElementById('main-view');
      await renderBillDetail(content, bill.id);
    } catch (err) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };
  openModal('modal-confirm');
}


/* ── Sidebar Mobile ───────────────────────────────────────────── */

function setupSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}


/* ── Init ─────────────────────────────────────────────────────── */

function init() {
  // Setup sidebar
  setupSidebar();

  // FAB
  document.getElementById('fab-create').addEventListener('click', openCreateBillModal);

  // Nav items
  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => {
      if (item.dataset.view === 'dashboard') navigate('#/');
    });
  });

  // Modal close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      modal.classList.remove('active');
    });
  });

  // Confirm cancel
  document.getElementById('btn-confirm-no').addEventListener('click', () => closeModal('modal-confirm'));

  // Router
  window.addEventListener('hashchange', handleRoute);
  handleRoute();

  // Hide loading screen
  setTimeout(() => {
    document.getElementById('loading-screen').classList.add('hidden');
  }, 800);
}

// Start
document.addEventListener('DOMContentLoaded', init);

// Expose for inline handlers
window.handleRoute = handleRoute;
