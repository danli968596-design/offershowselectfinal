(function () {
  const DIMENSIONS = ["totalPackage", "stability", "growth", "workIntensity", "cityLife", "teamFit"];
  const IMPORTANCE_FIELD_BY_DIMENSION = {
    totalPackage: "importanceTotalPackage",
    stability: "importanceStability",
    growth: "importanceGrowth",
    workIntensity: "importanceWorkIntensity",
    cityLife: "importanceCityLife",
    teamFit: "importanceTeamFit"
  };
  const BASE_STARTING_POINTS = 16;
  const BASE_ADJUSTMENTS = { 1: -4, 2: -2, 3: 0, 4: 2, 5: 4 };
  const TRADEOFF_STARTING_POINTS = 16;
  const PRIMARY_TRADEOFF_POINTS = 5;
  const SECONDARY_TRADEOFF_POINTS = 3;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function normalizeCity(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "").replace(/市$/u, "");
  }

  function parseCityList(value) {
    const emptyLabels = new Set(["无", "没有", "暂无", "none"]);
    return Array.from(new Set(String(value || "")
      .split(/[、,，.。;；:：/／\\|｜!！?？\n\r\t]+/)
      .map(normalizeCity)
      .filter((city) => city && !emptyLabels.has(city))));
  }

  function getBaseRawWeights(preferences) {
    return DIMENSIONS.reduce((weights, dimension) => {
      const answer = clamp(toNumber(preferences[IMPORTANCE_FIELD_BY_DIMENSION[dimension]]) || 3, 1, 5);
      weights[dimension] = BASE_STARTING_POINTS + BASE_ADJUSTMENTS[answer];
      return weights;
    }, {});
  }

  function getTradeoffRawWeights(preferences) {
    const prefs = preferences || {};
    const raw = DIMENSIONS.reduce((weights, dimension) => {
      weights[dimension] = TRADEOFF_STARTING_POINTS;
      return weights;
    }, {});
    const primaryKeep = String(prefs.tradeoffPrimaryKeep || "");
    const primaryCompromise = String(prefs.tradeoffPrimaryCompromise || "");
    const primaryValid = DIMENSIONS.includes(primaryKeep)
      && DIMENSIONS.includes(primaryCompromise)
      && primaryKeep !== primaryCompromise;
    if (primaryValid) {
      raw[primaryKeep] += PRIMARY_TRADEOFF_POINTS;
      raw[primaryCompromise] -= PRIMARY_TRADEOFF_POINTS;
    }

    const secondaryKeep = String(prefs.tradeoffSecondaryKeep || "");
    const secondaryCompromise = String(prefs.tradeoffSecondaryCompromise || "");
    const excluded = new Set([primaryKeep, primaryCompromise]);
    const secondaryValid = primaryValid
      && DIMENSIONS.includes(secondaryKeep)
      && DIMENSIONS.includes(secondaryCompromise)
      && secondaryKeep !== secondaryCompromise
      && !excluded.has(secondaryKeep)
      && !excluded.has(secondaryCompromise);
    if (secondaryValid) {
      raw[secondaryKeep] += SECONDARY_TRADEOFF_POINTS;
      raw[secondaryCompromise] -= SECONDARY_TRADEOFF_POINTS;
    }
    return raw;
  }

  function normalizeWeightValues(rawWeights) {
    const total = DIMENSIONS.reduce((sum, key) => sum + rawWeights[key], 0);
    return DIMENSIONS.reduce((weights, key) => {
      weights[key] = total ? (rawWeights[key] / total) * 100 : 100 / DIMENSIONS.length;
      return weights;
    }, {});
  }

  function roundWeights(exactWeights) {
    const entries = DIMENSIONS.map((key, index) => {
      const exact = exactWeights[key];
      return { key, index, value: Math.floor(exact), fraction: exact - Math.floor(exact) };
    });
    let remaining = 100 - entries.reduce((sum, item) => sum + item.value, 0);
    [...entries]
      .sort((left, right) => right.fraction - left.fraction || left.index - right.index)
      .forEach((item) => {
        if (remaining > 0) {
          entries[item.index].value += 1;
          remaining -= 1;
        }
      });
    return entries.reduce((weights, item) => {
      weights[item.key] = item.value;
      return weights;
    }, {});
  }

  function calculateWeightComponents(preferences) {
    const prefs = preferences || {};
    const baseRaw = getBaseRawWeights(prefs);
    const tradeoffRaw = getTradeoffRawWeights(prefs);
    const baseWeights = normalizeWeightValues(baseRaw);
    const tradeoffWeights = normalizeWeightValues(tradeoffRaw);
    const finalExactWeights = DIMENSIONS.reduce((weights, key) => {
      weights[key] = baseWeights[key] * 0.5 + tradeoffWeights[key] * 0.5;
      return weights;
    }, {});
    return {
      baseRaw,
      tradeoffRaw,
      baseWeights,
      tradeoffWeights,
      finalExactWeights,
      finalWeights: roundWeights(finalExactWeights)
    };
  }

  function calculateWeights(preferences) {
    return calculateWeightComponents(preferences).finalWeights;
  }

  function getCustomWeights(preferences) {
    const value = preferences && preferences.customWeights;
    if (!value || typeof value !== "object") return null;
    const weights = {};
    for (const dimension of DIMENSIONS) {
      const weight = Number(value[dimension]);
      if (!Number.isInteger(weight) || weight < 0 || weight > 100) return null;
      weights[dimension] = weight;
    }
    return Object.values(weights).reduce((sum, weight) => sum + weight, 0) === 100 ? weights : null;
  }

  function getEffectiveWeights(preferences) {
    const calculatedWeights = calculateWeights(preferences);
    const customWeights = getCustomWeights(preferences);
    return customWeights || calculatedWeights;
  }

  function rebalanceWeights(weights, changedDimension, targetValue) {
    if (!DIMENSIONS.includes(changedDimension)) return null;
    const current = getCustomWeights({ customWeights: weights });
    if (!current) return null;
    const target = clamp(Math.round(toNumber(targetValue)), 0, 100);
    const otherDimensions = DIMENSIONS.filter((dimension) => dimension !== changedDimension);
    const currentOtherTotal = otherDimensions.reduce((sum, dimension) => sum + current[dimension], 0);
    const remaining = 100 - target;
    const exact = { [changedDimension]: target };
    otherDimensions.forEach((dimension) => {
      exact[dimension] = currentOtherTotal > 0
        ? (current[dimension] / currentOtherTotal) * remaining
        : remaining / otherDimensions.length;
    });
    return roundWeights(exact);
  }

  function mapScale(value) {
    const numeric = toNumber(value);
    return numeric >= 1 && numeric <= 5 ? numeric * 20 : 50;
  }

  function getTotalPackageScore(offer, preferences) {
    const current = Math.max(0, toNumber(offer.estimatedAnnualPackage));
    const ideal = Math.max(0, toNumber(preferences.idealAnnualPackage));
    if (!current || !ideal) return 50;
    const ratio = current / ideal;
    if (ratio <= 0.7) return clamp(30 + (ratio / 0.7) * 20, 0, 50);
    if (ratio <= 0.85) return 50 + ((ratio - 0.7) / 0.15) * 20;
    if (ratio <= 1) return 70 + ((ratio - 0.85) / 0.15) * 15;
    if (ratio < 1.2) return 85 + ((ratio - 1) / 0.2) * 15;
    return 100;
  }

  function getStabilityScore(offer) {
    return mapScale(offer.businessStability) * 0.6 + mapScale(offer.roleStability) * 0.4;
  }

  function getGrowthScore(offer) {
    return mapScale(offer.abilityGrowth) * 0.6 + mapScale(offer.careerClarity) * 0.4;
  }

  function getWorkIntensityScore(offer) {
    return ({ 1: 100, 2: 85, 3: 70, 4: 40, 5: 15 })[toNumber(offer.workIntensity)] || 50;
  }

  function getCityLifeScore(offer, preferences) {
    const city = normalizeCity(offer.city);
    const preferred = normalizeCity(preferences.preferredCity);
    const acceptable = parseCityList(preferences.acceptableCities);
    if (!city) return 50;
    if (preferred && city === preferred) return 100;
    if (acceptable.includes(city)) return 80;
    return 40;
  }

  function getTeamFitScore(offer) {
    return mapScale(offer.managerFit) * 0.6 + mapScale(offer.teamFit) * 0.4;
  }

  function getScoringCompleteness(offer) {
    const fields = [
      "estimatedAnnualPackage", "city", "businessStability", "roleStability",
      "abilityGrowth", "careerClarity", "workIntensity", "managerFit", "teamFit"
    ];
    const filled = fields.filter((field) => {
      const value = String(offer[field] || "").trim();
      return value && value !== "unknown";
    }).length;
    return Math.round((filled / fields.length) * 100);
  }

  function scoreOffers(offers, weights, preferences) {
    return offers.map((offer, index) => {
      const dimensionScores = {
        totalPackage: Math.round(getTotalPackageScore(offer, preferences)),
        stability: Math.round(getStabilityScore(offer)),
        growth: Math.round(getGrowthScore(offer)),
        workIntensity: Math.round(getWorkIntensityScore(offer)),
        cityLife: Math.round(getCityLifeScore(offer, preferences)),
        teamFit: Math.round(getTeamFitScore(offer))
      };
      const weightedBreakdown = DIMENSIONS.map((key) => ({
        key, score: dimensionScores[key], weight: weights[key],
        weightedScore: Number(((dimensionScores[key] * weights[key]) / 100).toFixed(2))
      }));
      const total = weightedBreakdown.reduce((sum, item) => sum + item.weightedScore, 0);
      return {
        ...offer,
        inputIndex: index,
        label: window.OfferHelperState.getOfferLabel(offer, index),
        annualPackage: toNumber(offer.estimatedAnnualPackage),
        dimensionScores,
        weightedBreakdown,
        completeness: getScoringCompleteness(offer),
        totalScore: Number(clamp(total, 0, 100).toFixed(1))
      };
    });
  }

  function sortScoredOffers(scoredOffers, weights) {
    const focusDimension = Object.entries(weights)
      .sort((left, right) => right[1] - left[1] || DIMENSIONS.indexOf(left[0]) - DIMENSIONS.indexOf(right[0]))[0][0];
    return [...scoredOffers].sort((left, right) => (
      right.totalScore - left.totalScore
      || right.dimensionScores[focusDimension] - left.dimensionScores[focusDimension]
      || right.completeness - left.completeness
      || left.inputIndex - right.inputIndex
    ));
  }

  function buildDimensionRows(scoredOffers) {
    return DIMENSIONS.map((key) => ({
      key,
      label: window.OfferHelperCopy.getDimensionLabel(key),
      values: scoredOffers.map((offer) => ({ offerId: offer.id, label: offer.label, score: offer.dimensionScores[key] }))
    }));
  }

  function getPulseComparison(scoredOffers) {
    const sorted = [...scoredOffers].sort((left, right) => (
      toNumber(right.choicePulse) - toNumber(left.choicePulse) || left.inputIndex - right.inputIndex
    ));
    const firstPulse = toNumber(sorted[0] && sorted[0].choicePulse);
    const secondPulse = toNumber(sorted[1] && sorted[1].choicePulse);
    if (!firstPulse || firstPulse <= 3 || firstPulse === secondPulse) return { status: "neutral", pulseLeaderId: null };
    return {
      status: sorted[0].id === scoredOffers[0].id ? "aligned" : "different",
      pulseLeaderId: sorted[0].id,
      pulseLeaderLabel: sorted[0].label
    };
  }

  function buildTopSummary(topOffer, secondOffer, weights) {
    const focusKey = Object.entries(weights).sort((left, right) => right[1] - left[1])[0][0];
    const focusLabel = window.OfferHelperCopy.getDimensionLabel(focusKey);
    const gap = secondOffer ? Number((topOffer.totalScore - secondOffer.totalScore).toFixed(1)) : 0;
    if (secondOffer && gap <= 3) {
      return `${topOffer.label} 暂列第一，但与${secondOffer.label}只差 ${gap} 分，属于接近结果。重点比较两者在${focusLabel}上的差异。`;
    }
    return `${topOffer.label} 的六维综合匹配度最高；其中${focusLabel}是你本轮权重最高的判断维度。`;
  }

  function analyzeSession(session) {
    const comparableOffers = window.OfferHelperState.getComparableOffers(session.offers);
    if (comparableOffers.length < window.OfferHelperState.MIN_ANALYSIS_OFFERS) return null;
    const preferences = session.preferences;
    const weightComponents = calculateWeightComponents(preferences);
    const weights = getEffectiveWeights(preferences);
    const scoredOffers = sortScoredOffers(scoreOffers(comparableOffers, weights, preferences), weights)
      .map((offer, index, list) => ({
        ...offer,
        rank: index + 1,
        gapToNext: list[index + 1] ? Number((offer.totalScore - list[index + 1].totalScore).toFixed(1)) : null,
        isCloseToNext: Boolean(list[index + 1] && offer.totalScore - list[index + 1].totalScore <= 3)
      }));
    const topOffer = scoredOffers[0];
    const secondOffer = scoredOffers[1] || null;
    return {
      modelVersion: "offershow-6d-v5",
      createdAt: new Date().toISOString(),
      preferences,
      weights,
      weightComponents,
      scoredOffers,
      topOffer,
      secondOffer,
      topSummary: buildTopSummary(topOffer, secondOffer, weights),
      pulseComparison: getPulseComparison(scoredOffers),
      dimensionRows: buildDimensionRows(scoredOffers)
    };
  }

  window.OfferHelperScoring = {
    DIMENSIONS, BASE_STARTING_POINTS, BASE_ADJUSTMENTS, TRADEOFF_STARTING_POINTS,
    PRIMARY_TRADEOFF_POINTS, SECONDARY_TRADEOFF_POINTS, parseCityList, getBaseRawWeights,
    getTradeoffRawWeights, calculateWeightComponents, calculateWeights, getCustomWeights,
    getEffectiveWeights, rebalanceWeights, scoreOffers, analyzeSession
  };
})();
