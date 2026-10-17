(function () {
  "use strict";
  function openSalaryDestination() {
    // The native mini-program host supplies this adapter; this UI package contains no invented URL.
    const navigate = window.OfferShowMiniProgram?.navigate;
    if (typeof navigate === "function") { navigate("salary"); return; }
    const toast = document.getElementById("prototypeToast");
    if (!toast) return;
    toast.textContent = "请在 OfferShow 小程序打开薪资爆料页";
    toast.hidden = false;
    clearTimeout(openSalaryDestination.timer);
    openSalaryDestination.timer = setTimeout(() => { toast.hidden = true; }, 2800);
  }
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-miniprogram]");
    if (!button) return;
    event.preventDefault();
    openSalaryDestination();
  });
})();
