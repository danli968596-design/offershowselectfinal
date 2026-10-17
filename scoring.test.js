const assert = require("assert");

global.window = global;
require("./state.js");
require("./copywriting.js");
require("./scoring.js");

const dimensions = ["totalPackage", "stability", "growth", "workIntensity", "cityLife", "teamFit"];
const defaults = OfferHelperState.getDefaultPreferences();
const freshPreferences = OfferHelperState.normalizePreferences({});
OfferHelperState.IMPORTANCE_FIELDS.forEach((field) => assert.strictEqual(freshPreferences[field], ""));
OfferHelperState.TRADEOFF_FIELDS.forEach((field) => assert.strictEqual(freshPreferences[field], ""));
assert.strictEqual(freshPreferences.customWeights, null);
const completedTradeoffs = {
  tradeoffPrimaryKeep: "growth",
  tradeoffPrimaryCompromise: "stability",
  tradeoffSecondaryKeep: "totalPackage",
  tradeoffSecondaryCompromise: "workIntensity"
};

let combinations = 0;
for (let mask = 0; mask < 15625; mask += 1) {
  let value = mask;
  const prefs = { ...defaults, ...completedTradeoffs };
  OfferHelperState.IMPORTANCE_FIELDS.forEach((field) => {
    prefs[field] = String((value % 5) + 1);
    value = Math.floor(value / 5);
  });
  const weights = OfferHelperScoring.calculateWeights(prefs);
  assert.deepStrictEqual(Object.keys(weights), dimensions);
  assert.strictEqual(Object.values(weights).reduce((sum, item) => sum + item, 0), 100);
  assert(Object.values(weights).every((item) => Number.isInteger(item) && item > 0));
  combinations += 1;
}

const basePrefs = {
  ...defaults,
  importanceTotalPackage: "1",
  importanceStability: "2",
  importanceGrowth: "3",
  importanceWorkIntensity: "4",
  importanceCityLife: "5",
  importanceTeamFit: "3"
};
assert.deepStrictEqual(OfferHelperScoring.getBaseRawWeights(basePrefs), {
  totalPackage: 12,
  stability: 14,
  growth: 16,
  workIntensity: 18,
  cityLife: 20,
  teamFit: 16
});

assert.deepStrictEqual(OfferHelperScoring.getTradeoffRawWeights(completedTradeoffs), {
  totalPackage: 19,
  stability: 11,
  growth: 21,
  workIntensity: 13,
  cityLife: 16,
  teamFit: 16
});

const allFivePrefs = {
  ...defaults,
  ...completedTradeoffs,
  importanceTotalPackage: "5",
  importanceStability: "5",
  importanceGrowth: "5",
  importanceWorkIntensity: "5",
  importanceCityLife: "5",
  importanceTeamFit: "5"
};
assert.deepStrictEqual(OfferHelperScoring.calculateWeights(allFivePrefs), {
  totalPackage: 18,
  stability: 14,
  growth: 19,
  workIntensity: 15,
  cityLife: 17,
  teamFit: 17
});

const components = OfferHelperScoring.calculateWeightComponents(allFivePrefs);
dimensions.forEach((dimension) => {
  const expected = components.baseWeights[dimension] * 0.5 + components.tradeoffWeights[dimension] * 0.5;
  assert(Math.abs(components.finalExactWeights[dimension] - expected) < 1e-9);
});

const rebalanced = OfferHelperScoring.rebalanceWeights({
  totalPackage: 20,
  stability: 20,
  growth: 20,
  workIntensity: 20,
  cityLife: 10,
  teamFit: 10
}, "totalPackage", 50);
assert.deepStrictEqual(rebalanced, {
  totalPackage: 50,
  stability: 13,
  growth: 13,
  workIntensity: 12,
  cityLife: 6,
  teamFit: 6
});
assert.strictEqual(Object.values(rebalanced).reduce((sum, weight) => sum + weight, 0), 100);

const customWeights = {
  totalPackage: 60,
  stability: 8,
  growth: 8,
  workIntensity: 8,
  cityLife: 8,
  teamFit: 8
};
const effectiveCustomWeights = OfferHelperScoring.getEffectiveWeights({
  ...allFivePrefs,
  customWeights
});
assert.deepStrictEqual(effectiveCustomWeights, customWeights);
assert.deepStrictEqual(
  OfferHelperScoring.getEffectiveWeights(allFivePrefs),
  OfferHelperScoring.calculateWeights(allFivePrefs)
);

function buildOffer(patch) {
  return { ...OfferHelperState.createEmptyOffer(), company: "测试公司", role: "测试岗位", ...patch };
}

