(function () {
  const MIN_ANALYSIS_OFFERS = 2;
  const MAX_OFFERS = 4;
  const IMPORTANCE_FIELDS = [
    "importanceTotalPackage", "importanceStability", "importanceGrowth",
    "importanceWorkIntensity", "importanceCityLife", "importanceTeamFit"
  ];
  const DIMENSIONS = ["totalPackage", "stability", "growth", "workIntensity", "cityLife", "teamFit"];
  const TRADEOFF_FIELDS = [
    "tradeoffPrimaryKeep", "tradeoffPrimaryCompromise",
    "tradeoffSecondaryKeep", "tradeoffSecondaryCompromise"
  ];

  function createId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function getDefaultPreferences() {
    return {
      idealAnnualPackage: "",
      preferredCity: "",
      acceptableCities: "无",
      importanceTotalPackage: "",
      importanceStability: "",
      importanceGrowth: "",
      importanceWorkIntensity: "",
      importanceCityLife: "",
      importanceTeamFit: "",
      tradeoffPrimaryKeep: "",
      tradeoffPrimaryCompromise: "",
      tradeoffSecondaryKeep: "",
      tradeoffSecondaryCompromise: "",
      customWeights: null
    };
  }

  function createEmptyOffer() {
    return {
      id: createId(),
      company: "",
      role: "",
      city: "",
      estimatedAnnualPackage: "",
      businessStability: "unknown",
      roleStability: "unknown",
      abilityGrowth: "unknown",
      careerClarity: "unknown",
      workIntensity: "unknown",
      managerFit: "unknown",
      teamFit: "unknown",
      choicePulse: "3",
      notes: ""
    };
  }

  function migrateAnnualPackage(source) {
    if (source.estimatedAnnualPackage !== undefined && source.estimatedAnnualPackage !== "") {
      return String(source.estimatedAnnualPackage);
    }
    const monthly = Number(source.monthlySalary || source.monthlyCash || 0);
    const months = source.salaryMonths !== undefined && source.salaryMonths !== ""
      ? Number(source.salaryMonths)
      : 12 + Number(source.bonusMonths || 0);
    const additionalK = Number(source.annualAdditionalComp || source.annualOtherComp || 0);
    if (!monthly || !months) return "";
    return String(Number(((monthly * months + additionalK) / 10).toFixed(1)));
  }

  function normalizeScale(value, fallback) {
    const stringValue = String(value === undefined || value === null ? "" : value);
    return ["1", "2", "3", "4", "5", "unknown"].includes(stringValue) ? stringValue : fallback;
  }

  function normalizeOffer(offer) {
    const source = offer || {};
    const legacyIntensity = {
      flexible: "1", "five-day": "2", "995": "3", "996": "5", unknown: "unknown"
    };
    const fallbackIntensity = source.overtimeLevel === "high"
      ? "4"
      : source.overtimeLevel === "medium" ? "3" : source.overtimeLevel === "low" ? "2" : "unknown";
    return {
      ...createEmptyOffer(),
      id: source.id ? String(source.id) : createId(),
      company: String(source.company || ""),
      role: String(source.role || ""),
      city: String(source.city || ""),
      estimatedAnnualPackage: migrateAnnualPackage(source),
      businessStability: normalizeScale(source.businessStability ?? source.stabilityScore, "unknown"),
      roleStability: normalizeScale(source.roleStability ?? source.stabilityScore, "unknown"),
      abilityGrowth: normalizeScale(source.abilityGrowth ?? source.growthScore, "unknown"),
      careerClarity: normalizeScale(source.careerClarity, "unknown"),
      workIntensity: normalizeScale(source.workIntensity ?? legacyIntensity[source.schedule] ?? fallbackIntensity, "unknown"),
      managerFit: normalizeScale(source.managerFit, "unknown"),
      teamFit: normalizeScale(source.teamFit, "unknown"),
      choicePulse: normalizeScale(source.choicePulse ?? source.gutFeeling, "3"),
      notes: String(source.notes || "")
    };
  }

  function normalizePreferences(preferences) {
    const source = preferences || {};
    const sourceRanking = Array.isArray(source.dimensionRanking) ? source.dimensionRanking : [];
    const hasLegacyRanking = sourceRanking.length > 0;
    const legacyRanking = sourceRanking
      .map(String)
      .filter((dimension, index, list) => DIMENSIONS.includes(dimension) && list.indexOf(dimension) === index);
    DIMENSIONS.forEach((dimension) => {
      if (!legacyRanking.includes(dimension)) legacyRanking.push(dimension);
    });
    const normalizeDimension = (value, fallback = "") => {
      const dimension = String(value || "");
      return DIMENSIONS.includes(dimension) ? dimension : fallback;
    };
    const hasNewTradeoffs = TRADEOFF_FIELDS.some((field) => source[field]);
    const primaryKeep = normalizeDimension(source.tradeoffPrimaryKeep, hasNewTradeoffs || !hasLegacyRanking ? "" : legacyRanking[0]);
    let primaryCompromise = normalizeDimension(source.tradeoffPrimaryCompromise, hasNewTradeoffs || !hasLegacyRanking ? "" : legacyRanking[5]);
    if (primaryCompromise === primaryKeep) primaryCompromise = "";
    const secondaryCandidates = DIMENSIONS.filter((dimension) => ![primaryKeep, primaryCompromise].includes(dimension));
    let secondaryKeep = normalizeDimension(
      source.tradeoffSecondaryKeep,
      hasNewTradeoffs || !hasLegacyRanking ? "" : legacyRanking.find((dimension) => secondaryCandidates.includes(dimension))
    );
    if (!secondaryCandidates.includes(secondaryKeep)) secondaryKeep = "";
    let secondaryCompromise = normalizeDimension(
      source.tradeoffSecondaryCompromise,
      hasNewTradeoffs || !hasLegacyRanking ? "" : [...legacyRanking].reverse().find((dimension) => secondaryCandidates.includes(dimension))
    );
    if (!secondaryCandidates.includes(secondaryCompromise) || secondaryCompromise === secondaryKeep) secondaryCompromise = "";
    const next = {
      ...getDefaultPreferences(),
      idealAnnualPackage: String(source.idealAnnualPackage || source.expectedAnnualPackage || ""),
      preferredCity: String(source.preferredCity || ""),
      acceptableCities: String(source.acceptableCities || "无"),
      tradeoffPrimaryKeep: primaryKeep,
      tradeoffPrimaryCompromise: primaryCompromise,
      tradeoffSecondaryKeep: secondaryKeep,
      tradeoffSecondaryCompromise: secondaryCompromise,
      customWeights: normalizeCustomWeights(source.customWeights)
    };
    IMPORTANCE_FIELDS.forEach((field) => { next[field] = normalizeScale(source[field], ""); });
    return next;
  }

  function normalizeCustomWeights(value) {
    if (!value || typeof value !== "object") return null;
    const weights = {};
    for (const dimension of DIMENSIONS) {
      const weight = Number(value[dimension]);
      if (!Number.isInteger(weight) || weight < 0 || weight > 100) return null;
      weights[dimension] = weight;
    }
    return Object.values(weights).reduce((sum, weight) => sum + weight, 0) === 100 ? weights : null;
  }

  function getDefaultSession() {
    return { preferences: getDefaultPreferences(), offers: [] };
  }

  function normalizeSession(rawSession) {
    const session = rawSession || {};
    return {
      preferences: normalizePreferences(session.preferences),
      offers: Array.isArray(session.offers) ? session.offers.map(normalizeOffer) : []
    };
  }

  function getDemoSession() {
    return normalizeSession({
      preferences: {
        idealAnnualPackage: "40", preferredCity: "北京", acceptableCities: "上海、杭州",
        importanceTotalPackage: "4", importanceStability: "3",
        importanceGrowth: "5", importanceWorkIntensity: "4", importanceCityLife: "3",
        importanceTeamFit: "4",
        tradeoffPrimaryKeep: "growth", tradeoffPrimaryCompromise: "cityLife",
        tradeoffSecondaryKeep: "totalPackage", tradeoffSecondaryCompromise: "stability"
      },
      offers: [
        {
          id: createId(), company: "星云科技", role: "AI 产品经理", city: "北京",
          estimatedAnnualPackage: "41", businessStability: "4", roleStability: "4",
          abilityGrowth: "5", careerClarity: "4", workIntensity: "4",
          managerFit: "5", teamFit: "4", choicePulse: "5",
          notes: "业务方向明确，直属领导沟通顺畅，但工作节奏偏快。"
        },
        {
          id: createId(), company: "远景集团", role: "高级产品经理", city: "上海",
          estimatedAnnualPackage: "45", businessStability: "5", roleStability: "4",
          abilityGrowth: "3", careerClarity: "4", workIntensity: "3",
          managerFit: "3", teamFit: "4", choicePulse: "3",
          notes: "平台成熟、总包更高，岗位成长速度可能相对平稳。"
        },
        {
          id: createId(), company: "山海智能", role: "产品负责人", city: "深圳",
          estimatedAnnualPackage: "38", businessStability: "3", roleStability: "3",
          abilityGrowth: "5", careerClarity: "3", workIntensity: "5",
          managerFit: "4", teamFit: "3", choicePulse: "4",
          notes: "职责范围大，但城市和长期强度都需要权衡。"
        }
      ]
    });
  }

  function ensureMinimumOffers(session) {
    const nextSession = normalizeSession(session);
    while (nextSession.offers.length < MIN_ANALYSIS_OFFERS) nextSession.offers.push(createEmptyOffer());
    return nextSession;
  }

  function getOfferLabel(offer, index) {
    const company = (offer.company || "").trim();
    const role = (offer.role || "").trim();
    if (company && role) return `${company} · ${role}`;
    return company || role || `Offer ${index + 1}`;
  }

  function getOfferCompleteness(offer) {
    const fields = [
      "company", "role", "city", "estimatedAnnualPackage", "businessStability", "roleStability",
      "abilityGrowth", "careerClarity", "workIntensity", "managerFit", "teamFit"
    ];
    const filledCount = fields.reduce((count, field) => {
      const value = String(offer[field] || "").trim();
      return count + (value && value !== "unknown" ? 1 : 0);
    }, 0);
    return { filledCount, totalCount: fields.length, percent: Math.round((filledCount / fields.length) * 100) };
  }

  function getComparableOffers(offers) {
    return (offers || []).filter((offer) => (offer.company || "").trim() || (offer.role || "").trim());
  }

  function hasMinimumComparableOffers(session) {
    return getComparableOffers(session.offers).length >= MIN_ANALYSIS_OFFERS;
  }

  window.OfferHelperState = {
    MIN_ANALYSIS_OFFERS, MAX_OFFERS, IMPORTANCE_FIELDS, DIMENSIONS, TRADEOFF_FIELDS, createId, getDefaultPreferences,
    createEmptyOffer, normalizeOffer, normalizePreferences, normalizeCustomWeights, getDefaultSession, normalizeSession,
    getDemoSession, ensureMinimumOffers, getOfferLabel, getOfferCompleteness,
    getComparableOffers, hasMinimumComparableOffers
  };
})();
