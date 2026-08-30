/**
 * MJ OFFICIAL - SYSTEM ARCHITECT
 * APP: Setoran Hafalan Qur'an Premium (Point System)
 * VER: 3.2 (Auto-Init & Bulletproof Standalone REST Backend)
 */

function getSpreadsheet() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    // Fallback jika dibuka via ID
    return SpreadsheetApp.openById(SpreadsheetApp.getActiveSpreadsheet().getId());
  }
}

/* ==========================================================================
   1. AUTO-INITIALIZATION & HEALTH CHECK
   ========================================================================== */

function ensureDatabaseReady() {
  const ss = getSpreadsheet();
  const userSheet = ss.getSheetByName('users');
  const siswaSheet = ss.getSheetByName('siswa');
  
  if (!userSheet || userSheet.getLastRow() <= 1 || !siswaSheet || siswaSheet.getLastRow() <= 1) {
    setupInitialData();
  }
}

/* ==========================================================================
   2. REST API ROUTER (GET & POST)
   ========================================================================== */

function doGet(e) {
  ensureDatabaseReady();

  if (e && e.parameter && e.parameter.action) {
    try {
      var action = e.parameter.action;
      var params = [];
      if (e.parameter.params) {
        params = JSON.parse(e.parameter.params);
      } else if (e.parameter.token) {
        params = [e.parameter.token];
      }
      var result = routeApiCall(action, params);
      return createJsonResponse(result);
    } catch (err) {
      return createJsonResponse({ status: 'error', message: err.toString() });
    }
  }

  return createJsonResponse({
    status: 'success',
    app: 'Tahfizh Pro Backend API',
    version: '3.2',
    spreadsheetName: getSpreadsheet().getName(),
    message: 'Backend Google Apps Script aktif dan database siap digunakan.'
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    ensureDatabaseReady();

    var payload = {};
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (err) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || payload.functionName || (e.parameter && e.parameter.action);
    var params = payload.params || payload.args || payload.data || [];
    if (!Array.isArray(params)) {
      params = [params];
    }

    var result = routeApiCall(action, params);
    return createJsonResponse(result);

  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function routeApiCall(action, params) {
  switch (action) {
    case 'loginUser':
      return loginUser(params[0], params[1]);

    case 'getData':
      return getData(params[0]);

    case 'addSetoran':
      return addSetoran(params[0], params[1]);

    case 'getMySetoran':
      return getMySetoran(params[0]);

    case 'getSiswaProgress':
      return getSiswaProgress(params[0]);

    case 'getLeaderboardData':
      return getLeaderboardData();

    case 'getKelas':
      return getKelas(params[0]);

    case 'saveKelas':
      return saveKelas(params[0], params[1]);

    case 'deleteKelas':
      return deleteKelas(params[0], params[1]);

    case 'getUsers':
      return getUsers(params[0]);

    case 'saveUser':
      return saveUser(params[0], params[1]);

    case 'deleteUser':
      return deleteUser(params[0], params[1]);

    case 'changePassword':
      return changePassword(params[0], params[1], params[2]);

    case 'getLaporanData':
      return getLaporanData(params[0], params[1]);

    case 'setupInitialData':
      setupInitialData();
      return { status: 'success', message: 'Database berhasil diinisialisasi.' };

    case 'fixDuplicateSiswa':
      var msg = fixDuplicateSiswa();
      return { status: 'success', message: msg };

    default:
      return { status: 'error', message: 'Action "' + action + '" tidak dikenali.' };
  }
}

/* ==========================================================================
   3. INITIALIZATION & SETUP SPREADSHEET
   ========================================================================== */

function setupInitialData() {
  const ss = getSpreadsheet();

  createSheetIfNotExists(ss, 'users',       ['id','nama','nip_nisn','password','role','kelas']);
  createSheetIfNotExists(ss, 'siswa',       ['nisn','nama','kelas','target_juz','total_poin','badge']);
  createSheetIfNotExists(ss, 'setoran',     ['id_setoran','tanggal','waktu','nisn','nama','kelas','juz','surat','ayat_dari','ayat_sampai','nilai','status','poin','catatan','guru_pengoreksi']);
  createSheetIfNotExists(ss, 'leaderboard', ['nisn','nama','kelas','total_poin','ranking_kelas','ranking_global']);
  createSheetIfNotExists(ss, 'sessions',    ['session_id','username','role','nisn','expired_at']);
  createSheetIfNotExists(ss, 'kelas',       ['id','nama_kelas']);

  const userSheet   = ss.getSheetByName('users');
  const siswaSheet  = ss.getSheetByName('siswa');
  const setoranSheet= ss.getSheetByName('setoran');

  if (userSheet.getLastRow() > 1) {
    return;
  }

  // 1. KELAS
  const kelasSheet = ss.getSheetByName('kelas');
  [
    ['KLS-001', '7A'],
    ['KLS-002', '7B'],
    ['KLS-003', '8A'],
    ['KLS-004', '8B']
  ].forEach(r => kelasSheet.appendRow(r));

  // 2. USERS (Password default: 123456)
  [
    ['USR-001', 'Super Admin',       'admin',              '123456', 'admin', '-'],
    ['USR-002', 'Ust. Ahmad Yusuf',  'u.ahmad',            '123456', 'guru',  '7A,7B'],
    ['USR-003', 'Ust. Budi Santoso', 'u.budi',             '123456', 'guru',  '8A,8B'],
    ['USR-004', 'Fulan bin Fulan',   '1001',               '123456', 'siswa', '7A'],
    ['USR-005', 'Ahmad Fauzi',       '1002',               '123456', 'siswa', '7A'],
    ['USR-006', 'Siti Aisyah',       '1003',               '123456', 'siswa', '7A'],
    ['USR-007', 'Muhammad Rizki',    '1004',               '123456', 'siswa', '7B'],
    ['USR-008', 'Nurul Hidayah',     '1005',               '123456', 'siswa', '7B'],
    ['USR-009', 'Abdullah Hakim',    '2001',               '123456', 'siswa', '8A'],
    ['USR-010', 'Fatimah Zahra',     '2002',               '123456', 'siswa', '8A'],
    ['USR-011', 'Umar Farouq',       '2003',               '123456', 'siswa', '8B'],
    ['USR-012', 'Khadijah Nabilah',  '2004',               '123456', 'siswa', '8B']
  ].forEach(r => userSheet.appendRow(r));

  // 3. SETORAN SAMPEL
  function tgl(y, m, d) { return new Date(y, m - 1, d); }
  const rawSetoran = [
    ['STR-S001', tgl(2024,9,2),   '08:15', '1001', 'Fulan bin Fulan', '7A', 30, 'An-Nas',       1,  6, 'A', 'Sangat Lancar',  100, 'MasyaAllah, sangat lancar!', 'u.ahmad'],
    ['STR-S002', tgl(2024,9,9),   '08:30', '1001', 'Fulan bin Fulan', '7A', 30, 'Al-Falaq',     1,  5, 'A', 'Sangat Lancar',  100, 'Lanjutkan semangatnya',      'u.ahmad'],
    ['STR-S003', tgl(2024,9,16),  '09:10', '1001', 'Fulan bin Fulan', '7A', 30, 'Al-Ikhlas',    1,  4, 'A', 'Lancar',         90,  'Makhraj sudah baik',          'u.ahmad'],
    ['STR-S004', tgl(2024,10,3),  '08:45', '1001', 'Fulan bin Fulan', '7A', 29, 'Al-Mulk',      1, 30, 'A', 'Sangat Lancar',  100, 'Hafalan sangat kuat',         'u.ahmad'],
    ['STR-S030', tgl(2024,8,5),   '07:50', '2001', 'Abdullah Hakim', '8A', 30, 'An-Naba',      1, 40, 'A', 'Sangat Lancar',  100, 'Hafalan sempurna, juz 30!',  'u.budi'],
    ['STR-S031', tgl(2024,8,12),  '08:00', '2001', 'Abdullah Hakim', '8A', 30, "An-Nazi'at",   1, 46, 'A', 'Sangat Lancar',  100, 'Lanjutkan ke juz 29',        'u.budi'],
    ['STR-S032', tgl(2024,8,19),  '07:55', '2001', 'Abdullah Hakim', '8A', 29, 'Al-Mulk',      1, 30, 'A', 'Sangat Lancar',  100, 'Disiplin luar biasa',        'u.budi']
  ];
  rawSetoran.forEach(r => setoranSheet.appendRow(r));

  // 4. SISWA
  const siswaRows = [
    ['1001', 'Fulan bin Fulan',   '7A', 30, 390, calculateBadge(390)],
    ['1002', 'Ahmad Fauzi',       '7A', 30, 580, calculateBadge(580)],
    ['1003', 'Siti Aisyah',       '7A', 20, 340, calculateBadge(340)],
    ['1004', 'Muhammad Rizki',    '7B', 30, 740, calculateBadge(740)],
    ['1005', 'Nurul Hidayah',     '7B', 20, 280, calculateBadge(280)],
    ['2001', 'Abdullah Hakim',    '8A', 30, 2000, calculateBadge(2000)],
    ['2002', 'Fatimah Zahra',     '8A', 30, 700, calculateBadge(700)],
    ['2003', 'Umar Farouq',       '8B', 25, 520, calculateBadge(520)],
    ['2004', 'Khadijah Nabilah',  '8B', 20, 340, calculateBadge(340)]
  ];
  const siswaMap = new Map();
  siswaRows.forEach(r => { if (!siswaMap.has(r[0])) siswaMap.set(r[0], r); });
  siswaMap.forEach(r => siswaSheet.appendRow(r));

  // 5. LEADERBOARD
  const siswaArr = Array.from(siswaMap.values());
  const sorted   = [...siswaArr].sort((a, b) => b[4] - a[4]);
  const leaderboardSheet = ss.getSheetByName('leaderboard');

  const kelasPoinMap = {};
  siswaArr.forEach(s => {
    if (!kelasPoinMap[s[2]]) kelasPoinMap[s[2]] = [];
    kelasPoinMap[s[2]].push({ nisn: s[0], poin: s[4] });
  });
  Object.keys(kelasPoinMap).forEach(k => {
    kelasPoinMap[k].sort((a, b) => b.poin - a.poin);
  });
  const kelasRankMap = {};
  Object.keys(kelasPoinMap).forEach(k => {
    kelasPoinMap[k].forEach((s, i) => { kelasRankMap[s.nisn] = i + 1; });
  });

  sorted.forEach((s, globalIdx) => {
    leaderboardSheet.appendRow([s[0], s[1], s[2], s[4], kelasRankMap[s[0]], globalIdx + 1]);
  });
}

function createSheetIfNotExists(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0fdf4');
  }
  return sheet;
}

/* ==========================================================================
   4. AUTHENTICATION LOGIC
   ========================================================================== */

function loginUser(username, password) {
  ensureDatabaseReady();
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('users');
  if (!sheet) return { status: 'error', message: 'Database users belum siap.' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim().toLowerCase() == String(username).trim().toLowerCase() && 
        String(data[i][3]).trim() == String(password).trim()) {
      const token = Utilities.getUuid();
      const role  = data[i][4];
      const nama  = data[i][1];
      const kelas = data[i][5];

      let nisn = "";
      if (role === 'siswa') {
        nisn = String(data[i][2]);
      }

      const sessionSheet = ss.getSheetByName('sessions');
      const expiry = new Date().getTime() + (24 * 60 * 60 * 1000);
      sessionSheet.appendRow([token, username, role, nisn, expiry]);

      return {
        status: 'success',
        token: token,
        role:  role,
        nama:  nama,
        kelas: kelas,
        nisn:  nisn
      };
    }
  }
  return { status: 'error', message: 'Username / NIP / NISN atau password salah.' };
}

function verifyUser(token) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName('sessions');
  if (!sheet) return { valid: false };

  const data = sheet.getDataRange().getValues();
  const now = new Date().getTime();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] == token) {
      if (data[i][4] > now) {
        return { valid: true, role: data[i][2], username: data[i][1], nisn: data[i][3] };
      } else {
        return { valid: false };
      }
    }
  }
  return { valid: false };
}

