(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let session = {};
  try { session = JSON.parse(localStorage.getItem("offer-helper-paper-blue-v5-6d-session") || "{}"); } catch (_) {}
  const ids = new Set((new URLSearchParams(location.search).get("offers") || "").split(","));
  // Only fields shown in the preview are ever included in the local publishing draft.
  const items = (Array.isArray(session.offers) ? session.offers : []).filter((o) => ids.has(o.id)).map(({ company, role, city, annualPackage }) => ({ company, role, city, annualPackage }));
  $("publishEmptyMessage").hidden = items.length > 0;
  $("savePublishDraftBtn").disabled = !items.length;
  $("publishPreviewCards").replaceChildren(...items.map((item, i) => {
    const card = document.createElement("article"); card.className = "publish-preview-card";
    const label = document.createElement("span"); label.className = "publish-preview-label"; label.textContent = `匿名分享 · Offer ${i + 1}`;
    const title = document.createElement("h3"); title.textContent = item.company;
    const detail = document.createElement("p"); detail.textContent = `${item.role} · ${item.city}`;
    const salary = document.createElement("div"); salary.className = "publish-salary";
    const value = document.createElement("strong"); value.textContent = item.annualPackage;
    const unit = document.createElement("span"); unit.textContent = "万元 / 年";
    salary.append(value, unit); card.append(label, title, detail, salary); return card;
  }));
  $("savePublishDraftBtn").addEventListener("click", () => {
    try {
      localStorage.setItem("offershow-publish-preview-draft-v1", JSON.stringify({ status: "local-draft", createdAt: new Date().toISOString(), offers: items }));
      $("publishSaveStatus").textContent = "草稿已保存在当前浏览器，尚未发布到社区。";
      $("savePublishDraftBtn").textContent = "草稿已保存 ✓";
    } catch (_) { $("publishSaveStatus").textContent = "浏览器未能保存草稿，请保留本页后再试。"; }
  });
})();
