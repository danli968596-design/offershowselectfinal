(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const DEMO_MODE = window.OfferShowConfig?.environment === "demo";
  const model = window.OfferShow6D;
  function read(key) { try { return JSON.parse(localStorage.getItem(key) || "null") || {}; } catch (_) { return {}; } }
  function readTrial() {
    // If storage cannot be read in production, do not offer an untracked free reveal.
    try {
      const value = JSON.parse(localStorage.getItem(model.AI_TRIAL_KEY) || "null");
      return value?.used ? value : { used: false, offerId: "", createdAt: "" };
    } catch (_) { return { used: true, offerId: "", createdAt: "" }; }
  }
  function trialUsed() {
    return Boolean(readTrial().used);
  }
  const session = model.normalizeSession(read(model.SESSION_KEY));
  const analysis = model.analyze(session);
  const offers = analysis?.scoredOffers || session.offers;
  const ranks = new Map((analysis?.scoredOffers || []).map((offer) => [String(offer.id), offer.rank]));
  const requestedId = new URLSearchParams(location.search).get("offerId") || "";
  const report = $("backgroundReportContent");
  const list = $("backgroundOfferList");
  const cards = new Map();
  const memberGrants = new Set();
  let activeOffer = null;
  let activeMode = null;
  let busy = false;
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function toast(message) {
    const el = $("prototypeToast");
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 3000);
  }
  function openMembership(id) { window.OfferShowReviewActions.openMembership(id); }
  $("backgroundDemoBadge").hidden = !DEMO_MODE;
  if (!offers.length) { $("backgroundAccessMessage").hidden = false; return; }
  const reportTabs = [...document.querySelectorAll('.report-jump-nav [role="tab"]')];
  function showResearch(panelId, updateHash = false) {
    const activeTab = reportTabs.find((tab) => tab.getAttribute("aria-controls") === panelId) || reportTabs[0];
    reportTabs.forEach((tab) => {
      const selected = tab === activeTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      $(tab.getAttribute("aria-controls")).hidden = !selected;
    });
    if (updateHash) { const url = new URL(location.href); url.hash = activeTab.getAttribute("aria-controls"); history.replaceState(null, "", url); }
  }
  reportTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => showResearch(tab.getAttribute("aria-controls"), true));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % reportTabs.length;
      else if (event.key === "ArrowLeft") next = (index + reportTabs.length - 1) % reportTabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = reportTabs.length - 1;
      else return;
      event.preventDefault();
      showResearch(reportTabs[next].getAttribute("aria-controls"), true);
      reportTabs[next].focus();
    });
  });
  window.addEventListener("hashchange", () => showResearch(location.hash.slice(1)));
  function accessFor(offer) {
    const id = String(offer.id);
    if (memberGrants.has(id)) return { type: "view" };
    return model.aiAccessFor(offer, ranks.get(id), readTrial(), DEMO_MODE);
  }
  function refreshTrigger(trigger, offer) {
    const access = accessFor(offer);
    const label = model.aiActionLabel(access);
    trigger.textContent = label;
    trigger.classList.toggle("is-locked", access.type === "locked");
    trigger.setAttribute("aria-label", `${label}：${offer.company} ${offer.role}`);
  }
  function refreshAll() { cards.forEach(({ trigger, offer }) => refreshTrigger(trigger, offer)); }
  function expandedTrigger(trigger, offer) {
    trigger.setAttribute("aria-expanded", "true");
    trigger.classList.remove("is-locked");
    trigger.textContent = "收起背调";
    trigger.setAttribute("aria-label", `收起背调：${offer.company} ${offer.role}`);
  }
  function closeReport() {
    report.hidden = true;
    report.remove();
    cards.forEach(({ card, body, trigger, offer }) => {
      card.classList.remove("is-report-open");
      body.replaceChildren();
      body.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      refreshTrigger(trigger, offer);
    });
    activeOffer = null;
    activeMode = null;
  }
  function updateReportUrl(offer) {
    const query = new URLSearchParams({ offerId: offer.id, ui: "salary-card-v1" });
    // Query parameters are never proof of membership.
    const url = new URL(location.href); url.search = query; url.hash = location.hash.slice(1) || "stabilityResearch";
    history.replaceState(null, "", url);
  }
  function fillReport(data) {
    const sections = { stabilityResearch: data.sections.stability, growthResearch: data.sections.growth,
      workIntensityResearch: data.sections.workIntensity };
    Object.entries(sections).forEach(([id, text]) => { report.querySelector(`#${id}Content`).textContent = text; });
  }
  function revealReport(offer, data, mode) {
    closeReport();
    const { card, body, trigger } = cards.get(String(offer.id));
    fillReport(data);
    body.append(report);
    body.hidden = false;
    report.hidden = false;
    card.classList.add("is-report-open");
    activeOffer = offer;
    activeMode = mode;
    expandedTrigger(trigger, offer);
    updateReportUrl(offer);
    showResearch(location.hash.slice(1));
    reportTabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.focus({ preventScroll: true });
  }
  function expirePreview() {
    if (activeMode !== "preview" || !activeOffer) return;
    const { body } = cards.get(String(activeOffer.id));
    body.querySelectorAll(".research-preview__unlock").forEach((button) => { button.textContent = "会员解锁更多"; });
    body.querySelectorAll(".research-preview__caption").forEach((caption) => { caption.textContent = "首次免费次数已用完"; });
    refreshAll();
    expandedTrigger(cards.get(String(activeOffer.id)).trigger, activeOffer);
  }
  async function revealFirstFree(offer, button) {
    if (busy) return;
    if (DEMO_MODE) {
      revealReport(offer, window.OfferShowBackgroundDemo.build(), "demo");
      return;
    }
    if (trialUsed()) { expirePreview(); openMembership(String(offer.id)); return; }
    busy = true;
    button.disabled = true;
    try {
      // Build the local demo only when the user asks to reveal it. The blurred
      // placeholder contains no actual report, including in the accessibility tree.
      const data = window.OfferShowBackgroundDemo.build();
      if (!["stability", "growth", "workIntensity"].every((key) => typeof data?.sections?.[key] === "string")) throw new Error("Report unavailable");
      const claim = () => {
        if (activeMode !== "preview" || String(activeOffer?.id) !== String(offer.id) || trialUsed()) return false;
        localStorage.setItem(model.AI_TRIAL_KEY, JSON.stringify({ used: true, offerId: String(offer.id), createdAt: new Date().toISOString() }));
        return true;
      };
      const claimed = navigator.locks?.request
        ? await navigator.locks.request("offershow-background-first-free", claim)
        : claim();
      if (!claimed) { if (String(activeOffer?.id) === String(offer.id) && activeMode === "preview") { expirePreview(); openMembership(String(offer.id)); } return; }
      revealReport(offer, data, "free");
    } catch (_) {
      toast("暂时无法打开背调，请稍后重试。");
    } finally { busy = false; button.disabled = false; }
  }
  function previewReport(offer, free = true) {
    closeReport();
    const { card, body, trigger } = cards.get(String(offer.id));
    const placeholders = {
      stabilityResearch: ["公司与岗位的稳定性", "结合公开经营信息与业务阶段，了解岗位所在方向的持续性。", "梳理组织调整、岗位替补和资源变化等潜在风险。", "核实业务优先级以及岗位设立原因。"],
      growthResearch: ["岗位成长空间", "了解岗位职责范围、可独立负责的项目以及能力积累。", "梳理晋升路径、内部流动和重点业务机会。", "确认一年后可以形成哪些可迁移的经验。"],
      workIntensityResearch: ["团队工作强度", "了解日常工作节奏、版本高峰和临时需求频率。", "核实加班、周末工作、出差及线上响应安排。", "结合个人偏好判断工作节奏是否可持续。"]
    };
    Object.entries(placeholders).forEach(([id, lines]) => {
      const preview = document.createElement("div");
      preview.className = "research-preview research-preview--body";
      preview.innerHTML = `<div class="research-preview__lines" aria-hidden="true">${lines.map((line) => `<p>${esc(line)}</p>`).join("")}</div><div class="research-preview__veil"><svg class="research-preview__lock" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg><p class="research-preview__caption">${free ? "解锁查看本节分析内容" : "会员可解锁本节完整分析"}</p><button type="button" class="research-preview__unlock">${free ? "首次免费体验，会员解锁更多" : "会员解锁更多"} <span aria-hidden="true">→</span></button><small>${free ? "点击查看本次内容" : "解锁后查看完整内容"}</small></div>`;
      preview.querySelector(".research-preview__unlock").addEventListener("click", (event) => {
        if (free) revealFirstFree(offer, event.currentTarget);
        else openMembership(String(offer.id));
      });
      report.querySelector(`#${id}Content`).replaceChildren(preview);
    });
    body.append(report);
    report.hidden = false;
    body.hidden = false;
    card.classList.add("is-report-open");
    activeOffer = offer;
    activeMode = free ? "preview" : "member-preview";
    expandedTrigger(trigger, offer);
    updateReportUrl(offer);
    showResearch(location.hash.slice(1));
    reportTabs.find((tab) => tab.getAttribute("aria-selected") === "true")?.focus({ preventScroll: true });
  }
  async function requestReport(offer, trigger) {
    const id = String(offer.id);
    trigger.disabled = true;
    try {
      // Optional native host contract. Only an explicit true grants access.
      const hasAccess = await window.OfferShowMiniProgram?.hasBackgroundAccess?.(id);
      if (hasAccess === true) {
        memberGrants.add(id);
        revealReport(offer, window.OfferShowBackgroundDemo.build(), "member");
        return;
      }
      const access = accessFor(offer);
      if ((DEMO_MODE && access.type === "trial") || access.type === "view") {
        revealReport(offer, window.OfferShowBackgroundDemo.build(), DEMO_MODE ? "demo" : "view");
      } else if (access.type === "trial") previewReport(offer, true);
      else previewReport(offer, false);
    } catch (_) { toast("暂时无法确认解锁状态，请稍后重试。"); }
    finally { trigger.disabled = !ranks.has(id); }
  }
  offers.forEach((offer, index) => {
    const id = String(offer.id);
    const card = document.createElement("article");
    card.className = "background-offer-card";
    card.dataset.offerId = id;
    const bodyId = `offerResearch-${index + 1}`;
    const completeness = Number.isFinite(Number(offer.completeness)) ? `${Math.round(Number(offer.completeness))}%` : "待计算";
    card.innerHTML = `<p class="background-offer-eyebrow">Offer ${index + 1}</p><div class="background-offer-heading"><div class="background-offer-identity"><h2 class="background-offer-company">${esc(offer.company || "公司待填写")}</h2><p class="background-offer-role">${esc(offer.role || "岗位待填写")}</p></div><button type="button" class="background-report-trigger" aria-label="AI 背调：${esc(offer.company)} ${esc(offer.role)}" aria-controls="${bodyId}" aria-expanded="false">AI 背调</button></div><div class="background-offer-footer"><div class="background-offer-tags"><span class="background-offer-tag">年包 ${esc(offer.annualPackage ? `${offer.annualPackage} 万` : "待填写")}</span><span class="background-offer-tag">${esc(offer.city || "城市待填写")}</span></div><span class="background-offer-completeness">信息完整度 ${esc(completeness)}</span></div><div id="${bodyId}" class="background-offer-report" hidden></div>`;
    const trigger = card.querySelector(".background-report-trigger");
    const body = card.querySelector(".background-offer-report");
    trigger.disabled = !ranks.has(id);
    refreshTrigger(trigger, offer);
    trigger.addEventListener("click", () => {
      if (String(activeOffer?.id) === id) closeReport();
      else requestReport(offer, trigger);
    });
    cards.set(id, { card, body, trigger, offer });
    list.append(card);
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== model.AI_TRIAL_KEY && event.key !== null) return;
    refreshAll();
    if (trialUsed()) expirePreview();
  });
  // Demo opens the complete first-place report every time. Production previews
  // the unused trial or reopens the one Offer previously unlocked for free.
  const initialCard = cards.get(requestedId) || cards.values().next().value;
  if (initialCard && ranks.has(String(initialCard.offer.id))) {
    const access = accessFor(initialCard.offer);
    if ((DEMO_MODE && access.type === "trial") || access.type === "view") {
      revealReport(initialCard.offer, window.OfferShowBackgroundDemo.build(), DEMO_MODE ? "demo" : "view");
    } else previewReport(initialCard.offer, access.type === "trial");
  }
  // Enter at the page header even with an Offer id, tab hash, or restored history.
  const startAtTop = () => window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  window.addEventListener("pageshow", () => requestAnimationFrame(startAtTop));
  if (document.readyState === "complete") requestAnimationFrame(startAtTop);
  else window.addEventListener("load", () => requestAnimationFrame(startAtTop), { once: true });
})();
