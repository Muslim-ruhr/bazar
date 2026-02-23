(function () {
  const SITE = {
    title: "Bazaar Muslim Ruhr",
    subtitle: "Lebaran Idul Fitri 2026",
    googleFormUrl: "https://forms.gle/n2jsDC3xkXYszFY58"
  };

  const STALLS = [
    {
      label: "Keluarga Muslim Rhein-Ruhr Mempersembahkan",
      title: "Jajanan Pasar Indonesia",
      subtitle: "Makanan, Minuman segar, Cendramata dan jajanan khar tanah air favorit keluarga.",
      description:
        "Buka booth Jualan/bisnis Anda di area paling ramai pengunjung. Cocok untuk souvenir, makanan menu manis, gurih, dan minuman kekinian saat momen lebaran.",
      background: "assets/bg-stall-1.jpg",
      accents: ["#1d8b5f", "#f8c95b", "#35a7ff"],
      gerobakTransform: { xVw: 12, yVh: 62, scale: 0.92, rotateDeg: -6 }
    },
    {
      label: "Favorit Lebaran",
      title: "Booth Kue Kering",
      subtitle: "Nastar, kastengel, putri salju, hingga kreasi premium.",
      description:
        "Tampilkan varian kue kering andalan Anda dan tarik pembeli untuk hampers, bingkisan keluarga, hingga pesanan kantor.",
      background: "assets/bg-stall-2.jpg",
      accents: ["#0b4f6c", "#ffd166", "#f566b4"],
      gerobakTransform: { xVw: 66, yVh: 58, scale: 0.95, rotateDeg: 5 }
    },
    {
      label: "Gaya Hari Raya",
      title: "Booth Fashion Muslim",
      subtitle: "Busana muslim modern untuk dewasa dan anak.",
      description:
        "Perkenalkan koleksi gamis, koko, hijab, dan aksesori terbaru menjelang Idul Fitri. Cocok untuk brand lokal maupun reseller.",
      background: "assets/bg-stall-3.jpg",
      accents: ["#146356", "#f8c95b", "#f59e0b"],
      gerobakTransform: { xVw: 18, yVh: 48, scale: 1.02, rotateDeg: -3 }
    },
    {
      label: "Hadiah Istimewa",
      title: "Booth Parsel Lebaran",
      subtitle: "Parsel premium untuk keluarga, relasi, dan korporat.",
      description:
        "Jual paket parsel siap kirim dengan tampilan eksklusif. Area ini ditujukan untuk produk hampers, buah, snack, dan souvenir.",
      background: "assets/bg-stall-4.jpg",
      accents: ["#1f4e5f", "#f4b400", "#fb7185"],
      gerobakTransform: { xVw: 64, yVh: 46, scale: 1.0, rotateDeg: 4 }
    },
    {
      label: "Produk Lokal",
      title: "Booth Kerajinan",
      subtitle: "Karya handmade bernilai seni untuk hampers dan dekorasi.",
      description:
        "Dari anyaman, lilin aromaterapi, hingga dekor rumah, booth kerajinan memberi ruang untuk produk kreatif bernilai tambah.",
      background: "assets/bg-stall-5.jpg",
      accents: ["#0f766e", "#facc15", "#60a5fa"],
      gerobakTransform: { xVw: 14, yVh: 36, scale: 0.98, rotateDeg: -4 }
    },
    {
      label: "Zona Keluarga",
      title: "Booth Mainan Anak",
      subtitle: "Mainan edukatif, hadiah lebaran, dan aktivitas seru anak.",
      description:
        "Undang keluarga berkunjung lebih lama dengan booth mainan anak yang aman, menarik, dan interaktif selama festival berlangsung.",
      background: "assets/bg-stall-6.jpg",
      accents: ["#2563eb", "#f59e0b", "#ec4899"],
      gerobakTransform: { xVw: 62, yVh: 34, scale: 1.05, rotateDeg: 6 }
    }
  ];

  window.SITE = SITE;
  window.STALLS = STALLS;
})();
