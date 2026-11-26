# SiRAPI KUT — Vercel Fast Edition (Tahap 1: Portal Tim Lapangan)

Aplikasi Web modern **Next.js 14 + Tailwind CSS** untuk menggantikan beban Streamlit bagi **200 teknisi lapangan**, dengan **100% pola data Google Sheets & Cloudinary yang sama persis** seperti SiRAPI versi Streamlit (`App-v4.py`).

## Fitur yang Sudah Tersedia di Tahap 1
1. **Beranda Utama (Seragam HP & Web + PWA):**
   - Pilihan area **NOP Palangkaraya**, **NOP Pangkalan Bun**, **Tarakan**, dan **Pontianak**.
   - **Cek Status Tiket Pribadi** & **Daftar Tim Belum PJB (Tiket Pending)** real-time dari Google Sheets.
2. **Form Request Dana (`/request`):**
   - Multi-split sub-tiket (`[MOBIL]`, `[MOBIL-1/2]`, `[MOTOR]`, `[GENSET]` Solar & **Genset Portable Pertalite/Pertamax**, `[UM]`, `[INAP]`, `[MATERIAL]`, `[SUPPORT]`, `[FERY]`, `[KLOTOK]`).
   - Pilihan **SPBU vs Eceran** dengan validasi harga aktual ketat + tombol minta Approval Harga BBM / Limit Motor / Izin Revisi.
   - Wajib **Kapasitas Tangki** (1x / 2x Pengisian), **Live Kontrol KM/RH** anti salah titik/koma + 5 histori terakhir per plat/genset (terhubung ke tab `Master KM RH` & melewati tiket `REJECTED`).
   - Aturan **Uang Makan System Lock** (Pekerjaan Atas ganti RRU `<80 KM` = Rp 30.000/org; PP `>80 KM` Berat = Rp 60.000/org, Ringan = Rp 30.000/org).
   - **Direct Upload Foto ke Cloudinary** (dikompresi otomatis di HP sebelum dikirim).
   - **Generator Laporan WA (Tanpa Nominal)** siap salin & kirim.
3. **Form PJB Operasional (`/pjb`):**
   - Tabel sub-tiket pending dengan kunci urutan tahap 1 -> tahap 2.
   - Wajib Bukti Transfer, **Kalkulasi Jarak Nopol & Odometer Terakhir**, validasi silang `Liter × Harga vs Total Fisik Nota`.
   - Khusus Eceran: **2 Foto Wajib Eceran + Analisa AI di browser** (cek resolusi, ketajaman, kecerahan & anti-duplikat SHA-256).
   - Khusus Akomodasi UM: 4 Foto Aktivitas + **Cetak Surat Tugas & Pengajuan Uang Makan A4 (3 Halaman + Peta Leaflet)**.
   - Menulis tepat **24 kolom** ke `Form Request dana` dan tepat **40 kolom** ke `Form PJB` + `Approval BBM`.

---

## Cara Deploy ke Vercel (5 Menit, Gratis)

1. **Buat Repositori Baru di GitHub** (disarankan **Private**), misalnya `sirapi-vercel`.
2. **Ekstrak file ZIP ini** dan upload seluruh isinya ke repositori GitHub tersebut.
3. Buka **[vercel.com](https://vercel.com)** → **Add New Project** → pilih repo `sirapi-vercel`.
4. Pada menu **Environment Variables**, masukkan 4 variabel berikut (sama seperti di Streamlit Secrets Anda):
   - `GCP_JSON` → Paste seluruh isi JSON *Service Account* Google (`{"type":"service_account",...}`) dalam 1 baris.
   - `CLOUDINARY_CLOUD_NAME` → `ji9i1hei`
   - `CLOUDINARY_API_KEY` → `277523771179144`
   - `CLOUDINARY_API_SECRET` → *(isi API Secret Cloudinary Anda)*
   *(Opsional cadangan: `CLOUDINARY_BACKUP_CLOUD_NAME`, `CLOUDINARY_BACKUP_API_KEY`, `CLOUDINARY_BACKUP_API_SECRET`)*
5. Klik **Deploy** dan tunggu ± 1 menit. Link Vercel langsung aktif dan berjalan **paralel** dengan link Streamlit lama karena mengakses Google Sheets yang sama persis!

## Opsional: Menambahkan Daftar Site Palangkaraya (`Hasil_910_Site.xlsx`)
Saat ini `src/data/sites.json` sudah memuat 875 site dari `Site ID Sidata Pangkalanbun.xlsx`. Untuk menggabungkan site Palangkaraya:
1. Letakkan `Hasil_910_Site.xlsx` dan `Site ID Sidata Pangkalanbun.xlsx` di folder utama proyek.
2. Jalankan `python scripts/convert_excel_to_json.py`, lalu commit & push `src/data/sites.json` ke GitHub.
