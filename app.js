/**
 * Tahfizh Super App - Main Application Logic
 */

// --- Initial Mock Data (Fallback jika belum ada GAS Endpoint) ---
const MOCK_SANTRI = [
  { id: 'STR001', nama: 'Ahmad Fauzi', halaqah: 'Halaqah Al-Fatih', targetJuz: '30', status: 'Aktif' },
  { id: 'STR002', nama: 'Muhammad Zaki', halaqah: 'Halaqah Al-Fatih', targetJuz: '30', status: 'Aktif' },
  { id: 'STR003', nama: 'Siti Aisyah', halaqah: 'Halaqah An-Nur', targetJuz: '29', status: 'Aktif' },
  { id: 'STR004', nama: 'Umar Faruq', halaqah: 'Halaqah An-Nur', targetJuz: '30', status: 'Aktif' },
  { id: 'STR005', nama: 'Fatimah Az-Zahra', halaqah: 'Halaqah An-Nur', targetJuz: '30', status: 'Aktif' }
];

const MOCK_SETORAN = [
  {
    id: 'STR-1001',
    tanggal: new Date().toLocaleDateString('id-ID'),
    namaSantri: 'Ahmad Fauzi',
    surah: "An-Naba'",
    ayatStart: 1,
    ayatEnd: 40,
    nilai: 'Mumtaz (A)',
    catatan: 'Lancar sekali, tajwid & makhraj sangat baik.',
    penguji: 'Ustadz H. Abdullah'
  },
  {
    id: 'STR-1002',
    tanggal: new Date().toLocaleDateString('id-ID'),
    namaSantri: 'Muhammad Zaki',
    surah: "An-Nazi'at",
    ayatStart: 1,
    ayatEnd: 26,
    nilai: 'Jayyid Jiddan (B+)',
    catatan: 'Perhatikan ghunnah di ayat 15 dan 20.',
    penguji: 'Ustadz H. Abdullah'
  },
  {
    id: 'STR-1003',
    tanggal: new Date(Date.now() - 86400000).toLocaleDateString('id-ID'),
    namaSantri: 'Siti Aisyah',
    surah: "'Abasa",
    ayatStart: 1,
    ayatEnd: 42,
    nilai: 'Mumtaz (A)',
    catatan: 'Hafalan sangat mutqin.',
    penguji: 'Ustadzah Maryam'
  }
];

// --- App State ---
const DEFAULT_ENDPOINT = 'https://script.google.com/macros/s/AKfycbxbsw18EFULmVdtE7ubyPd5RG0emHvg3c69TeFZnl2l3380kAhyskGUvrs3NOhHhj0org/exec';
const savedEndpoint = localStorage.getItem('tahfizh_gas_endpoint');

const state = {
  endpoint: (savedEndpoint && savedEndpoint.trim() !== '') ? savedEndpoint : DEFAULT_ENDPOINT,
  santri: [...MOCK_SANTRI],
  setoran: [...MOCK_SETORAN],
  currentTab: 'dashboard',
  isLoading: false
};

// --- DOM Elements ---
const elements = {
  endpointInput: document.getElementById('gas-endpoint-input'),
  btnSaveEndpoint: document.getElementById('btn-save-endpoint'),
  endpointStatus: document.getElementById('endpoint-status'),
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

// --- Helper Functions ---
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
  if (nilai.includes('Mumtaz')) return 'badge-mumtaz';
  if (nilai.includes('Jayyid')) return 'badge-jayyid';
  if (nilai.includes('Maqbul')) return 'badge-maqbul';
  return 'badge-rasib';
}

// --- Navigation Tabs ---
function switchTab(tabName) {
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
    const res = await fetch(state.endpoint);
    const data = await res.json();

    if (data.status === 'success') {
      if (Array.isArray(data.santri) && data.santri.length > 0) {
        state.santri = data.santri;
      }
      if (Array.isArray(data.setoran)) {
        state.setoran = data.setoran;
      }
      updateSyncBadge('Terhubung GAS', 'bg-emerald-100 text-emerald-800');
      showToast('Data berhasil diperbarui dari Google Sheets!');
    } else {
      throw new Error(data.message || 'Gagal memuat data dari GAS');
    }
  } catch (err) {
    console.warn('Gagal fetch data GAS, menggunakan data terkahir:', err);
    updateSyncBadge('Offline / Error GAS', 'bg-rose-100 text-rose-800');
    showToast('Menggunakan data lokal (Tidak dapat terhubung ke GAS)', true);
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
  state.santri.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.nama;
    opt.textContent = `${s.nama} (${s.halaqah || 'Santri'})`;
    elements.selectSantri.appendChild(opt);
  });
}

function renderDashboard() {
  if (elements.statTotalSantri) elements.statTotalSantri.innerText = state.santri.length;
  if (elements.statTotalSetoran) elements.statTotalSetoran.innerText = state.setoran.length;

  const mumtazCount = state.setoran.filter(s => s.nilai && s.nilai.includes('Mumtaz')).length;
  if (elements.statMumtaz) elements.statMumtaz.innerText = mumtazCount;

  // Render Activity Terakhir (max 5)
  if (elements.recentActivityList) {
    elements.recentActivityList.innerHTML = '';
    const recent = state.setoran.slice(0, 5);

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

  const filtered = state.setoran.filter(item => {
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

    const newSetoran = {
      id: 'STR-' + Date.now(),
      tanggal: new Date().toLocaleDateString('id-ID'),
      namaSantri: document.getElementById('input-santri').value,
      surah: document.getElementById('input-surah').value,
      ayatStart: parseInt(document.getElementById('input-ayat-start').value) || 1,
      ayatEnd: parseInt(document.getElementById('input-ayat-end').value) || 1,
      nilai: document.getElementById('input-nilai').value,
      catatan: document.getElementById('input-catatan').value,
      penguji: document.getElementById('input-penguji').value || 'Ustadz'
    };

    if (!newSetoran.namaSantri || !newSetoran.surah) {
      showToast('Harap isi Nama Santri dan Surah!', true);
      return;
    }

    // Tambah ke state lokal secara responsif dulu
    state.setoran.unshift(newSetoran);
    renderDashboard();
    elements.formSetoran.reset();
    showToast('Setoran hafalan berhasil disimpan!');
    switchTab('riwayat');

    // Jika Endpoint terpasang, kirim ke GAS
    if (state.endpoint) {
      try {
        await fetch(state.endpoint, {
          method: 'POST',
          mode: 'no-cors', // Penting untuk GAS Web App cross-origin
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

// Filter and Search Listeners
if (elements.searchRiwayat) elements.searchRiwayat.addEventListener('input', renderRiwayat);
if (elements.filterNilai) elements.filterNilai.addEventListener('change', renderRiwayat);

// --- App Initializer ---
window.addEventListener('DOMContentLoaded', () => {
  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA Service Worker registered:', reg.scope))
      .catch(err => console.warn('PWA Service Worker registration failed:', err));
  }

  fetchGasData();
});
