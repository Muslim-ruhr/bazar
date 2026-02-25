(function () {
  "use strict";

  const scriptLoadCache = new Map();
  let activePdfObjectUrl = "";
  const PDF_CACHE_DATA_KEY = "bazar_pdf_data_uri_v1";
  const PDF_CACHE_META_KEY = "bazar_pdf_meta_v1";

  function waitNextFrames(count) {
    return new Promise((resolve) => {
      const step = (left) => {
        if (left <= 0) return resolve();
        requestAnimationFrame(() => step(left - 1));
      };
      step(count);
    });
  }

  function loadScriptOnce(url) {
    if (scriptLoadCache.has(url)) return scriptLoadCache.get(url);
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      const ready = Promise.resolve();
      scriptLoadCache.set(url, ready);
      return ready;
    }
    const p = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error(`Gagal memuat script: ${url}`));
      document.head.appendChild(s);
    });
    scriptLoadCache.set(url, p);
    return p;
  }

  async function loadFromCandidates(urls, isReady) {
    if (isReady()) return;
    let lastErr = null;
    for (const url of urls) {
      try {
        await loadScriptOnce(url);
        if (isReady()) return;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("Gagal memuat library.");
  }

  async function ensurePdfLibraries() {
    await loadFromCandidates(
      [
        "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
        "https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js"
      ],
      () => typeof window.html2canvas === "function"
    );
    await loadFromCandidates(
      [
        "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
        "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js"
      ],
      () => !!(window.jspdf && window.jspdf.jsPDF)
    );
  }

  function ensurePdfModal() {
    let modal = document.getElementById("pdfPreviewModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "pdfPreviewModal";
    modal.className = "pdf-modal";
    modal.innerHTML = `
      <div class="pdf-modal-dialog" role="dialog" aria-modal="true" aria-label="PDF Preview">
        <div class="pdf-modal-head">
          <strong>Preview PDF</strong>
          <div class="pdf-modal-actions">
            <a id="pdfModalDownloadLink" class="share-btn share-btn-pdf" download>Download</a>
            <button id="pdfModalCloseBtn" type="button" class="share-btn share-btn-pdf">Tutup</button>
          </div>
        </div>
        <div id="pdfModalStatus" class="pdf-modal-status" hidden>
          <div id="pdfModalStatusText">Menyiapkan PDF...</div>
          <div class="pdf-modal-progress">
            <div id="pdfModalProgressBar" class="pdf-modal-progress-bar" style="width:0%"></div>
          </div>
          <div id="pdfModalProgressMeta" class="pdf-modal-progress-meta">0%</div>
        </div>
        <iframe id="pdfModalFrame" title="PDF Preview"></iframe>
      </div>`;
    document.body.appendChild(modal);

    const close = () => {
      modal.classList.remove("is-open");
      document.body.classList.remove("pdf-modal-open");
      const frame = document.getElementById("pdfModalFrame");
      if (frame) frame.src = "about:blank";
      if (activePdfObjectUrl) {
        URL.revokeObjectURL(activePdfObjectUrl);
        activePdfObjectUrl = "";
      }
    };
    document.getElementById("pdfModalCloseBtn").addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) close();
    });
    return modal;
  }

  function setModalStatus(text, isBusy, progressPct, pageIndex, pageTotal) {
    const modal = ensurePdfModal();
    const status = document.getElementById("pdfModalStatus");
    const statusText = document.getElementById("pdfModalStatusText");
    const progressBar = document.getElementById("pdfModalProgressBar");
    const progressMeta = document.getElementById("pdfModalProgressMeta");
    const downloadLink = document.getElementById("pdfModalDownloadLink");
    if (!status || !statusText || !progressBar || !progressMeta || !downloadLink) return;
    statusText.textContent = text || "";
    const safePct = Math.max(0, Math.min(100, Math.round(Number(progressPct || 0))));
    progressBar.style.width = `${safePct}%`;
    if (isBusy && Number(pageTotal) > 0) {
      progressMeta.textContent = `Halaman ${Number(pageIndex) || 0}/${Number(pageTotal)} • ${safePct}%`;
    } else {
      progressMeta.textContent = `${safePct}%`;
    }
    status.hidden = !isBusy;
    downloadLink.classList.toggle("is-disabled", !!isBusy);
    if (isBusy) {
      downloadLink.removeAttribute("href");
    }
    modal.classList.add("is-open");
    document.body.classList.add("pdf-modal-open");
  }

  function showPdfInModal(blob, filename) {
    const modal = ensurePdfModal();
    const frame = document.getElementById("pdfModalFrame");
    const downloadLink = document.getElementById("pdfModalDownloadLink");
    if (!frame || !downloadLink) return;
    if (activePdfObjectUrl) {
      URL.revokeObjectURL(activePdfObjectUrl);
      activePdfObjectUrl = "";
    }
    activePdfObjectUrl = URL.createObjectURL(blob);
    frame.src = activePdfObjectUrl;
    downloadLink.href = activePdfObjectUrl;
    downloadLink.download = filename;
    setModalStatus("", false, 100, 0, 0);
  }

  function dataUriToBlob(dataUri) {
    const raw = String(dataUri || "");
    const parts = raw.split(",");
    if (parts.length < 2) throw new Error("Data URI PDF tidak valid.");
    const mimeMatch = parts[0].match(/data:(.*?);base64/);
    const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
    const binary = atob(parts[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function showPdfDataUriInModal(dataUri, filename) {
    const blob = dataUriToBlob(dataUri);
    showPdfInModal(blob, filename);
  }

  function readCachedPdf(formUrl) {
    try {
      const dataUri = sessionStorage.getItem(PDF_CACHE_DATA_KEY);
      const metaRaw = sessionStorage.getItem(PDF_CACHE_META_KEY);
      if (!dataUri || !metaRaw) return null;
      const meta = JSON.parse(metaRaw);
      if (!meta || meta.formUrl !== String(formUrl || "").trim()) return null;
      return {
        dataUri,
        filename: meta.filename || `bazar-idul-fitri-muslim-ruhr-${new Date().toISOString().slice(0, 10)}.pdf`
      };
    } catch (_) {
      return null;
    }
  }

  function cachePdfDataUri(dataUri, filename, formUrl) {
    try {
      sessionStorage.setItem(PDF_CACHE_DATA_KEY, dataUri);
      sessionStorage.setItem(
        PDF_CACHE_META_KEY,
        JSON.stringify({
          filename,
          formUrl: String(formUrl || "").trim(),
          cachedAt: new Date().toISOString()
        })
      );
    } catch (_) {
      // Ignore quota / storage errors, preview will still work.
    }
  }

  function buildCaptureScope(options) {
    const sourceSections = Array.from(document.querySelectorAll(options.sectionSelector || ".festival-section"));
    if (!sourceSections.length) return null;
    const scope = document.createElement("div");
    scope.className = options.captureBodyClass || "pdf-export";
    scope.style.position = "fixed";
    scope.style.left = "-200vw";
    scope.style.top = "0";
    scope.style.width = "100vw";
    scope.style.height = "100vh";
    scope.style.pointerEvents = "none";
    scope.style.opacity = "0";
    scope.style.zIndex = "-1";
    sourceSections.forEach((section) => {
      scope.appendChild(section.cloneNode(true));
    });
    document.body.appendChild(scope);
    return scope;
  }

  function getImageFormatFromDataUrl(dataUrl) {
    const raw = String(dataUrl || "");
    if (raw.startsWith("data:image/png")) return "PNG";
    if (raw.startsWith("data:image/webp")) return "WEBP";
    return "JPEG";
  }

  async function loadImageAsDataUrl(src) {
    const raw = String(src || "").trim();
    if (!raw) return null;
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    const loaded = new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Gagal memuat image: ${raw}`));
    });
    img.src = raw;
    await loaded;
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height };
  }

  function drawFirstPageHeader(pdf, pageW, title, subtitle) {
    const safeTitle = String(title || "").trim();
    const safeSubtitle = String(subtitle || "").trim();
    const barH = 20;
    // Match web topbar mood: deep green with warm-gold accent.
    pdf.setFillColor(8, 50, 36);
    pdf.rect(0, 0, pageW, barH, "F");
    pdf.setFillColor(13, 63, 47);
    pdf.rect(0, barH - 4.6, pageW, 4.6, "F");
    pdf.setDrawColor(248, 201, 91);
    pdf.line(0, barH, pageW, barH);

    pdf.setTextColor(255, 244, 210);
    pdf.setFontSize(15);
    const titleLines = pdf.splitTextToSize(safeTitle || "Bazar Idul Fitri", pageW - 16);
    pdf.text(titleLines, pageW / 2, 8.2, { align: "center", baseline: "top" });

    if (safeSubtitle) {
      pdf.setTextColor(230, 245, 232);
      pdf.setFontSize(10);
      const subLines = pdf.splitTextToSize(safeSubtitle, pageW - 20);
      pdf.text(subLines, pageW / 2, 14.2, { align: "center", baseline: "top" });
    }
  }

  function drawGerobakStamp(pdf, gerobakAsset, pageW, pageH) {
    if (!gerobakAsset || !gerobakAsset.dataUrl || !gerobakAsset.width || !gerobakAsset.height) return;
    const targetH = 50; // 5 cm = 50 mm
    const targetW = targetH * (gerobakAsset.width / gerobakAsset.height);
    const margin = 6;
    const x = pageW - margin - targetW;
    const y = pageH - margin - targetH;
    pdf.addImage(gerobakAsset.dataUrl, getImageFormatFromDataUrl(gerobakAsset.dataUrl), x, y, targetW, targetH, undefined, "FAST");
  }

  function prepareBackgroundLayer(section) {
    const clone = section.cloneNode(true);
    clone.classList.add("pdf-capture-bg");
    clone.querySelectorAll(".section-content,.section-cta,.stop-point-box,.hero-sparkles,.print-form-access,.share-actions").forEach((el) => {
      el.style.display = "none";
    });
    return clone;
  }

  function prepareContentLayer(section) {
    const clone = section.cloneNode(true);
    clone.classList.add("pdf-capture-content");
    clone.querySelectorAll(".section-bg,.section-overlay,.stop-point-box,.hero-sparkles").forEach((el) => {
      el.style.display = "none";
    });
    return clone;
  }

  async function buildSlidesPdfBlob(options) {
    await ensurePdfLibraries();
    const html2canvasLib = window.html2canvas;
    const JsPdfCtor = window.jspdf && window.jspdf.jsPDF;
    if (!html2canvasLib || !JsPdfCtor) throw new Error("PDF library belum termuat.");

    if (typeof options.beforeCapture === "function") options.beforeCapture();
    const scope = buildCaptureScope(options || {});
    const sections = scope ? Array.from(scope.querySelectorAll(options.sectionSelector || ".festival-section")) : [];
    if (!sections.length) throw new Error("Tidak ada section untuk diekspor.");
    await waitNextFrames(2);

    const pdf = new JsPdfCtor({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const contentMargin = 6;
    const contentMaxW = pageW - contentMargin * 2;
    const baseContentMaxH = pageH - contentMargin * 2;
    const gerobakAsset = await loadImageAsDataUrl(options.gerobakSrc || (document.querySelector("#gerobak img") || {}).src || "");
    const headerTitle = String(options.headerTitle || "").trim();
    const headerSubtitle = String(options.headerSubtitle || "").trim();

    try {
      for (let i = 0; i < sections.length; i += 1) {
        const startPct = (i / sections.length) * 100;
        setModalStatus("Membuat PDF...", true, startPct, i + 1, sections.length);
        await waitNextFrames(1);

        const bgLayer = prepareBackgroundLayer(sections[i]);
        scope.appendChild(bgLayer);
        const bgCanvas = await html2canvasLib(bgLayer, {
          scale: Math.min(1.35, window.devicePixelRatio > 1 ? 1.2 : 1.1),
          useCORS: true,
          imageTimeout: 12000,
          foreignObjectRendering: false,
          backgroundColor: "#ffffff",
          logging: false
        });
        if (bgLayer.parentNode) bgLayer.parentNode.removeChild(bgLayer);

        const contentLayer = prepareContentLayer(sections[i]);
        scope.appendChild(contentLayer);
        let clickableFormArea = null;
        const formUrlNode = contentLayer.querySelector("#printFormUrl");
        if (formUrlNode) {
          const layerRect = contentLayer.getBoundingClientRect();
          const linkRect = formUrlNode.getBoundingClientRect();
          if (layerRect.width > 0 && layerRect.height > 0 && linkRect.width > 0 && linkRect.height > 0) {
            clickableFormArea = {
              x: (linkRect.left - layerRect.left) / layerRect.width,
              y: (linkRect.top - layerRect.top) / layerRect.height,
              w: linkRect.width / layerRect.width,
              h: linkRect.height / layerRect.height
            };
          }
        }
        const contentCanvas = await html2canvasLib(contentLayer, {
          scale: Math.min(1.35, window.devicePixelRatio > 1 ? 1.2 : 1.1),
          useCORS: true,
          imageTimeout: 12000,
          foreignObjectRendering: false,
          backgroundColor: null,
          logging: false
        });
        if (contentLayer.parentNode) contentLayer.parentNode.removeChild(contentLayer);

        const bgData = bgCanvas.toDataURL("image/jpeg", 0.9);
        const contentData = contentCanvas.toDataURL("image/png");
        if (i > 0) pdf.addPage();

        // Background full-cover on A4 portrait.
        const bgCover = Math.max(pageW / bgCanvas.width, pageH / bgCanvas.height);
        const bgW = bgCanvas.width * bgCover;
        const bgH = bgCanvas.height * bgCover;
        const bgX = (pageW - bgW) / 2;
        const bgY = (pageH - bgH) / 2;
        pdf.addImage(bgData, "JPEG", bgX, bgY, bgW, bgH, undefined, "FAST");

        if (i === 0) {
          drawFirstPageHeader(pdf, pageW, headerTitle, headerSubtitle);
        }

        // Content fit (contain) on top, so text/elements stay inside page.
        const topReserved = i === 0 ? 22 : 0;
        const contentMaxH = Math.max(40, baseContentMaxH - topReserved);
        const contentFit = Math.min(contentMaxW / contentCanvas.width, contentMaxH / contentCanvas.height);
        const contentW = contentCanvas.width * contentFit;
        const contentH = contentCanvas.height * contentFit;
        const contentX = (pageW - contentW) / 2;
        const contentY = contentMargin + topReserved + (contentMaxH - contentH) / 2;
        pdf.addImage(contentData, "PNG", contentX, contentY, contentW, contentH, undefined, "FAST");
        if (clickableFormArea && options.formUrl) {
          const linkX = contentX + clickableFormArea.x * contentW;
          const linkY = contentY + clickableFormArea.y * contentH;
          const linkW = Math.max(8, clickableFormArea.w * contentW);
          const linkH = Math.max(4, clickableFormArea.h * contentH);
          pdf.link(linkX, linkY, linkW, linkH, { url: String(options.formUrl).trim() });
        }
        drawGerobakStamp(pdf, gerobakAsset, pageW, pageH);
        const endPct = ((i + 1) / sections.length) * 100;
        setModalStatus("Membuat PDF...", true, endPct, i + 1, sections.length);
      }
    } finally {
      if (scope && scope.parentNode) scope.parentNode.removeChild(scope);
      if (typeof options.afterCapture === "function") options.afterCapture();
    }

    const dataUri = pdf.output("datauristring");
    const blob = dataUriToBlob(dataUri);
    return { blob, dataUri };
  }

  async function exportAndPreview(options) {
    setModalStatus("Menyiapkan PDF...", true, 2, 0, 0);
    try {
      const safeOptions = options || {};
      const cached = readCachedPdf(safeOptions.formUrl);
      if (cached) {
        setModalStatus("Memuat PDF dari cache session...", true, 100, 0, 0);
        showPdfDataUriInModal(cached.dataUri, cached.filename);
        return;
      }

      const dateToken = new Date().toISOString().slice(0, 10);
      const filename = `bazar-idul-fitri-muslim-ruhr-${dateToken}.pdf`;
      const result = await buildSlidesPdfBlob(safeOptions);
      cachePdfDataUri(result.dataUri, filename, safeOptions.formUrl);
      showPdfInModal(result.blob, filename);
    } catch (err) {
      setModalStatus("", false, 0, 0, 0);
      throw err;
    }
  }

  window.BazarPDF = { exportAndPreview };
})();
