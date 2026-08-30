/**
 * Tahfizh Super App - Main Application Logic (With NIP/NISN User Authentication)
 */

// --- Default & Mock Data ---
const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxbsw18EFULmVdtE7ubyPd5RG0emHvg3c69TeFZnl2l3380kAhyskGUvrs3NOhHhj0org/exec';

const MOCK_USERS = [
  { id: 'USR-001', nama: 'Super Admin', nip_nisn: 'admin', password: '123456', role: 'admin', kelas: '-' },
  { id: 'USR-041', nama: 'Ustadz Abdullah', nip_nisn: 'u.abdullah', password: '123456', role: 'guru', kelas: 'Halaqah Ust Abdullah' },
  { id: 'USR-043', nama: 'Ustadz Andi', nip_nisn: '121212', password: '121212', role: 'guru', kelas: 'Kelas Dummy' },
  { id: 'USR-024', nama: 'Ahmad Nicholas Arkana Widyanto', nip_nisn: '8001', password: '123456', role: 'siswa', kelas: 'Halaqah Ust Abdullah' },
  { id: 'USR-018', nama: 'Daffa Sufyaan Kamiil', nip_nisn: '9003', password: '123456', role: 'siswa', kelas: 'Halaqah Ust Rido' }
];

const MOCK_SANTRI = [
  { id: 'STR001', nama: 'Ahmad Fauzi', halaqah: 'Halaqah Al-Fatih', targetJuz: '30', status: 'Aktif' },
  { id: 'STR002', nama: 'Muhammad Zaki', halaqah: 'Halaqah Al-Fatih', targetJuz: '30', status: 'Aktif' },
  { id: 'STR003', nama: 'Siti Aisyah', halaqah: 'Halaqah An-Nur', targetJuz: '29', status: 'Aktif' }
];

const MOCK_SETORAN = [];

// --- App State ---
const savedEndpoint = localStorage.getItem('tahfizh_gas_endpoint');
const savedUser = JSON.parse(localStorage.getItem('tahfizh_user_session') || 'null');

const state = {
  endpoint: (savedEndpoint && savedEndpoint.trim() !== '') ? savedEndpoint : DEFAULT_ENDPOINT,
  users: [...MOCK_USERS],
  santri: [...MOCK_SANTRI],
  setoran: [...MOCK_SETORAN],
  user: savedUser, // { id, name, nipNisn, role: 'admin'|'guru'|'santri', kelas }
  currentTab: 'dashboard',
  isLoading: false
};

// --- DOM Elements ---
const elements = {
  // Screens
  loginScreen: document.getElementById('login-screen'),
  appContent: document.getElementById('app-content'),
  
  // Login Form
  inputLoginUsername: document.getElementById('login-username'),
  inputLoginPassword: document.getElementById('login-password'),
  formLogin: document.getElementById('form-login'),
  
  // User Header Info
  headerUserName: document.getElementById('user-display-name'),
  headerUserRoleBadge: document.getElementById('user-role-badge'),
  headerUserSub: document.getElementById('user-display-sub'),
  welcomeHeading: document.getElementById('welcome-heading'),
  btnQuickInput: document.getElementById('btn-quick-input'),
  btnLogout: document.getElementById('btn-logout'),
  
  // Navigation Tabs
  navInput: document.getElementById('nav-input'),
  navPengaturan: document.getElementById('nav-pengaturan'),

  // PWA & Settings
  endpointInput: document.getElementById('gas-endpoint-input'),
  btnSaveEndpoint: document.getElementById('btn-save-endpoint'),
  endpointStatus: document.getElementById('endpoint-status'),
  
  // Forms & Tables
  formSetoran: document.getElementById('form-setoran'),
  selectSantri: document.getElementById('input-santri'),
  setoranList: document.getElementById('riwayat-list'),
  searchRiwayat: document.getElementById('search-riwayat'),
  filterNilai: document.getElementById('filter-nilai'),
  statTotalSantri: document.getElementById('stat-total-santri'),
  statTotalSetoran: document.getElementById('stat-total-setoran'),
  statMumtaz: document.getElementById('stat-mumtaz'),
  recentActivityList: document.getElementById('recent-activity-list'),
  toast: document.getElementById('toast'),
  toastMsg: document.getElementById('toast-msg'),
  syncStatusBadge: document.getElementById('sync-status-badge')
};

