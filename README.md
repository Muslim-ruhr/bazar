# Bazaar Marketplace — Idul Fitri Festival 2026

Landing page statis untuk GitHub Pages dengan animasi **Gerobak Bakso** yang berpindah antar section saat scroll.

## Struktur Proyek

```
/
  index.html
  styles.css
  main.js
  /data
    stalls.js
  /assets
    gerobak-bakso.png
    bg-hero.jpg
    bg-stall-1.jpg
    bg-stall-2.jpg
    bg-stall-3.jpg
    bg-stall-4.jpg
    bg-stall-5.jpg
    bg-stall-6.jpg
```

## Cara Ganti Gambar di `/assets`

1. Siapkan file gambar baru.
2. Timpa file lama dengan nama yang sama di folder `/assets`.
3. Rekomendasi ukuran:
   - `gerobak-bakso.png`: lebar 1000-1400 px, background transparan.
   - `bg-hero.jpg` dan `bg-stall-*.jpg`: minimal 1920x1080 px (landscape), ukuran file < 500 KB per gambar agar ringan.
4. Jika nama file diganti, update path `background` pada objek stall di `data/stalls.js`.

## Cara Edit Konten Stall (Paling Penting)

Semua konten stall ada di **satu file**: `data/stalls.js`.

Setiap objek stall berisi:
- `label`
- `title`
- `subtitle`
- `description`
- `background`
- `accents` (2-3 warna)
- `gerobakTransform` (`xVw`, `yVh`, `scale`, `rotateDeg`)

Tambah/hapus stall cukup tambah/hapus objek pada array `STALLS`. Section dan nav dots akan otomatis mengikuti.

## Cara Ganti URL Google Form

Buka `data/stalls.js`, lalu ubah:

```js
googleFormUrl: "https://forms.gle/REPLACE_ME"
```

Tautan ini dipakai oleh semua tombol **Daftar Buka Stall**.

## Deploy ke GitHub Pages

1. Push semua file ke branch `main` di repository GitHub.
2. Masuk ke repository di GitHub.
3. Buka **Settings** -> **Pages**.
4. Pada **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/ (root)**
5. Simpan. Tunggu proses deploy selesai.
6. URL GitHub Pages akan muncul di halaman yang sama.

## Catatan Aksesibilitas & Motion

- Jika user mengaktifkan **prefers-reduced-motion**, animasi transisi gerobak disederhanakan (langsung ke posisi target), efek sparkles juga dikurangi.
- Scroll snap aktif default di desktop dan dibuat lebih ringan di mobile.
