const assert = require("node:assert/strict");

global.window = global;
require("./state.js");
require("./copywriting.js");
require("./scoring.js");
require("./storage.js");
require("./OfferShow-UI确认版-20261015/scripts/app-config.js");
require("./OfferShow-UI确认版-20261015/scripts/china-cities.js");
require("./OfferShow-UI确认版-20261015/scripts/background-demo-content.js");
require("./OfferShow-UI确认版-20261015/scripts/core-algorithm-adapter.js");
require("./OfferShow-UI确认版-20261015/scripts/six-dim-v5.js");

const model = global.OfferShow6D;

function validPreferences(overrides = {}) {
  return {
    idealAnnualPackage: "40",
    preferredCity: "杭州市",
    preferredProvinceCode: "33",
    preferredCityCode: "3301",
    acceptableCities: "上海市、北京市",
    acceptableCityCodes: "3101,1101",
    importanceTotalPackage: "4",
    importanceStability: "3",
    importanceGrowth: "5",
    importanceWorkIntensity: "4",
    importanceCityLife: "3",
    importanceTeamFit: "4",
    tradeoffPrimaryKeep: "growth",
    tradeoffPrimaryCompromise: "stability",
    tradeoffSecondaryKeep: "totalPackage",
    tradeoffSecondaryCompromise: "cityLife",
    ...overrides
  };
}

function validOffer(index = 1, overrides = {}) {
  return {
    id: `offer-${index}`,
    company: `offershow${index}`,
    role: "产品经理",
    city: "杭州市",
    provinceCode: "33",
    cityCode: "3301",
    annualPackage: "40",
    companyStability: "4",
    roleStability: "4",
    skillGrowth: "5",
    pathClarity: "4",
    workIntensity: "seasonal",
    managerFit: "4",
    teamFit: "4",
    gutFeeling: "4",
    notes: "",
    ...overrides
  };
}

assert.equal(model.MIN_OFFERS, 2);
assert.equal(model.MAX_OFFERS, 6);
assert.equal(model.DEMO_MODE, true, "当前内部原型应启用演示模式");
assert.equal(model.aiAccessFor({ id: "top" }, 1, { used: false }, true).type, "trial", "演示模式第一名可展示完整背调");
assert.equal(model.aiAccessFor({ id: "top" }, 1, { used: true, offerId: "old" }, true).type, "trial", "演示模式不受已用免费次数影响");
assert.equal(model.aiAccessFor({ id: "top" }, 1, { used: true, offerId: "top" }, true).type, "trial", "演示模式可重复打开同一 Offer");
assert.equal(model.aiAccessFor({ id: "second" }, 2, { used: false, offerId: "" }, true).type, "locked", "演示模式仍应锁定非第一名");
assert.equal(model.aiAccessFor({ id: "top" }, 1, { used: true, offerId: "old" }, false).type, "locked", "正式模式应保持一次免费限制");
assert.equal(model.aiAccessFor({ id: "top" }, 1, { used: true, offerId: "top" }, false).type, "view", "正式模式可重新查看已解锁的同一 Offer");
assert.equal(model.aiAccessFor({ id: "top" }, 1, { used: false, offerId: "" }, false).type, "trial", "正式模式首次应允许第一名试用");
const demoReport = global.OfferShowBackgroundDemo.build();
assert.equal(demoReport.reportTitle, "XXX公司产品经理岗位分析");
assert.equal(demoReport.targetCity, "深圳");
assert.equal(demoReport.targetRole, "产品经理");
assert.deepEqual(Object.keys(demoReport.sections), ["stability", "growth", "workIntensity"]);
assert.match(demoReport.sections.stability, /岗位的实际稳定性/);
assert.match(demoReport.sections.growth, /产品规划、需求分析/);
assert.match(demoReport.sections.workIntensity, /版本发布、业务目标/);

const normalized = model.normalizeSession({ offers: Array.from({ length: 7 }, (_, index) => validOffer(index + 1)) });
assert.equal(normalized.offers.length, 6, "旧数据迁移也必须限制为 6 份 Offer");
assert.equal(normalized.preferences.considerOtherCities, "", "新会话应等待用户手动填写其他可接受城市");
assert.equal(normalized.preferences.acceptableCities, "", "新会话不应预填其他可接受城市");
assert.equal(normalized.preferences.preferredCity, "", "新会话不应预填首选地点");
assert.deepEqual(normalized.offers.slice(0, 3).map((offer) => offer.company), ["OfferShow1", "OfferShow2", "OfferShow3"], "旧版示例名称应自动迁移为正确大小写");

