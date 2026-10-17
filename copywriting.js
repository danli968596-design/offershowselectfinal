(function () {
  const DIMENSION_LABELS = {
    totalPackage: "总包预期",
    stability: "稳定性",
    growth: "成长空间",
    workIntensity: "工作强度",
    cityLife: "城市/生活质量",
    teamFit: "团队匹配度"
  };
  function getDimensionLabel(key) {
    return DIMENSION_LABELS[key] || key;
  }

  function buildPreferencePersona(preferences, weights, isAdjusted) {
    const sorted = Object.entries(weights).sort((left, right) => right[1] - left[1]);
    const primary = getDimensionLabel(sorted[0][0]);
    const secondary = getDimensionLabel(sorted[1][0]);
    return {
      headline: `你当前更看重${primary}`,
      summary: isAdjusted
        ? `根据你微调后的偏好，${primary}与${secondary}是本轮决策中权重最高的两个维度。`
        : `结合六道基础题和两道取舍题，${primary}与${secondary}是本轮决策中权重最高的两个维度。`,
      tags: [
        `期望薪资：${preferences.idealAnnualPackage || "未填写"} 万元`,
        `意向城市：${preferences.preferredCity || "未填写"}`,
        `可接受城市：${preferences.acceptableCities || "无"}`
      ]
    };
  }

  window.OfferHelperCopy = {
    DIMENSION_LABELS, getDimensionLabel, buildPreferencePersona
  };
})();
