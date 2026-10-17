(function () {
  const elements = {
    form: document.getElementById("preferenceForm"),
    headline: document.getElementById("preferenceHeadline"),
    summary: document.getElementById("preferenceSummary"),
    tagList: document.getElementById("preferenceTagList"),
    weightList: document.getElementById("previewWeightList"),
    statusText: document.getElementById("preferenceStatusText"),
    weightSourceBadge: document.getElementById("weightSourceBadge"),
    openWeightTunerBtn: document.getElementById("openWeightTunerBtn"),
    weightTunerPanel: document.getElementById("weightTunerPanel"),
    weightTunerList: document.getElementById("weightTunerList"),
    weightTunerTotal: document.getElementById("weightTunerTotal"),
    resetWeightTunerBtn: document.getElementById("resetWeightTunerBtn"),
    cancelWeightTunerBtn: document.getElementById("cancelWeightTunerBtn"),
    saveWeightTunerBtn: document.getElementById("saveWeightTunerBtn"),
    validation: document.getElementById("preferenceValidation"),
    nextBtn: document.getElementById("goToOffersBtn"),
    demoBtn: document.getElementById("loadPreferenceDemoBtn"),
    primaryKeep: document.getElementById("tradeoffPrimaryKeep"),
    primaryCompromise: document.getElementById("tradeoffPrimaryCompromise"),
    secondaryKeep: document.getElementById("tradeoffSecondaryKeep"),
    secondaryCompromise: document.getElementById("tradeoffSecondaryCompromise")
  };

  if (!elements.form) return;
  let session = window.OfferHelperState.normalizeSession(window.OfferHelperStorage.loadSessionRaw());
  let tuningWeights = null;
  const weightInputFields = new Set([
    ...window.OfferHelperState.IMPORTANCE_FIELDS,
    ...window.OfferHelperState.TRADEOFF_FIELDS
  ]);

  const dimensionDescriptions = {
    totalPackage: "总包预期 · 收入是否接近理想总包",
    stability: "稳定性 · 工作是否稳定可预期",
    growth: "成长空间 · 能力与履历是否持续提升",
    workIntensity: "工作强度 · 节奏是否长期可持续",
    cityLife: "城市/生活质量 · 城市是否适合生活",
    teamFit: "团队匹配度 · 领导与团队是否合适"
  };

  function persist() {
    window.OfferHelperStorage.saveSessionRaw(session);
    window.OfferHelperStorage.clearAnalysis();
  }

  function setSelectOptions(select, dimensions, selectedValue, placeholder) {
    select.innerHTML = [
      `<option value="">${window.OfferHelperUI.escapeHtml(placeholder)}</option>`,
      ...dimensions.map((dimension) => (
        `<option value="${dimension}">${window.OfferHelperUI.escapeHtml(dimensionDescriptions[dimension])}</option>`
      ))
    ].join("");
    select.value = dimensions.includes(selectedValue) ? selectedValue : "";
  }

  function renderSecondaryTradeoffs() {
    const prefs = session.preferences;
    const primaryComplete = window.OfferHelperState.DIMENSIONS.includes(prefs.tradeoffPrimaryKeep)
      && window.OfferHelperState.DIMENSIONS.includes(prefs.tradeoffPrimaryCompromise)
      && prefs.tradeoffPrimaryKeep !== prefs.tradeoffPrimaryCompromise;
    if (!primaryComplete) {
      setSelectOptions(elements.secondaryKeep, [], "", "请先完成第 9 题");
      setSelectOptions(elements.secondaryCompromise, [], "", "请先完成第 9 题");
      elements.secondaryKeep.disabled = true;
      elements.secondaryCompromise.disabled = true;
      return;
    }

    const candidates = window.OfferHelperState.DIMENSIONS.filter((dimension) => (
      dimension !== prefs.tradeoffPrimaryKeep && dimension !== prefs.tradeoffPrimaryCompromise
    ));
    if (!candidates.includes(prefs.tradeoffSecondaryKeep)) prefs.tradeoffSecondaryKeep = "";
    if (!candidates.includes(prefs.tradeoffSecondaryCompromise)) prefs.tradeoffSecondaryCompromise = "";
    if (prefs.tradeoffSecondaryKeep === prefs.tradeoffSecondaryCompromise) prefs.tradeoffSecondaryCompromise = "";
    setSelectOptions(elements.secondaryKeep, candidates, prefs.tradeoffSecondaryKeep, "请选择");
    setSelectOptions(elements.secondaryCompromise, candidates, prefs.tradeoffSecondaryCompromise, "请选择");
    elements.secondaryKeep.disabled = false;
    elements.secondaryCompromise.disabled = false;
  }

  function fillForm() {
    Object.entries(session.preferences).forEach(([key, value]) => {
      if (elements.form.elements[key]) elements.form.elements[key].value = value;
    });
    renderSecondaryTradeoffs();
  }

  function renderPreview() {
    const customWeights = window.OfferHelperScoring.getCustomWeights(session.preferences);
    const weights = window.OfferHelperScoring.getEffectiveWeights(session.preferences);
    const persona = window.OfferHelperCopy.buildPreferencePersona(session.preferences, weights, Boolean(customWeights));
    elements.headline.textContent = persona.headline;
    elements.summary.textContent = persona.summary;
    elements.weightSourceBadge.textContent = customWeights ? "已微调" : "问卷生成";
    elements.statusText.textContent = validate()
      ? "完成 10 个问题后可微调权重"
      : customWeights
        ? "当前将使用微调后的权重进行 Offer 分析"
        : "当前将使用问卷生成的权重进行 Offer 分析";
    elements.openWeightTunerBtn.disabled = Boolean(validate());
    window.OfferHelperUI.renderTagList(elements.tagList, persona.tags);
    window.OfferHelperUI.renderWeightList(elements.weightList, weights, true);
  }

  function syncTunerValues() {
    if (!tuningWeights) return;
    elements.weightTunerList.querySelectorAll("[data-weight-dimension]").forEach((input) => {
      input.value = tuningWeights[input.dataset.weightDimension];
      const output = elements.weightTunerList.querySelector(`[data-weight-output="${input.dataset.weightDimension}"]`);
      if (output) output.textContent = `${input.value}%`;
    });
    elements.weightTunerTotal.textContent = `合计 ${Object.values(tuningWeights).reduce((sum, value) => sum + value, 0)}%`;
  }

  function renderWeightTuner() {
    elements.weightTunerList.innerHTML = window.OfferHelperState.DIMENSIONS.map((dimension) => `
      <div class="weight-tuner-row">
        <label for="weight-tuner-${dimension}">${window.OfferHelperUI.escapeHtml(window.OfferHelperCopy.getDimensionLabel(dimension))}</label>
        <input id="weight-tuner-${dimension}" type="range" min="0" max="100" step="1" data-weight-dimension="${dimension}">
        <output data-weight-output="${dimension}">0%</output>
      </div>
    `).join("");
    syncTunerValues();
  }

  function openWeightTuner() {
    const message = validate();
    if (message) {
      elements.validation.textContent = `${message} 完成后即可微调权重。`;
      elements.validation.dataset.type = "error";
      return;
    }
    const customWeights = window.OfferHelperScoring.getCustomWeights(session.preferences);
    tuningWeights = { ...(customWeights || window.OfferHelperScoring.calculateWeights(session.preferences)) };
    renderWeightTuner();
    elements.weightTunerPanel.hidden = false;
    elements.weightTunerPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function closeWeightTuner() {
    tuningWeights = null;
    elements.weightTunerPanel.hidden = true;
  }

  function validate() {
    const prefs = session.preferences;
    if (!(Number(prefs.idealAnnualPackage) > 0)) return "请填写有效的理想年度总包。";
    if (!prefs.preferredCity.trim()) return "请填写首选城市。";
    const unansweredIndex = window.OfferHelperState.IMPORTANCE_FIELDS.findIndex((field) => !["1", "2", "3", "4", "5"].includes(prefs[field]));
    if (unansweredIndex >= 0) return `请完成第 ${unansweredIndex + 3} 题。`;
    if (!prefs.tradeoffPrimaryKeep || !prefs.tradeoffPrimaryCompromise) return "请完成第 9 题的两项选择。";
    if (prefs.tradeoffPrimaryKeep === prefs.tradeoffPrimaryCompromise) return "第 9 题的两项选择不能相同。";
    if (!prefs.tradeoffSecondaryKeep || !prefs.tradeoffSecondaryCompromise) return "请完成第 10 题的两项选择。";
    if (prefs.tradeoffSecondaryKeep === prefs.tradeoffSecondaryCompromise) return "第 10 题的两项选择不能相同。";
    const excluded = [prefs.tradeoffPrimaryKeep, prefs.tradeoffPrimaryCompromise];
    if (excluded.includes(prefs.tradeoffSecondaryKeep) || excluded.includes(prefs.tradeoffSecondaryCompromise)) {
      return "第 10 题只能从第 9 题未选择的四个维度中作答。";
    }
    return "";
  }

  function handleInput(event) {
    const field = event.target.name;
    if (!field) return;
    session.preferences[field] = event.target.value.trim();
    if (weightInputFields.has(field)) session.preferences.customWeights = null;
    if (field === "tradeoffPrimaryKeep" || field === "tradeoffPrimaryCompromise") {
      session.preferences.tradeoffSecondaryKeep = "";
      session.preferences.tradeoffSecondaryCompromise = "";
      renderSecondaryTradeoffs();
    }
    persist();
    renderPreview();
    elements.validation.textContent = "";
  }

  elements.form.addEventListener("input", handleInput);
  elements.form.addEventListener("change", handleInput);
  elements.openWeightTunerBtn.addEventListener("click", openWeightTuner);
  elements.cancelWeightTunerBtn.addEventListener("click", closeWeightTuner);
  elements.resetWeightTunerBtn.addEventListener("click", () => {
    tuningWeights = { ...window.OfferHelperScoring.calculateWeights(session.preferences) };
    syncTunerValues();
  });
  elements.weightTunerList.addEventListener("input", (event) => {
    const dimension = event.target.dataset.weightDimension;
    if (!dimension || !tuningWeights) return;
    tuningWeights = window.OfferHelperScoring.rebalanceWeights(tuningWeights, dimension, event.target.value);
    syncTunerValues();
  });
  elements.saveWeightTunerBtn.addEventListener("click", () => {
    if (!tuningWeights) return;
    session.preferences.customWeights = { ...tuningWeights };
    persist();
    closeWeightTuner();
    renderPreview();
    elements.validation.textContent = "微调权重已保存，将直接用于 Offer 分析。";
    elements.validation.dataset.type = "success";
  });
  elements.nextBtn.addEventListener("click", () => {
    const message = validate();
    if (message) {
      elements.validation.textContent = message;
      elements.validation.dataset.type = "error";
      return;
    }
    persist();
    window.OfferHelperUI.navigate("./offers.html");
  });
  elements.demoBtn.addEventListener("click", () => {
    session = window.OfferHelperState.getDemoSession();
    persist();
    closeWeightTuner();
    fillForm();
    renderPreview();
    elements.validation.textContent = "示例偏好已填入。";
    elements.validation.dataset.type = "success";
  });

  fillForm();
  renderPreview();
})();
