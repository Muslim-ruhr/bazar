(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const xClamp = { min: 8, max: 72 };
  const yClamp = { min: 18, max: 74 };

  const app = document.getElementById("app");
  const topbar = document.querySelector(".topbar");
  const navDots = document.getElementById("navDots");
  const backToTop = document.getElementById("backToTop");
  const ctaTop = document.getElementById("ctaTop");
  const titleEl = document.getElementById("siteTitle");
  const subtitleEl = document.getElementById("siteSubtitle");
  const gerobak = document.getElementById("gerobak");
  const gerobakImg = gerobak.querySelector("img");
  const loadingScreen = document.getElementById("loadingScreen");
  const loadingBarFill = document.getElementById("loadingBarFill");
  const loadingPercent = document.getElementById("loadingPercent");
  const loadingText = document.getElementById("loadingText");

  const SITE = window.SITE || {
    title: "Bazaar Marketplace",
    subtitle: "Idul Fitri Festival 2026",
    googleFormUrl: "https://forms.gle/REPLACE_ME"
  };
  const STALLS = Array.isArray(window.STALLS) ? window.STALLS : [];
  let sectionElements = [];
  let loadingProgress = 0;
  let fitTextRaf = 0;

  if (!STALLS.length) {
    app.innerHTML =
      '<section class="festival-section"><div class="section-content"><h2>Data stall belum tersedia.</h2></div></section>';
    hideLoadingScreen();
    return;
  }

  titleEl.textContent = SITE.title;
  subtitleEl.textContent = SITE.subtitle;
  ctaTop.href = "#section-form";
  ctaTop.removeAttribute("target");
  ctaTop.removeAttribute("rel");
  setLoadingProgress(4, "Menyiapkan halaman...");

  function toEmbedFormUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    if (raw.includes("embedded=true")) return raw;
    if (raw.includes("/viewform")) {
      return raw.includes("?") ? `${raw}&embedded=true` : `${raw}?embedded=true`;
    }
    return raw;
  }

  function getLandingPageUrl() {
    return `${window.location.origin}${window.location.pathname}`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createQrMatrixV3L(text) {
    const encoder = new TextEncoder();
    const input = encoder.encode(String(text || ""));
    const maxBytes = 53;
    if (!input.length || input.length > maxBytes) return null;

    const dataCodewordsCount = 55;
    const eccCodewordsCount = 15;
    const size = 29;
    const alignCenter = 22;

    const bits = [];
    bits.push(0, 1, 0, 0);
    for (let i = 7; i >= 0; i -= 1) bits.push((input.length >> i) & 1);
    for (const b of input) {
      for (let i = 7; i >= 0; i -= 1) bits.push((b >> i) & 1);
    }
    const maxDataBits = dataCodewordsCount * 8;
    const terminator = Math.min(4, maxDataBits - bits.length);
    for (let i = 0; i < terminator; i += 1) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    const data = [];
    for (let i = 0; i < bits.length; i += 8) {
      let v = 0;
      for (let j = 0; j < 8; j += 1) v = (v << 1) | bits[i + j];
      data.push(v);
    }
    const pads = [0xec, 0x11];
    for (let i = data.length; i < dataCodewordsCount; i += 1) data.push(pads[i % 2]);

    const gfExp = new Uint16Array(512);
    const gfLog = new Uint16Array(256);
    let x = 1;
    for (let i = 0; i < 255; i += 1) {
      gfExp[i] = x;
      gfLog[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (let i = 255; i < 512; i += 1) gfExp[i] = gfExp[i - 255];
    const gfMul = (a, b) => {
      if (a === 0 || b === 0) return 0;
      return gfExp[gfLog[a] + gfLog[b]];
    };

    const polyMul = (a, b) => {
      const out = new Array(a.length + b.length - 1).fill(0);
      for (let i = 0; i < a.length; i += 1) {
        for (let j = 0; j < b.length; j += 1) {
          out[i + j] ^= gfMul(a[i], b[j]);
        }
      }
      return out;
    };

    let gen = [1];
    for (let i = 0; i < eccCodewordsCount; i += 1) {
      gen = polyMul(gen, [1, gfExp[i]]);
    }

    const msg = data.concat(new Array(eccCodewordsCount).fill(0));
    for (let i = 0; i < data.length; i += 1) {
      const coef = msg[i];
      if (coef === 0) continue;
      for (let j = 0; j < gen.length; j += 1) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
    const codewords = data.concat(msg.slice(msg.length - eccCodewordsCount));

    const modules = Array.from({ length: size }, () => Array(size).fill(null));
    const isFn = Array.from({ length: size }, () => Array(size).fill(false));
    const setFn = (r, c, dark) => {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      modules[r][c] = !!dark;
      isFn[r][c] = true;
    };

    const drawFinder = (r, c) => {
      for (let y = -1; y <= 7; y += 1) {
        for (let x2 = -1; x2 <= 7; x2 += 1) {
          const rr = r + y;
          const cc = c + x2;
          if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
          const border = y === -1 || y === 7 || x2 === -1 || x2 === 7;
          const ring = y === 0 || y === 6 || x2 === 0 || x2 === 6;
          const core = y >= 2 && y <= 4 && x2 >= 2 && x2 <= 4;
          setFn(rr, cc, !border && (ring || core));
        }
      }
    };

    const drawAlign = (centerR, centerC) => {
      for (let y = -2; y <= 2; y += 1) {
        for (let x2 = -2; x2 <= 2; x2 += 1) {
          const rr = centerR + y;
          const cc = centerC + x2;
          const border = Math.abs(y) === 2 || Math.abs(x2) === 2;
          const dot = y === 0 && x2 === 0;
          setFn(rr, cc, border || dot);
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);
    drawAlign(alignCenter, alignCenter);

    for (let i = 8; i < size - 8; i += 1) {
      setFn(6, i, i % 2 === 0);
      setFn(i, 6, i % 2 === 0);
    }
    setFn(size - 8, 8, true);

    for (let i = 0; i < 9; i += 1) {
      if (i !== 6) {
        setFn(8, i, false);
        setFn(i, 8, false);
      }
    }
    for (let i = size - 8; i < size; i += 1) {
      setFn(8, i, false);
      setFn(i, 8, false);
    }

    const bitStream = [];
    for (const cw of codewords) {
      for (let i = 7; i >= 0; i -= 1) bitStream.push((cw >> i) & 1);
    }

    let bitIdx = 0;
    let upward = true;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      for (let rowStep = 0; rowStep < size; rowStep += 1) {
        const row = upward ? size - 1 - rowStep : rowStep;
        for (let offset = 0; offset < 2; offset += 1) {
          const c = col - offset;
          if (isFn[row][c]) continue;
          modules[row][c] = bitIdx < bitStream.length ? bitStream[bitIdx] === 1 : false;
          bitIdx += 1;
        }
      }
      upward = !upward;
    }

    const maskFns = [
      (r, c) => (r + c) % 2 === 0,
      (r, c) => r % 2 === 0,
      (r, c) => c % 3 === 0,
      (r, c) => (r + c) % 3 === 0,
      (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
      (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
      (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
      (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
    ];

    const calcPenalty = (grid) => {
      let p = 0;
      for (let r = 0; r < size; r += 1) {
        let runColor = grid[r][0];
        let runLen = 1;
        for (let c = 1; c < size; c += 1) {
          if (grid[r][c] === runColor) runLen += 1;
          else {
            if (runLen >= 5) p += 3 + (runLen - 5);
            runColor = grid[r][c];
            runLen = 1;
          }
        }
        if (runLen >= 5) p += 3 + (runLen - 5);
      }
      for (let c = 0; c < size; c += 1) {
        let runColor = grid[0][c];
        let runLen = 1;
        for (let r = 1; r < size; r += 1) {
          if (grid[r][c] === runColor) runLen += 1;
          else {
            if (runLen >= 5) p += 3 + (runLen - 5);
            runColor = grid[r][c];
            runLen = 1;
          }
        }
        if (runLen >= 5) p += 3 + (runLen - 5);
      }
      for (let r = 0; r < size - 1; r += 1) {
        for (let c = 0; c < size - 1; c += 1) {
          const v = grid[r][c];
          if (v === grid[r][c + 1] && v === grid[r + 1][c] && v === grid[r + 1][c + 1]) p += 3;
        }
      }
      const isFinderLike = (arr, i) =>
        arr[i] &&
        !arr[i + 1] &&
        arr[i + 2] &&
        arr[i + 3] &&
        arr[i + 4] &&
        !arr[i + 5] &&
        arr[i + 6] &&
        !arr[i + 7] &&
        !arr[i + 8] &&
        !arr[i + 9] &&
        !arr[i + 10];
      for (let r = 0; r < size; r += 1) {
        const row = grid[r];
        for (let i = 0; i <= size - 11; i += 1) {
          if (isFinderLike(row, i) || isFinderLike([...row].reverse(), size - 11 - i)) p += 40;
        }
      }
      for (let c = 0; c < size; c += 1) {
        const col = [];
        for (let r = 0; r < size; r += 1) col.push(grid[r][c]);
        for (let i = 0; i <= size - 11; i += 1) {
          if (isFinderLike(col, i) || isFinderLike([...col].reverse(), size - 11 - i)) p += 40;
        }
      }
      let dark = 0;
      for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) if (grid[r][c]) dark += 1;
      const total = size * size;
      const k = Math.floor(Math.abs((dark * 100) / total - 50) / 5);
      p += k * 10;
      return p;
    };

    const applyMask = (base, maskId) =>
      base.map((row, r) =>
        row.map((v, c) => {
          if (isFn[r][c]) return v;
          return maskFns[maskId](r, c) ? !v : v;
        })
      );

    const formatBits = (maskId) => {
      const levelL = 0b01;
      const data5 = (levelL << 3) | maskId;
      let bitsVal = data5 << 10;
      const g = 0x537;
      for (let i = 14; i >= 10; i -= 1) {
        if ((bitsVal >> i) & 1) bitsVal ^= g << (i - 10);
      }
      return ((data5 << 10) | (bitsVal & 0x3ff)) ^ 0x5412;
    };

    const drawFormatBits = (grid, bitsVal) => {
      const bit = (i) => ((bitsVal >> i) & 1) === 1;
      const a = [
        [8, 0],
        [8, 1],
        [8, 2],
        [8, 3],
        [8, 4],
        [8, 5],
        [8, 7],
        [8, 8],
        [7, 8],
        [5, 8],
        [4, 8],
        [3, 8],
        [2, 8],
        [1, 8],
        [0, 8]
      ];
      const b = [
        [size - 1, 8],
        [size - 2, 8],
        [size - 3, 8],
        [size - 4, 8],
        [size - 5, 8],
        [size - 6, 8],
        [size - 7, 8],
        [size - 8, 8],
        [8, size - 8],
        [8, size - 7],
        [8, size - 6],
        [8, size - 5],
        [8, size - 4],
        [8, size - 3],
        [8, size - 2]
      ];
      for (let i = 0; i < 15; i += 1) {
        const [r1, c1] = a[i];
        const [r2, c2] = b[i];
        grid[r1][c1] = bit(i);
        grid[r2][c2] = bit(i);
      }
    };

    let bestGrid = null;
    let bestPenalty = Infinity;
    for (let maskId = 0; maskId < 8; maskId += 1) {
      const g = applyMask(modules, maskId);
      drawFormatBits(g, formatBits(maskId));
      const p = calcPenalty(g);
      if (p < bestPenalty) {
        bestPenalty = p;
        bestGrid = g;
      }
    }
    return bestGrid;
  }

  function qrMatrixToSvgDataUrl(matrix) {
    if (!matrix || !matrix.length) return "";
    const size = matrix.length;
    const margin = 2;
    const viewSize = size + margin * 2;
    let cells = "";
    for (let r = 0; r < size; r += 1) {
      for (let c = 0; c < size; c += 1) {
        if (matrix[r][c]) cells += `<rect x="${c + margin}" y="${r + margin}" width="1" height="1"/>`;
      }
    }
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges">` +
      `<rect width="100%" height="100%" fill="#fff"/>` +
      `<g fill="#000">${cells}</g></svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  }

  function setLoadingProgress(nextProgress, text) {
    const safe = clamp(Math.round(nextProgress), 0, 100);
    loadingProgress = Math.max(loadingProgress, safe);
    if (loadingBarFill) {
      loadingBarFill.style.width = `${loadingProgress}%`;
    }
    if (loadingPercent) {
      loadingPercent.textContent = `${loadingProgress}%`;
    }
    if (loadingText && text) {
      loadingText.textContent = text;
    }
  }

  function hideLoadingScreen() {
    if (!loadingScreen) {
      document.body.classList.remove("is-loading");
      return;
    }
    setLoadingProgress(100, "Siap");
    loadingScreen.classList.add("is-hidden");
    window.setTimeout(() => {
      if (loadingScreen && loadingScreen.parentNode) {
        loadingScreen.parentNode.removeChild(loadingScreen);
      }
      document.body.classList.remove("is-loading");
    }, 320);
  }

  function safeTransform(transform) {
    const t = transform || {};
    return {
      xVw: clamp(Number(t.xVw != null ? t.xVw : 50), xClamp.min, xClamp.max),
      yVh: clamp(Number(t.yVh != null ? t.yVh : 50), yClamp.min, yClamp.max),
      scale: clamp(Number(t.scale != null ? t.scale : 1), 0.72, 1.35),
      rotateDeg: clamp(Number(t.rotateDeg != null ? t.rotateDeg : 0), -12, 12),
      zPx: clamp(Number(t.zPx != null ? t.zPx : 80), 28, 180)
    };
  }

  function choose(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const layoutPattern = ["layout-center", "layout-right", "layout-left"];
  const typeChoices = [
    { className: "text-giant", gerobakScaleMult: 0.86, zPxBase: 94 },
    { className: "text-normal", gerobakScaleMult: 1.0, zPxBase: 120 },
    { className: "text-compact", gerobakScaleMult: 1.14, zPxBase: 148 }
  ];

  const SECTION_PROFILES = STALLS.map((_, index) => {
    const type = choose(typeChoices);
    const layoutClass = layoutPattern[index % layoutPattern.length];
    let gerobakScaleMult = type.gerobakScaleMult;
    if (layoutClass === "layout-center") {
      // Jika text di tengah, gerobak wajib lebih kecil.
      gerobakScaleMult = Math.min(gerobakScaleMult * 0.86, 0.92);
    }
    return {
      layoutClass,
      textClass: type.className,
      gerobakScaleMult,
      zPx: clamp(type.zPxBase + (Math.random() * 20 - 10), 32, 170)
    };
  });

  // Section pertama selalu teks di tengah (sesuai permintaan).
  SECTION_PROFILES[0].layoutClass = "layout-center";

  function between(min, max) {
    return min + Math.random() * (max - min);
  }

  function resolveLaneSpotBySection(index, total, layoutClass) {
    const isFirst = index === 0;
    const isLast = index === total - 1;
    const isEdge = isFirst || isLast;

    // First/last section: bottom lane. Middle sections: top lane.
    // Desktop rule: gerobak stop position must be opposite text alignment.
    let isRight;
    if (layoutClass === "layout-left") {
      isRight = true;
    } else if (layoutClass === "layout-right") {
      isRight = false;
    } else {
      isRight = index % 2 === 1;
    }

    const xBase = isRight ? 65 : 12;
    const yBase = isEdge ? 70 : 15;

    // Small deterministic offsets so path feels organic but stable.
    const xOffset = ((index * 7) % 5) - 2;
    const yOffset = ((index * 5) % 3) - 1;

    return {
      xVw: clamp(xBase + xOffset, xClamp.min, xClamp.max),
      yVh: clamp(yBase + yOffset, yClamp.min, yClamp.max)
    };
  }

  function resolveMobileCornerSpot(index, total, layoutClass) {
    const lastIndex = Math.max(0, total - 1);
    let isRight;
    if (layoutClass === "layout-left") {
      isRight = true;
    } else if (layoutClass === "layout-right") {
      isRight = false;
    } else {
      isRight = index % 2 === 1;
    }
    const isEdge = index <= 0 || index >= lastIndex;
    const yVh = isEdge ? 64 : 44;
    return { xVw: isRight ? 78 : 6, yVh, side: isRight ? "right" : "left" };
  }

  const GEROBAK_TARGETS = [];
  STALLS.forEach((stall, index) => {
    const profile = SECTION_PROFILES[index] || SECTION_PROFILES[0];
    const base = stall.gerobakTransform || {};
    const spot = resolveLaneSpotBySection(index, STALLS.length, profile.layoutClass);
    const resolved = safeTransform({
      xVw: spot.xVw,
      yVh: spot.yVh,
      scale: Number(base.scale != null ? base.scale : 1) * Number(profile.gerobakScaleMult != null ? profile.gerobakScaleMult : 1),
      rotateDeg: Number(base.rotateDeg != null ? base.rotateDeg : 0),
      zPx: profile.zPx
    });
    GEROBAK_TARGETS.push(resolved);
  });

  function getGerobakTarget(index) {
    const safeIndex = clamp(index, 0, GEROBAK_TARGETS.length - 1);
    return GEROBAK_TARGETS[safeIndex] || GEROBAK_TARGETS[0];
  }

  function buildSections() {
    const frag = document.createDocumentFragment();

    STALLS.forEach((stall, index) => {
      const profile = SECTION_PROFILES[index];
      const section = document.createElement("section");
      section.className = `festival-section${index === 0 ? " hero" : ""} ${profile.layoutClass}`;
      const mobileStopMeta = resolveMobileCornerSpot(index, STALLS.length, profile.layoutClass);
      section.classList.add(mobileStopMeta.side === "right" ? "stop-right" : "stop-left");
      const sectionTarget = getGerobakTarget(index);
      section.style.setProperty("--lamp-x", `${sectionTarget.xVw}%`);
      section.style.setProperty("--lamp-y", `${sectionTarget.yVh}%`);
      section.style.setProperty("--lamp-size", `${Math.round(360 * sectionTarget.scale)}px`);
      section.style.setProperty("--lamp-alpha", "0");
      section.id = `section-${index}`;
      section.dataset.index = String(index);
      section.dataset.title = stall.title || `Section ${index + 1}`;

      const bg = document.createElement("div");
      bg.className = "section-bg";
      const gradientBase = Array.isArray(stall.accents)
        ? `linear-gradient(135deg, ${stall.accents[0]}99, ${stall.accents[1]}88, ${stall.accents[2]}77)`
        : "linear-gradient(135deg, #1d8b5f99, #f8c95b88, #35a7ff77)";
      bg.style.backgroundImage = `${gradientBase}, url('${stall.background || "assets/bg-hero.jpg"}')`;

      const overlay = document.createElement("div");
      overlay.className = "section-overlay";

      const content = document.createElement("div");
      content.className = `section-content ${profile.textClass}`;
      const card = document.createElement("div");
      card.className = "section-card";

      const pill = document.createElement("span");
      pill.className = "stall-pill";
      pill.textContent = stall.label || "Stall";

      const h2 = document.createElement("h2");
      h2.textContent = stall.title || `Stall ${index + 1}`;

      const h3 = document.createElement("h3");
      h3.textContent = index === 0 ? SITE.subtitle : stall.subtitle || "Deskripsi singkat stall.";

      const p = document.createElement("p");
      p.textContent = stall.description || "Lengkapi deskripsi stall di data/stalls.js";

      const ctaWrap = document.createElement("div");
      ctaWrap.className = "section-cta";
      const cta = document.createElement("a");
      cta.className = "cta-btn";
      cta.href = "#section-form";
      cta.textContent = "Daftarkan Usaha";
      ctaWrap.appendChild(cta);
      card.append(pill, h2, h3, p);
      if (index !== 0) {
        card.append(ctaWrap);
      }
      content.append(card);

      if (index === 0) {
        const sparkles = document.createElement("div");
        sparkles.className = "hero-sparkles";
        section.append(sparkles);
      }

      const stopBox = document.createElement("div");
      stopBox.className = `stop-point-box ${mobileStopMeta.side === "right" ? "stop-right" : "stop-left"}`;
      stopBox.setAttribute("aria-hidden", "true");
      section.append(stopBox);

      section.append(bg, overlay, content);
      frag.appendChild(section);
    });

    const formSection = document.createElement("section");
    formSection.className = "festival-section form-section is-last";
    formSection.id = "section-form";
    formSection.dataset.index = String(STALLS.length);
    formSection.dataset.title = "Form Pendaftaran";
    formSection.style.setProperty("--lamp-alpha", "0");

    const formBg = document.createElement("div");
    formBg.className = "section-bg";
    formBg.style.backgroundImage =
      "linear-gradient(135deg, #0c5941cc, #145f82cc, #f8c95b66), url('assets/bg-hero.jpg')";

    const formOverlay = document.createElement("div");
    formOverlay.className = "section-overlay";

    const formContent = document.createElement("div");
    formContent.className = "section-content form-content text-normal";

    const formPill = document.createElement("span");
    formPill.className = "stall-pill";
    formPill.textContent = "Pendaftaran Online";

    const formTitle = document.createElement("h2");
    formTitle.textContent = "Form Daftar Booth Jualan";

    const formDesc = document.createElement("p");
    formDesc.textContent =
      "Isi form langsung di halaman ini. atau Jika embed tidak tampil, gunakan tombol buka di tab baru untuk membuka form asli.";

    const frameWrap = document.createElement("div");
    frameWrap.className = "form-embed-wrap";
    const iframe = document.createElement("iframe");
    iframe.className = "form-embed";
    iframe.title = "Google Form Pendaftaran Stall";
    iframe.loading = "lazy";
    iframe.referrerPolicy = "no-referrer-when-downgrade";
    iframe.src = toEmbedFormUrl(SITE.googleFormUrl);
    frameWrap.appendChild(iframe);

    const fallbackWrap = document.createElement("div");
    fallbackWrap.className = "section-cta";
    const fallbackBtn = document.createElement("a");
    fallbackBtn.className = "cta-btn cta-secondary";
    fallbackBtn.href = SITE.googleFormUrl;
    fallbackBtn.target = "_blank";
    fallbackBtn.rel = "noopener noreferrer";
    fallbackBtn.textContent = "Buka Form di Tab Baru";
    fallbackWrap.appendChild(fallbackBtn);

    const printAccess = document.createElement("div");
    printAccess.className = "print-form-access";

    const printAccessTitle = document.createElement("h3");
    printAccessTitle.textContent = "Akses Form Pendaftaran";

    const formUrl = String(SITE.googleFormUrl || "").trim();
    const printAccessLink = document.createElement("a");
    printAccessLink.className = "print-form-url";
    printAccessLink.href = formUrl || "#";
    printAccessLink.target = "_blank";
    printAccessLink.rel = "noopener noreferrer";
    printAccessLink.textContent = formUrl || "URL form belum diatur";

    const qrImg = document.createElement("img");
    qrImg.className = "print-form-qr";
    qrImg.alt = "QR code form pendaftaran";
    qrImg.loading = "lazy";
    if (formUrl) {
      const matrix = createQrMatrixV3L(formUrl);
      const qrDataUrl = qrMatrixToSvgDataUrl(matrix);
      if (qrDataUrl) {
        qrImg.src = qrDataUrl;
      } else {
        qrImg.style.display = "none";
      }
    } else {
      qrImg.style.display = "none";
    }

    printAccess.append(printAccessTitle, printAccessLink, qrImg);

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "share-actions";

    const shareTitle = document.createElement("h3");
    shareTitle.className = "share-title";
    shareTitle.textContent = "Bagikan Halaman Ini";

    const actionGrid = document.createElement("div");
    actionGrid.className = "share-grid";

    const shareIcons = {
      whatsapp: "https://cdn.simpleicons.org/whatsapp/ffffff",
      telegram: "https://cdn.simpleicons.org/telegram/ffffff",
      facebook: "https://cdn.simpleicons.org/facebook/ffffff",
      x: "https://cdn.simpleicons.org/x/ffffff"
    };
    ["whatsapp", "telegram", "facebook", "x"].forEach((network) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "share-btn";
      btn.dataset.shareNetwork = network;
      btn.title = `Share ke ${network.toUpperCase()}`;
      btn.setAttribute("aria-label", `Share ke ${network.toUpperCase()}`);
      const icon = document.createElement("img");
      icon.className = "share-icon";
      icon.src = shareIcons[network];
      icon.alt = "";
      icon.loading = "lazy";
      btn.appendChild(icon);
      actionGrid.appendChild(btn);
    });

    const pdfBtn = document.createElement("button");
    pdfBtn.type = "button";
    pdfBtn.className = "share-btn share-btn-pdf";
    pdfBtn.id = "downloadPdfBtn";
    pdfBtn.setAttribute("aria-label", "Download PDF");
    pdfBtn.textContent = "Download PDF";
    actionGrid.appendChild(pdfBtn);

    actionsWrap.append(shareTitle, actionGrid);

    formContent.append(formPill, formTitle, formDesc, frameWrap, fallbackWrap, printAccess, actionsWrap);
    formSection.append(formBg, formOverlay, formContent);
    frag.appendChild(formSection);

    app.appendChild(frag);
  }

  function fitSectionText(section) {
    if (!section) return;
    if (section.classList.contains("is-last")) return;
    const content = section.querySelector(".section-content");
    const card = section.querySelector(".section-card");
    if (!content || !card) return;

    content.style.setProperty("--content-font-scale", "1");

    const styles = window.getComputedStyle(content);
    const padTop = Number.parseFloat(styles.paddingTop) || 0;
    const padBottom = Number.parseFloat(styles.paddingBottom) || 0;
    const availableHeight = Math.max(140, content.clientHeight - padTop - padBottom - 6);
    const targetHeight = Math.max(120, availableHeight * 0.82);

    let scale = 1;
    const minScale = 0.62;
    while (card.getBoundingClientRect().height > targetHeight && scale > minScale) {
      scale = Math.max(minScale, scale - 0.03);
      content.style.setProperty("--content-font-scale", scale.toFixed(2));
    }
  }

  function fitAllSectionsText() {
    sectionElements.forEach((section) => fitSectionText(section));
  }

  function scheduleTextFit() {
    if (fitTextRaf) {
      window.cancelAnimationFrame(fitTextRaf);
    }
    fitTextRaf = window.requestAnimationFrame(() => {
      fitTextRaf = 0;
      fitAllSectionsText();
    });
  }

  function buildDots() {
    const frag = document.createDocumentFragment();
    sectionElements.forEach((section, index) => {
      const btn = document.createElement("button");
      btn.className = "nav-dot";
      btn.type = "button";
      btn.dataset.index = String(index);
      const title = section.dataset.title || `Section ${index + 1}`;
      btn.title = title;
      btn.setAttribute("aria-label", `Ke ${title}`);
      btn.addEventListener("click", () => {
        const target = sectionElements[index];
        if (target) {
          target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        }
      });
      frag.appendChild(btn);
    });

    navDots.appendChild(frag);
  }

  async function preloadImages(paths, onProgress) {
    const uniquePaths = Array.from(new Set((paths || []).filter(Boolean)));
    const total = uniquePaths.length;
    if (!total) {
      if (typeof onProgress === "function") onProgress(0, 0, "", true);
      return [];
    }

    let loaded = 0;
    const tasks = uniquePaths.map(
      (path) =>
        new Promise((resolve) => {
          const img = new Image();
          const done = (ok) => {
            loaded += 1;
            if (typeof onProgress === "function") {
              onProgress(loaded, total, path, ok);
            }
            resolve({ path, ok });
          };
          img.onload = () => done(true);
          img.onerror = () => done(false);
          img.src = path;
        })
    );

    return Promise.all(tasks);
  }

  function fallbackGerobak() {
    const svg = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 240"><rect width="420" height="240" fill="none"/><rect x="60" y="62" width="250" height="96" rx="12" fill="#ffd166" stroke="#14532d" stroke-width="8"/><rect x="294" y="74" width="64" height="74" rx="8" fill="#f59e0b" stroke="#14532d" stroke-width="8"/><line x1="44" y1="165" x2="372" y2="165" stroke="#14532d" stroke-width="9"/><circle cx="118" cy="186" r="25" fill="#0b3f2f"/><circle cx="274" cy="186" r="25" fill="#0b3f2f"/><text x="90" y="122" font-family="Arial" font-weight="700" font-size="34" fill="#14532d">BAKSO</text></svg>'
    );
    gerobakImg.src = `data:image/svg+xml;charset=UTF-8,${svg}`;
  }

  const initialTarget = getGerobakTarget(0);
  gerobak.style.setProperty("--glow-rgb", "255, 214, 102");

  const motion = {
    current: initialTarget,
    start: initialTarget,
    target: initialTarget,
    startTime: performance.now(),
    duration: 760,
    active: !reduceMotion,
    bobOffset: Math.random() * Math.PI * 2,
    jumpBoost: 0,
    crossesCenter: false,
    viaX: 44,
    viaY: 50,
    stopIndex: 0
  };
  const renderState = {
    xVw: initialTarget.xVw,
    yVh: initialTarget.yVh,
    scale: initialTarget.scale,
    rotateDeg: initialTarget.rotateDeg,
    zPx: initialTarget.zPx
  };
  let prevTs = performance.now();
  let lastRenderTs = 0;
  let rafId = 0;
  let animationLoopRunning = false;
  let lowPowerMode = false;
  let lastUserActivityTs = performance.now();
  const IDLE_MS = 45000;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function smoothToward(current, target, speed, dtSec) {
    const t = 1 - Math.exp(-speed * dtSec);
    return current + (target - current) * t;
  }

  function stopAnimationLoop() {
    if (!animationLoopRunning) return;
    animationLoopRunning = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function startAnimationLoop() {
    if (animationLoopRunning) return;
    if (document.hidden) return;
    if (reduceMotion && !motion.active) return;
    animationLoopRunning = true;
    prevTs = performance.now();
    rafId = window.requestAnimationFrame(animate);
  }

  function setLowPowerMode(enabled) {
    if (lowPowerMode === enabled) return;
    lowPowerMode = enabled;
    document.body.classList.toggle("low-power", enabled);
    if (enabled && !motion.active && !pagingLock) {
      stopAnimationLoop();
    } else {
      startAnimationLoop();
    }
  }

  function registerActivity() {
    lastUserActivityTs = performance.now();
    if (lowPowerMode) {
      setLowPowerMode(false);
    }
    if (!document.hidden) {
      startAnimationLoop();
    }
  }

  function applyGerobakTransform(base, nowTs) {
    const bob = Math.sin(nowTs / 650 + motion.bobOffset);
    const viewportW = window.innerWidth || 1;
    const viewportH = window.innerHeight || 1;
    const baseWidth = gerobak.offsetWidth || 220;
    const baseHeight = gerobak.offsetHeight || 300;
    const isFirstSection = activeIndex === 0;
    const bobAmpY = reduceMotion || lowPowerMode ? 0 : 0.65;
    const bobAmpRot = reduceMotion || lowPowerMode ? 0 : 0.5;
    const edgePaddingPx = isFirstSection ? 26 : 18;
    const topSafetyPx = isFirstSection ? 14 : 12;
    const bottomSafetyPx = isFirstSection ? 52 : 34;
    const sideExtraPx = isFirstSection ? 20 : 0;
    const fitWidth = Math.max(140, viewportW - edgePaddingPx * 2 - sideExtraPx);
    const fitHeight = Math.max(180, viewportH - topSafetyPx - bottomSafetyPx);
    const fitScaleX = fitWidth / baseWidth;
    const fitScaleY = fitHeight / baseHeight;
    const firstSectionScaleCap = isFirstSection ? 0.88 : 1.35;
    let safeScale = clamp(Math.min(base.scale, fitScaleX, fitScaleY), 0.48, firstSectionScaleCap);
    const renderedWidth = baseWidth * safeScale;
    const renderedHeight = baseHeight * safeScale;
    const rotationPadX = renderedWidth * 0.09;
    const rotationPadY = renderedHeight * 0.06;
    const horizontalSafetyPx = edgePaddingPx + renderedWidth * 0.03 + rotationPadX;

    const minX = Math.max(2, (horizontalSafetyPx / viewportW) * 100);
    const maxX = Math.min(98, ((viewportW - renderedWidth - horizontalSafetyPx) / viewportW) * 100);
    const minY = Math.max(2, ((topSafetyPx + rotationPadY * 0.5) / viewportH) * 100);
    const maxY = Math.min(94, ((viewportH - renderedHeight - bottomSafetyPx - rotationPadY) / viewportH) * 100);

    let xSafe = clamp(base.xVw, Math.min(minX, maxX), Math.max(minX, maxX));
    const ySafeBase = clamp(base.yVh, Math.min(minY, maxY), Math.max(minY, maxY));
    let yBobbing = clamp(ySafeBase + bob * bobAmpY, Math.min(minY, maxY), Math.max(minY, maxY));

    const activeSection = sectionElements[activeIndex];
    if (activeSection) {
      const content = activeSection.querySelector(".section-card") || activeSection.querySelector(".section-content");
      if (content) {
        const contentRect = content.getBoundingClientRect();
        const cartXpx = (xSafe / 100) * viewportW;
        const cartYpx = (yBobbing / 100) * viewportH;
        const overlapX = cartXpx < contentRect.right && cartXpx + renderedWidth > contentRect.left;
        const overlapY = cartYpx < contentRect.bottom && cartYpx + renderedHeight > contentRect.top;

        if (overlapX && overlapY) {
          const leftCandidate = ((contentRect.left - renderedWidth - horizontalSafetyPx) / viewportW) * 100;
          const rightCandidate = ((contentRect.right + horizontalSafetyPx) / viewportW) * 100;
          const leftSafe = clamp(leftCandidate, Math.min(minX, maxX), Math.max(minX, maxX));
          const rightSafe = clamp(rightCandidate, Math.min(minX, maxX), Math.max(minX, maxX));
          const contentCenter = contentRect.left + contentRect.width / 2;
          const cartCenter = cartXpx + renderedWidth / 2;
          const preferLeft = cartCenter <= contentCenter;
          const desiredX = preferLeft ? leftSafe : rightSafe;
          xSafe = lerp(xSafe, desiredX, 0.18);

          // Recompute vertical bobbing safely after horizontal correction.
          yBobbing = clamp(ySafeBase + bob * bobAmpY, Math.min(minY, maxY), Math.max(minY, maxY));
        }
      }
    }

    const rBobbing = base.rotateDeg + bob * bobAmpRot;
    const zBobbing = base.zPx + motion.jumpBoost + (reduceMotion ? 0 : Math.abs(bob) * 4.2);

    const tiltY = lowPowerMode ? 0 : ((xSafe - 40) / 32) * 3.2;
    const tiltX = lowPowerMode ? 0 : ((52 - ySafeBase) / 36) * 2.2;
    const settledStrength = motion.active ? 0.38 : 0.98;
    const glowAlpha = lowPowerMode ? 0 : clamp(settledStrength - motion.jumpBoost / 300, 0.26, 1.0);
    const glowSize = Math.round(290 * safeScale + (motion.active ? 60 : 180));
    const glowBlur = lowPowerMode ? 0 : motion.active ? 38 : 58;
    const glowStreak = lowPowerMode ? 0 : Math.round(420 * safeScale + (motion.active ? 120 : 320));

    gerobak.style.setProperty("--glow-size", `${glowSize}px`);
    gerobak.style.setProperty("--glow-alpha", String(glowAlpha));
    gerobak.style.setProperty("--glow-blur", `${glowBlur}px`);
    gerobak.style.setProperty("--glow-streak", `${glowStreak}px`);

    gerobak.style.transform = `perspective(1200px) translate3d(${xSafe}vw, ${yBobbing}vh, ${zBobbing}px) scale(${safeScale}) rotate(${rBobbing}deg) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  }

  function syncLampToActiveSection() {
    if (!sectionElements.length) return;
    if (lowPowerMode) {
      sectionElements.forEach((section) => {
        section.style.setProperty("--lamp-alpha", "0");
      });
      return;
    }

    const rect = gerobak.getBoundingClientRect();
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;
    const px = rect.left + rect.width * 0.52;
    const py = rect.top + rect.height * 0.62;
    const lampX = (px / vw) * 100;
    const lampY = (py / vh) * 100;
    const lampSize = Math.max(240, rect.width * 1.75);

    let lampSectionIndex = activeIndex;
    for (let i = 0; i < sectionElements.length; i += 1) {
      const r = sectionElements[i].getBoundingClientRect();
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) {
        lampSectionIndex = i;
        break;
      }
    }
    const lampSection = sectionElements[lampSectionIndex];
    if (!lampSection) return;
    const lampSectionRect = lampSection.getBoundingClientRect();

    const distanceToTarget = Math.hypot(
      motion.current.xVw - motion.target.xVw,
      motion.current.yVh - motion.target.yVh
    );
    const settled = !motion.active && distanceToTarget < 0.35;
    const sectionCenterY = lampSectionRect.top + lampSectionRect.height / 2;
    const viewportCenterY = vh / 2;
    const centerTolerance = Math.max(8, vh * 0.03);
    const isSectionCentered = Math.abs(sectionCenterY - viewportCenterY) <= centerTolerance;
    const lampAlpha = isSectionCentered ? (settled ? 0.82 : 0.42) : 0;

    sectionElements.forEach((section, idx) => {
      section.style.setProperty("--lamp-alpha", idx === lampSectionIndex ? String(lampAlpha) : "0");
    });
    lampSection.style.setProperty("--lamp-x", `${lampX}%`);
    lampSection.style.setProperty("--lamp-y", `${lampY}%`);
    lampSection.style.setProperty("--lamp-size", `${Math.round(lampSize)}px`);
  }

  function setTargetTransform(index) {
    registerActivity();
    const safeIndex = Math.min(index, STALLS.length - 1);
    const nextTarget = getGerobakTarget(safeIndex);
    const startPoint = { ...motion.current };
    motion.stopIndex = safeIndex;

    if (reduceMotion) {
      motion.current = nextTarget;
      motion.start = nextTarget;
      motion.target = nextTarget;
      motion.jumpBoost = 0;
      renderState.xVw = nextTarget.xVw;
      renderState.yVh = nextTarget.yVh;
      renderState.scale = nextTarget.scale;
      renderState.rotateDeg = nextTarget.rotateDeg;
      renderState.zPx = nextTarget.zPx;
      applyGerobakTransform(nextTarget, performance.now());
      return;
    }

    motion.start = startPoint;
    motion.target = nextTarget;
    const centerX = 44;
    const crossesCenter =
      (startPoint.xVw - centerX) * (nextTarget.xVw - centerX) < 0 &&
      Math.abs(nextTarget.xVw - startPoint.xVw) > 16;
    motion.crossesCenter = crossesCenter;
    motion.viaX = centerX;
    motion.viaY = clamp((startPoint.yVh + nextTarget.yVh) / 2, yClamp.min + 4, yClamp.max - 4);
    motion.startTime = performance.now();
    const travelDist = Math.hypot(nextTarget.xVw - startPoint.xVw, nextTarget.yVh - startPoint.yVh);
    motion.duration = Math.round(clamp(680 + travelDist * 10, 720, 1040));
    motion.active = true;
    gerobak.classList.add("is-popping");
    startAnimationLoop();
  }

  function animate(ts) {
    if (!animationLoopRunning) return;
    if (lowPowerMode && !motion.active && ts - lastRenderTs < 180) {
      rafId = window.requestAnimationFrame(animate);
      return;
    }
    if (lowPowerMode && motion.active && ts - lastRenderTs < 33) {
      rafId = window.requestAnimationFrame(animate);
      return;
    }
    lastRenderTs = ts;

    const dtSec = Math.min(0.05, Math.max(0.001, (ts - prevTs) / 1000));
    prevTs = ts;

    if (motion.active && !reduceMotion) {
      const elapsed = ts - motion.startTime;
      const t = clamp(elapsed / motion.duration, 0, 1);
      const travel = Math.hypot(motion.target.xVw - motion.start.xVw, motion.target.yVh - motion.start.yVh);
      const jumpPeak = clamp(22 + travel * 1.7, 22, 62);
      const travelPortion = 0.74;
      const travelT = clamp(t / travelPortion, 0, 1);
      const settleT = clamp((t - travelPortion) / (1 - travelPortion), 0, 1);
      const moveT = easeInOutCubic(travelT);
      const settleEase = easeOutCubic(settleT);

      let movedX = motion.start.xVw;
      let movedY = motion.start.yVh;
      if (motion.crossesCenter) {
        const firstHalf = moveT < 0.5;
        const segRaw = firstHalf ? moveT * 2 : (moveT - 0.5) * 2;
        const segT = easeInOutCubic(segRaw);
        movedX = firstHalf ? lerp(motion.start.xVw, motion.viaX, segT) : lerp(motion.viaX, motion.target.xVw, segT);
        movedY = firstHalf ? lerp(motion.start.yVh, motion.viaY, segT) : lerp(motion.viaY, motion.target.yVh, segT);
      } else {
        movedX = lerp(motion.start.xVw, motion.target.xVw, moveT);
        movedY = lerp(motion.start.yVh, motion.target.yVh, moveT);
      }

      const settleSwing = Math.sin(settleT * Math.PI * 2.8) * (1 - settleT);
      const settleY = settleSwing * 0.65;
      const settleX = settleSwing * (motion.target.xVw >= motion.start.xVw ? 0.45 : -0.45);
      const settleRot = settleSwing * 1.35;
      const settleScale = settleSwing * 0.012;
      const baseScaleT = easeInOutCubic(Math.min(1, t * 1.04));

      motion.current = {
        xVw: lerp(movedX, motion.target.xVw, settleEase) + settleX,
        yVh: lerp(movedY, motion.target.yVh, settleEase) + settleY,
        scale: lerp(motion.start.scale, motion.target.scale, baseScaleT) + settleScale,
        rotateDeg: lerp(motion.start.rotateDeg, motion.target.rotateDeg, baseScaleT) + settleRot,
        zPx: lerp(motion.start.zPx, motion.target.zPx, baseScaleT)
      };

      const travelJump = Math.sin(Math.PI * travelT) * jumpPeak;
      const settleJump = Math.sin(Math.PI * settleT) * (1 - settleT) * (jumpPeak * 0.34);
      motion.jumpBoost = t < travelPortion ? travelJump : settleJump;

      if (t >= 1) {
        motion.current = { ...motion.target };
        motion.jumpBoost = 0;
        motion.active = false;
        gerobak.classList.remove("is-popping");
      }
    }

    if (!reduceMotion) {
      renderState.xVw = smoothToward(renderState.xVw, motion.current.xVw, 14, dtSec);
      renderState.yVh = smoothToward(renderState.yVh, motion.current.yVh, 14, dtSec);
      renderState.scale = smoothToward(renderState.scale, motion.current.scale, 10, dtSec);
      renderState.rotateDeg = smoothToward(renderState.rotateDeg, motion.current.rotateDeg, 12, dtSec);
      renderState.zPx = smoothToward(renderState.zPx, motion.current.zPx, 10, dtSec);
    }

    applyGerobakTransform(reduceMotion ? motion.current : renderState, ts);
    syncLampToActiveSection();
    if (reduceMotion && !motion.active) {
      stopAnimationLoop();
      return;
    }
    if (lowPowerMode && !motion.active && !pagingLock) {
      stopAnimationLoop();
      return;
    }
    rafId = window.requestAnimationFrame(animate);
  }

  function setActiveDot(index) {
    navDots.querySelectorAll(".nav-dot").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === index);
    });
  }

  function setActiveSectionClass(index) {
    sectionElements.forEach((section, i) => {
      section.classList.toggle("is-active", i === index);
    });
  }

  let activeIndex = 0;
  let lastSectionSwitchTs = 0;
  let pagingLock = false;
  let touchStartY = null;
  let touchStartX = null;

  function getClosestSectionIndex() {
    const viewportCenter = (window.innerHeight || 0) / 2;
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    sectionElements.forEach((section, idx) => {
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(center - viewportCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    return bestIdx;
  }

  function scrollToSectionIndex(index) {
    const safeIndex = clamp(index, 0, sectionElements.length - 1);
    const isLastTarget = safeIndex === sectionElements.length - 1;
    const target = sectionElements[safeIndex];
    if (!target) return;
    pagingLock = true;
    window.scrollTo({
      top: Math.max(0, target.offsetTop),
      behavior: reduceMotion ? "auto" : "smooth"
    });
    window.setTimeout(() => {
      pagingLock = false;
      if (isLastTarget) return;
      const nearestIndex = getClosestSectionIndex();
      const nearest = sectionElements[nearestIndex];
      if (nearest) {
        window.scrollTo({ top: Math.max(0, nearest.offsetTop), behavior: "auto" });
      }
    }, reduceMotion ? 120 : 760);
  }

  function stepSection(direction) {
    registerActivity();
    if (pagingLock) return;
    const dir = direction > 0 ? 1 : -1;
    const nextIndex = clamp(activeIndex + dir, 0, sectionElements.length - 1);
    if (nextIndex === activeIndex) return;
    scrollToSectionIndex(nextIndex);
  }

  function getLastSectionEdgeState() {
    const lastIndex = sectionElements.length - 1;
    if (activeIndex !== lastIndex || lastIndex < 0) return null;
    const lastSection = sectionElements[lastIndex];
    if (!lastSection) return null;
    const rect = lastSection.getBoundingClientRect();
    const viewportH = window.innerHeight || 0;
    return {
      atTop: rect.top >= -2,
      atBottom: rect.bottom <= viewportH + 2
    };
  }

  function updateTopbarVisibility() {
    if (!topbar) return;
    topbar.classList.toggle("is-hidden", activeIndex !== 0);
  }

  function updateGerobakVisibility() {
    const isLastSection = activeIndex === sectionElements.length - 1;
    gerobak.classList.toggle("is-hidden", isLastSection);
  }

  function updateBackToTopVisibility() {
    const isLast = activeIndex === sectionElements.length - 1;
    backToTop.classList.toggle("is-visible", isLast);
  }

  function onSectionActive(index, force) {
    if (index === activeIndex) return;
    const now = performance.now();
    const isForced = Boolean(force);
    if (!isForced && now - lastSectionSwitchTs < 140) return;
    activeIndex = index;
    lastSectionSwitchTs = now;
    setActiveDot(index);
    setActiveSectionClass(index);
    setTargetTransform(index);
    updateTopbarVisibility();
    updateGerobakVisibility();
    updateBackToTopVisibility();
  }

  function initPerformanceGuards() {
    const activityEvents = ["pointerdown", "touchstart", "keydown", "wheel", "scroll"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(
        eventName,
        () => {
          registerActivity();
        },
        { passive: true }
      );
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopAnimationLoop();
        return;
      }
      registerActivity();
      startAnimationLoop();
    });

    window.addEventListener("pageshow", () => {
      registerActivity();
      startAnimationLoop();
    });

    window.setInterval(() => {
      if (document.hidden) return;
      const idleMs = performance.now() - lastUserActivityTs;
      if (idleMs >= IDLE_MS && !motion.active) {
        setLowPowerMode(true);
      }
    }, 5000);
  }

  function setupObserver() {
    const sections = sectionElements;
    let snapTimer = null;

    function getClosestToViewportCenter() {
      const idx = getClosestSectionIndex();
      const viewportCenter = (window.innerHeight || 0) / 2;
      const rect = sections[idx].getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      return { idx, dist: Math.abs(center - viewportCenter) };
    }

    function getCenterDistanceByIndex(index) {
      const section = sections[index];
      if (!section) return Number.POSITIVE_INFINITY;
      const viewportCenter = (window.innerHeight || 0) / 2;
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      return Math.abs(center - viewportCenter);
    }

    function evaluateActiveSection(force) {
      const candidate = getClosestToViewportCenter();
      if (force) {
        onSectionActive(candidate.idx, true);
        return;
      }
      if (candidate.idx === activeIndex) return;

      const currentDist = getCenterDistanceByIndex(activeIndex);
      const viewportH = window.innerHeight || 1;
      const minSwitchGap = viewportH * 0.08;
      const mustSwitchIfFar = currentDist > viewportH * 0.32;
      const isClearlyBetter = currentDist - candidate.dist > minSwitchGap;

      if (mustSwitchIfFar || isClearlyBetter) {
        onSectionActive(candidate.idx);
      }
    }

    function scheduleSnapCorrection() {
      if (pagingLock) return;
      if (snapTimer) {
        window.clearTimeout(snapTimer);
      }
      snapTimer = window.setTimeout(() => {
        if (pagingLock) return;
        const { idx, dist } = getClosestToViewportCenter();
        if (idx === sectionElements.length - 1) return;
        const viewportH = window.innerHeight || 1;
        // If section center is not close enough to viewport center, force align.
        if (dist > viewportH * 0.04) {
          scrollToSectionIndex(idx);
        }
      }, reduceMotion ? 80 : 150);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting);
        if (!visible.length) return;
        evaluateActiveSection(false);
      },
      {
        threshold: 0.58,
        rootMargin: "-8% 0px -8% 0px"
      }
    );

    sections.forEach((section) => observer.observe(section));

    backToTop.addEventListener("click", () => {
      registerActivity();
      scrollToSectionIndex(0);
    });

    window.addEventListener(
      "wheel",
      (event) => {
        registerActivity();
        if (Math.abs(event.deltaY) < 8) return;
        const lastEdge = getLastSectionEdgeState();
        if (
          lastEdge &&
          ((event.deltaY > 0 && !lastEdge.atBottom) || (event.deltaY < 0 && !lastEdge.atTop))
        ) {
          return;
        }
        event.preventDefault();
        stepSection(event.deltaY > 0 ? 1 : -1);
      },
      { passive: false }
    );

    window.addEventListener(
      "touchstart",
      (event) => {
        registerActivity();
        if (!event.touches || !event.touches.length) return;
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
      },
      { passive: true }
    );

    window.addEventListener(
      "touchend",
      (event) => {
        if (touchStartY == null || touchStartX == null) return;
        const touch = event.changedTouches && event.changedTouches[0];
        if (!touch) return;
        const diffY = touchStartY - touch.clientY;
        const diffX = touchStartX - touch.clientX;
        touchStartY = null;
        touchStartX = null;
        if (Math.abs(diffY) < 42 || Math.abs(diffY) <= Math.abs(diffX)) return;
        const lastEdge = getLastSectionEdgeState();
        if (
          lastEdge &&
          ((diffY > 0 && !lastEdge.atBottom) || (diffY < 0 && !lastEdge.atTop))
        ) {
          return;
        }
        stepSection(diffY > 0 ? 1 : -1);
      },
      { passive: true }
    );

    window.addEventListener("keydown", (event) => {
      registerActivity();
      if (event.defaultPrevented) return;
      const lastEdge = getLastSectionEdgeState();
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
        if (lastEdge && !lastEdge.atBottom) return;
        event.preventDefault();
        stepSection(1);
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        if (lastEdge && !lastEdge.atTop) return;
        event.preventDefault();
        stepSection(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        scrollToSectionIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        scrollToSectionIndex(sectionElements.length - 1);
      }
    });

    let scrollTicking = false;
    window.addEventListener(
      "scroll",
      () => {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
          evaluateActiveSection(false);
          scheduleSnapCorrection();
          scrollTicking = false;
        });
      },
      { passive: true }
    );

    activeIndex = getClosestToViewportCenter().idx;
    setActiveDot(activeIndex);
    setActiveSectionClass(activeIndex);
    setTargetTransform(activeIndex);
    updateTopbarVisibility();
    updateGerobakVisibility();
    updateBackToTopVisibility();
  }

  function initShareAndPdfActions() {
    const baseUrl = getLandingPageUrl();
    const encodedUrl = encodeURIComponent(baseUrl);
    const shareTextRaw =
      "Keluarga Besar MUSLIM RUHR ✨🌙 Mempersembahkan: 📣 BAZAR IDUL FITRI 📣 " +
      "Assalamu’alaikum Warahmatullahi Wabarakatuh, Mari meriahkan momen Lebaran Idul Fitri kali ini dengan suka cita! 🎉 " +
      "Punya usaha kuliner sedap atau resep masakan enak (seperti hidangan Bakso yang menggugah selera 🍲, kue kering, minuman segar), " +
      "cendramata, souvenir atau produk lainnya? Inilah saat yang tepat! Yuk, buka stand bazar kamu di acara kami! " +
      "Cari rezeki yang halal, jual produkmu, dan raih berkah silaturahmi bersama seluruh warga Muslim Ruhr. 🤝🕌 " +
      "⚠️ SEGERA DAFTAR!!! ⚠️ Jangan sampai kehabisan, karena ★ TEMPAT TERBATAS ★ Informasi Pendaftaran:";
    const shareTextWithUrl = `${shareTextRaw} ${baseUrl}`;
    const encodedText = encodeURIComponent(shareTextRaw);
    const encodedTextWithUrl = encodeURIComponent(shareTextWithUrl);

    function openShare(network) {
      let shareUrl = "";
      if (network === "whatsapp") {
        shareUrl = `https://wa.me/?text=${encodedTextWithUrl}`;
      } else if (network === "telegram") {
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
      } else if (network === "facebook") {
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      } else if (network === "x") {
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
      }
      if (shareUrl) {
        window.open(shareUrl, "_blank", "noopener,noreferrer");
      }
    }

    document.querySelectorAll("[data-share-network]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const network = btn.dataset.shareNetwork;
        openShare(network);
      });
    });

    const pdfBtn = document.getElementById("downloadPdfBtn");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", () => {
        document.body.classList.add("print-slides");
        const clear = () => {
          document.body.classList.remove("print-slides");
        };
        window.addEventListener("afterprint", clear, { once: true });
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            window.print();
            setTimeout(clear, 1500);
          });
        });
      });
    }
  }

  function initAssetFallbacks(onProgress) {
    gerobakImg.addEventListener("error", fallbackGerobak, { once: true });

    const imagePaths = [
      "assets/gerobak-bakso.png",
      "assets/bg-hero.jpg",
      ...STALLS.map((stall) => stall.background)
    ].filter(Boolean);

    return preloadImages(imagePaths, onProgress).then((result) => {
      const missing = new Set(result.filter((it) => !it.ok).map((it) => it.path));
      if (!missing.size) return;

      document.querySelectorAll(".festival-section").forEach((section, i) => {
        const p = STALLS[i] && STALLS[i].background;
        if (p && missing.has(p)) {
          section.classList.add("image-missing");
        }
      });
    });
  }

  async function initApp() {
    setLoadingProgress(10, "Menyusun section...");
    buildSections();
    sectionElements = Array.from(document.querySelectorAll(".festival-section"));
    scheduleTextFit();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        scheduleTextFit();
      });
    }
    buildDots();

    setLoadingProgress(24, "Memuat gambar...");
    await initAssetFallbacks((loaded, total) => {
      if (!total) {
        setLoadingProgress(70, "Aset siap");
        return;
      }
      const ratio = loaded / total;
      const pct = 24 + ratio * 52;
      setLoadingProgress(pct, `Memuat gambar ${loaded}/${total}`);
    });

    setLoadingProgress(80, "Menyiapkan interaksi...");
    setupObserver();
    initShareAndPdfActions();
    initPerformanceGuards();

    setLoadingProgress(94, "Finalisasi...");
    applyGerobakTransform(renderState, performance.now());
    syncLampToActiveSection();
    startAnimationLoop();

    window.requestAnimationFrame(() => {
      hideLoadingScreen();
    });
  }

  initApp().catch((error) => {
    console.error("Init error:", error);
    hideLoadingScreen();
    startAnimationLoop();
  });

  window.addEventListener("resize", () => {
    registerActivity();
    motion.current = safeTransform(motion.current);
    motion.target = safeTransform(motion.target);
    renderState.xVw = clamp(renderState.xVw, xClamp.min, xClamp.max);
    renderState.yVh = clamp(renderState.yVh, yClamp.min, yClamp.max);
    scheduleTextFit();
  });
})();