/* ==========================================================================
   5. DATA TRANSACTIONS & BUSINESS LOGIC
   ========================================================================== */

function getData(token) {
  const user = verifyUser(token);
  if (!user.valid) throw new Error("Unauthorized: Sesi login berakhir.");

  const ss = getSpreadsheet();

  let namaUser = '';
  const usersRaw = ss.getSheetByName('users').getDataRange().getValues();
  for (let i = 1; i < usersRaw.length; i++) {
    if (String(usersRaw[i][2]).toLowerCase() == String(user.username).toLowerCase()) {
      namaUser = usersRaw[i][1];
      break;
    }
  }

  const siswaRaw = ss.getSheetByName('siswa').getDataRange().getValues();
  const seenNisnData = new Set();
  const siswaData = siswaRaw.slice(1)
    .filter(r => {
      const n = String(r[0]);
      if (!n || seenNisnData.has(n)) return false;
      seenNisnData.add(n);
      return true;
    })
    .map(r => ({
      nisn: String(r[0]), nama: r[1], kelas: r[2], target: r[3], poin: parseInt(r[4]) || 0, badge: r[5]
    }));

  const setoranRaw = ss.getSheetByName('setoran').getDataRange().getValues();
  let setoranList = setoranRaw.slice(1).map(r => ({
    id: r[0], tanggal: formatDate(r[1]), waktu: formatTime(r[2]), nisn: String(r[3]), nama: r[4],
    kelas: r[5], juz: r[6], surat: r[7], ayat: r[8] + '-' + r[9],
    nilai: r[10], status: r[11], poin: parseInt(r[12]) || 0, guru: r[14]
  })).reverse();

  let dashboard = {};

  if (user.role === 'siswa') {
    setoranList = setoranList.filter(s => s.nisn == String(user.nisn));
    const myData = siswaData.find(s => s.nisn == String(user.nisn)) || {poin: 0, badge: 'Pemula'};
    const sortedAll = [...siswaData].sort((a,b) => b.poin - a.poin);
    const globalRank = sortedAll.findIndex(s => s.nisn == String(user.nisn)) + 1;

    dashboard = {
      total_poin: myData.poin,
      badge: myData.badge,
      global_rank: globalRank,
      recent_setoran: setoranList.slice(0, 10),
      chart_data: getPointsHistory(user.nisn)
    };
  } else {
    let guruKelasList = [];
    if (user.role === 'guru') {
      const usersData = ss.getSheetByName('users').getDataRange().getValues();
      for (let i = 1; i < usersData.length; i++) {
        if (String(usersData[i][2]).toLowerCase() == String(user.username).toLowerCase()) {
          const raw = String(usersData[i][5] || '').trim();
          if (raw && raw !== '-') {
            guruKelasList = raw.split(',').map(k => k.trim()).filter(k => k);
          }
          break;
        }
      }
    }

    const isFiltered = user.role === 'guru' && guruKelasList.length > 0;
    const kelasSet   = new Set(guruKelasList);

    const siswaFiltered = isFiltered
      ? siswaData.filter(s => kelasSet.has(String(s.kelas)))
      : siswaData;

    const nisnSet = new Set(siswaFiltered.map(s => String(s.nisn)));
    const setoranFiltered = isFiltered
      ? setoranList.filter(s => nisnSet.has(String(s.nisn)))
      : setoranList;

    dashboard = {
      total_siswa:    siswaFiltered.length,
      total_setoran:  setoranFiltered.length,
      recent_setoran: setoranFiltered.slice(0, 20),
      top_siswa:      [...siswaFiltered].sort((a,b) => b.poin - a.poin).slice(0, 5),
      siswa_list:     siswaFiltered,
      guru_kelas:     guruKelasList.join(', '),
      chart_data:     getAdminChartData(setoranFiltered)
    };
  }

  return { role: user.role, username: user.username, nama: namaUser, data: dashboard };
}