assert.match(model.validatePreferences(validPreferences({ acceptableCities: "", acceptableCityCodes: "", considerOtherCities: "" })), /其他可接受的城市/);
assert.equal(model.validatePreferences(validPreferences({ acceptableCities: "无", acceptableCityCodes: "" })), "");
assert.match(model.validatePreferences(validPreferences({ preferredCity: "", preferredCityCode: "" })), /意向城市/);
assert.match(model.validatePreferences(validPreferences({ acceptableCities: "上海市、杭州市", acceptableCityCodes: "3101,3301" })), /无需重复填写/);
assert.equal(model.validatePreferences(validPreferences({ preferredCity: "杭州", preferredCityCode: "", acceptableCities: "上海，苏州。南京;合肥/宁波", acceptableCityCodes: "" })), "", "手动输入的城市和多种分隔符应通过校验");
assert.deepEqual(model.parseCityList("上海，苏州。南京;合肥/宁波；上海市"), ["上海", "苏州", "南京", "合肥", "宁波"]);
assert.deepEqual(model.parseCityList("无"), []);
assert.equal(model.cityKey(" 杭州市 "), model.cityKey("杭州"));

assert.match(model.validateOffers([validOffer(1)]), /至少填写 2 份/);
assert.match(model.validateOffers([validOffer(1), validOffer(2, { annualPackage: "" })]), /必填信息/);
assert.match(model.validateOffers([validOffer(1), validOffer(2, { gutFeeling: "" })]), /必填信息/);
assert.equal(model.validateOffers([validOffer(1, { teamFit: "unknown" }), validOffer(2)]), "", "不清楚是显式有效选项");

const equalWeights = { totalPackage: 17, stability: 17, growth: 17, workIntensity: 17, cityLife: 16, teamFit: 16 };
assert.equal(model.scoreOffer(validOffer(1), validPreferences(), equalWeights).dimensionScores.cityLife, 100);
assert.equal(model.scoreOffer(validOffer(1, { city: "苏州市", provinceCode: "32", cityCode: "3205" }), validPreferences({ acceptableCities: "上海市、苏州市", acceptableCityCodes: "3101,3205" }), equalWeights).dimensionScores.cityLife, 80);
assert.equal(model.scoreOffer(validOffer(1, { city: "苏州市", provinceCode: "32", cityCode: "3205" }), validPreferences({ preferredCity: "杭州", preferredCityCode: "", acceptableCities: "上海，苏州。南京;合肥/宁波", acceptableCityCodes: "" }), equalWeights).dimensionScores.cityLife, 80, "逗号、句号、分号和斜线都应被识别为城市分隔符");
assert.equal(model.scoreOffer(validOffer(1, { city: "杭州市" }), validPreferences({ preferredCity: "杭州", preferredCityCode: "" }), equalWeights).dimensionScores.cityLife, 100, "手动输入不带市也应与 Offer 城市匹配");
assert.equal(model.scoreOffer(validOffer(1, { city: "深圳市", provinceCode: "44", cityCode: "4403" }), validPreferences({ acceptableCities: "无", acceptableCityCodes: "" }), equalWeights).dimensionScores.cityLife, 40);

const baseline = { totalPackage: 18, stability: 14, growth: 19, workIntensity: 15, cityLife: 17, teamFit: 17 };
let stableDragResult;
for (let target = 20; target <= 50; target++) stableDragResult = model.redistribute(baseline, "growth", target);
assert.deepEqual(stableDragResult, { totalPackage: 11, stability: 9, growth: 50, workIntensity: 9, cityLife: 11, teamFit: 10 });
assert.equal(Object.values(stableDragResult).reduce((sum, value) => sum + value, 0), 100);

const analysisSession = {
  preferences: validPreferences(),
  offers: [validOffer(1), validOffer(2, { city: "上海市", provinceCode: "31", cityCode: "3101", gutFeeling: "3" })]
};
const analysis = model.analyze(analysisSession);
assert.equal(analysis.scoredOffers.length, 2);
assert.equal(analysis.scoredOffers[0].rank, 1);
const shareCardData = model.buildShareCardData(analysisSession, analysis);
assert.deepEqual(shareCardData.weights, analysis.weights, "分享卡应采用本次分析得到的当前权重");
assert.equal(shareCardData.topPreference, "成长空间");
assert.equal(shareCardData.offers.length, 2);
assert.equal(shareCardData.offers[0].score, analysis.scoredOffers[0].totalScore, "分享卡应采用当前 Offer 的实际综合得分");
assert.equal(shareCardData.offers[0].label, analysis.scoredOffers[0].company, "分享卡应显示当前排序对应的公司名称");
assert.equal(shareCardData.offers[0].dimensions.length, 6, "分享卡应采用当前 Offer 的六维得分");

console.log("production flow tests passed");
