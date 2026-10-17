(function () {
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderTagList(container, tags) {
    container.innerHTML = tags
      .filter(Boolean)
      .map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`)
      .join("");
  }

  function renderWeightList(container, weights, compact) {
    container.innerHTML = Object.entries(weights)
      .sort((left, right) => right[1] - left[1])
      .map(([key, value]) => {
        const label = window.OfferHelperCopy.getDimensionLabel(key);
        return `
          <div class="weight-item ${compact ? "weight-item--compact" : ""}">
            <div class="weight-item__meta">
              <span>${escapeHtml(label)}</span>
              <strong>${value}%</strong>
            </div>
            <div class="weight-item__bar">
              <span style="width:${value}%"></span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  function renderInsightList(container, items) {
    container.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function formatTime(isoString) {
    try {
      const date = new Date(isoString);
      return `生成于 ${date.toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })}`;
    } catch (error) {
      return "";
    }
  }

  function navigate(path) {
    window.location.href = path;
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  }

  window.OfferHelperUI = {
    escapeHtml,
    renderTagList,
    renderWeightList,
    renderInsightList,
    formatTime,
    navigate,
    copyText
  };
})();