const PENILAIAN_TAHFIZH = {
  nilai: { 'A': 60, 'A-': 55, 'B+': 50, 'B': 45, 'B-': 40, 'C+': 35, 'C': 30, 'C-': 25, 'D': 20 },
  kelancaran: { 'Sangat Lancar': 40, 'Lancar': 30, 'Cukup Lancar': 20, 'Belum Lancar': 10 }
};

function addSetoran(token, form) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const user = verifyUser(token);
    if (!user.valid || user.role === 'siswa') return { status: 'error', message: 'Unauthorized' };

    const ss = getSpreadsheet();
    const setoranSheet = ss.getSheetByName('setoran');
    const siswaSheet   = ss.getSheetByName('siswa');

    const poinNilai = PENILAIAN_TAHFIZH.nilai[form.nilai] !== undefined ? PENILAIAN_TAHFIZH.nilai[form.nilai] : 50;
    const poinKelancaran = PENILAIAN_TAHFIZH.kelancaran[form.status] !== undefined ? PENILAIAN_TAHFIZH.kelancaran[form.status] : 20;
    const poin = poinNilai + poinKelancaran;

    const now = new Date();
    const idSetoran = 'STR-' + Utilities.getUuid().slice(0, 8);
    const timeStr = Utilities.formatDate(now, 'Asia/Jakarta', 'HH:mm');

    setoranSheet.appendRow([
      idSetoran,
      now,
      timeStr,
      form.nisn,
      form.nama_siswa,
      form.kelas,
      form.juz,
      form.surat,
      form.ayat_dari,
      form.ayat_sampai,
      form.nilai,
      form.status,
      poin,
      form.catatan || '',
      user.username
    ]);

    const siswaData = siswaSheet.getDataRange().getValues();
    let found = false;

    for (let i = 1; i < siswaData.length; i++) {
      if (String(siswaData[i][0]) === String(form.nisn)) {
        const currentPoin = parseInt(siswaData[i][4]) || 0;
        const newTotal    = currentPoin + poin;
        const newBadge    = calculateBadge(newTotal);

        siswaSheet.getRange(i + 1, 5).setValue(newTotal);
        siswaSheet.getRange(i + 1, 6).setValue(newBadge);
        found = true;
        break;
      }
    }

    if (!found) return { status: 'error', message: 'Siswa tidak ditemukan.' };

    return { status: 'success', message: 'Setoran berhasil disimpan. +' + poin + ' Poin!' };
  } catch (e) {
    return { status: 'error', message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function calculateBadge(poin) {
  if (poin >= 5000) return '👑 Bintang Tahfizh';
  if (poin >= 2000) return '🥇 Hafizh Teladan';
  if (poin >= 1000) return '🥈 Hafizh Berkembang';
  if (poin >= 500)  return '🥉 Hafizh Pemula';
  return 'Pemula';
}

function getPointsHistory(nisn) {
  const ss   = getSpreadsheet();
  const data = ss.getSheetByName('setoran').getDataRange().getValues();
  let points = [];
  let labels = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3]) == String(nisn)) {
      var tglDate = (data[i][1] instanceof Date) ? data[i][1] : new Date(data[i][1]);
      labels.push(Utilities.formatDate(tglDate, "Asia/Jakarta", "dd/MM"));
      points.push(data[i][12]);
    }
  }
  return { labels: labels.slice(-7), data: points.slice(-7) };
}

