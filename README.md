# Bazar Idul Fitri Muslim Ruhr 2026

Landing page statis untuk promosi dan pendaftaran stand bazar dengan:
- section stall dinamis,
- animasi gerobak saat scroll,
- share social media,
- preview/download PDF di modal,
- QR code form pendaftaran,
- SEO meta tags untuk GitHub Pages.

## Struktur Proyek

```text
/
  index.html
  styles.css
  main.js
  site.webmanifest
  /assets
    bg-hero.jpg
    bg-stall-1.jpg ... bg-stall-7.jpg
    gerobak-bakso.png
    favicon.svg
  /data
    stalls.js
  /components
    stall-slide.js
  /modules
    qr.js
    motion-engine.js
    share-actions.js
    pdf-export.js
```

## Arsitektur Singkat

- `data/stalls.js`
  Sumber data utama: judul situs, subtitle, URL Google Form, dan daftar stall.
- `components/stall-slide.js`
  Web Component untuk render section stall yang berulang.
- `modules/qr.js`
  Generator QR lokal (tanpa API eksternal).
- `modules/share-actions.js`
  Logic tombol share WhatsApp/Telegram/Facebook/X.
- `modules/pdf-export.js`
  Pipeline PDF (modal progress, cache `sessionStorage`, preview/download).
- `modules/motion-engine.js`
  Utility easing/lerp/smoothing untuk animasi.
- `main.js`
  Orchestrator aplikasi: build section, state scroll, gerobak animation, init modul.

## Fitur Utama

- Stall section dinamis dari data.
- Google Form embed + fallback tombol buka tab baru.
- QR code otomatis dari URL form.
- Share halaman ke social media.
- Export PDF:
  - proses di modal (bukan tab baru),
  - progress bar real-time + info halaman,
  - cache Base64 di `sessionStorage` agar klik berikutnya tidak regenerate,
  - halaman pertama punya header,
  - setiap halaman ada stempel gerobak (tinggi 5 cm),
  - URL form di halaman terakhir bisa diklik.
- SEO metadata: description, Open Graph, Twitter card, favicon, manifest.

## Cara Menjalankan Lokal

```bash
python3 -m http.server 3001
```

Buka: `http://localhost:3001`

## Cara Edit Konten

### 1. Ubah Data Stall

Edit `data/stalls.js`:
- `SITE.title`
- `SITE.subtitle`
- `SITE.googleFormUrl`
- array `STALLS`

Setiap stall:
- `label`
- `title`
- `subtitle`
- `description`
- `background`
- `accents`
- `gerobakTransform` (`scale`, `rotateDeg`)

### 2. Ubah URL Form Pendaftaran

Edit:

```js
googleFormUrl: "https://forms.gle/...."
```

Dampak otomatis:
- iframe form,
- tombol fallback,
- URL form di halaman terakhir PDF,
- QR code.

### 3. Ubah Tampilan Section Stall

Edit `components/stall-slide.js` jika ingin ubah struktur HTML card stall.

### 4. Ubah Share Text / Network

Edit `main.js` (bagian `initShareAndPdfActions`) untuk teks campaign.
Edit `modules/share-actions.js` jika ingin menambah/mengubah network.

### 5. Ubah Pipeline PDF

Edit `modules/pdf-export.js` untuk:
- style dan flow modal,
- progress behavior,
- cache key `sessionStorage`,
- komposisi PDF (background/content/header/stamp).

### 6. Ubah Animasi

- `modules/motion-engine.js`: fungsi easing/smoothing.
- `main.js`: state dan aturan pergerakan gerobak.

## Panduan Aset Gambar

Rekomendasi:
- `bg-stall-*.jpg`, `bg-hero.jpg`: sekitar 1600-1920 px lebar, kompres < 400 KB.
- `gerobak-bakso.png`: transparan, kualitas baik, ukuran terkompres.

Jika ganti nama file, update path di `data/stalls.js`.

## Deploy GitHub Pages

1. Push ke `main`.
2. GitHub Repo -> `Settings` -> `Pages`.
3. Source: `Deploy from a branch`.
4. Branch: `main`, folder: `/ (root)`.
5. Tunggu deployment selesai.

## Catatan Teknis

- Preferensi `prefers-reduced-motion` otomatis dihormati.
- Cache PDF disimpan per sesi browser (tab/session saat ini).
- Jika `googleFormUrl` berubah, cache PDF lama diabaikan dan PDF dibuat ulang.

## License

Proyek ini open source di bawah lisensi **Apache License 2.0**.  
Lihat detail lisensi di file [`LICENSE`](LICENSE).
