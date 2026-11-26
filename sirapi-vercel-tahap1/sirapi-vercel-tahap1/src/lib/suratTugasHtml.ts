export interface SuratTugasParams {
  nop: string;
  tiket: string;
  nama: string;
  nik: string;
  role: string;
  site: string;
  keperluan: string;
  desc: string;
  jarak: string;
  tglPjb: string;
  tglBerangkat: string;
  tglKembali: string;
  lamaHari: number;
  totalUm: number;
  lat1: string;
  lon1: string;
  lat2: string;
  lon2: string;
  urlUm1: string;
  urlUm2: string;
  urlUm3: string;
  urlUm4: string;
}

export function buildSuratTugasHtml(p: SuratTugasParams): string {
  const isPbu = p.nop.toLowerCase().includes("pangkalan");
  const kota = isPbu ? "Pangkalan Bun" : "Palangka Raya";
  const koorNama = isPbu ? "Roni Yudi Iswanto" : "Okta Pradika";
  const koorJab = isPbu ? "Koordinator NOP Pangkalan Bun" : "Koordinator NOP Palangka Raya";
  const koorNik = isPbu ? "-" : "B0924649";
  const parts = p.tglPjb.split("/");
  const monthIdx = parseInt(parts[1] || "11", 10);
  const year = parts[2] || "2026";
  const romawiList = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const romawi = romawiList[monthIdx] || "XI";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Surat Tugas & PJB - ${p.tiket}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; margin: 0; background: #525659; }
    @page { size: A4; margin: 0; }
    .page {
      width: 210mm; min-height: 297mm; background: white; margin: 10mm auto;
      padding: 15mm 20mm; box-sizing: border-box; box-shadow: 0 0 10px rgba(0,0,0,0.4);
      page-break-after: always; position: relative;
    }
    h3 { text-align: center; font-size: 14pt; margin-bottom: 15px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 11pt; }
    .tbl-info td { padding: 3px 5px; vertical-align: top; }
    .tbl-data th, .tbl-data td { border: 1px solid black; padding: 6px; text-align: center; }
    .tbl-uang td, .tbl-uang th { border: 1px solid black; padding: 6px; }
    .signature { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
    .signature div { width: 45%; }
    .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; }
    .photo-item { text-align: center; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
    .photo-item img { width: 100%; max-height: 250px; object-fit: contain; }
    .brand-top { text-align: right; font-family: Arial, sans-serif; font-weight: 800; color: #1E293B; margin-bottom: 12px; }
    @media print { body { background: white; } .page { margin: 0; box-shadow: none; width: 100%; } }
  </style>
</head>
<body>
  <div class="page">
    <div class="brand-top">PT. KINARYA UTAMA TEKNIK</div>
    <h3 style="letter-spacing: 5px;"><u>SURAT TUGAS</u></h3>
    <p>Saya yang bertanda tangan di bawah ini:</p>
    <table class="tbl-info" style="width: 75%;">
      <tr><td width="150">Nama</td><td width="10">:</td><td>${koorNama}</td></tr>
      <tr><td>NIK</td><td>:</td><td>${koorNik}</td></tr>
      <tr><td>Jabatan</td><td>:</td><td>${koorJab}</td></tr>
    </table>
    <p>Dengan ini menugaskan sebagai berikut :</p>
    <table class="tbl-data">
      <tr><th>No.</th><th>Nama</th><th>NIK</th><th>Jabatan</th><th>Lokasi Kerja</th></tr>
      <tr><td>1</td><td>${p.nama}</td><td>${p.nik}</td><td>${p.role}</td><td>${p.site}</td></tr>
    </table>
    <table class="tbl-info">
      <tr><td width="150">No Ticket</td><td width="10">:</td><td>${p.tiket}</td></tr>
      <tr><td>Tujuan</td><td>:</td><td>${p.site}</td></tr>
      <tr><td>Estimasi Jarak</td><td>:</td><td><b>${p.jarak}</b></td></tr>
      <tr><td>Lama tugas dinas</td><td>:</td><td>${p.lamaHari} Hari</td></tr>
      <tr><td>Tgl. Berangkat</td><td>:</td><td>${p.tglBerangkat}</td></tr>
      <tr><td>Tgl. Kembali</td><td>:</td><td>${p.tglKembali}</td></tr>
      <tr><td>Keperluan</td><td>:</td><td>${p.keperluan}</td></tr>
    </table>
    <div style="text-align: right; margin-top: 30px;">${kota}, ${p.tglPjb}</div>
    <div class="signature">
      <div><p>${koorJab},</p><br><br><br><p><b><u>${koorNama}</u></b><br>NIK. ${koorNik}</p></div>
      <div><p>POH. SPV Operation,</p><br><br><br><p><b><u>Rian Sharon</u></b><br>NIK. 79058</p></div>
    </div>
  </div>

  <div class="page">
    <div class="brand-top">PT. KINARYA UTAMA TEKNIK</div>
    <h3><u>SURAT PENGAJUAN UANG MAKAN</u></h3>
    <div style="text-align:center; margin-top:-12px; margin-bottom:18px;">Nomor : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; /KUT/${romawi}/${year}</div>
    <table class="tbl-info" style="width: 75%;">
      <tr><td width="150">Nama</td><td width="10">:</td><td>${p.nama}</td></tr>
      <tr><td>NIK</td><td>:</td><td>${p.nik}</td></tr>
      <tr><td>Jabatan</td><td>:</td><td>${p.role}</td></tr>
    </table>
    <table class="tbl-data">
      <tr><th>No.</th><th>Tujuan Tugas</th><th>Berangkat</th><th>Kembali</th><th>Uraian Penugasan</th></tr>
      <tr><td>1</td><td>${p.site}</td><td>${p.tglBerangkat}</td><td>${p.tglKembali}</td><td>${p.desc}</td></tr>
    </table>
    <div style="margin-top: 12px;"><b>Peta Satelit Rute Perjalanan:</b><div id="map" style="height:240px; width:100%; border:1px solid #475569; border-radius:8px; margin-top:5px;"></div></div>
    <table class="tbl-uang" style="margin-top:15px;">
      <tr style="background:#f0f0f0;"><th colspan="3">Bantuan Perjalanan Dinas</th><th colspan="2">Perhitungan</th><th>Jumlah</th></tr>
      <tr><td colspan="3">Uang Makan (${p.nama})</td><td align="center">${p.lamaHari} Hari (Lumpsum)</td><td width="30">Rp.</td><td align="right">${p.totalUm.toLocaleString("id-ID")}</td></tr>
      <tr><th colspan="5" align="right">Jumlah Total</th><th align="right">Rp. ${p.totalUm.toLocaleString("id-ID")}</th></tr>
    </table>
    <div class="signature">
      <div><p>${koorJab},</p><br><br><br><p><b><u>${koorNama}</u></b><br>NIK. ${koorNik}</p></div>
      <div><p>POH. SPV Operation,</p><br><br><br><p><b><u>Rian Sharon</u></b><br>NIK. 79058</p></div>
    </div>
  </div>

  <div class="page">
    <div class="brand-top">PT. KINARYA UTAMA TEKNIK</div>
    <h3><u>LAMPIRAN FOTO AKTIVITAS LAPANGAN</u></h3>
    <div class="photo-grid">
      <div class="photo-item"><img src="${p.urlUm1}" /><br><b>Foto Aktivitas 1</b></div>
      <div class="photo-item"><img src="${p.urlUm2}" /><br><b>Foto Aktivitas 2</b></div>
      <div class="photo-item"><img src="${p.urlUm3}" /><br><b>Foto Aktivitas 3</b></div>
      <div class="photo-item"><img src="${p.urlUm4}" /><br><b>Foto Aktivitas 4</b></div>
    </div>
  </div>
  <script>
    window.onload = function() {
      var lat1 = parseFloat("${p.lat1}"), lon1 = parseFloat("${p.lon1}");
      var lat2 = parseFloat("${p.lat2}"), lon2 = parseFloat("${p.lon2}");
      if (lat1 && lat2 && !isNaN(lat1) && !isNaN(lat2)) {
        var map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        var line = L.polyline([[lat1, lon1], [lat2, lon2]], { color: 'red', weight: 4 }).addTo(map);
        L.marker([lat1, lon1]).addTo(map); L.marker([lat2, lon2]).addTo(map);
        map.fitBounds(line.getBounds(), { padding: [30, 30] });
        setTimeout(function() { window.print(); }, 1200);
      } else {
        document.getElementById('map').innerHTML = '<div style="text-align:center;padding-top:95px;color:#94a3b8;">Koordinat peta tidak tersedia</div>';
        setTimeout(function() { window.print(); }, 500);
      }
    };
  </script>
</body>
</html>`;
}