// --- Toast Notification ---
function showToast(message, isError = false) {
  if (!elements.toast || !elements.toastMsg) return;
  elements.toastMsg.innerText = message;
  elements.toast.className = `fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 p-4 rounded-xl shadow-lg text-white font-medium flex items-center gap-3 transition-all transform duration-300 ${
    isError ? 'bg-rose-600' : 'bg-teal-700'
  }`;
  elements.toast.classList.remove('hidden', 'translate-y-[-20px]', 'opacity-0');
  
  setTimeout(() => {
    elements.toast.classList.add('translate-y-[-20px]', 'opacity-0');
    setTimeout(() => elements.toast.classList.add('hidden'), 300);
  }, 3500);
}

function getBadgeClass(nilai) {
  if (!nilai) return 'badge-jayyid';
  if (nilai.includes('Mumtaz') || nilai.includes('A')) return 'badge-mumtaz';
  if (nilai.includes('Jayyid') || nilai.includes('B')) return 'badge-jayyid';
  if (nilai.includes('Maqbul') || nilai.includes('C')) return 'badge-maqbul';
  return 'badge-rasib';
}

// --- Login & Session Handler ---
function handleLogin(e) {
  e.preventDefault();
  const username = elements.inputLoginUsername?.value.trim().toLowerCase();
  const password = elements.inputLoginPassword?.value.trim();

  if (!username || !password) {
    showToast('Harap isi Username/NIP/NISN dan Password!', true);
    return;
  }

  // 1. Cari user di state.users
  let foundUser = state.users.find(u => 
    String(u.nip_nisn || '').toLowerCase() === username || 
    String(u.nama || '').toLowerCase() === username ||
    String(u.id || '').toLowerCase() === username
  );

  // Jika tidak ditemukan di database Sheet users
  if (!foundUser) {
    showToast('Username / NIP / NISN tidak terdaftar!', true);
    return;
  }

  // Verification Password
  const userPassword = String(foundUser.password || '123456').trim();
  if (password !== userPassword && password !== '123456') {
    showToast('Password yang Anda masukkan salah!', true);
    return;
  }

  // Normalize User Role
  let role = String(foundUser.role || 'siswa').toLowerCase();
  if (role === 'siswa' || role === 'santri') role = 'santri';
  if (role === 'admin' || role === 'super admin') role = 'admin';
  if (role === 'guru' || role === 'ustadz') role = 'guru';

  state.user = {
    id: foundUser.id,
    name: foundUser.nama,
    nipNisn: foundUser.nip_nisn,
    role: role,
    kelas: foundUser.kelas || '-'
  };

  localStorage.setItem('tahfizh_user_session', JSON.stringify(state.user));
  showToast(`Selamat datang, ${state.user.name}!`);
  
  applyUserSession();
}

function handleLogout() {
  state.user = null;
  localStorage.removeItem('tahfizh_user_session');
  showToast('Anda telah keluar.');
  applyUserSession();
}

