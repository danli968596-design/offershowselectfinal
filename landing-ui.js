(function () {
  "use strict";
  const LEGACY_SESSION_KEY = "offer-helper-paper-blue-v5-6d-session";
  const startButton = document.getElementById("startFlowBtn");
  startButton?.addEventListener("click", () => {
    if (window.OfferHelperStorage) {
      window.OfferHelperStorage.remove(window.OfferHelperStorage.SESSION_KEY);
      window.OfferHelperStorage.clearAnalysis();
    }
    localStorage.removeItem(LEGACY_SESSION_KEY);
  });
})();