function getAdminChartData(setoranList) {
  const ss   = getSpreadsheet();
  const data = ss.getSheetByName('setoran').getDataRange().getValues();
  const nisnSet = new Set(setoranList.map(s => String(s.nisn)));
  const monthMap = {};

  for (let i = 1; i < data.length; i++) {
    const nisn = String(data[i][3]);
    if (!nisnSet.has(nisn)) continue;

    const tgl = data[i][1];
    if (!tgl) continue;
    const d = (tgl instanceof Date) ? tgl : new Date(tgl);
    if (isNaN(d)) continue;

    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    monthMap[key] = (monthMap[key] || 0) + (parseInt(data[i][12]) || 0);
  }

  const sorted = Object.keys(monthMap).sort();
  const last7  = sorted.slice(-7);

  const labels = last7.map(k => {
    const parts = k.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
      .toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
  });

  const values = last7.map(k => monthMap[k]);
  return { labels: labels, data: values };
}

function getLeaderboardData() {
  ensureDatabaseReady();
  const ss   = getSpreadsheet();
  const data = ss.getSheetByName('siswa').getDataRange().getValues();
  const seenNisn = new Set();
  let students = data.slice(1)
    .filter(r => {
      const n = String(r[0]);
      if (!n || seenNisn.has(n)) return false;
      seenNisn.add(n);
      return true;
    })
    .map(r => ({ nisn: String(r[0]), nama: r[1], kelas: r[2], poin: parseInt(r[4]) || 0, badge: r[5] }));

  students.sort((a, b) => b.poin - a.poin);
  return students;
}

