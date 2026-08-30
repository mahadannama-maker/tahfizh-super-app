/**
 * Tahfizh Super App - Smart Backend Google Apps Script (GAS)
 * Compatible with both default sheets and existing MJ Official spreadsheets.
 */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  let sheetSantri = getSantriSheet(ss);
  if (!sheetSantri) {
    sheetSantri = ss.insertSheet("Santri");
    sheetSantri.appendRow(["ID Santri", "Nama Santri", "Kelas/Halaqah", "Target Juz", "Status"]);
  }

  let sheetSetoran = getSetoranSheet(ss);
  if (!sheetSetoran) {
    sheetSetoran = ss.insertSheet("Setoran");
    sheetSetoran.appendRow(["ID Setoran", "Tanggal", "Nama Santri", "Surah", "Ayat Mula", "Ayat Akhir", "Nilai/Predikat", "Catatan Ustadz", "Penguji"]);
  }
}

function getSantriSheet(ss) {
  return ss.getSheetByName("Santri") || ss.getSheetByName("santri") || ss.getSheetByName("siswa") || ss.getSheetByName("users");
}

function getSetoranSheet(ss) {
  return ss.getSheetByName("setoran") || ss.getSheetByName("Setoran") || ss.getSheetByName("SETORAN");
}

function getUsersSheet(ss) {
  return ss.getSheetByName("users") || ss.getSheetByName("Users") || ss.getSheetByName("USERS");
}

