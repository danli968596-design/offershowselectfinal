/* Shared country-level overseas locations for preferences, Offer entry and scoring. */
(function () {
  "use strict";
  const countries = [["US", "美国", "United States"], ["GB", "英国", "United Kingdom"], ["CA", "加拿大", "Canada"], ["AU", "澳大利亚", "Australia"], ["NZ", "新西兰", "New Zealand"], ["SG", "新加坡", "Singapore"], ["JP", "日本", "Japan"], ["KR", "韩国", "South Korea"], ["DE", "德国", "Germany"], ["FR", "法国", "France"], ["NL", "荷兰", "Netherlands"], ["IE", "爱尔兰", "Ireland"], ["CH", "瑞士", "Switzerland"], ["AE", "阿联酋", "United Arab Emirates"], ["IT", "意大利", "Italy"], ["ES", "西班牙", "Spain"], ["SE", "瑞典", "Sweden"], ["DK", "丹麦", "Denmark"], ["NO", "挪威", "Norway"], ["FI", "芬兰", "Finland"], ["MY", "马来西亚", "Malaysia"], ["TH", "泰国", "Thailand"], ["VN", "越南", "Vietnam"], ["ID", "印度尼西亚", "Indonesia"]];
  const regions = [...(window.OfferShowChinaCities || []), {
    c: "overseas", n: "海外国家", ch: countries.map(([iso, name, english]) => ({ c: `country:${iso}`, n: name, english, iso }))
  }];
  const places = regions.flatMap((region) => region.ch.filter((place) => place.n !== "县").map((place) => ({
    code: String(place.c), name: place.n, provinceCode: String(region.c), province: region.n,
    english: place.english || "", iso: place.iso || "", overseas: region.c === "overseas"
  })));
  const normalize = (value) => String(value || "").toLowerCase().replace(/\s/g, "");
  window.OfferShowLocations = regions;
  window.OfferShowLocationCatalog = {
    provinces: regions.filter((region) => region.c !== "overseas"), places,
    byCode: new Map(places.map((place) => [place.code, place])),
    matches(place, query) { return [place.name, place.province, place.english, place.iso].some((text) => normalize(text).includes(normalize(query))); },
    isOverseas(code) { return String(code || "").startsWith("country:"); }
  };
})();