function formatDate(date) {
  if (!date) return "";
  try {
    var d = (date instanceof Date) ? date : new Date(date);
    return Utilities.formatDate(d, "Asia/Jakarta", "dd MMM yyyy");
  } catch(e) {
    return String(date);
  }
}

function formatTime(time) {
  if (!time) return "";
  if (time instanceof Date) return Utilities.formatDate(time, "Asia/Jakarta", "HH:mm");
  return String(time);
}

function getSiswaProgress(token) {
  const user = verifyUser(token);
  if (!user.valid || user.role === 'siswa') throw new Error("Unauthorized");

  const ss = getSpreadsheet();
  let kelasList = [];
  if (user.role === 'guru') {
    const usersData = ss.getSheetByName('users').getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (String(usersData[i][2]).toLowerCase() == String(user.username).toLowerCase()) {
        const raw = String(usersData[i][5] || '').trim();
        if (raw && raw !== '-') kelasList = raw.split(',').map(k => k.trim()).filter(Boolean);
        break;
      }
    }
  }
  const kelasSet   = new Set(kelasList);
  const isFiltered = user.role === 'guru' && kelasList.length > 0;

  const siswaRaw = ss.getSheetByName('siswa').getDataRange().getValues();
  const seenNisn = new Set();

  const siswaList = siswaRaw.slice(1)
    .filter(r => {
      const n = String(r[0]);
      if (!n || seenNisn.has(n)) return false;
      seenNisn.add(n);
      return true;
    })
    .filter(r => !isFiltered || kelasSet.has(String(r[2])))
    .map(r => ({
      nisn:           String(r[0]),
      nama:           r[1],
      kelas:          r[2],
      target:         r[3],
      poin:           parseInt(r[4]) || 0,
      badge:          r[5],
      setoran:        [],
      jumlah_setoran: 0,
      last_setoran:   ''
    }));

  const setoranRaw = ss.getSheetByName('setoran').getDataRange().getValues();
  const nisnMap    = {};
  siswaList.forEach(s => { nisnMap[s.nisn] = s; });

  for (let i = 1; i < setoranRaw.length; i++) {
    const r    = setoranRaw[i];
    const nisn = String(r[3]);
    if (!nisnMap[nisn]) continue;
    nisnMap[nisn].setoran.push({
      tanggal: formatDate(r[1]),
      waktu:   formatTime(r[2]),
      juz:     r[6],
      surat:   r[7],
      ayat:    r[8] + '-' + r[9],
      nilai:   r[10],
      status:  r[11],
      poin:    parseInt(r[12]) || 0,
      guru:    r[14]
    });
  }

  siswaList.forEach(s => {
    s.jumlah_setoran = s.setoran.length;
    s.last_setoran   = s.setoran.length ? s.setoran[s.setoran.length - 1].tanggal : '';
  });

  return siswaList;
}