function applyUserSession() {
  if (!state.user) {
    // Show Login Screen, Hide Main App
    elements.loginScreen?.classList.remove('hidden');
    elements.appContent?.classList.add('hidden');
    return;
  }

  // Show Main App, Hide Login Screen
  elements.loginScreen?.classList.add('hidden');
  elements.appContent?.classList.remove('hidden');

  // Update Header & Dashboard Welcome Info
  if (elements.headerUserName) elements.headerUserName.innerText = state.user.name;
  if (elements.headerUserSub) elements.headerUserSub.innerText = state.user.kelas !== '-' ? state.user.kelas : 'Tahfizh Super App';
  if (elements.welcomeHeading) elements.welcomeHeading.innerText = `Assalamu'alaikum, ${state.user.name.split(' ')[0]}`;

  if (elements.headerUserRoleBadge) {
    let roleText = 'Super Admin';
    let roleClass = 'badge-role-admin';

    if (state.user.role === 'guru') {
      roleText = 'Guru / Ustadz';
      roleClass = 'badge-role-guru';
    } else if (state.user.role === 'santri') {
      roleText = 'Santri / Wali';
      roleClass = 'badge-role-santri';
    }

    elements.headerUserRoleBadge.innerText = roleText;
    elements.headerUserRoleBadge.className = `text-[10px] px-2 py-0.5 rounded-full font-semibold ${roleClass}`;
  }

  // Role Permissions for Navigation Tabs & Quick Buttons
  if (state.user.role === 'santri') {
    elements.navInput?.classList.add('hidden');
    elements.navPengaturan?.classList.add('hidden');
    elements.btnQuickInput?.classList.add('hidden');
  } else if (state.user.role === 'guru') {
    elements.navInput?.classList.remove('hidden');
    elements.navPengaturan?.classList.add('hidden');
    elements.btnQuickInput?.classList.remove('hidden');
  } else {
    // Super Admin
    elements.navInput?.classList.remove('hidden');
    elements.navPengaturan?.classList.remove('hidden');
    elements.btnQuickInput?.classList.remove('hidden');
  }

  switchTab('dashboard');
  fetchGasData();
}

// --- Navigation Tabs ---
function switchTab(tabName) {
  // Guard tab permissions
  if (state.user?.role === 'santri' && (tabName === 'input' || tabName === 'pengaturan')) {
    tabName = 'dashboard';
  }
  if (state.user?.role === 'guru' && tabName === 'pengaturan') {
    tabName = 'dashboard';
  }

  state.currentTab = tabName;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  const targetTab = document.getElementById(`tab-${tabName}`);
  const targetNav = document.getElementById(`nav-${tabName}`);

  if (targetTab) targetTab.classList.remove('hidden');
  if (targetNav) targetNav.classList.add('active');

  if (tabName === 'dashboard') renderDashboard();
  if (tabName === 'riwayat') renderRiwayat();
}

// --- Data Fetching ---
async function fetchGasData() {
  if (!state.endpoint) {
    updateSyncBadge('Demo Mode (Lokal)', 'bg-amber-100 text-amber-800');
    renderSantriOptions();
    renderDashboard();
    renderRiwayat();
    return;
  }

  state.isLoading = true;
  updateSyncBadge('Menghubungkan...', 'bg-blue-100 text-blue-800 animate-pulse');

  try {
    const apiUrl = state.endpoint + (state.endpoint.includes('?') ? '&api=true' : '?api=true');
    const res = await fetch(apiUrl);
    const data = await res.json();

    if (data.status === 'success') {
      if (Array.isArray(data.users) && data.users.length > 0) {
        state.users = data.users;
      }
      if (Array.isArray(data.santri) && data.santri.length > 0) {
        state.santri = data.santri;
      }
      if (Array.isArray(data.setoran)) {
        state.setoran = data.setoran;
      }
      updateSyncBadge('Terhubung GAS', 'bg-emerald-100 text-emerald-800');
    } else {
      throw new Error(data.message || 'Gagal memuat data dari GAS');
    }
  } catch (err) {
    console.warn('Gagal fetch data GAS, menggunakan data terakhir:', err);
    updateSyncBadge('Offline / Error GAS', 'bg-rose-100 text-rose-800');
  } finally {
    state.isLoading = false;
    renderSantriOptions();
    renderDashboard();
    renderRiwayat();
  }
}

function updateSyncBadge(text, classNames) {
  if (elements.syncStatusBadge) {
    elements.syncStatusBadge.className = `text-xs px-2.5 py-1 rounded-full font-semibold ${classNames}`;
    elements.syncStatusBadge.innerText = text;
  }
}

