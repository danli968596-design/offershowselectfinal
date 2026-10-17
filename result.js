(function () {
  const elements = {
    topChoiceTitle: document.getElementById("topChoiceTitle"),
    topChoiceSummary: document.getElementById("topChoiceSummary"),
    topChoiceScore: document.getElementById("topChoiceScore"),
    analysisTimestamp: document.getElementById("analysisTimestamp"),
    weightList: document.getElementById("weightList"),
    rankingList: document.getElementById("rankingList"),
    dimensionTableWrapper: document.getElementById("dimensionTableWrapper"),
    pulseComparison: document.getElementById("pulseComparison"),
    restartFlowBtn: document.getElementById("restartFlowBtn"),
    openShareCardBtn: document.getElementById("openShareCardBtn"),
    shareModal: document.getElementById("shareModal"),
    shareCanvas: document.getElementById("shareCanvas"),
    downloadShareCardBtn: document.getElementById("downloadShareCardBtn"),
    regenerateShareCardBtn: document.getElementById("regenerateShareCardBtn")
  };
  if (!elements.topChoiceTitle) return;

  const session = window.OfferHelperState.normalizeSession(window.OfferHelperStorage.loadSessionRaw());
  const analysis = window.OfferHelperScoring.analyzeSession(session);
  if (!analysis) {
    window.OfferHelperUI.navigate("./offers.html");
    return;
  }
  window.OfferHelperStorage.saveAnalysis(analysis);
  let sharePreviewCanvas = null;

  function renderRanking() {
    elements.rankingList.innerHTML = analysis.scoredOffers.map((offer, index) => `
      <article class="ranking-item ${index === 0 ? "ranking-item--top" : ""}">
        <div>
          <p class="ranking-item__index">TOP ${index + 1}${offer.isCloseToNext ? " · 结果接近" : ""}</p>
          <h3>${window.OfferHelperUI.escapeHtml(offer.label)}</h3>
          <p class="ranking-item__meta">年度总包 ${offer.annualPackage} 万元 · 信息完整度 ${offer.completeness}%</p>
        </div>
        <strong>${offer.totalScore}</strong>
      </article>
    `).join("");
  }

  function renderDimensionTable() {
    const headers = analysis.scoredOffers.map((offer) => `<th>${window.OfferHelperUI.escapeHtml(offer.label)}</th>`).join("");
    const rows = analysis.dimensionRows.map((row) => `
      <tr><th>${window.OfferHelperUI.escapeHtml(row.label)}</th>${row.values.map((value) => `<td>${value.score}</td>`).join("")}</tr>
    `).join("");
    elements.dimensionTableWrapper.innerHTML = `
      <table class="compare-table"><thead><tr><th>维度</th>${headers}</tr></thead><tbody>${rows}</tbody></table>
    `;
  }

  function renderPulseComparison() {
    const comparison = analysis.pulseComparison;
    if (comparison.status === "aligned") {
      elements.pulseComparison.textContent = "六维评分第一名与你最想接受的 Offer 一致，理性排序和直接意愿同向。";
    } else if (comparison.status === "different") {
      elements.pulseComparison.textContent = `六维评分第一名是${analysis.topOffer.label}，但你当前最想接受的是${comparison.pulseLeaderLabel}。这项差异只作提示，不改变排名。`;
    } else {
      elements.pulseComparison.textContent = "当前直接意愿没有形成明确的唯一首选，因此不与六维排名做强行比较。";
    }
  }

  function renderAnalysis() {
    elements.topChoiceTitle.textContent = analysis.topOffer.label;
    elements.topChoiceSummary.textContent = analysis.topSummary;
    elements.topChoiceScore.textContent = analysis.topOffer.totalScore;
    elements.analysisTimestamp.textContent = window.OfferHelperUI.formatTime(analysis.createdAt);
    window.OfferHelperUI.renderWeightList(elements.weightList, analysis.weights, false);
    renderRanking();
    renderDimensionTable();
    renderPulseComparison();
    sharePreviewCanvas = null;
  }

  renderAnalysis();

  elements.restartFlowBtn.addEventListener("click", () => {
    window.OfferHelperStorage.clearAll();
    window.OfferHelperUI.navigate("../index.html");
  });

  function renderShareCanvas() {
    sharePreviewCanvas = window.OfferHelperShareCard.drawCard({ analysis, urgency: null, nickname: "" });
    const targetContext = elements.shareCanvas.getContext("2d");
    elements.shareCanvas.width = sharePreviewCanvas.width;
    elements.shareCanvas.height = sharePreviewCanvas.height;
    targetContext.clearRect(0, 0, sharePreviewCanvas.width, sharePreviewCanvas.height);
    targetContext.drawImage(sharePreviewCanvas, 0, 0);
  }

  function openShareModal() {
    elements.shareModal.hidden = false;
    elements.shareModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    renderShareCanvas();
  }

  function closeShareModal() {
    elements.shareModal.hidden = true;
    elements.shareModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  elements.openShareCardBtn.addEventListener("click", openShareModal);
  elements.shareModal.addEventListener("click", (event) => {
    if (event.target.hasAttribute("data-modal-close")) closeShareModal();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.shareModal.hidden) closeShareModal();
  });
  elements.regenerateShareCardBtn.addEventListener("click", renderShareCanvas);
  elements.downloadShareCardBtn.addEventListener("click", async () => {
    if (!sharePreviewCanvas) renderShareCanvas();
    try {
      const safeLabel = (analysis.topOffer.label || "offer").replace(/[\\/:*?"<>|]/g, "_");
      await window.OfferHelperShareCard.downloadCanvas(sharePreviewCanvas, `offershow-${safeLabel}.png`);
      elements.downloadShareCardBtn.textContent = "已下载";
      setTimeout(() => { elements.downloadShareCardBtn.textContent = "下载 PNG"; }, 2400);
    } catch (error) {
      elements.downloadShareCardBtn.textContent = `下载失败：${error.message}`;
    }
  });
})();
