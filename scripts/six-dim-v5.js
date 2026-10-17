(function () {
  "use strict";

  const MODEL_VERSION = "offershow-6d-v5";
  const SESSION_KEY = window.OfferHelperStorage?.SESSION_KEY || "offer-helper-miniapp-session-v1";
  const MIN_OFFERS = 2;
  const MAX_OFFERS = 6;
  const DEMO_COMPANY_NAMES = Object.freeze({ offershow1: "OfferShow1", offershow2: "OfferShow2", offershow3: "OfferShow3" });
  const DIMENSIONS = [
    ["totalPackage", "总包预期"], ["stability", "稳定性"],
    ["growth", "成长空间"], ["workIntensity", "工作强度"],
    ["cityLife", "城市匹配度"], ["teamFit", "团队匹配度"]
  ];
  const IMPORTANCE = {
    totalPackage: "importanceTotalPackage", stability: "importanceStability",
    growth: "importanceGrowth", workIntensity: "importanceWorkIntensity",
    cityLife: "importanceCityLife", teamFit: "importanceTeamFit"
  };
  const LABEL = Object.fromEntries(DIMENSIONS);
  const PREFERENCE_FIELDS = ["idealAnnualPackage", "preferredCity", "preferredProvinceCode", "preferredCityCode", "considerOtherCities",
    "acceptableCities", "acceptableCityCodes", ...Object.values(IMPORTANCE),
    "tradeoffPrimaryKeep", "tradeoffPrimaryCompromise", "tradeoffSecondaryKeep", "tradeoffSecondaryCompromise"];
  const OFFER_FIELDS = ["company", "role", "city", "provinceCode", "cityCode", "annualPackage", "companyStability", "roleStability",
    "skillGrowth", "pathClarity", "workIntensity", "managerFit", "teamFit", "gutFeeling", "notes"];
  const REQUIRED_OFFER_FIELDS = ["company", "role", "city", "annualPackage", "companyStability", "roleStability",
    "skillGrowth", "pathClarity", "workIntensity", "managerFit", "teamFit", "gutFeeling"];

  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const n = (value) => Number(value);
  const has = (value) => String(value ?? "").trim() !== "";
  const CITY_SPLITTER = /[、,，.。;；:：/／\\|｜!！?？\n\r\t]+/;
  const NO_OTHER_CITY_VALUES = new Set(["无", "没有", "暂无", "无其他城市", "无其他可接受城市"]);
  const cleanCityLabel = (value) => String(value ?? "").trim().replace(/\s+/g, "").replace(/市$/u, "");
  const cityKey = (value) => cleanCityLabel(value).toLowerCase();
  const isNoOtherCityAnswer = (value) => NO_OTHER_CITY_VALUES.has(String(value ?? "").trim().replace(/\s+/g, ""));
  const looksLikeMultipleCities = (value) => parseCityList(value).length > 1
    || /[\u3400-\u9fff]\s+[\u3400-\u9fff]/u.test(String(value ?? ""));
  function parseCityList(value) {
    if (isNoOtherCityAnswer(value)) return [];
    const seen = new Set();
    return String(value ?? "").split(CITY_SPLITTER).map(cleanCityLabel).filter((label) => {
      const key = cityKey(label);
      if (!key || isNoOtherCityAnswer(label) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  const REGION_DATA = (typeof window !== "undefined" && Array.isArray(window.OfferShowLocations || window.OfferShowChinaCities)
    ? (window.OfferShowLocations || window.OfferShowChinaCities) : []).map((province) => ({
      code: String(province.c), name: String(province.n),
      cities: (Array.isArray(province.ch) ? province.ch : []).filter((city) => city.n !== "县")
        .map((city) => ({ code: String(city.c), name: String(city.n), provinceCode: String(province.c), provinceName: String(province.n) }))
    }));
  const REGION_CITIES = REGION_DATA.flatMap((province) => province.cities);
  const CITY_BY_CODE = new Map(REGION_CITIES.map((city) => [city.code, city]));
  function cityByName(value) {
    const key = cityKey(value);
    if (!key) return null;
    return REGION_CITIES.find((city) => cityKey(city.name) === key) || null;
  }
  function cityByCode(value) { return CITY_BY_CODE.get(String(value || "")) || null; }
  function parseCityCodes(value) {
    return [...new Set(String(value || "").split(",").map((code) => code.trim()).filter(Boolean))];
  }
  function provinceOptions(selected = "") {
    return `<option value="">请选择省份</option>${REGION_DATA.map((province) => `<option value="${esc(province.code)}" ${province.code === String(selected) ? "selected" : ""}>${esc(province.name)}</option>`).join("")}`;
  }
  function cityOptions(provinceCode, selected = "") {
    const province = REGION_DATA.find((item) => item.code === String(provinceCode));
    if (!province) return '<option value="">请先选择省份</option>';
    return `<option value="">请选择城市</option>${province.cities.map((city) => `<option value="${esc(city.code)}" ${city.code === String(selected) ? "selected" : ""}>${esc(city.name)}</option>`).join("")}`;
  }

  function initInfoTips() {
    const guide = $("backgroundGuideTip");
    guide?.addEventListener("toggle", () => {
      if (!guide.open) return;
      guide.style.removeProperty("--guide-space");
      const row = guide.closest(".ranking-ai-bar, .background-guide-row").getBoundingClientRect();
      const height = guide.querySelector(".info-tip__bubble").offsetHeight + 12;
      const dockTop = document.querySelector(".bottom-action-bar")?.getBoundingClientRect().top;
      const visibleBottom = dockTop > 0 ? Math.min(innerHeight, dockTop) : innerHeight;
      const below = visibleBottom - row.bottom;
      const above = row.top;
      const useAbove = below < height && (above >= height || above > below);
      guide.dataset.placement = useAbove ? "above" : "below";
      guide.style.setProperty("--guide-space", `${Math.max(100, (useAbove ? above : below) - 12)}px`);
    });
    document.addEventListener("click", (event) => {
      document.querySelectorAll(".info-tip[open]").forEach((tip) => {
        if (!tip.contains(event.target)) tip.open = false;
      });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const openTip = document.querySelector(".info-tip[open]");
      if (!openTip) return;
      openTip.open = false;
      openTip.querySelector("summary")?.focus();
    });
  }

  function confirmAction(title, message, confirmLabel, action, tone = "danger") {
    if (document.querySelector(".confirmation-dialog[open]")) return;
    const dialog = document.createElement("dialog");
    dialog.className = `confirmation-dialog confirmation-dialog--${tone}`;
    dialog.setAttribute("aria-labelledby", "confirmationTitle");
    dialog.setAttribute("aria-describedby", "confirmationMessage");
    dialog.innerHTML = `<h2 id="confirmationTitle">${esc(title)}</h2><p id="confirmationMessage">${esc(message)}</p><div class="confirmation-dialog__actions"><button type="button" class="btn btn-outline" data-cancel autofocus>取消</button><button type="button" class="btn btn-primary confirmation-dialog__confirm" data-confirm>${esc(confirmLabel)}</button></div>`;
    dialog.querySelector("[data-cancel]").addEventListener("click", () => dialog.close());
    dialog.querySelector("[data-confirm]").addEventListener("click", () => dialog.close("confirm"));
    dialog.addEventListener("close", () => {
      const confirmed = dialog.returnValue === "confirm";
      dialog.remove();
      if (confirmed) action();
    }, { once: true });
    document.body.appendChild(dialog);
    dialog.showModal();
  }

  function emptyPreferences() {
    return Object.fromEntries(PREFERENCE_FIELDS.map((field) => [field, ""]));
  }
  function emptyOffer() {
    return { id: createId(), ...Object.fromEntries(OFFER_FIELDS.map((field) => [field, ""])) };
  }
  function createId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }
  function normalizeSession(value) {
    const raw = value && typeof value === "object" ? value : {};
    const rawPreferences = raw.preferences && typeof raw.preferences === "object" ? raw.preferences : {};
    const prefs = emptyPreferences();
    for (const field of PREFERENCE_FIELDS) prefs[field] = String(raw.preferences?.[field] ?? "");
    let preferredRecord = cityByCode(prefs.preferredCityCode);
    if (!preferredRecord && has(prefs.preferredCity)) preferredRecord = cityByName(prefs.preferredCity);
    prefs.preferredCity = cleanCityLabel(prefs.preferredCity);
    if (preferredRecord) {
      prefs.preferredCityCode = preferredRecord.code;
      prefs.preferredProvinceCode = preferredRecord.provinceCode;
    } else {
      prefs.preferredCityCode = "";
      prefs.preferredProvinceCode = "";
    }
    if (!has(prefs.acceptableCities) && prefs.considerOtherCities === "no") prefs.acceptableCities = "无";
    const acceptableNames = parseCityList(prefs.acceptableCities);
    prefs.acceptableCities = isNoOtherCityAnswer(prefs.acceptableCities) ? "无" : acceptableNames.join("、");
    prefs.acceptableCityCodes = acceptableNames.map((name) => cityByName(name)?.code).filter(Boolean).join(",");
    prefs.considerOtherCities = !has(prefs.acceptableCities) ? "" : isNoOtherCityAnswer(prefs.acceptableCities) ? "no" : "yes";
    const custom = raw.preferences?.customWeights;
    if (custom && DIMENSIONS.every(([key]) => Number.isInteger(custom[key]) && custom[key] >= 0 && custom[key] <= 100)
      && DIMENSIONS.reduce((sum, [key]) => sum + custom[key], 0) === 100) prefs.customWeights = { ...custom };
    const offers = Array.isArray(raw.offers) ? raw.offers.slice(0, MAX_OFFERS).map((item) => {
      const offer = emptyOffer();
      offer.id = String(item?.id || offer.id);
      for (const field of OFFER_FIELDS) offer[field] = String(item?.[field] ?? "");
      offer.company = DEMO_COMPANY_NAMES[offer.company] || offer.company;
      const city = cityByCode(offer.cityCode) || cityByName(offer.city);
      if (city) {
        offer.city = city.name;
        offer.cityCode = city.code;
        offer.provinceCode = city.provinceCode;
      }
      return offer;
    }) : [];
    return { modelVersion: MODEL_VERSION, preferences: prefs, offers,
      analyzedAt: typeof raw.analyzedAt === "string" ? raw.analyzedAt : "" };
  }
  function loadSession() {
    try {
      const value = window.OfferHelperStorage
        ? window.OfferHelperStorage.loadSessionRaw()
        : JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
      return normalizeSession(value);
    } catch (_) { return normalizeSession(null); }
  }
  function saveSession(session) {
    if (window.OfferHelperStorage) window.OfferHelperStorage.saveSessionRaw(session);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
  function validateCityPreferences(prefs) {
    const preferred = parseCityList(prefs.preferredCity);
    if (!preferred.length) return "请填写一个意向城市。";
    if (preferred.length !== 1 || looksLikeMultipleCities(prefs.preferredCity)) return "意向城市仅填写一个城市。";
    if (!has(prefs.acceptableCities)) return "请填写其他可接受的城市；如果没有，请填写“无”。";
    const acceptable = parseCityList(prefs.acceptableCities);
    if (!isNoOtherCityAnswer(prefs.acceptableCities) && !acceptable.length) return "请填写至少一个其他可接受的城市。";
    if (acceptable.some((city) => cityKey(city) === cityKey(preferred[0]))) return `${preferred[0]}已是意向城市，无需重复填写。`;
    return "";
  }
  function validatePreferences(prefs) {
    if (!Number.isFinite(n(prefs.idealAnnualPackage)) || n(prefs.idealAnnualPackage) <= 0) return "请填写大于 0 的期望薪资。";
    const cityError = validateCityPreferences(prefs);
    if (cityError) return cityError;
    for (const field of Object.values(IMPORTANCE)) {
      if (!["1", "2", "3", "4", "5"].includes(prefs[field])) return "请完成六道重要程度题。";
    }
    const pair1 = [prefs.tradeoffPrimaryKeep, prefs.tradeoffPrimaryCompromise];
    const pair2 = [prefs.tradeoffSecondaryKeep, prefs.tradeoffSecondaryCompromise];
    const valid = (key) => DIMENSIONS.some(([item]) => item === key);
    if (!pair1.every(valid) || pair1[0] === pair1[1]) return "请完成第 9 题，并选择两项不同的因素。";
    if (!pair2.every(valid) || pair2[0] === pair2[1] || pair2.some((key) => pair1.includes(key))) return "请在剩余因素中完成第 10 题。";
    return "";
  }
  function validateOffers(offers) {
    if (!Array.isArray(offers) || offers.length < MIN_OFFERS) return `请至少填写 ${MIN_OFFERS} 份 Offer。`;
    if (offers.length > MAX_OFFERS) return `最多只能比较 ${MAX_OFFERS} 份 Offer。`;
    const ratingFields = ["companyStability", "roleStability", "skillGrowth", "pathClarity", "managerFit", "teamFit"];
    const intensityValues = ["relaxed", "occasional", "seasonal", "frequent", "sustained", "unknown"];
    for (let index = 0; index < offers.length; index++) {
      const offer = offers[index];
      const missing = REQUIRED_OFFER_FIELDS.find((field) => !has(offer[field]));
      if (missing) return `请完整填写第 ${index + 1} 份 Offer 的必填信息。`;
      if (!cityByCode(offer.cityCode) || cityByCode(offer.cityCode).name !== offer.city) return `请选择第 ${index + 1} 份 Offer 的城市。`;
      if (!Number.isFinite(n(offer.annualPackage)) || n(offer.annualPackage) <= 0) return `第 ${index + 1} 份 Offer 的年度总包需大于 0。`;
      if (ratingFields.some((field) => !["1", "2", "3", "4", "5", "unknown"].includes(offer[field]))) return `请完成第 ${index + 1} 份 Offer 的稳定、成长和团队选择。`;
      if (!intensityValues.includes(offer.workIntensity)) return `请选择第 ${index + 1} 份 Offer 的工作节奏。`;
      if (!["1", "2", "3", "4", "5"].includes(offer.gutFeeling)) return `请选择第 ${index + 1} 份 Offer 的接受直觉。`;
    }
    return "";
  }

  function firstInvalidOfferField(offer) {
    const missing = REQUIRED_OFFER_FIELDS.find((field) => !has(offer[field]));
    if (missing) return missing === "city" ? "cityCode" : missing;
    if (!cityByCode(offer.cityCode) || cityByCode(offer.cityCode).name !== offer.city) return "cityCode";
    if (!Number.isFinite(n(offer.annualPackage)) || n(offer.annualPackage) <= 0) return "annualPackage";
    return "";
  }
  function setupResultEditFooter(confirmId, secondaryId) {
    if (new URLSearchParams(location.search).get("from") !== "result") return false;
    document.body.classList.add("is-result-edit");
    if (secondaryId && $(secondaryId)) $(secondaryId).hidden = true;
    $("returnToResultBtn").hidden = false;
    $(confirmId).innerHTML = '确认修改<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
    document.querySelector(".topbar-back").href = "./result.html?ui=review-v2";
    return true;
  }
  function calculateWeights(prefs) {
    if (validatePreferences(prefs)) return null;
    return window.OfferShowCoreAlgorithm.calculate(prefs);
  }
  function redistribute(weights, selected, target) {
    return window.OfferShowCoreAlgorithm.rebalance(weights, selected, target);
  }
  function packageScore(offerAmount, target) {
    return window.OfferShowCoreAlgorithm.packageScore(offerAmount, target);
  }
  function scoreOffer(offer, prefs, weights) {
    return window.OfferShowCoreAlgorithm.scoreOffer(offer, prefs, weights);
  }
  function analyze(session) {
    if (validatePreferences(session.preferences)) return null;
    return window.OfferShowCoreAlgorithm.analyze(session);
  }

  function renderWeightDistribution(node, weights) {
    const colors = { growth: "#3c95f1", workIntensity: "#5aaba4", totalPackage: "#d8a841", stability: "#ec8a76", cityLife: "#527197", teamFit: "#9388b8" };
    const ranked = DIMENSIONS.map(([key]) => [key, weights[key]]).sort((a, b) => b[1] - a[1]);
    const circumference = 2 * Math.PI * 48;
    let offset = 0;
    const segments = ranked.map(([key, value]) => {
      const length = circumference * value / 100;
      const circle = `<circle data-dimension="${key}" cx="64" cy="64" r="48" fill="none" stroke="${colors[key]}" stroke-width="13" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" transform="rotate(-90 64 64)"/>`;
      offset += length;
      return circle;
    }).join("");
    let boundary = -Math.PI / 2;
    const separators = ranked.filter(([, value]) => value > 0).map(([, value]) => {
      const line = `<line x1="${64 + Math.cos(boundary) * 37}" y1="${64 + Math.sin(boundary) * 37}" x2="${64 + Math.cos(boundary) * 59}" y2="${64 + Math.sin(boundary) * 59}" stroke="white" stroke-width="3"/>`;
      boundary += 2 * Math.PI * value / 100;
      return line;
    }).join("");
    node.innerHTML = `<div class="portrait-chart" aria-hidden="true"><svg viewBox="0 0 128 128">${segments}${separators}</svg><div class="portrait-chart__center">偏好权重</div></div><ul class="portrait-legend" role="radiogroup" aria-label="比较 Offer 的六项权重">${ranked.map(([key, value]) => `<li role="presentation" style="--dimension-color:${colors[key]}"><button type="button" class="portrait-legend__option" role="radio" data-dimension="${key}" aria-checked="false" tabindex="-1"><span class="portrait-legend__dot" aria-hidden="true"></span><span>${LABEL[key]}</span><strong>${value}%</strong></button></li>`).join("")}</ul>`;
    const options = [...node.querySelectorAll(".portrait-legend__option")];
    function selectDimension(key) {
      node.dataset.selectedDimension = key;
      options.forEach((button) => {
        const selected = button.dataset.dimension === key;
        button.setAttribute("aria-checked", String(selected));
        button.tabIndex = selected ? 0 : -1;
        button.parentElement.classList.toggle("is-primary", selected);
      });
      node.querySelectorAll("circle[data-dimension]").forEach((circle) => {
        circle.setAttribute("stroke-width", circle.dataset.dimension === key ? "20" : "13");
      });
    }
    selectDimension(ranked.some(([key]) => key === node.dataset.selectedDimension)
      ? node.dataset.selectedDimension : ranked[0][0]);
    node.onclick = (event) => {
      const button = event.target.closest(".portrait-legend__option");
      if (button && node.contains(button)) selectDimension(button.dataset.dimension);
    };
    node.onkeydown = (event) => {
      const current = options.indexOf(event.target);
      if (current < 0 || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
      const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1
        : (current + direction + options.length) % options.length;
      selectDimension(options[next].dataset.dimension);
      options[next].focus();
    };
    return ranked;
  }
  function renderPortrait(weights, prefs) {
    const ranked = renderWeightDistribution($("previewWeightList"), weights);
    $("preferenceHeadline").textContent = `优先${LABEL[ranked[0][0]]}，兼顾${LABEL[ranked[1][0]]}`;
    const facts = [["期望薪资", `${prefs.idealAnnualPackage} 万元`], ["意向城市", prefs.preferredCity], ["其他可接受城市", prefs.acceptableCities || "未填写"], ["最不愿意牺牲", LABEL[prefs.tradeoffPrimaryKeep]]];
    $("portraitFacts").innerHTML = facts.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join("");
  }

  function initPreferences() {
    const form = $("preferenceForm");
    if (!form) return;
    const session = loadSession();
    const prefs = session.preferences;
    const editingResult = setupResultEditFooter("goToOffersBtn");
    let draftWeights = null;
    let tunerDragBaseline = null;
    for (const field of PREFERENCE_FIELDS) if (form.elements[field]) form.elements[field].value = prefs[field];
    const preferredCityInput = form.elements.preferredCity;
    const acceptableCitiesInput = form.elements.acceptableCities;
    function syncCityMetadata() {
      const preferredRecord = cityByName(prefs.preferredCity);
      prefs.preferredCityCode = preferredRecord?.code || "";
      prefs.preferredProvinceCode = preferredRecord?.provinceCode || "";
      const acceptableNames = parseCityList(prefs.acceptableCities);
      prefs.acceptableCityCodes = acceptableNames.map((name) => cityByName(name)?.code).filter(Boolean).join(",");
      prefs.considerOtherCities = !has(prefs.acceptableCities) ? "" : isNoOtherCityAnswer(prefs.acceptableCities) ? "no" : "yes";
      form.elements.preferredCityCode.value = prefs.preferredCityCode;
      form.elements.preferredProvinceCode.value = prefs.preferredProvinceCode;
      form.elements.acceptableCityCodes.value = prefs.acceptableCityCodes;
      form.elements.considerOtherCities.value = prefs.considerOtherCities;
    }
    const choiceFields = [...Object.values(IMPORTANCE), "tradeoffPrimaryKeep", "tradeoffPrimaryCompromise",
      "tradeoffSecondaryKeep", "tradeoffSecondaryCompromise"];
    const choiceGroups = new Map();
    function syncChoiceGroup(select) {
      const group = choiceGroups.get(select.name);
      if (!group) return;
      const buttons = [...group.querySelectorAll("button[data-value]")];
      const unavailable = (button) => select.disabled || [...select.options].some((option) => option.value === button.dataset.value && option.disabled);
      const active = buttons.find((button) => button.dataset.value === select.value && !unavailable(button)) || buttons.find((button) => !unavailable(button));
      group.setAttribute("aria-disabled", String(select.disabled));
      buttons.forEach((button) => {
        button.disabled = unavailable(button);
        button.classList.toggle("is-unavailable", button.disabled && !select.disabled);
        button.setAttribute("aria-disabled", String(button.disabled));
        button.setAttribute("aria-checked", String(button.dataset.value === select.value));
        button.tabIndex = !button.disabled && button === active ? 0 : -1;
      });
    }
    function renderChoiceGroup(select) {
      const group = choiceGroups.get(select.name);
      if (!group) return;
      const options = [...select.options].filter((option) => option.value);
      group.innerHTML = options.length ? options.map((option) => {
        const full = option.textContent.trim();
        const separator = full.includes("：") ? "：" : " · ";
        const parts = full.split(separator);
        const title = parts.shift();
        const detail = parts.join(separator);
        if (Object.values(IMPORTANCE).includes(select.name)) {
          const shortLabel = title.replace(/^\d+\s*·\s*/, "");
          return `<button type="button" class="v5-choice v5-choice--scale" role="radio" data-value="${esc(option.value)}" aria-label="${esc(full)}" aria-checked="false"><span class="v5-scale-ring-space" aria-hidden="true"><span class="v5-choice__ring"></span></span><span class="v5-choice__copy"><strong>${esc(shortLabel)}</strong></span></button>`;
        }
        return `<button type="button" class="v5-choice" role="radio" data-value="${esc(option.value)}" aria-label="${esc(full)}" aria-checked="false"><span class="v5-choice__ring" aria-hidden="true"></span><span class="v5-choice__copy"><strong>${esc(title)}</strong>${detail ? `<small>${esc(detail)}</small>` : ""}</span></button>`;
      }).join("") : `<p class="v5-choice-placeholder">请先完成第一次取舍</p>`;
      syncChoiceGroup(select);
    }
    for (const field of choiceFields) {
      const select = form.elements[field];
      const label = form.querySelector(`label[for="${field}"]`);
      const group = document.createElement("div");
      group.className = `v5-choice-grid ${Object.values(IMPORTANCE).includes(field) ? "v5-choice-grid--importance" : "v5-choice-grid--tradeoff"}`;
      group.setAttribute("role", "radiogroup");
      if (label) {
        label.id = `${field}-choice-label`;
        label.removeAttribute("for");
        group.setAttribute("aria-labelledby", label.id);
      }
      select.classList.add("v5-choice-native");
      select.tabIndex = -1;
      select.setAttribute("aria-hidden", "true");
      select.after(group);
      choiceGroups.set(field, group);
      group.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-value]");
        if (!button || button.disabled || select.value === button.dataset.value) return;
        select.value = button.dataset.value;
        select.dispatchEvent(new Event("input", { bubbles: true }));
      });
      group.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        const buttons = [...group.querySelectorAll("button[data-value]:not(:disabled)")];
        if (!buttons.length) return;
        event.preventDefault();
        const current = buttons.indexOf(document.activeElement);
        const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : -1;
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
          : (current + direction + buttons.length) % buttons.length;
        buttons[next].click();
        buttons[next].focus();
      });
      renderChoiceGroup(select);
    }
    function syncChoiceGroups() {
      syncTradeoffAvailability();
      for (const field of choiceFields) syncChoiceGroup(form.elements[field]);
    }
    const primary = [form.elements.tradeoffPrimaryKeep, form.elements.tradeoffPrimaryCompromise];
    const secondary = [form.elements.tradeoffSecondaryKeep, form.elements.tradeoffSecondaryCompromise];
    function updateSecondary(clear) {
      const chosen = primary.map((element) => element.value);
      const ready = chosen.every(Boolean) && chosen[0] !== chosen[1];
      secondary.forEach((element) => {
        const previous = clear ? "" : (prefs[element.name] || element.value);
        element.innerHTML = `<option value="">${ready ? "请选择" : "请先完成第一次取舍"}</option>` +
          (ready ? DIMENSIONS.filter(([key]) => !chosen.includes(key)).map(([key, label]) => `<option value="${key}">${label}</option>`).join("") : "");
        element.disabled = !ready;
        element.value = previous;
        if (element.value !== previous) element.value = "";
        prefs[element.name] = element.value;
        renderChoiceGroup(element);
      });
    }
    function syncTradeoffAvailability() {
      const reserved = new Set();
      [...primary, ...secondary].forEach((select) => {
        [...select.options].forEach((option) => { option.disabled = !!option.value && reserved.has(option.value); });
        if (reserved.has(select.value)) { select.value = ""; prefs[select.name] = ""; }
        if (select.value) reserved.add(select.value);
      });
    }
    function render() {
      syncChoiceGroups();
      const calculation = calculateWeights(prefs);
      $("preferencePortrait").hidden = !calculation;
      $("openWeightTunerBtn").disabled = !calculation;
      if (calculation) renderPortrait(calculation.weights, prefs);
      $("preferenceStatusText").textContent = prefs.customWeights ? "已采用微调后的权重，六项合计 100%。" : "比较 Offer 时，越在意的方向占比越高。";
    }
    function closeTuner() { $("weightTunerPanel").hidden = true; draftWeights = null; tunerDragBaseline = null; }
    function syncTuner() {
      for (const [key] of DIMENSIONS) {
        const row = $("weightTunerList").querySelector(`[data-weight-key="${key}"]`);
        row.querySelector("input").value = draftWeights[key];
        row.querySelector("output").textContent = `${draftWeights[key]}%`;
      }
      $("weightTunerTotal").textContent = `合计 ${Object.values(draftWeights).reduce((a, b) => a + b, 0)}%`;
    }
    form.addEventListener("input", (event) => {
      const field = event.target.name;
      if (!PREFERENCE_FIELDS.includes(field)) return;
      prefs[field] = event.target.value.trim();
      if (field === "preferredCity" || field === "acceptableCities") syncCityMetadata();
      session.analyzedAt = "";
      if (Object.values(IMPORTANCE).includes(field) || field.startsWith("tradeoff")) delete prefs.customWeights;
      if (field.startsWith("tradeoff")) syncTradeoffAvailability();
      if (field === "tradeoffPrimaryKeep" || field === "tradeoffPrimaryCompromise") updateSecondary(true);
      saveSession(session);
      if (prefs[field]) {
        $("preferenceValidation").textContent = "";
      }
      closeTuner();
      render();
    });
    $("openWeightTunerBtn").addEventListener("click", () => {
      const calculation = calculateWeights(prefs);
      if (!calculation) return;
      draftWeights = { ...calculation.weights };
      tunerDragBaseline = null;
      $("weightTunerList").innerHTML = DIMENSIONS.map(([key, label]) => `<div class="weight-tuner-row" data-weight-key="${key}"><label for="weight-${key}">${label}</label><input id="weight-${key}" type="range" min="0" max="100" value="${draftWeights[key]}" aria-label="${label}权重"><output>${draftWeights[key]}%</output></div>`).join("");
      $("weightTunerPanel").hidden = false;
      syncTuner();
      $("weightTunerPanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    $("weightTunerList").addEventListener("pointerdown", (event) => {
      const key = event.target.closest("[data-weight-key]")?.dataset.weightKey;
      if (key && draftWeights) tunerDragBaseline = { key, weights: { ...draftWeights } };
    });
    $("weightTunerList").addEventListener("focusin", (event) => {
      const key = event.target.closest("[data-weight-key]")?.dataset.weightKey;
      if (key && draftWeights && tunerDragBaseline?.key !== key) tunerDragBaseline = { key, weights: { ...draftWeights } };
    });
    $("weightTunerList").addEventListener("input", (event) => {
      const key = event.target.closest("[data-weight-key]")?.dataset.weightKey;
      if (!key || !draftWeights) return;
      if (tunerDragBaseline?.key !== key) tunerDragBaseline = { key, weights: { ...draftWeights } };
      draftWeights = redistribute(tunerDragBaseline.weights, key, n(event.target.value));
      syncTuner();
    });
    $("weightTunerList").addEventListener("change", () => { tunerDragBaseline = null; });
    $("weightTunerList").addEventListener("focusout", () => { tunerDragBaseline = null; });
    $("resetWeightTunerBtn").addEventListener("click", () => {
      confirmAction("恢复问卷权重？", "将清除当前微调结果，恢复为问卷生成的权重。", "确认恢复", () => {
        delete prefs.customWeights;
        session.analyzedAt = "";
        saveSession(session);
        draftWeights = { ...calculateWeights(prefs).questionnaireWeights };
        syncTuner(); render();
      });
    });
    $("cancelWeightTunerBtn").addEventListener("click", closeTuner);
    $("saveWeightTunerBtn").addEventListener("click", () => {
      if (!draftWeights) return;
      prefs.customWeights = { ...draftWeights };
      session.analyzedAt = "";
      saveSession(session); closeTuner(); render();
    });
    $("goToOffersBtn").addEventListener("click", () => {
      syncCityMetadata();
      const error = validatePreferences(prefs);
      if (error) {
        $("preferenceValidation").textContent = error;
        const firstMissing = ["idealAnnualPackage", "preferredCity", "acceptableCities", ...Object.values(IMPORTANCE),
          "tradeoffPrimaryKeep", "tradeoffPrimaryCompromise", "tradeoffSecondaryKeep", "tradeoffSecondaryCompromise"]
          .find((field) => !has(prefs[field]));
        const control = firstMissing === "acceptableCities" || error.includes("重复填写") || error.includes("其他可接受城市")
          ? acceptableCitiesInput
          : firstMissing === "preferredCity" ? preferredCityInput : firstMissing ? form.elements[firstMissing]
            : error.includes("意向城市") ? preferredCityInput : null;
        const target = control?.classList.contains("v5-choice-native") ? control.nextElementSibling : control;
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
        (target?.querySelector?.('[tabindex="0"]') || target)?.focus?.();
        return;
      }
      prefs.preferredCity = parseCityList(prefs.preferredCity)[0];
      prefs.acceptableCities = isNoOtherCityAnswer(prefs.acceptableCities) ? "无" : parseCityList(prefs.acceptableCities).join("、");
      preferredCityInput.value = prefs.preferredCity;
      acceptableCitiesInput.value = prefs.acceptableCities;
      syncCityMetadata();
      if (editingResult) {
        const offerError = validateOffers(session.offers);
        if (offerError) { $("preferenceValidation").textContent = offerError; return; }
        session.analyzedAt = new Date().toISOString();
      }
      saveSession(session); location.href = editingResult ? "./result.html?ui=review-v2" : "./offers.html?ui=review-v2";
    });
    updateSecondary(false);
    render();
  }

  const PAPER_ICON_PATHS = {
    salary: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9v6m12-6v6"/><rect x="10" y="9" width="4" height="6" rx="1"/>',
    city: '<path d="M19 10c0 5-7 12-7 12S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    shield: '<path d="m12 2 8 4v7c0 5-8 9-8 9S4 18 4 13V6l8-4Z"/><path d="m8 12 3 3 5-6"/>',
    growth: '<path d="m3 17 6-6 4 4 8-10m-5 0h5v5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    person: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M7 17c1-4 9-4 10 0"/>',
    work: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4"/>',
    heart: '<path d="M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 5 2 10 8 15 6-5 12-10 8-15Z"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>'
  };
  const PAPER_FIELD_ICONS = {
    idealAnnualPackage: "salary", preferredCity: "city", acceptableCities: "city", acceptableCityEntry: "city",
    importanceTotalPackage: "salary", importanceStability: "shield", importanceGrowth: "growth",
    importanceWorkIntensity: "clock", importanceCityLife: "city", importanceTeamFit: "person",
    tradeoffPrimaryKeep: "heart", tradeoffPrimaryCompromise: "compass",
    tradeoffSecondaryKeep: "heart", tradeoffSecondaryCompromise: "compass",
    company: "person", role: "work", city: "city", annualPackage: "salary",
    companyStability: "shield", roleStability: "shield", skillGrowth: "growth",
    pathClarity: "compass", workIntensity: "clock", managerFit: "person", teamFit: "person", gutFeeling: "heart"
  };
  function paperIcon(key) {
    const type = PAPER_FIELD_ICONS[key];
    if (!type) return "";
    return `<svg class="v5-field-icon v5-field-icon--${type}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PAPER_ICON_PATHS[type]}</svg>`;
  }
  function decoratePreferenceLabels() {
    document.querySelectorAll("#preferenceForm label[for]").forEach((label) => {
      label.insertAdjacentHTML("afterbegin", paperIcon(label.htmlFor));
    });
  }
  function paperSection(number, title, color) {
    return `<h3 class="offer-section__title offer-section__title--${color}">${title}</h3>`;
  }

  function field(label, key, value, type = "text", extra = "", unit = "") {
    const input = `<input data-field="${key}" type="${type}" value="${esc(value)}" ${unit ? `aria-label="${esc(label)}，单位${esc(unit)}"` : ""} ${extra}>`;
    const control = unit ? `<span class="unit-input">${input}<span class="unit-input__suffix" aria-hidden="true">${esc(unit)}</span></span>` : input;
    return `<label class="field-group offer-field"><span>${paperIcon(key)}${label}</span>${control}</label>`;
  }
  function regionField(offer) {
    const city = cityByCode(offer.cityCode);
    const code = city?.code || "";
    const name = city?.name || "选择城市";
    return `<div class="field-group offer-field offer-region-field"><span>${paperIcon("city")}城市 / 国家</span><div class="region-select-row"><button type="button" class="city-select-trigger offer-city-trigger" data-offer-city-trigger data-field="cityCode" value="${esc(code)}" aria-label="Offer 所在地点：${esc(name)}" aria-haspopup="dialog" aria-controls="offerCityPickerDialog"><span data-offer-city-label>${esc(name)}</span><span class="city-trigger-action">${city ? "更换 ›" : "选择 ›"}</span></button><input type="hidden" data-offer-city-value data-field="cityCode" value="${esc(code)}"></div></div>`;
  }
  function choiceField(label, key, value, options, offerId) {
    const labelId = `offer-${offerId}-${key}-label`;
    const choices = key === "gutFeeling" ? options : [...options, ["unknown", "不清楚"]];
    const shortLabels = {
      workIntensity: { relaxed: "宽松", occasional: "偶尔忙", seasonal: "阶段忙", frequent: "经常忙", sustained: "长期忙" },
      gutFeeling: { "1": "不想", "2": "犹豫", "3": "不确定", "4": "想接受", "5": "很想" }
    };
    return `<div class="field-group offer-field offer-choice-field"><span id="${esc(labelId)}">${paperIcon(key)}${esc(label)}</span><div class="v5-choice-grid v5-choice-grid--offer" role="radiogroup" aria-labelledby="${esc(labelId)}">${choices.map(([optionValue, text]) => {
      const short = shortLabels[key]?.[optionValue] || text;
      return `<label class="v5-choice v5-choice--scale ${optionValue === "unknown" ? "v5-choice--unknown" : ""}"><input type="radio" name="offer-${esc(offerId)}-${key}" data-field="${key}" value="${esc(optionValue)}" aria-label="${esc(text)}" ${String(value) === String(optionValue) ? "checked" : ""}><span class="v5-scale-ring-space" aria-hidden="true"><span class="v5-choice__ring"></span></span><span class="v5-choice__copy"><strong>${esc(short)}</strong></span></label>`;
    }).join("")}</div></div>`;
  }
  function offerFormCompletion(offer) {
    const filled = REQUIRED_OFFER_FIELDS.filter((key) => has(offer[key])
      && (key !== "annualPackage" || (Number.isFinite(n(offer[key])) && n(offer[key]) > 0))
      && (key !== "city" || Boolean(cityByCode(offer.cityCode)))).length;
    return Math.round(filled / REQUIRED_OFFER_FIELDS.length * 100);
  }
  function offerCard(offer, index, offerCount) {
    const five = [["1", "很低"], ["2", "偏低"], ["3", "一般"], ["4", "较高"], ["5", "很高"]];
    const intensity = [["relaxed", "节奏宽松"], ["occasional", "偶尔忙碌"], ["seasonal", "阶段性高峰"], ["frequent", "经常高强度"], ["sustained", "长期高压"]];
    const pulse = [["1", "完全不想接受"], ["2", "有些犹豫"], ["3", "说不准"], ["4", "比较想接受"], ["5", "非常想接受"]];
    const percent = offerFormCompletion(offer);
    return `<article class="offer-card compact-offer" data-offer-id="${esc(offer.id)}" data-summary-complete="${percent === 100}">
      <details class="compact-offer__details" ${index === 0 ? "open" : ""}>
        <summary class="compact-offer__summary">
          <div class="offer-card__top"><p class="offer-card__eyebrow offer-summary__base-title">Offer ${index + 1}</p><h2 class="offer-card__title"><span class="offer-company" data-offer-title>${esc(offer.company || `Offer ${index + 1}`)}</span><span class="offer-role" data-offer-meta>${esc(offer.role || "填写公司与岗位")}</span></h2></div>
          <div class="offer-summary__facts"><div class="offer-summary__fact"><span class="offer-summary__caption">年度总包</span><p class="offer-summary__salary"><strong data-offer-package>${has(offer.annualPackage) ? `${esc(offer.annualPackage)} 万` : "待补充"}</strong></p></div><div class="offer-summary__fact"><span class="offer-summary__caption">城市</span><span class="offer-summary__value" data-offer-city>${esc(offer.city || "待补充")}</span></div><div class="offer-summary__fact"><span class="offer-summary__caption">工作节奏</span><span class="offer-summary__value" data-offer-intensity>${esc({ relaxed: "宽松", occasional: "偶尔忙", seasonal: "阶段忙", frequent: "经常忙", sustained: "长期忙" }[offer.workIntensity] || "待确认")}</span></div></div>
          <div class="offer-summary__footer"><div class="offer-card__meta"><span class="progress-badge" data-offer-progress>${percent === 100 ? "已填完" : `已填写 ${percent}%`}</span></div><div class="offer-progress"><span data-offer-progress-bar style="width:${percent}%"></span></div><span class="offer-summary__action"><span>展开编辑</span><span>收起</span></span></div>
        </summary>
      <div class="compact-offer__content offer-fields"><section class="offer-section offer-section--blue offer-fields__group">${paperSection("01", "基本信息", "blue")}<div class="offer-section__fields offer-field-grid">${field("公司", "company", offer.company, "text", 'placeholder="公司名称" required')}${field("岗位", "role", offer.role, "text", 'placeholder="岗位名称" required')}${regionField(offer)}</div></section>
      <section class="offer-section offer-fields__group">${paperSection("02", "薪资与工作", "yellow")}<div class="offer-section__fields offer-field-grid">${field("预计年度总包", "annualPackage", offer.annualPackage, "number", 'inputmode="decimal" min="0.1" step="0.1" placeholder="如：38" required', "万元")}${choiceField("预计长期工作节奏", "workIntensity", offer.workIntensity, intensity, offer.id)}</div></section>
      <section class="offer-section offer-fields__group">${paperSection("03", "稳定与成长", "coral")}<div class="offer-section__fields offer-field-grid">${choiceField("公司及业务稳定程度", "companyStability", offer.companyStability, five, offer.id)}${choiceField("部门及岗位稳定程度", "roleStability", offer.roleStability, five, offer.id)}${choiceField("能力提升程度", "skillGrowth", offer.skillGrowth, five, offer.id)}${choiceField("发展路径清晰度", "pathClarity", offer.pathClarity, five, offer.id)}</div></section>
      <section class="offer-section offer-fields__group">${paperSection("04", "团队匹配", "teal")}<div class="offer-section__fields offer-field-grid">${choiceField("直属领导匹配感", "managerFit", offer.managerFit, five, offer.id)}${choiceField("团队氛围与协作匹配感", "teamFit", offer.teamFit, five, offer.id)}</div></section>
      <section class="offer-section offer-fields__group offer-fields__group--last">${paperSection("05", "你的直觉", "blue")}${choiceField("如果 3 天内必须回复，你有多想接受？", "gutFeeling", offer.gutFeeling, pulse, offer.id)}<p class="field-hint">记录你的接受意愿，不进入评分。</p><label class="field-group offer-field"><span>备注（选填）</span><textarea data-field="notes" rows="3" placeholder="写下还需要确认的事">${esc(offer.notes)}</textarea></label></section></div></details><button class="icon-btn compact-offer__delete" type="button" data-remove="${esc(offer.id)}" aria-label="删除第 ${index + 1} 份 Offer" ${offerCount <= MIN_OFFERS ? "disabled" : ""}><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></article>`;
  }
  function initOffers() {
    const cards = $("offerCards"); if (!cards) return;
    const session = loadSession();
    setupResultEditFooter("goToResultBtn", "offerCountText");
    while (session.offers.length < MIN_OFFERS) session.offers.push(emptyOffer());
    saveSession(session);
    function render(message = "") {
      cards.innerHTML = session.offers.map((offer, index) => offerCard(offer, index, session.offers.length)).join("");
      $("addOfferBtn").disabled = session.offers.length >= MAX_OFFERS;
      const addOfferLabel = session.offers.length >= MAX_OFFERS ? "已达 6 份上限" : "新增 Offer";
      $("addOfferBtn").querySelector(".add-offer-label").textContent = addOfferLabel;
      $("addOfferBtn").setAttribute("aria-label", addOfferLabel);
      $("addOfferBtn").title = addOfferLabel;
      $("offerCountText").textContent = session.offers.length >= MAX_OFFERS
        ? `已添加 ${session.offers.length}/${MAX_OFFERS} 份 Offer · 已达上限`
        : `已添加 ${session.offers.length}/${MAX_OFFERS} 份 Offer（至少 ${MIN_OFFERS} 份）`;
      $("validationMessage").textContent = message;
    }
    cards.addEventListener("input", (event) => {
      const field = event.target.dataset.field;
      const offer = session.offers.find((item) => item.id === event.target.closest("[data-offer-id]")?.dataset.offerId);
      if (!offer || !OFFER_FIELDS.includes(field)) return;
      offer[field] = event.target.value;
      if (field === "provinceCode") {
        offer.cityCode = "";
        offer.city = "";
        const citySelect = event.target.closest(".offer-region-field")?.querySelector('[data-field="cityCode"]');
        if (citySelect) {
          citySelect.innerHTML = cityOptions(offer.provinceCode);
          citySelect.disabled = !offer.provinceCode;
        }
      } else if (field === "cityCode") {
        const city = cityByCode(offer.cityCode);
        offer.city = city?.name || "";
        offer.provinceCode = city?.provinceCode || offer.provinceCode;
      }
      session.analyzedAt = "";
      const card = event.target.closest(".offer-card");
      card.querySelector("[data-offer-title]").textContent = offer.company || `Offer ${session.offers.indexOf(offer) + 1}`;
      card.querySelector("[data-offer-meta]").textContent = offer.role || "填写公司与岗位";
      card.querySelector("[data-offer-package]").textContent = has(offer.annualPackage) ? `${offer.annualPackage} 万` : "待补充";
      card.querySelector("[data-offer-city]").textContent = offer.city || "待补充";
      card.querySelector("[data-offer-intensity]").textContent = { relaxed: "宽松", occasional: "偶尔忙", seasonal: "阶段忙", frequent: "经常忙", sustained: "长期忙" }[offer.workIntensity] || "待确认";
      const percent = offerFormCompletion(offer);
      card.querySelector("[data-offer-progress]").textContent = percent === 100 ? "已填完" : `已填写 ${percent}%`;
      card.dataset.summaryComplete = String(percent === 100);
      card.querySelector("[data-offer-progress-bar]").style.width = `${percent}%`;
      saveSession(session);
    });
    cards.addEventListener("change", (event) => event.target.dispatchEvent(new Event("input", { bubbles: true })));
    cards.addEventListener("click", (event) => {
      const id = event.target.closest("[data-remove]")?.dataset.remove;
      if (!id) return;
      if (session.offers.length <= MIN_OFFERS) { $("validationMessage").textContent = `至少保留 ${MIN_OFFERS} 份 Offer。`; return; }
      const offer = session.offers.find((item) => item.id === id);
      confirmAction("删除这份 Offer？", `将删除${offer?.company || "这份 Offer"}的全部已填信息。`, "确认删除", () => {
        session.offers = session.offers.filter((item) => item.id !== id);
        session.analyzedAt = ""; saveSession(session); render();
      });
    });
    $("addOfferBtn").addEventListener("click", () => {
      if (session.offers.length >= MAX_OFFERS) { $("validationMessage").textContent = `已达到 ${MAX_OFFERS} 份 Offer 上限。`; return; }
      session.offers.push(emptyOffer()); session.analyzedAt = ""; saveSession(session); render();
      if (session.offers.length >= MAX_OFFERS) $("validationMessage").textContent = `已达到 ${MAX_OFFERS} 份 Offer 上限。`;
      cards.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    $("loadOfferDemoBtn").addEventListener("click", () => {
      session.analyzedAt = "";
      session.offers = [
        { company: "OfferShow1", role: "AI 产品经理", city: "杭州市", provinceCode: "33", cityCode: "3301", annualPackage: "44", companyStability: "3", roleStability: "3", skillGrowth: "5", pathClarity: "4", workIntensity: "frequent", managerFit: "4", teamFit: "4", gutFeeling: "5", notes: "方向和团队都很有吸引力，需要再确认节奏。" },
        { company: "OfferShow2", role: "产品经理", city: "北京市", provinceCode: "11", cityCode: "1101", annualPackage: "38", companyStability: "4", roleStability: "4", skillGrowth: "3", pathClarity: "3", workIntensity: "seasonal", managerFit: "4", teamFit: "4", gutFeeling: "4", notes: "工作内容稳定，成长路径需要再聊。" },
        { company: "OfferShow3", role: "产品负责人", city: "上海市", provinceCode: "31", cityCode: "3101", annualPackage: "42", companyStability: "2", roleStability: "3", skillGrowth: "5", pathClarity: "3", workIntensity: "occasional", managerFit: "5", teamFit: "5", gutFeeling: "3", notes: "团队氛围好，业务确定性还需要核实。" }
      ].map((offer) => ({ ...emptyOffer(), ...offer }));
      saveSession(session); render();
    });
    $("clearAllBtn").addEventListener("click", () => {
      confirmAction("清空这些 Offer？", "将清空所有 Offer 的已填信息，保留你的偏好设置。", "确认清空", () => {
        session.offers = [emptyOffer(), emptyOffer()];
        session.analyzedAt = ""; saveSession(session); render();
      });
    });
    $("goToResultBtn").addEventListener("click", () => {
      const error = validatePreferences(session.preferences);
      if (error) { $("validationMessage").textContent = `偏好设置还未完成：${error}`; return; }
      const offerError = validateOffers(session.offers);
      if (offerError) {
        $("validationMessage").textContent = offerError;
        const invalidIndex = session.offers.findIndex((offer) => firstInvalidOfferField(offer));
        if (invalidIndex >= 0) {
          const offer = session.offers[invalidIndex];
          const field = firstInvalidOfferField(offer);
          const card = [...cards.querySelectorAll("[data-offer-id]")].find((element) => element.dataset.offerId === offer.id);
          if (card) {
            card.querySelector("details").open = true;
            const control = card.querySelector(`[data-field="${field}"]`);
            (control?.closest(".offer-field") || control || card).scrollIntoView({ behavior: "smooth", block: "center" });
            control?.focus?.();
          }
        }
        return;
      }
      session.analyzedAt = new Date().toISOString(); saveSession(session); location.href = "./result.html?ui=review-v2";
    });
    render();
    const offerToolbar = document.querySelector(".offers-toolbar");
    if (window.IntersectionObserver && offerToolbar) {
      const updateAddOffer = () => {
        $("addOfferBtn").classList.toggle("is-floating", offerToolbar.getBoundingClientRect().bottom <= 0);
      };
      // Observe the reserved row so moving the button cannot change the threshold.
      new IntersectionObserver(updateAddOffer, { threshold: 0 }).observe(offerToolbar);
      updateAddOffer();
    }
  }

  function buildShareCardData(session, analysis) {
    // Share the current company labels and computed results, while excluding role/city/pay/notes.
    const offers = analysis.scoredOffers.map((offer, sortedIndex) => {
      const originalIndex = session.offers.findIndex((item) => item.id === offer.id);
      return {
        label: String(offer.company || `Offer ${originalIndex >= 0 ? originalIndex + 1 : sortedIndex + 1}`),
        score: offer.totalScore,
        dimensions: DIMENSIONS.map(([key]) => offer.dimensionScores[key])
      };
    });
    return {
      weights: { ...analysis.weights },
      topPreference: LABEL[analysis.topWeightKey] || "综合匹配",
      topPreferenceWeight: analysis.weights[analysis.topWeightKey] || 0,
      offers
    };
  }
  function drawShareCard(canvas, session, analysis, mascot) {
    // Allowlist: company labels, dimensions, weights and numerical results; no role/city/pay/notes.
    const shareData = buildShareCardData(session, analysis);
    const shareOffers = shareData.offers;
    canvas.width = 750;
    canvas.height = 1570 + shareOffers.length * 112;
    const ctx = canvas.getContext("2d");
    const blue = "#328ff0", ink = "#34475d", muted = "#71889e";
    const fitLabel = (label, maxWidth) => {
      if (ctx.measureText(label).width <= maxWidth) return label;
      let value = label;
      while (value.length > 1 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1);
      return `${value}…`;
    };
    ctx.fillStyle = "#f5f8fc"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = blue; ctx.fillRect(0, 0, 750, 230);
    ctx.fillStyle = "#fff"; ctx.font = "600 30px sans-serif"; ctx.fillText("OfferShow", 48, 62);
    ctx.font = "700 44px sans-serif"; ctx.fillText("我的六维决策结果", 48, 134);
    ctx.font = "24px sans-serif"; ctx.fillText(`首要偏好：${shareData.topPreference} ${shareData.topPreferenceWeight}% · ${shareOffers.length} 份 Offer`, 48, 188);
    ctx.drawImage(mascot, 534, 28, 190, 190);
    const block = (y, height) => { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.roundRect(32, y, 686, height, 20); ctx.fill(); };
    block(260, 302);
    ctx.fillStyle = ink; ctx.font = "600 28px sans-serif"; ctx.fillText("01  我的决策权重", 58, 307);
    DIMENSIONS.forEach(([key, label], i) => {
      const x = i % 2 ? 392 : 58, y = 362 + Math.floor(i / 2) * 72;
      ctx.fillStyle = muted; ctx.font = "23px sans-serif"; ctx.fillText(label, x, y);
      ctx.fillStyle = blue; ctx.font = "600 24px sans-serif"; ctx.fillText(`${shareData.weights[key]}%`, x + 212, y);
      ctx.fillStyle = "#eaf1f8"; ctx.fillRect(x, y + 15, 276, 5);
      ctx.fillStyle = blue; ctx.fillRect(x, y + 15, 276 * shareData.weights[key] / 100, 5);
    });
    const rankingY = 588, rankingHeight = 80 + shareOffers.length * 62;
    block(rankingY, rankingHeight);
    ctx.fillStyle = ink; ctx.font = "600 28px sans-serif"; ctx.fillText("02  综合匹配度排序", 58, rankingY + 46);
    shareOffers.forEach((offer, i) => {
      const y = rankingY + 99 + i * 62;
      ctx.fillStyle = ink; ctx.font = "26px sans-serif"; ctx.fillText(fitLabel(offer.label, 420), 58, y);
      ctx.fillStyle = blue; ctx.font = "600 28px sans-serif"; ctx.fillText(offer.score.toFixed(1), 539, y);
      ctx.fillStyle = muted; ctx.font = "19px sans-serif"; ctx.fillText("/ 100", 626, y);
    });
    const tableY = rankingY + rankingHeight + 26;
    const legendRows = Math.ceil(shareOffers.length / 3);
    const tableHeaderY = tableY + 557 + legendRows * 44 + 28;
    block(tableY, tableHeaderY - tableY + 82 + shareOffers.length * 50);
    ctx.fillStyle = ink; ctx.font = "600 28px sans-serif"; ctx.fillText("03  六维表现", 58, tableY + 46);
    const cx = 375, cy = tableY + 300, radius = 174;
    const point = (i, score) => { const angle = -Math.PI / 2 + i * Math.PI / 3; return [cx + Math.cos(angle) * radius * score / 100, cy + Math.sin(angle) * radius * score / 100]; };
    const polygon = (scores) => { ctx.beginPath(); scores.forEach((score, i) => { const [x, y] = point(i, score); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath(); };
    ctx.strokeStyle = "#e2eaf2"; ctx.lineWidth = 1.5;
    [20, 40, 60, 80, 100].forEach((score) => { polygon(DIMENSIONS.map(() => score)); ctx.stroke(); });
    DIMENSIONS.forEach((_, i) => { const [x, y] = point(i, 100); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); });
    const axisLabels = [[375, tableY + 98], [607, tableY + 205], [607, tableY + 416], [375, tableY + 512], [143, tableY + 416], [143, tableY + 205]];
    ctx.fillStyle = muted; ctx.font = "23px sans-serif"; ctx.textAlign = "center";
    DIMENSIONS.forEach(([, label], i) => ctx.fillText(label, ...axisLabels[i]));
    ctx.textAlign = "left";
    const colors = [blue, "#d6a337", "#eb846f", "#51a79f", "#907abb", "#638aaa"];
    shareOffers.forEach((offer, index) => {
      ctx.strokeStyle = colors[index]; ctx.lineWidth = index === 0 ? 3 : 2.5;
      polygon(offer.dimensions); ctx.stroke();
      offer.dimensions.forEach((score, i) => { const [x, y] = point(i, score); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = colors[index]; ctx.fill(); });
      const x = 105 + index % 3 * 190, y = tableY + 557 + Math.floor(index / 3) * 44;
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 24, y - 7); ctx.stroke();
      ctx.fillStyle = muted; ctx.font = "22px sans-serif"; ctx.fillText(fitLabel(offer.label, 145), x + 34, y);
    });
    const labels = ["总包", "稳定", "成长", "强度", "城市", "团队"];
    ctx.font = "20px sans-serif"; ctx.fillStyle = muted;
    labels.forEach((label, i) => ctx.fillText(label, 213 + i * 78, tableHeaderY));
    shareOffers.forEach((offer, row) => {
      const y = tableHeaderY + 52 + row * 50;
      ctx.fillStyle = ink; ctx.font = "22px sans-serif"; ctx.fillText(fitLabel(offer.label, 140), 58, y);
      offer.dimensions.forEach((score, col) => { ctx.fillStyle = blue; ctx.fillText(String(Math.round(score)), 213 + col * 78, y); });
    });
    ctx.fillStyle = muted; ctx.font = "20px sans-serif";
    ctx.fillText("内容由当前公司名称、偏好权重与 Offer 得分实时生成。", 48, canvas.height - 84);
    ctx.fillText("不含岗位、城市、薪资等信息；匹配度结果仅供参考。", 48, canvas.height - 46);
  }
  function showPrototypeToast(message) {
    const toast = $("prototypeToast");
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showPrototypeToast.timer);
    showPrototypeToast.timer = setTimeout(() => { toast.hidden = true; }, 2600);
  }
  function initResult() {
    if (!$("rankingList")) return;
    $("restartFlowBtn").addEventListener("click", () => {
      confirmAction("重新开始？", "将清空这次的偏好设置、全部 Offer 和分析结果。", "确认清空", () => {
        if (window.OfferHelperStorage) {
          window.OfferHelperStorage.remove(window.OfferHelperStorage.SESSION_KEY);
          window.OfferHelperStorage.clearAnalysis();
        } else localStorage.removeItem(SESSION_KEY);
        location.href = "../index.html?ui=review-v2";
      });
    });
    const session = loadSession();
    const analysis = analyze(session);
    const validOffers = !validateOffers(session.offers);
    if (!analysis || !validOffers) {
      $("topChoiceTitle").textContent = "先完成偏好和 Offer 录入";
      $("topChoiceRole").textContent = "";
      $("topChoiceSummary").textContent = "填写完成后，这里会展示六维评分与排名。";
      $("topChoiceScore").textContent = "—";
      return;
    }
    const top = analysis.scoredOffers[0];
    $("topChoiceTitle").textContent = top.company;
    $("topChoiceRole").textContent = top.role;
    $("topChoiceSummary").textContent = top.isCloseToNext
      ? `${top.company}暂时排在前面，但与第二名分差不超过 3 分。建议先补齐未知信息，再看哪份更适合。`
      : `${top.company}在你最看重的${LABEL[analysis.topWeightKey]}等方面更占优，整体匹配度目前排在第一。`;
    $("topChoiceScore").textContent = top.totalScore.toFixed(1);
    $("analysisTimestamp").textContent = session.analyzedAt ? `生成于 ${new Date(session.analyzedAt).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "";
    renderWeightDistribution($("weightList"), analysis.weights);
    $("rankingList").innerHTML = analysis.scoredOffers.map((offer) => `<article class="ranking-item ${offer.rank === 1 ? "ranking-item--top" : ""}"><div class="ranking-item__body"><h3>${esc(offer.company)}</h3><p>${esc(offer.role)}</p></div><div class="ranking-item__score"><strong>${offer.totalScore.toFixed(1)}</strong><span>匹配度</span></div><div class="ranking-item__footer"><div class="ranking-item__tags"><span class="ranking-item__tag">年包 ${esc(offer.annualPackage)} 万</span><span class="ranking-item__tag">${esc(offer.city)}</span></div><span class="ranking-item__completeness">信息完整度 ${offer.completeness}%</span></div></article>`).join("");
    $("dimensionTableWrapper").innerHTML = `<table class="dimension-table dimension-table--offers"><thead><tr>
      <th scope="col">Offer</th><th scope="col" class="dimension-table__match">综合匹配度</th>
      ${analysis.dimensionRows.map((row) => `<th scope="col" data-dimension="${row.key}">${row.key === "cityLife" ? "城市匹配度" : row.label}<small>权重 ${row.weight}%</small></th>`).join("")}
      </tr></thead><tbody>${analysis.scoredOffers.map((offer) => `<tr>
        <th scope="row" data-offer-title="${esc(offer.company)}"><span class="dimension-table__company">${esc(offer.company)}</span><small title="${esc(offer.role)}">${esc(offer.role)}</small></th>
        <td class="dimension-table__match">${offer.totalScore.toFixed(1)}</td>
        ${DIMENSIONS.map(([key]) => `<td>${Math.round(offer.dimensionScores[key])}</td>`).join("")}
      </tr>`).join("")}</tbody></table>`;
    $("saveLocalBtn").addEventListener("click", () => {
      // UI feedback only. Existing form storage remains the prototype implementation.
      showPrototypeToast("填写信息保存在本地设备");
    });
    const modal = $("shareModal"), canvas = $("shareCanvas");
    const shareMascot = new Image();
    shareMascot.src = "../assets/offershow-mascot-wave.png";
    const shareMascotReady = shareMascot.decode().then(() => true, () => false);
    let shareOpener = null;
    async function openShare() {
      shareOpener = document.activeElement;
      if (!await shareMascotReady) { showPrototypeToast("分享图片加载失败，请刷新后重试。"); return; }
      const currentSession = loadSession();
      const currentAnalysis = analyze(currentSession);
      if (!currentAnalysis || validateOffers(currentSession.offers)) { showPrototypeToast("请先完成偏好和 Offer 录入。"); return; }
      drawShareCard(canvas, currentSession, currentAnalysis, shareMascot);
      modal.hidden = false; modal.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
      modal.querySelector("[data-modal-close].share-modal__close").focus();
    }
    function closeShare() { modal.hidden = true; modal.setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; shareOpener?.focus(); }
    $("openShareCardBtn").disabled = false;
    $("openShareCardBtn").addEventListener("click", openShare);
    $("downloadShareCardBtn").addEventListener("click", () => {
      const link = document.createElement("a"); link.download = "OfferShow-六维结果.png"; link.href = canvas.toDataURL("image/png"); link.click();
    });
    modal.querySelectorAll("[data-modal-close]").forEach((element) => element.addEventListener("click", closeShare));
    document.addEventListener("keydown", (event) => {
      if (modal.hidden) return;
      if (event.key === "Escape") closeShare();
      if (event.key === "Tab") {
        const buttons = [...modal.querySelectorAll("button")];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  window.OfferShow6D = { MODEL_VERSION, SESSION_KEY, MIN_OFFERS, MAX_OFFERS, DIMENSIONS,
    normalizeSession, validateCityPreferences, validatePreferences, validateOffers, cleanCityLabel, cityKey, parseCityList,
    calculateWeights, redistribute, packageScore, scoreOffer, analyze, buildShareCardData };
  if (typeof document !== "undefined") {
    initInfoTips(); decoratePreferenceLabels(); initPreferences(); initOffers(); initResult();
  }
})();