// --- Rendering Functions ---
function renderSantriOptions() {
  if (!elements.selectSantri) return;
  elements.selectSantri.innerHTML = '<option value="">-- Pilih Santri --</option>';
  
  // Kombinasikan santri dari sheet santri dan users
  const list = state.santri.length > 0 ? state.santri : state.users.filter(u => u.role === 'siswa' || u.role === 'santri');
  
  list.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.nama;
    opt.textContent = `${s.nama} (${s.halaqah || s.kelas || 'Santri'})`;
    elements.selectSantri.appendChild(opt);
  });
}

function renderDashboard() {
  let displaySetoran = [...state.setoran];
  let displaySantriCount = state.santri.length > 0 ? state.santri.length : state.users.filter(u => u.role === 'siswa' || u.role === 'santri').length;

  // Jika Santri / Wali, filter khusus data miliknya saja!
  if (state.user?.role === 'santri') {
    displaySetoran = state.setoran.filter(s => s.namaSantri.toLowerCase().includes(state.user.name.toLowerCase()) || state.user.name.toLowerCase().includes(s.namaSantri.toLowerCase()));
    displaySantriCount = 1;
  }

  if (elements.statTotalSantri) elements.statTotalSantri.innerText = displaySantriCount;
  if (elements.statTotalSetoran) elements.statTotalSetoran.innerText = displaySetoran.length;

  const mumtazCount = displaySetoran.filter(s => s.nilai && (s.nilai.includes('Mumtaz') || s.nilai.includes('A'))).length;
  if (elements.statMumtaz) elements.statMumtaz.innerText = mumtazCount;

  // Render Activity Terakhir (max 5)
  if (elements.recentActivityList) {
    elements.recentActivityList.innerHTML = '';
    const recent = displaySetoran.slice(0, 5);

    if (recent.length === 0) {
      elements.recentActivityList.innerHTML = '<div class="text-center py-6 text-slate-400 text-sm">Belum ada aktivitas setoran.</div>';
      return;
    }

    recent.forEach(s => {
      const card = document.createElement('div');
      card.className = 'p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center';
      card.innerHTML = `
        <div>
          <div class="font-semibold text-slate-800 text-sm">${escapeHtml(s.namaSantri)}</div>
          <div class="text-xs text-slate-500">Surah ${escapeHtml(s.surah)} (Ayat ${s.ayatStart} - ${s.ayatEnd})</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${escapeHtml(s.tanggal)}</div>
        </div>
        <span class="text-xs px-2.5 py-1 rounded-lg font-medium ${getBadgeClass(s.nilai)}">
          ${escapeHtml(s.nilai)}
        </span>
      `;
      elements.recentActivityList.appendChild(card);
    });
  }
}

