(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const catalogue = window.OfferShowLocationCatalog;
  const { provinces, places: cities, byCode } = catalogue;
  const popularCodes = ["1101", "3101", "4401", "4403", "3301", "5101", "3201", "4201", "3205", "6101", "5001", "4301"];
  function init(form, prefs) {
    const dialog = $("cityPickerDialog");
    const preferredButton = $("preferredCityButton");
    const acceptableButton = $("acceptableCitiesButton");
    let accepted = String(prefs.acceptableCityCodes || "").split(",").filter((c) => byCode.has(c));
    let willingness = prefs.considerOtherCities || (accepted.length ? "yes" : "no");
    let mode = "preferred";
    let scope = "domestic";
    let draft = new Set();
    function save(field, value) {
      form.elements[field].value = value;
      form.elements[field].dispatchEvent(new Event("input", { bubbles: true }));
    }
    function syncAccepted() {
      save("considerOtherCities", willingness);
      save("acceptableCityCodes", willingness === "yes" ? accepted.join(",") : "");
      save("acceptableCities", willingness === "no" ? "无" : accepted.map((c) => byCode.get(c).name).join("、"));
      renderFields();
    }
    function renderFields() {
      const city = byCode.get(form.elements.preferredCityCode.value);
      $("preferredCityLabel").textContent = city?.name || "选择首选城市或国家";
      preferredButton.classList.toggle("has-value", Boolean(city));
      preferredButton.querySelector(".city-trigger-action").textContent = city ? "更换 ›" : "选择 ›";
      $("acceptableCityCount").textContent = accepted.length ? `已选 ${accepted.length} 个` : "可多选";
      $("otherCitySelection").hidden = willingness !== "yes";
      document.querySelectorAll("[data-city-willingness]").forEach((button) => {
        const selected = button.dataset.cityWillingness === willingness;
        button.setAttribute("aria-checked", String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      $("acceptableCityTags").replaceChildren(...accepted.map((code) => {
        const tag = document.createElement("span"); tag.className = "city-tag";
        const name = byCode.get(code).name;
        tag.append(document.createTextNode(name));
        const remove = document.createElement("button"); remove.type = "button";
        remove.textContent = "×"; remove.setAttribute("aria-label", `移除${name}`);
        remove.addEventListener("click", () => { accepted = accepted.filter((c) => c !== code); syncAccepted(); $("citySelectionStatus").textContent = `已移除${name}`; acceptableButton.focus(); });
        tag.append(remove); return tag;
      }), acceptableButton);
    }
    function renderResults() {
      const query = $("citySearchInput").value.trim().replace(/\s/g, "");
      const province = $("cityProvinceFilter").value;
      const visible = query
        ? cities.filter((c) => (!province || c.provinceCode === province) && catalogue.matches(c, query))
        : scope === "overseas" ? cities.filter((c) => c.overseas)
        : province ? cities.filter((c) => c.provinceCode === province)
        : popularCodes.map((code) => byCode.get(code)).filter(Boolean);
      $("cityProvinceFilter").hidden = scope === "overseas";
      dialog.querySelectorAll("[data-location-scope]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.locationScope === scope)));
      $("cityResultsTitle").textContent = query ? `搜索结果 · ${visible.length}` : scope === "overseas" ? "常用海外国家" : province ? "选择城市" : "常用城市";
      $("citySearchEmpty").hidden = visible.length > 0;
      $("cityPickerResults").replaceChildren(...visible.map((city) => {
        const button = document.createElement("button"); button.type = "button"; button.className = "city-option";
        const isPreferred = mode === "acceptable" && city.code === form.elements.preferredCityCode.value;
        button.disabled = isPreferred; button.dataset.cityCode = city.code;
        button.setAttribute("aria-pressed", String(draft.has(city.code)));
        button.setAttribute("aria-label", isPreferred ? `${city.name}，已是首选` : city.name);
        const name = document.createElement("span"); name.textContent = city.name;
        const status = document.createElement("small"); status.textContent = isPreferred ? "首选" : draft.has(city.code) ? "✓" : "+";
        button.append(name, status); return button;
      }));
      $("cityDraftCount").textContent = `已选 ${draft.size} 个${[...draft].some(catalogue.isOverseas) ? "地点" : "城市"}`;
      $("cityDraftNames").textContent = [...draft].map((c) => byCode.get(c)?.name).join("、") || "请选择你愿意考虑的城市或国家";
      $("confirmCityPickerBtn").textContent = draft.size ? `确认选择 (${draft.size})` : "请先选择地点";
      $("confirmCityPickerBtn").disabled = draft.size === 0;
    }
    function open(nextMode) {
      mode = nextMode;
      draft = new Set(mode === "preferred" ? [form.elements.preferredCityCode.value].filter(Boolean) : accepted);
      $("cityPickerTitle").textContent = mode === "preferred" ? "选择首选城市 / 国家" : "其他可接受的城市 / 国家";
      $("cityPickerDescription").textContent = mode === "preferred" ? "单选 · 选择国内城市或海外国家，点选后直接保存。" : "可多选 · 首选地点已为你排除。";
      $("cityPickerFooter").hidden = mode === "preferred";
      scope = draft.size && [...draft].every(catalogue.isOverseas) ? "overseas" : "domestic";
      $("citySearchInput").value = ""; $("cityProvinceFilter").value = "";
      renderResults(); dialog.showModal(); $("citySearchInput").focus();
    }
    provinces.forEach((p) => { const option = document.createElement("option"); option.value = p.c; option.textContent = p.n; $("cityProvinceFilter").append(option); });
    dialog.querySelectorAll("[data-location-scope]").forEach((button) => button.addEventListener("click", () => {
      scope = button.dataset.locationScope;
      $("citySearchInput").value = ""; $("cityProvinceFilter").value = ""; renderResults();
    }));
    preferredButton.addEventListener("click", () => open("preferred"));
    acceptableButton.addEventListener("click", () => open("acceptable"));
    $("closeCityPickerBtn").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (e) => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
    $("citySearchInput").addEventListener("input", renderResults);
    $("cityProvinceFilter").addEventListener("change", renderResults);
    $("cityPickerResults").addEventListener("click", (event) => {
      const button = event.target.closest("[data-city-code]"); if (!button || button.disabled) return;
      const city = byCode.get(button.dataset.cityCode);
      if (mode === "preferred") {
        save("preferredProvinceCode", city.provinceCode); save("preferredCityCode", city.code); save("preferredCity", city.name);
        const wasAccepted = accepted.includes(city.code);
        if (wasAccepted) { accepted = accepted.filter((c) => c !== city.code); syncAccepted(); }
        renderFields(); dialog.close();
        $("citySelectionStatus").textContent = wasAccepted ? `${city.name}已设为首选，并从其他城市中移除。` : `首选城市已更新为${city.name}。`;
        return;
      }
      draft.has(city.code) ? draft.delete(city.code) : draft.add(city.code); renderResults();
      $("cityPickerResults").querySelector(`[data-city-code="${city.code}"]`)?.focus();
    });
    $("confirmCityPickerBtn").addEventListener("click", () => {
      if (!draft.size) return;
      accepted = [...draft]; syncAccepted(); dialog.close();
      $("citySelectionStatus").textContent = `已保存 ${accepted.length} 个可接受地点。`;
    });
    const willingnessButtons = [...document.querySelectorAll("[data-city-willingness]")];
    function chooseWillingness(button) {
      willingness = button.dataset.cityWillingness;
      syncAccepted();
      $("citySelectionStatus").textContent = willingness === "no" ? "已选择只考虑首选地点。" : "";
    }
    willingnessButtons.forEach((button, index) => {
      button.addEventListener("click", () => chooseWillingness(button));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? willingnessButtons[0] : event.key === "End" ? willingnessButtons[1] : willingnessButtons[1 - index];
        chooseWillingness(next); next.focus();
      });
    });
    renderFields();
    return { preferredButton, acceptableButton: $("considerOtherCityYes") };
  }
  window.OfferShowCityPicker = { init };
})();
