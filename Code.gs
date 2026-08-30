/**
 * Tahfizh Super App - Backend Google Apps Script (GAS)
 * 
 * CARA PENGGUNAAN:
 * 1. Buka Google Sheets baru di https://sheets.google.com
 * 2. Klik Ekstensi -> Apps Script
 * 3. Hapus semua kode yang ada, lalu tempelkan seluruh isi file ini
 * 4. Jalankan fungsi 'setupSheet' sekali untuk membuat tabel awal otomatis
 * 5. Klik 'Terapkan' (Deploy) -> 'Terapkan sebagai Web app' (New Deployment)
 *    - Jalankan sebagai: Saya (Me)
 *    - Yang memiliki akses: Siapa saja (Anyone)
 * 6. Salin URL Web App yang dihasilkan dan masukkan ke menu Pengaturan di aplikasi PWA Anda!
 */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Sheet Santri
  let sheetSantri = ss.getSheetByName("Santri");
  if (!sheetSantri) {
    sheetSantri = ss.insertSheet("Santri");
    sheetSantri.appendRow(["ID Santri", "Nama Santri", "Kelas/Halaqah", "Target Juz", "Status"]);
    sheetSantri.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#d1fae5");
    sheetSantri.appendRow(["STR001", "Ahmad Fauzi", "Halaqah Al-Fatih", "30", "Aktif"]);
    sheetSantri.appendRow(["STR002", "Muhammad Zaki", "Halaqah Al-Fatih", "30", "Aktif"]);
    sheetSantri.appendRow(["STR003", "Siti Aisyah", "Halaqah An-Nur", "29", "Aktif"]);
    sheetSantri.appendRow(["STR004", "Umar Faruq", "Halaqah An-Nur", "30", "Aktif"]);
  }

  // 2. Sheet Setoran
  let sheetSetoran = ss.getSheetByName("Setoran");
  if (!sheetSetoran) {
    sheetSetoran = ss.insertSheet("Setoran");
    sheetSetoran.appendRow(["ID Setoran", "Tanggal", "Nama Santri", "Surah", "Ayat Mula", "Ayat Akhir", "Nilai/Predikat", "Catatan Ustadz", "Penguji"]);
    sheetSetoran.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#d1fae5");
    sheetSetoran.appendRow(["STR-1001", new Date().toLocaleDateString("id-ID"), "Ahmad Fauzi", "An-Naba'", 1, 40, "Mumtaz (A)", "Lancar, pertahankan tajwid", "Ustadz H. Abdullah"]);
    sheetSetoran.appendRow(["STR-1002", new Date().toLocaleDateString("id-ID"), "Muhammad Zaki", "An-Nazi'at", 1, 26, "Jayyid Jiddan (B+)", "Perhatikan ghunnah di ayat 15", "Ustadz H. Abdullah"]);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Ambil Data Santri
    const sheetSantri = ss.getSheetByName("Santri");
    const santriData = [];
    if (sheetSantri) {
      const rows = sheetSantri.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0]) {
          santriData.push({
            id: rows[i][0],
            nama: rows[i][1],
            halaqah: rows[i][2],
            targetJuz: rows[i][3],
            status: rows[i][4]
          });
        }
      }
    }

    // Ambil Data Setoran
    const sheetSetoran = ss.getSheetByName("Setoran");
    const setoranData = [];
    if (sheetSetoran) {
      const rows = sheetSetoran.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) { // Urutkan terbaru di atas
        if (rows[i][0]) {
          setoranData.push({
            id: rows[i][0],
            tanggal: rows[i][1] instanceof Date ? rows[i][1].toLocaleDateString("id-ID") : rows[i][1],
            namaSantri: rows[i][2],
            surah: rows[i][3],
            ayatStart: rows[i][4],
            ayatEnd: rows[i][5],
            nilai: rows[i][6],
            catatan: rows[i][7],
            penguji: rows[i][8]
          });
        }
      }
    }

    const response = {
      status: "success",
      summary: {
        totalSantri: santriData.length,
        totalSetoran: setoranData.length,
        lastUpdate: new Date().toISOString()
      },
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
    let sheetSetoran = ss.getSheetByName("Setoran");
    
    if (!sheetSetoran) {
      setupSheet();
      sheetSetoran = ss.getSheetByName("Setoran");
    }

    let postData = {};
    if (e.postData && e.postData.contents) {
      postData = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      postData = e.parameter;
    }

    const idSetoran = "STR-" + Date.now();
    const tanggal = postData.tanggal || new Date().toLocaleDateString("id-ID");
    const namaSantri = postData.namaSantri || "-";
    const surah = postData.surah || "-";
    const ayatStart = postData.ayatStart || 1;
    const ayatEnd = postData.ayatEnd || 1;
    const nilai = postData.nilai || "Mumtaz (A)";
    const catatan = postData.catatan || "-";
    const penguji = postData.penguji || "Ustadz";

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