function getKelas(token) {
  const user = verifyUser(token);
  if (!user.valid || user.role !== 'admin') throw new Error("Unauthorized");
  const ss   = getSpreadsheet();
  const data = ss.getSheetByName('kelas').getDataRange().getValues();
  return data.slice(1).map(r => ({ id: r[0], nama: r[1] })).filter(r => r.id);
}

function saveKelas(token, nama) {
  const user = verifyUser(token);
  if (!user.valid || user.role !== 'admin') return { status: 'error', message: 'Unauthorized' };
  nama = (nama || '').trim();
  if (!nama) return { status: 'error', message: 'Nama kelas tidak boleh kosong' };

  const ss    = getSpreadsheet();
  const sheet = ss.getSheetByName('kelas');
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === nama.toLowerCase()) {
      return { status: 'error', message: 'Kelas "' + nama + '" sudah ada.' };
    }
  }
  const newId = 'KLS-' + Utilities.getUuid().slice(0, 6);
  sheet.appendRow([newId, nama]);
  return { status: 'success', message: 'Kelas "' + nama + '" berhasil ditambahkan.', id: newId };
}

function deleteKelas(token, kelasId) {
  const user = verifyUser(token);
  if (!user.valid || user.role !== 'admin') return { status: 'error', message: 'Unauthorized' };

  const ss    = getSpreadsheet();
  const sheet = ss.getSheetByName('kelas');
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == kelasId) {
      const nama = data[i][1];
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Kelas "' + nama + '" dihapus.' };
    }
  }
  return { status: 'error', message: 'Kelas tidak ditemukan.' };
}

function getUsers(token) {
  const user = verifyUser(token);
  if (!user.valid || user.role !== 'admin') throw new Error("Unauthorized");

  const ss        = getSpreadsheet();
  const usersData = ss.getSheetByName('users').getDataRange().getValues();
  const siswaData = ss.getSheetByName('siswa').getDataRange().getValues();

  const guru  = [];
  const siswa = [];

  for (let i = 1; i < usersData.length; i++) {
    const row  = usersData[i];
    const role = row[4];
    if (role === 'admin') continue;

    const entry = {
      id:       row[0],
      nama:     row[1],
      username: row[2],
      role:     role,
      kelas:    row[5]
    };

    if (role === 'siswa') {
      for (let j = 1; j < siswaData.length; j++) {
        if (String(siswaData[j][0]) === String(row[2]) || siswaData[j][1] === row[1]) {
          entry.nisn   = siswaData[j][0];
          entry.target = siswaData[j][3];
          break;
        }
      }
      siswa.push(entry);
    } else {
      guru.push(entry);
    }
  }

  return { guru, siswa };
}