function doGet(e) {
  // Jika dibuka langsung lewat browser tanpa parameter API, alihkan langsung ke PWA resmi!
  const isApiRequest = e && e.parameter && (e.parameter.api === 'true' || e.parameter.json === 'true' || e.parameter.format === 'json');
  
  if (!isApiRequest) {
    const htmlRedirect = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Membuka Tahfizh Super App...</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; items-align: center; justify-content: center; min-height: 100vh; margin: 0; background: #0f766e; color: white; text-align: center; padding: 20px; }
          .card { background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 20px; padding: 30px; border: 1px solid rgba(255,255,255,0.2); max-width: 380px; margin: auto; }
          h2 { margin-top: 10px; font-size: 20px; }
          p { font-size: 13px; opacity: 0.9; }
          a { display: inline-block; margin-top: 15px; background: white; color: #0f766e; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: bold; font-size: 13px; }
        </style>
        <script>
          setTimeout(function() {
            window.location.href = "https://mahadannama-maker.github.io/tahfizh-super-app/";
          }, 300);
        </script>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 48px;">📖</div>
          <h2>Tahfizh Super App</h2>
          <p>Mohon tunggu sebentar, Anda sedang dialihkan ke aplikasi PWA resmi...</p>
          <a href="https://mahadannama-maker.github.io/tahfizh-super-app/">Buka Aplikasi Sekarang &rarr;</a>
        </div>
      </body>
      </html>
    `;
    return HtmlService.createHtmlOutput(htmlRedirect)
      .setTitle("Tahfizh Super App")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Ambil Data Users (Authentication)
    const sheetUsers = getUsersSheet(ss);
    const usersData = [];
    if (sheetUsers) {
      const rows = sheetUsers.getDataRange().getValues();
      const headers = rows[0] ? rows[0].map(h => String(h).toLowerCase().trim()) : [];

      const idxId = headers.findIndex(h => h === "id");
      const idxNama = headers.findIndex(h => h === "nama");
      const idxNip = headers.findIndex(h => h.includes("nip") || h.includes("nisn") || h.includes("username"));
      const idxPwd = headers.findIndex(h => h.includes("password") || h.includes("pass"));
      const idxRole = headers.findIndex(h => h.includes("role"));
      const idxKelas = headers.findIndex(h => h.includes("kelas") || h.includes("halaqah"));

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] || (idxNama !== -1 && rows[i][idxNama])) {
          usersData.push({
            id: String(idxId !== -1 ? rows[i][idxId] : rows[i][0]),
            nama: String(idxNama !== -1 ? rows[i][idxNama] : rows[i][1]),
            nip_nisn: String(idxNip !== -1 ? rows[i][idxNip] : rows[i][2]),
            password: String(idxPwd !== -1 ? rows[i][idxPwd] : rows[i][3]),
            role: String(idxRole !== -1 ? rows[i][idxRole] : rows[i][4]).toLowerCase(),
            kelas: String(idxKelas !== -1 ? rows[i][idxKelas] : rows[i][5])
          });
        }
      }
    }

    // 2. Ambil Data Santri
    const sheetSantri = getSantriSheet(ss);
    const santriData = [];
    if (sheetSantri) {
      const rows = sheetSantri.getDataRange().getValues();
      const headers = rows[0] ? rows[0].map(h => String(h).toLowerCase()) : [];
      
      const idxNama = headers.findIndex(h => h.includes("nama"));
      const idxHalaqah = headers.findIndex(h => h.includes("kelas") || h.includes("halaqah"));
      const idxTarget = headers.findIndex(h => h.includes("target") || h.includes("juz"));

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] || (idxNama !== -1 && rows[i][idxNama])) {
          santriData.push({
            id: rows[i][0] || "STR" + i,
            nama: idxNama !== -1 ? rows[i][idxNama] : rows[i][1],
            halaqah: idxHalaqah !== -1 ? rows[i][idxHalaqah] : "Halaqah Santri",
            targetJuz: idxTarget !== -1 ? rows[i][idxTarget] : "30",
            status: "Aktif"
          });
        }
      }
    }

    // 3. Ambil Data Setoran
    const sheetSetoran = getSetoranSheet(ss);
    const setoranData = [];
    if (sheetSetoran) {
      const rows = sheetSetoran.getDataRange().getValues();
      const headers = rows[0] ? rows[0].map(h => String(h).toLowerCase().trim()) : [];

      const idxId = headers.findIndex(h => h.includes("id"));
      const idxTanggal = headers.findIndex(h => h.includes("tanggal"));
      const idxNama = headers.findIndex(h => h.includes("nama"));
      const idxSurah = headers.findIndex(h => h.includes("surat") || h.includes("surah"));
      const idxAyatStart = headers.findIndex(h => h.includes("ayat_dari") || h.includes("mula") || h.includes("dari"));
      const idxAyatEnd = headers.findIndex(h => h.includes("ayat_sampai") || h.includes("akhir") || h.includes("sampai"));
      const idxNilai = headers.findIndex(h => h.includes("nilai"));
      const idxCatatan = headers.findIndex(h => h.includes("catatan"));
      const idxPenguji = headers.findIndex(h => h.includes("penguji") || h.includes("ustadz"));

      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][0] || (idxNama !== -1 && rows[i][idxNama])) {
          const tgl = idxTanggal !== -1 ? rows[i][idxTanggal] : rows[i][1];
          setoranData.push({
            id: String(idxId !== -1 ? rows[i][idxId] : rows[i][0]),
            tanggal: tgl instanceof Date ? tgl.toLocaleDateString("id-ID") : String(tgl),
            namaSantri: idxNama !== -1 ? rows[i][idxNama] : rows[i][2],
            surah: idxSurah !== -1 ? rows[i][idxSurah] : rows[i][3],
            ayatStart: idxAyatStart !== -1 ? rows[i][idxAyatStart] : rows[i][4],
            ayatEnd: idxAyatEnd !== -1 ? rows[i][idxAyatEnd] : rows[i][5],
            nilai: idxNilai !== -1 ? rows[i][idxNilai] : (rows[i][6] || "Mumtaz (A)"),
            catatan: idxCatatan !== -1 ? rows[i][idxCatatan] : rows[i][7],
            penguji: idxPenguji !== -1 ? rows[i][idxPenguji] : "Ustadz"
          });
        }
      }
    }

    const response = {
      status: "success",
      summary: {
        totalSantri: santriData.length,
        totalUsers: usersData.length,
        totalSetoran: setoranData.length,
        lastUpdate: new Date().toISOString()
      },
      users: usersData,
      santri: santriData,
      setoran: setoranData
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetSetoran = getSetoranSheet(ss);
    
    if (!sheetSetoran) {
      setupSheet();
      sheetSetoran = getSetoranSheet(ss);
    }

    let postData = {};
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      postData = e.parameter;
    }

    const idSetoran = "STR-" + Date.now();
    const now = new Date();
    const tanggal = postData.tanggal || now.toLocaleDateString("id-ID");
    const waktu = now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    const namaSantri = postData.namaSantri || "-";
    const surah = postData.surah || "-";
    const ayatStart = postData.ayatStart || 1;
    const ayatEnd = postData.ayatEnd || 1;
    const nilai = postData.nilai || "Mumtaz (A)";
    const catatan = postData.catatan || "-";
    const penguji = postData.penguji || "Ustadz";

    // Deteksi Struktur Kolom Sheet
    const headers = sheetSetoran.getRange(1, 1, 1, sheetSetoran.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim());
    
    // Jika format sheet MJ Official
    if (headers.includes("surat") || headers.includes("ayat_dari") || headers.includes("nisn")) {
      const newRow = new Array(headers.length).fill("-");
      
      headers.forEach((h, idx) => {
        if (h.includes("id")) newRow[idx] = idSetoran;
        else if (h === "tanggal") newRow[idx] = tanggal;
        else if (h === "waktu") newRow[idx] = waktu;
        else if (h === "nama") newRow[idx] = namaSantri;
        else if (h === "surat" || h === "surah") newRow[idx] = surah;
        else if (h === "ayat_dari" || h === "mula") newRow[idx] = ayatStart;
        else if (h === "ayat_sampai" || h === "akhir") newRow[idx] = ayatEnd;
        else if (h === "nilai") newRow[idx] = nilai;
        else if (h === "catatan") newRow[idx] = catatan;
        else if (h === "status") newRow[idx] = "Sangat Lancar";
        else if (h === "poin") newRow[idx] = 10;
        else if (h === "penguji") newRow[idx] = penguji;
      });

      sheetSetoran.appendRow(newRow);
    } else {
      // Format Standar
      sheetSetoran.appendRow([
        idSetoran,
        tanggal,
        namaSantri,
        surah,
        ayatStart,
        ayatEnd,
        nilai,
        catatan,
        penguji
      ]);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Setoran hafalan berhasil disimpan!",
      idSetoran: idSetoran
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