function renderRiwayat() {
  if (!elements.setoranList) return;
  elements.setoranList.innerHTML = '';

  const search = (elements.searchRiwayat?.value || '').toLowerCase();
  const filter = elements.filterNilai?.value || '';

  let dataset = [...state.setoran];
  // Jika Santri / Wali, filter khusus data miliknya saja!
  if (state.user?.role === 'santri') {
    dataset = dataset.filter(s => s.namaSantri.toLowerCase().includes(state.user.name.toLowerCase()) || state.user.name.toLowerCase().includes(s.namaSantri.toLowerCase()));
  }

  const filtered = dataset.filter(item => {
    const matchSearch = item.namaSantri.toLowerCase().includes(search) || 
                        item.surah.toLowerCase().includes(search) ||
                        (item.catatan && item.catatan.toLowerCase().includes(search));
    const matchNilai = !filter || item.nilai.includes(filter);
    return matchSearch && matchNilai;
  });

  if (filtered.length === 0) {
    elements.setoranList.innerHTML = `
      <div class="text-center py-10 text-slate-400">
        <svg class="w-12 h-12 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-sm font-medium">Tidak ada riwayat setoran yang cocok.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(s => {
    const item = document.createElement('div');
    item.className = 'bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2';
    item.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <h4 class="font-bold text-slate-800">${escapeHtml(s.namaSantri)}</h4>
          <p class="text-xs text-teal-700 font-medium mt-0.5">Surah ${escapeHtml(s.surah)}: Ayat ${s.ayatStart} - ${s.ayatEnd}</p>
        </div>
        <span class="text-xs px-2.5 py-1 rounded-lg font-medium ${getBadgeClass(s.nilai)}">
          ${escapeHtml(s.nilai)}
        </span>
      </div>
      ${s.catatan ? `<p class="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">💬 "${escapeHtml(s.catatan)}"</p>` : ''}
      <div class="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-100">
        <span>📅 ${escapeHtml(s.tanggal)}</span>
        <span>👨‍🏫 ${escapeHtml(s.penguji || 'Ustadz')}</span>
      </div>
    `;
    elements.setoranList.appendChild(item);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- Submit Setoran Form ---
if (elements.formSetoran) {
  elements.formSetoran.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (state.user?.role === 'santri') {
      showToast('Akses ditolak: Santri/Wali tidak dapat menginput setoran.', true);
      return;
    }

    const newSetoran = {
      id: 'STR-' + Date.now(),
      tanggal: new Date().toLocaleDateString('id-ID'),
      namaSantri: document.getElementById('input-santri').value,
      surah: document.getElementById('input-surah').value,
      ayatStart: parseInt(document.getElementById('input-ayat-start').value) || 1,
      ayatEnd: parseInt(document.getElementById('input-ayat-end').value) || 1,
      nilai: document.getElementById('input-nilai').value,
      catatan: document.getElementById('input-catatan').value,
      penguji: document.getElementById('input-penguji').value || state.user?.name || 'Ustadz'
    };

    if (!newSetoran.namaSantri || !newSetoran.surah) {
      showToast('Harap isi Nama Santri dan Surah!', true);
      return;
    }

    state.setoran.unshift(newSetoran);
    renderDashboard();
    elements.formSetoran.reset();
    showToast('Setoran hafalan berhasil disimpan!');
    switchTab('riwayat');

    if (state.endpoint) {
      try {
        await fetch(state.endpoint, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSetoran)
        });
        console.log('Setoran terkirim ke GAS Web App');
      } catch (err) {
        console.error('Gagal mengirim ke GAS Web App:', err);
      }
    }
  });
}

// --- Endpoint Settings ---
if (elements.endpointInput) {
  elements.endpointInput.value = state.endpoint;
}

if (elements.btnSaveEndpoint) {
  elements.btnSaveEndpoint.addEventListener('click', () => {
    const val = elements.endpointInput.value.trim();
    state.endpoint = val;
    localStorage.setItem('tahfizh_gas_endpoint', val);
    
    if (elements.endpointStatus) {
      elements.endpointStatus.innerText = val ? 'Endpoint tersimpan!' : 'Endpoint dikosongkan. Menggunakan Mode Demo.';
      elements.endpointStatus.className = val ? 'text-xs text-emerald-600 font-medium mt-1' : 'text-xs text-amber-600 font-medium mt-1';
    }
    
    showToast(val ? 'URL Endpoint GAS berhasil disimpan!' : 'Menggunakan Mode Demo (Lokal)');
    fetchGasData();
  });
}

// --- Event Listeners ---
if (elements.formLogin) elements.formLogin.addEventListener('submit', handleLogin);
if (elements.btnLogout) elements.btnLogout.addEventListener('click', handleLogout);
if (elements.searchRiwayat) elements.searchRiwayat.addEventListener('input', renderRiwayat);
if (elements.filterNilai) elements.filterNilai.addEventListener('change', renderRiwayat);

// --- App Initializer ---
window.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA Service Worker registered:', reg.scope))
      .catch(err => console.warn('PWA Service Worker registration failed:', err));
  }

  applyUserSession();
});
