(function () {
  const SCALE_OPTIONS = {
    businessStability: [
      "风险明显：经营、融资或业务持续性存在较大不确定",
      "偏不稳定：能看到收缩、预算或竞争压力",
      "一般：没有明显利好或风险",
      "较稳定：业务与资源投入基本可预期",
      "很稳定：经营和业务持续性都有充分依据"
    ],
    roleStability: [
      "风险明显：岗位临时性强或组织频繁变动",
      "偏不稳定：职责、汇报线或 HC 原因不够确定",
      "一般：岗位确定性中等",
      "较稳定：职责和组织关系基本清楚",
      "很稳定：岗位长期必要性与资源都有充分依据"
    ],
    abilityGrowth: [
      "很低：重复已有能力，几乎没有新挑战",
      "偏低：有零散学习，但难形成能力增量",
      "一般：能获得一项可说明的经验",
      "较高：有核心职责和可见成果",
      "很高：能显著拓宽能力边界和竞争力"
    ],
    careerClarity: [
      "很不清楚：职责和后续发展都模糊",
      "偏不清楚：成长依赖个人摸索",
      "一般：有大致方向但缺少明确路径",
      "较清楚：职责、反馈或晋升路径基本明确",
      "很清楚：发展路径与下一跳价值都有充分依据"
    ],
    managerFit: [
      "明显不匹配",
      "有一些顾虑",
      "暂时中性",
      "比较匹配",
      "非常匹配"
    ],
    teamFit: [
      "明显不匹配",
      "有一些顾虑",
      "暂时中性",
      "比较匹配",
      "非常匹配"
    ]
  };
  const INTENSITY_OPTIONS = ["节奏宽松", "偶尔忙碌", "阶段性高峰", "经常高强度", "长期高压"];
  const PULSE_OPTIONS = ["明显不想接受", "比较勉强", "还在犹豫", "比较愿意接受", "非常想接受"];

  const elements = {
    offerCards: document.getElementById("offerCards"),
    addOfferBtn: document.getElementById("addOfferBtn"),
    loadOfferDemoBtn: document.getElementById("loadOfferDemoBtn"),
    clearAllBtn: document.getElementById("clearAllBtn"),
    validationMessage: document.getElementById("validationMessage"),
    goToResultBtn: document.getElementById("goToResultBtn")
  };
  if (!elements.offerCards) return;

  let session = window.OfferHelperState.ensureMinimumOffers(
    window.OfferHelperState.normalizeSession(window.OfferHelperStorage.loadSessionRaw())
  );

  function persist() {
    window.OfferHelperStorage.saveSessionRaw(session);
    window.OfferHelperStorage.clearAnalysis();
  }

  function renderScaleSelect(field, currentValue, includeUnknown) {
    const labels = SCALE_OPTIONS[field] || [];
    const unknown = includeUnknown
      ? `<option value="unknown" ${currentValue === "unknown" ? "selected" : ""}>不清楚</option>`
      : "";
    return unknown + labels.map((label, index) => {
      const value = String(index + 1);
      return `<option value="${value}" ${String(currentValue) === value ? "selected" : ""}>${index + 1} · ${label}</option>`;
    }).join("");
  }

  function renderSimpleScale(currentValue, labels, includeUnknown) {
    const unknown = includeUnknown
      ? `<option value="unknown" ${currentValue === "unknown" ? "selected" : ""}>不清楚</option>`
      : "";
    return unknown + labels.map((label, index) => {
      const value = String(index + 1);
      return `<option value="${value}" ${String(currentValue) === value ? "selected" : ""}>${index + 1} · ${label}</option>`;
    }).join("");
  }

  function getValidationText() {
    const comparable = window.OfferHelperState.getComparableOffers(session.offers);
    if (comparable.length < window.OfferHelperState.MIN_ANALYSIS_OFFERS) {
      return `至少需要录入 ${window.OfferHelperState.MIN_ANALYSIS_OFFERS} 份 Offer，当前为 ${comparable.length} 份。`;
    }
    const incomplete = comparable.find((offer) => !offer.city.trim() || !(Number(offer.estimatedAnnualPackage) > 0));
    if (incomplete) return "每份参与比较的 Offer 都需要填写城市和有效的预计年度总包。";
    return `当前可比较 Offer：${comparable.length} 份`;
  }

  function renderOfferCard(offer, index) {
    const completeness = window.OfferHelperState.getOfferCompleteness(offer);
    const title = window.OfferHelperState.getOfferLabel(offer, index);
    const escapeHtml = window.OfferHelperUI.escapeHtml;
    return `
      <article class="offer-card" data-offer-id="${offer.id}">
        <div class="offer-card__top">
          <div><p class="offer-card__eyebrow">Offer ${index + 1}</p><h2 class="offer-card__title">${escapeHtml(title)}</h2></div>
          <div class="offer-card__meta">
            <span class="progress-badge">${completeness.percent}% 完整</span>
            <button type="button" class="icon-btn" data-action="delete" data-id="${offer.id}" ${session.offers.length <= 2 ? "disabled" : ""}>删除</button>
          </div>
        </div>
        <div class="offer-progress"><span style="width:${completeness.percent}%"></span></div>

        <div class="offer-form-grid">
          <label class="field-group"><span>公司</span><input type="text" data-id="${offer.id}" data-field="company" value="${escapeHtml(offer.company)}" placeholder="例如：星云科技"></label>
          <label class="field-group"><span>岗位</span><input type="text" data-id="${offer.id}" data-field="role" value="${escapeHtml(offer.role)}" placeholder="例如：产品经理"></label>
          <label class="field-group"><span>工作城市</span><input type="text" data-id="${offer.id}" data-field="city" value="${escapeHtml(offer.city)}" placeholder="例如：上海"></label>
          <label class="field-group"><span>预计年度总包（万元）</span><input type="number" min="0.1" step="0.1" data-id="${offer.id}" data-field="estimatedAnnualPackage" value="${escapeHtml(offer.estimatedAnnualPackage)}" placeholder="例如：42"></label>
        </div>

        <div class="offer-card__subjective">
          <p class="offer-card__subjective-eyebrow">六维评分信息</p>
          <p class="offer-card__subjective-hint">请只根据已经获得的信息判断；拿不准就选“不清楚”，不会因为缺少信息获得额外优势。</p>
          <div class="offer-form-grid offer-form-grid--subjective">
            <label class="field-group"><span>公司及业务稳定程度</span><select data-id="${offer.id}" data-field="businessStability">${renderScaleSelect("businessStability", offer.businessStability, true)}</select></label>
            <label class="field-group"><span>部门及岗位稳定程度</span><select data-id="${offer.id}" data-field="roleStability">${renderScaleSelect("roleStability", offer.roleStability, true)}</select></label>
            <label class="field-group"><span>能力提升程度</span><select data-id="${offer.id}" data-field="abilityGrowth">${renderScaleSelect("abilityGrowth", offer.abilityGrowth, true)}</select></label>
            <label class="field-group"><span>职责、晋升或下一跳清晰度</span><select data-id="${offer.id}" data-field="careerClarity">${renderScaleSelect("careerClarity", offer.careerClarity, true)}</select></label>
            <label class="field-group"><span>预计长期工作节奏</span><select data-id="${offer.id}" data-field="workIntensity">${renderSimpleScale(offer.workIntensity, INTENSITY_OPTIONS, true)}</select></label>
            <label class="field-group"><span>直属领导匹配感</span><select data-id="${offer.id}" data-field="managerFit">${renderScaleSelect("managerFit", offer.managerFit, true)}</select></label>
            <label class="field-group field-group--full"><span>团队氛围与协作匹配感</span><select data-id="${offer.id}" data-field="teamFit">${renderScaleSelect("teamFit", offer.teamFit, true)}</select></label>
          </div>
        </div>

        <div class="pulse-panel">
          <label class="field-group field-group--full">
            <span>如果 3 天内必须回复，你有多想接受这份 Offer？</span>
            <select data-id="${offer.id}" data-field="choicePulse">${renderSimpleScale(offer.choicePulse, PULSE_OPTIONS, false)}</select>
          </label>
          <p class="field-hint">这道题只用于对照直接意愿，不进入六维总分，也不会改变排名。</p>
        </div>

        <label class="field-group field-group--full"><span>补充备注（选填）</span><textarea rows="3" data-id="${offer.id}" data-field="notes" placeholder="可记录薪资构成、信息来源或其他背景，不直接参与算法">${escapeHtml(offer.notes)}</textarea></label>
      </article>
    `;
  }

  function renderOffers() {
    elements.offerCards.innerHTML = session.offers.map(renderOfferCard).join("");
    elements.validationMessage.textContent = getValidationText();
  }

  function handleInput(event) {
    const { id, field } = event.target.dataset;
    if (!id || !field) return;
    const offer = session.offers.find((item) => item.id === id);
    if (!offer) return;
    offer[field] = event.target.value.trim();
    persist();
    elements.validationMessage.textContent = getValidationText();
  }

  elements.offerCards.addEventListener("input", handleInput);
  elements.offerCards.addEventListener("change", handleInput);
  elements.offerCards.addEventListener("click", (event) => {
    if (event.target.dataset.action !== "delete") return;
    if (session.offers.length <= window.OfferHelperState.MIN_ANALYSIS_OFFERS) return;
    session.offers = session.offers.filter((offer) => offer.id !== event.target.dataset.id);
    persist();
    renderOffers();
  });
  elements.addOfferBtn.addEventListener("click", () => {
    if (session.offers.length >= window.OfferHelperState.MAX_OFFERS) {
      elements.validationMessage.textContent = `最多支持 ${window.OfferHelperState.MAX_OFFERS} 份 Offer。`;
      return;
    }
    session.offers.push(window.OfferHelperState.createEmptyOffer());
    persist();
    renderOffers();
  });
  elements.loadOfferDemoBtn.addEventListener("click", () => {
    const demo = window.OfferHelperState.getDemoSession();
    session.offers = demo.offers;
    persist();
    renderOffers();
  });
  elements.clearAllBtn.addEventListener("click", () => {
    session.offers = [window.OfferHelperState.createEmptyOffer(), window.OfferHelperState.createEmptyOffer()];
    persist();
    renderOffers();
  });
  elements.goToResultBtn.addEventListener("click", () => {
    const comparable = window.OfferHelperState.getComparableOffers(session.offers);
    const invalid = comparable.length < 2
      || comparable.some((offer) => !offer.city.trim() || !(Number(offer.estimatedAnnualPackage) > 0));
    if (invalid) {
      elements.validationMessage.textContent = getValidationText();
      elements.validationMessage.dataset.type = "error";
      return;
    }
    persist();
    window.OfferHelperUI.navigate("./result.html");
  });

  persist();
  renderOffers();
})();