function saveUser(token, form) {
  const user = verifyUser(token);
  if (!user.valid || user.role !== 'admin') return { status: 'error', message: 'Unauthorized' };

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss         = getSpreadsheet();
    const usersSheet = ss.getSheetByName('users');
    const usersData  = usersSheet.getDataRange().getValues();

    if (form.role === 'siswa' && form.nisn) {
      form.username = String(form.nisn);
    }

    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][2] == form.username && usersData[i][0] != form.id) {
        return { status: 'error', message: 'NIP/NISN "' + form.username + '" sudah digunakan.' };
      }
    }

    if (form.id) {
      for (let i = 1; i < usersData.length; i++) {
        if (usersData[i][0] == form.id) {
          usersSheet.getRange(i + 1, 2).setValue(form.nama);
          usersSheet.getRange(i + 1, 3).setValue(form.username);
          if (form.password) usersSheet.getRange(i + 1, 4).setValue(form.password);
          usersSheet.getRange(i + 1, 6).setValue(form.kelas || '-');

          if (form.role === 'siswa') {
            const siswaSheet = ss.getSheetByName('siswa');
            const siswaData  = siswaSheet.getDataRange().getValues();
            for (let j = 1; j < siswaData.length; j++) {
              if (String(siswaData[j][0]) == String(form.nisn) || siswaData[j][1] == usersData[i][1]) {
                siswaSheet.getRange(j + 1, 1).setValue(form.nisn);
                siswaSheet.getRange(j + 1, 2).setValue(form.nama);
                siswaSheet.getRange(j + 1, 3).setValue(form.kelas || '-');
                siswaSheet.getRange(j + 1, 4).setValue(form.target || 30);
                break;
              }
            }
          }
          return { status: 'success', message: 'Data user berhasil diperbarui.' };
        }
      }
      return { status: 'error', message: 'User tidak ditemukan.' };

    } else {
      const newId = 'USR-' + Utilities.getUuid().slice(0, 8);
      usersSheet.appendRow([
        newId, form.nama, form.username, form.password, form.role, form.kelas || '-'
      ]);

      if (form.role === 'siswa') {
        const siswaSheet = ss.getSheetByName('siswa');
        const existingSiswa = siswaSheet.getDataRange().getValues();
        let nisnSudahAda = false;
        for (let i = 1; i < existingSiswa.length; i++) {
          if (String(existingSiswa[i][0]) == String(form.nisn)) {
            nisnSudahAda = true;
            break;
          }
        }
        if (!nisnSudahAda) {
          siswaSheet.appendRow([
            form.nisn, form.nama, form.kelas || '-', form.target || 30, 0, 'Pemula'
          ]);
        }
      }

      return { status: 'success', message: 'User baru berhasil ditambahkan.' };
    }

  } catch(e) {
    return { status: 'error', message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

function deleteUser(token, userId) {
  const user = verifyUser(token);
  if (!user.valid || user.role !== 'admin') return { status: 'error', message: 'Unauthorized' };

  const ss         = getSpreadsheet();
  const usersSheet = ss.getSheetByName('users');
  const usersData  = usersSheet.getDataRange().getValues();

  for (let i = 1; i < usersData.length; i++) {
    if (usersData[i][0] == userId) {
      const role = usersData[i][4];
      const nama = usersData[i][1];

      if (role === 'admin') return { status: 'error', message: 'Akun admin tidak dapat dihapus.' };

      usersSheet.deleteRow(i + 1);

      if (role === 'siswa') {
        const siswaSheet = ss.getSheetByName('siswa');
        const siswaData  = siswaSheet.getDataRange().getValues();
        for (let j = siswaData.length - 1; j >= 1; j--) {
          if (siswaData[j][1] === nama) {
            siswaSheet.deleteRow(j + 1);
          }
        }
      }
      return { status: 'success', message: '"' + nama + '" berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'User tidak ditemukan.' };
}

function getMySetoran(token) {
  const user = verifyUser(token);
  if (!user.valid || user.role !== 'siswa') throw new Error("Unauthorized");

  const ss   = getSpreadsheet();
  const data = ss.getSheetByName('setoran').getDataRange().getValues();

  let result = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][3]) == String(user.nisn)) {
      result.push({
        id:      data[i][0],
        tanggal: formatDate(data[i][1]),
        waktu:   formatTime(data[i][2]),
        juz:     data[i][6],
        surat:   data[i][7],
        ayat:    data[i][8] + '-' + data[i][9],
        nilai:   data[i][10],
        status:  data[i][11],
        poin:    parseInt(data[i][12]) || 0,
        catatan: data[i][13],
        guru:    data[i][14]
      });
    }
  }
  result.reverse();
  return result;
}

function changePassword(token, oldPass, newPass) {
  const user = verifyUser(token);
  if (!user.valid) return { status: 'error', message: 'Session expired' };

  const ss    = getSpreadsheet();
  const sheet = ss.getSheetByName('users');
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][2]).toLowerCase() == String(user.username).toLowerCase() && data[i][3] == oldPass) {
      sheet.getRange(i + 1, 4).setValue(newPass);
      return { status: 'success', message: 'Password berhasil diubah' };
    }
  }
  return { status: 'error', message: 'Password lama salah' };
}

