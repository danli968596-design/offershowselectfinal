(function () {
  "use strict";

  const core = window.OfferHelperScoring;
  if (!core) throw new Error("OfferShow 核心评分算法未加载。");

  const DIMENSIONS = ["totalPackage", "stability", "growth", "workIntensity", "cityLife", "teamFit"];
  const INTENSITY_TO_CORE = {
    relaxed: "1",
    occasional: "2",
    seasonal: "3",
    frequent: "4",
    sustained: "5",
    unknown: "unknown"
  };

  function toCorePreferences(preferences) {
    const prefs = preferences || {};
    return {
      idealAnnualPackage: String(prefs.idealAnnualPackage || ""),
      preferredCity: String(prefs.preferredCity || ""),
      acceptableCities: String(prefs.acceptableCities || "无"),
      importanceTotalPackage: String(prefs.importanceTotalPackage || ""),
      importanceStability: String(prefs.importanceStability || ""),
      importanceGrowth: String(prefs.importanceGrowth || ""),
      importanceWorkIntensity: String(prefs.importanceWorkIntensity || ""),
      importanceCityLife: String(prefs.importanceCityLife || ""),
      importanceTeamFit: String(prefs.importanceTeamFit || ""),
      tradeoffPrimaryKeep: String(prefs.tradeoffPrimaryKeep || ""),
      tradeoffPrimaryCompromise: String(prefs.tradeoffPrimaryCompromise || ""),
      tradeoffSecondaryKeep: String(prefs.tradeoffSecondaryKeep || ""),
      tradeoffSecondaryCompromise: String(prefs.tradeoffSecondaryCompromise || ""),
      customWeights: prefs.customWeights ? { ...prefs.customWeights } : null
    };
  }

  function toCoreOffer(offer) {
    return {
      id: String(offer.id || ""),
      company: String(offer.company || ""),
      role: String(offer.role || ""),
      city: String(offer.city || ""),
      estimatedAnnualPackage: String(offer.annualPackage || ""),
      businessStability: String(offer.companyStability || "unknown"),
      roleStability: String(offer.roleStability || "unknown"),
      abilityGrowth: String(offer.skillGrowth || "unknown"),
      careerClarity: String(offer.pathClarity || "unknown"),
      workIntensity: INTENSITY_TO_CORE[offer.workIntensity] || "unknown",
      managerFit: String(offer.managerFit || "unknown"),
      teamFit: String(offer.teamFit || "unknown"),
      choicePulse: String(offer.gutFeeling || "3"),
      notes: String(offer.notes || "")
    };
  }

  function adaptComponents(components) {
    return {
      baseRaw: components.baseRaw,
      tradeoffRaw: components.tradeoffRaw,
      baseWeight: components.baseWeights,
      tradeoffWeight: components.tradeoffWeights,
      finalExact: components.finalExactWeights
    };
  }

  function calculate(preferences) {
    const prefs = toCorePreferences(preferences);
    const components = core.calculateWeightComponents(prefs);
    return {
      weights: core.getEffectiveWeights(prefs),
      questionnaireWeights: components.finalWeights,
      weightComponents: adaptComponents(components)
    };
  }

  function rebalance(weights, selectedDimension, targetValue) {
    return core.rebalanceWeights(weights, selectedDimension, targetValue);
  }

  function mapScoredOffer(scored, originalOffer) {
    return {
      ...originalOffer,
      dimensionScores: scored.dimensionScores,
      weightedBreakdown: Object.fromEntries(scored.weightedBreakdown.map((item) => [item.key, {
        score: item.score,
        weight: item.weight,
        contribution: item.weightedScore
      }])),
      completeness: scored.completeness,
      totalScore: scored.totalScore,
      rawTotal: scored.totalScore,
      originalIndex: scored.inputIndex
    };
  }

  function scoreOffers(offers, preferences, weights) {
    const sourceOffers = Array.isArray(offers) ? offers : [];
    const originalsById = new Map(sourceOffers.map((offer) => [String(offer.id), offer]));
    return core.scoreOffers(sourceOffers.map(toCoreOffer), weights, toCorePreferences(preferences))
      .map((scored) => mapScoredOffer(scored, originalsById.get(String(scored.id)) || {}));
  }

  function scoreOffer(offer, preferences, weights) {
    return scoreOffers([offer], preferences, weights)[0];
  }

  function packageScore(offerAmount, targetAmount) {
    const equalWeights = { totalPackage: 17, stability: 17, growth: 17, workIntensity: 17, cityLife: 16, teamFit: 16 };
    return scoreOffer({
      id: "package-score",
      annualPackage: offerAmount,
      workIntensity: "unknown"
    }, {
      idealAnnualPackage: targetAmount,
      acceptableCities: "无"
    }, equalWeights).dimensionScores.totalPackage;
  }

  function analyze(session) {
    const sourceOffers = Array.isArray(session?.offers) ? session.offers : [];
    const preferences = session?.preferences || {};
    const result = core.analyzeSession({
      preferences: toCorePreferences(preferences),
      offers: sourceOffers.map(toCoreOffer)
    });
    if (!result) return null;

    const originalsById = new Map(sourceOffers.map((offer) => [String(offer.id), offer]));
    const scoredOffers = result.scoredOffers.map((scored) => ({
      ...mapScoredOffer(scored, originalsById.get(String(scored.id)) || {}),
      rank: scored.rank,
      gapToNext: scored.gapToNext,
      isCloseToNext: scored.isCloseToNext
    }));
    const topWeightKey = [...DIMENSIONS]
      .sort((left, right) => result.weights[right] - result.weights[left] || DIMENSIONS.indexOf(left) - DIMENSIONS.indexOf(right))[0];

    return {
      modelVersion: result.modelVersion,
      weights: result.weights,
      questionnaireWeights: result.weightComponents.finalWeights,
      weightComponents: adaptComponents(result.weightComponents),
      scoredOffers,
      dimensionRows: DIMENSIONS.map((key) => ({
        key,
        label: window.OfferHelperCopy.getDimensionLabel(key),
        weight: result.weights[key],
        scores: scoredOffers.map((offer) => offer.dimensionScores[key])
      })),
      pulseComparison: result.pulseComparison,
      topWeightKey
    };
  }

  window.OfferShowCoreAlgorithm = Object.freeze({
    calculate,
    rebalance,
    packageScore,
    scoreOffer,
    scoreOffers,
    analyze,
    toCorePreferences,
    toCoreOffer
  });
})();
