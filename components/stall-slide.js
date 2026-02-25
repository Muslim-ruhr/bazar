(function () {
  "use strict";

  class StallSlide extends HTMLElement {
    set model(value) {
      this._model = value;
      this.render();
    }

    get model() {
      return this._model;
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const m = this._model;
      if (!m) return;

      const { index, stall, profile, sectionTarget, mobileStopSide, siteSubtitle } = m;
      this.className = `festival-section${index === 0 ? " hero" : ""} ${profile.layoutClass}`;
      this.classList.remove("stop-right", "stop-left");
      this.classList.add(mobileStopSide === "right" ? "stop-right" : "stop-left");
      this.style.setProperty("--lamp-x", `${sectionTarget.xVw}%`);
      this.style.setProperty("--lamp-y", `${sectionTarget.yVh}%`);
      this.style.setProperty("--lamp-size", `${Math.round(360 * sectionTarget.scale)}px`);
      this.style.setProperty("--lamp-alpha", "0");
      this.id = `section-${index}`;
      this.dataset.index = String(index);
      this.dataset.title = stall.title || `Section ${index + 1}`;

      this.textContent = "";

      if (index === 0) {
        const sparkles = document.createElement("div");
        sparkles.className = "hero-sparkles";
        this.appendChild(sparkles);
      }

      const stopBox = document.createElement("div");
      stopBox.className = `stop-point-box ${mobileStopSide === "right" ? "stop-right" : "stop-left"}`;
      stopBox.setAttribute("aria-hidden", "true");
      this.appendChild(stopBox);

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
      h3.textContent = index === 0 ? siteSubtitle : stall.subtitle || "Deskripsi singkat stall.";

      const p = document.createElement("p");
      p.textContent = stall.description || "Lengkapi deskripsi stall di data/stalls.js";

      card.append(pill, h2, h3, p);

      if (index !== 0) {
        const ctaWrap = document.createElement("div");
        ctaWrap.className = "section-cta";
        const cta = document.createElement("a");
        cta.className = "cta-btn";
        cta.href = "#section-form";
        cta.textContent = "Daftarkan Usaha";
        ctaWrap.appendChild(cta);
        card.appendChild(ctaWrap);
      }

      content.appendChild(card);
      this.append(bg, overlay, content);
    }
  }

  if (!customElements.get("stall-slide")) {
    customElements.define("stall-slide", StallSlide);
  }
})();