function fixDuplicateSiswa() {
  const ss         = getSpreadsheet();
  const siswaSheet = ss.getSheetByName('siswa');
  const data       = siswaSheet.getDataRange().getValues();

  const seen    = new Set();
  let   deleted = 0;

  for (let i = data.length - 1; i >= 1; i--) {
    const nisn = String(data[i][0]);
    if (!nisn) continue;
    if (seen.has(nisn)) {
      siswaSheet.deleteRow(i + 1);
      deleted++;
    } else {
      seen.add(nisn);
    }
  }
  return 'Selesai. ' + deleted + ' baris duplikat dihapus.';
}

function getLaporanData(token, filterKelas) {
  const user = verifyUser(token);
  if (!user.valid || user.role === 'siswa') throw new Error("Unauthorized");

  const ss = getSpreadsheet();

  let kelasDiizinkan = [];
  if (user.role === 'guru') {
    const usersData = ss.getSheetByName('users').getDataRange().getValues();
    for (let i = 1; i < usersData.length; i++) {
      if (String(usersData[i][2]).toLowerCase() == String(user.username).toLowerCase()) {
        const raw = String(usersData[i][5] || '').trim();
        if (raw && raw !== '-') kelasDiizinkan = raw.split(',').map(k => k.trim()).filter(Boolean);
        break;
      }
    }
  }
  const isGuru = user.role === 'guru';
  const kelasRaw  = ss.getSheetByName('kelas').getDataRange().getValues();
  const semuaKelas = kelasRaw.slice(1).map(r => r[1]).filter(Boolean);

  let kelasList = [];
  if (filterKelas === 'semua') {
    kelasList = isGuru ? kelasDiizinkan : semuaKelas;
  } else {
    if (isGuru && !kelasDiizinkan.includes(filterKelas)) {
      throw new Error("Unauthorized: kelas tidak sesuai");
    }
    kelasList = [filterKelas];
  }

  const kelasSet = new Set(kelasList);
  const siswaRaw = ss.getSheetByName('siswa').getDataRange().getValues();
  const seenNisn = new Set();
  const siswaMap = {};

  siswaRaw.slice(1).forEach(r => {
    const nisn = String(r[0]);
    if (!nisn || seenNisn.has(nisn)) return;
    if (!kelasSet.has(String(r[2]))) return;
    seenNisn.add(nisn);
    siswaMap[nisn] = {
      nisn: nisn, nama: r[1], kelas: r[2],
      target: r[3], total_poin: parseInt(r[4]) || 0, badge: r[5],
      setoran: []
    };
  });

  const setoranRaw = ss.getSheetByName('setoran').getDataRange().getValues();
  setoranRaw.slice(1).forEach(r => {
    const nisn = String(r[3]);
    if (!siswaMap[nisn]) return;
    siswaMap[nisn].setoran.push({
      tanggal:  formatDate(r[1]),
      waktu:    formatTime(r[2]),
      juz:      r[6],
      surat:    r[7],
      ayat:     r[8] + '-' + r[9],
      nilai:    r[10],
      status:   r[11],
      poin:     parseInt(r[12]) || 0,
      catatan:  r[13],
      guru:     r[14]
    });
  });

  const perKelas = {};
  Object.values(siswaMap).forEach(s => {
    if (!perKelas[s.kelas]) perKelas[s.kelas] = [];
    perKelas[s.kelas].push(s);
  });
  Object.keys(perKelas).forEach(k => {
    perKelas[k].sort((a, b) => b.total_poin - a.total_poin);
    perKelas[k].forEach((s, i) => { s.ranking_kelas = i + 1; });
  });

  const globalSorted = Object.values(siswaMap).sort((a, b) => b.total_poin - a.total_poin);
  globalSorted.forEach((s, i) => { s.ranking_global = i + 1; });

  return {
    kelas_tersedia:    isGuru ? kelasDiizinkan : semuaKelas,
    kelas_dipilih:     kelasList,
    siswa:             Object.values(siswaMap),
    generated_at:      Utilities.formatDate(new Date(), "Asia/Jakarta", "dd MMM yyyy HH:mm"),
    generated_by:      user.username
  };
}
