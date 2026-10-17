(function () {
  const loadDemoEntryBtn = document.getElementById("loadDemoEntryBtn");

  if (!loadDemoEntryBtn) {
    return;
  }

  loadDemoEntryBtn.addEventListener("click", () => {
    const demoSession = window.OfferHelperState.getDemoSession();
    window.OfferHelperStorage.saveSessionRaw(demoSession);
    window.OfferHelperStorage.clearAnalysis();
    window.OfferHelperUI.navigate("./pages/result.html");
  });
})();
