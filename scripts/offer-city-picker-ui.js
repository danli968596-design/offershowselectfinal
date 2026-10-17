(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const dialog = $("offerCityPickerDialog");
  if (!dialog) return;
  const catalogue = window.OfferShowLocationCatalog;
  const { provinces, places: cities, byCode } = catalogue;
  const popular = ["1101", "3101", "4401", "4403", "3301", "5101", "3201", "4201", "3205", "6101", "5001", "4301"];
  const search = $("offerCitySearchInput");
  const filter = $("offerCityProvinceFilter");
  let activeTrigger = null;
  let scope = "domestic";
  function renderResults() {
    const query = search.value.trim().replace(/\s/g, "");
    const province = filter.value;
    const visible = query
      ? cities.filter((city) => (!province || city.provinceCode === province) && catalogue.matches(city, query))
      : scope === "overseas" ? cities.filter((city) => city.overseas)
      : province ? cities.filter((city) => city.provinceCode === province)
      : popular.map((code) => byCode.get(code)).filter(Boolean);
    filter.hidden = scope === "overseas";
    dialog.querySelectorAll("[data-location-scope]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.locationScope === scope)));
    $("offerCityResultsTitle").textContent = query ? `搜索结果 · ${visible.length}` : scope === "overseas" ? "常用海外国家" : province ? "选择城市" : "常用城市";
    $("offerCitySearchEmpty").hidden = visible.length > 0;
    $("offerCityPickerResults").replaceChildren(...visible.map((city) => {
      const button = document.createElement("button");
      button.type = "button"; button.className = "city-option"; button.dataset.cityCode = city.code;
      const selected = activeTrigger?.value === city.code;
      button.setAttribute("aria-pressed", String(selected)); button.setAttribute("aria-label", city.name);
      const name = document.createElement("span"); name.textContent = city.name;
      const status = document.createElement("small"); status.textContent = selected ? "✓" : "+";
      button.append(name, status); return button;
    }));
  }
  provinces.forEach((province) => {
    const option = document.createElement("option"); option.value = String(province.c); option.textContent = province.n; filter.append(option);
  });
  dialog.querySelectorAll("[data-location-scope]").forEach((button) => button.addEventListener("click", () => {
    scope = button.dataset.locationScope; search.value = ""; filter.value = ""; renderResults();
  }));
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-offer-city-trigger]");
    if (!trigger) return;
    activeTrigger = trigger; scope = catalogue.isOverseas(trigger.value) ? "overseas" : "domestic"; search.value = ""; filter.value = "";
    renderResults(); dialog.showModal(); search.focus();
  });
  search.addEventListener("input", renderResults);
  filter.addEventListener("change", renderResults);
  $("closeOfferCityPickerBtn").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => { if (activeTrigger?.isConnected) activeTrigger.focus(); });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  $("offerCityPickerResults").addEventListener("click", (event) => {
    const option = event.target.closest("[data-city-code]");
    if (!option || !activeTrigger?.isConnected) return;
    const city = byCode.get(option.dataset.cityCode);
    if (!city) return;
    const value = activeTrigger.closest(".offer-region-field").querySelector("[data-offer-city-value]");
    value.value = city.code;
    value.dispatchEvent(new Event("input", { bubbles: true }));
    activeTrigger.value = city.code;
    activeTrigger.querySelector("[data-offer-city-label]").textContent = city.name;
    activeTrigger.querySelector(".city-trigger-action").textContent = "更换 ›";
    activeTrigger.setAttribute("aria-label", `Offer 所在地点：${city.name}`);
    dialog.close();
  });
})();
