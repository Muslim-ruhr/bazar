(function () {
  "use strict";

  function initShareButtons(config) {
    const baseUrl = config.baseUrl;
    const text = config.text || "";
    const encodedUrl = encodeURIComponent(baseUrl);
    const encodedText = encodeURIComponent(text);
    const encodedTextWithUrl = encodeURIComponent(`${text} ${baseUrl}`);

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
      btn.addEventListener("click", () => {
        openShare(btn.dataset.shareNetwork);
      });
    });
  }

  window.BazarShare = { initShareButtons };
})();