const equalWeights = { totalPackage: 17, stability: 17, growth: 17, workIntensity: 17, cityLife: 16, teamFit: 16 };
const scoringPrefs = {
  ...allFivePrefs,
  idealAnnualPackage: "100",
  preferredCity: "上海",
  acceptableCities: "杭州、苏州"
};

function packageScore(value) {
  return OfferHelperScoring.scoreOffers(
    [buildOffer({ estimatedAnnualPackage: String(value), city: "上海" })],
    equalWeights,
    scoringPrefs
  )[0].dimensionScores.totalPackage;
}
assert.strictEqual(packageScore(70), 50);
assert.strictEqual(packageScore(85), 70);
assert.strictEqual(packageScore(100), 85);
assert.strictEqual(packageScore(120), 100);
assert(packageScore(90) > packageScore(80));

const cityOffers = [
  buildOffer({ city: "上海", estimatedAnnualPackage: "100" }),
  buildOffer({ city: "杭州", estimatedAnnualPackage: "100" }),
  buildOffer({ city: "北京", estimatedAnnualPackage: "100" }),
  buildOffer({ city: "", estimatedAnnualPackage: "100" })
];
const cityScores = OfferHelperScoring.scoreOffers(cityOffers, equalWeights, scoringPrefs)
  .map((offer) => offer.dimensionScores.cityLife);
assert.deepStrictEqual(cityScores, [100, 80, 40, 50]);

const detailed = buildOffer({
  city: "上海",
  estimatedAnnualPackage: "100",
  businessStability: "5",
  roleStability: "4",
  abilityGrowth: "5",
  careerClarity: "4",
  workIntensity: "1",
  managerFit: "5",
  teamFit: "4",
  choicePulse: "1"
});
const scored = OfferHelperScoring.scoreOffers([detailed], equalWeights, scoringPrefs)[0];
assert.strictEqual(scored.dimensionScores.stability, 92);
assert.strictEqual(scored.dimensionScores.growth, 92);
assert.strictEqual(scored.dimensionScores.workIntensity, 100);
assert.strictEqual(scored.dimensionScores.teamFit, 92);
assert.strictEqual(scored.completeness, 100);

const pulseLow = buildOffer({ ...detailed, id: "a", company: "A", choicePulse: "1" });
const pulseHigh = buildOffer({ ...detailed, id: "b", company: "B", choicePulse: "5" });
const analysis = OfferHelperScoring.analyzeSession({ preferences: scoringPrefs, offers: [pulseLow, pulseHigh] });
assert(analysis);
assert.strictEqual(analysis.modelVersion, "offershow-6d-v5");
assert(analysis.weightComponents);
assert(!Object.prototype.hasOwnProperty.call(analysis, "dimensionRanking"));
assert(!Object.prototype.hasOwnProperty.call(analysis, "rankingAdjustments"));
assert.strictEqual(analysis.pulseComparison.status, "different");

const customAnalysis = OfferHelperScoring.analyzeSession({
  preferences: { ...scoringPrefs, customWeights },
  offers: [pulseLow, pulseHigh]
});
assert.deepStrictEqual(customAnalysis.weights, customWeights);
assert(!Object.prototype.hasOwnProperty.call(customAnalysis, "customWeights"));
assert(!Object.prototype.hasOwnProperty.call(customAnalysis, "weightMode"));

const migrated = OfferHelperState.normalizeSession({
  preferences: {
    dimensionRanking: ["growth", "totalPackage", "teamFit", "workIntensity", "stability", "cityLife"],
    relocationWillingness: "no"
  },
  offers: [{ company: "旧数据", role: "岗位", monthlySalary: "20", bonusMonths: "3", city: "北京", gutFeeling: "5" }]
});
assert.strictEqual(migrated.offers[0].estimatedAnnualPackage, "30");
assert.strictEqual(migrated.offers[0].choicePulse, "5");
assert.strictEqual(migrated.preferences.tradeoffPrimaryKeep, "growth");
assert.strictEqual(migrated.preferences.tradeoffPrimaryCompromise, "cityLife");
assert.strictEqual(migrated.preferences.tradeoffSecondaryKeep, "totalPackage");
assert.strictEqual(migrated.preferences.tradeoffSecondaryCompromise, "stability");
assert(!Object.prototype.hasOwnProperty.call(migrated.preferences, "dimensionRanking"));
assert(!Object.prototype.hasOwnProperty.call(migrated.preferences, "relocationWillingness"));

console.log(`OfferShow 六维算法测试通过：${combinations} 组基础题组合。`);
