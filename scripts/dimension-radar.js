/* Visual-only comparison chart. The rendered table remains the source of truth. */
(function () {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const COLORS = ["#328ff0", "#d6a337", "#eb846f", "#51a79f"];
  const DIMENSIONS = [
    { key: "totalPackage", label: "总包预期" },
    { key: "stability", label: "稳定性" },
    { key: "growth", label: "成长空间" },
    { key: "workIntensity", label: "工作强度" },
    { key: "cityLife", label: "城市匹配度" },
    { key: "teamFit", label: "团队匹配度" }
  ];
  const CENTER = { x: 180, y: 133 };
  const RADIUS = 94;
  const LABELS = [
    { x: 180, y: 20 },
    { x: 304, y: 83 },
    { x: 304, y: 203 },
    { x: 180, y: 260 },
    { x: 56, y: 203 },
    { x: 56, y: 83 }
  ];

  function cleanText(node) {
    return node.textContent.replace(/\s+/g, " ").trim();
  }

  function readOffers(wrapper) {
    const table = wrapper.querySelector(".dimension-table");
    const header = table && table.querySelector("thead tr");
    const body = table && table.querySelector("tbody");
    if (!header || !body) return null;

    const columns = DIMENSIONS.map((dimension) => Array.from(header.cells)
      .findIndex((cell) => cell.dataset.dimension === dimension.key));
    const rows = Array.from(body.rows);
    if (columns.some((column) => column < 0) || rows.length < 2 || rows.length > COLORS.length) return null;

    const offers = rows.map((row, index) => {
      const title = row.cells[0]?.dataset.offerTitle || "";
      const scores = columns.map((column) => {
        const cell = row.cells[column];
        const text = cell ? cleanText(cell) : "";
        const score = text === "" ? NaN : Number(text);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
      });
      return { title, scores, color: COLORS[index] };
    });
    return offers.some((offer) => !offer.title || offer.scores.some((score) => score === null)) ? null : offers;
  }

  function svgNode(tag, attributes, text) {
    const node = document.createElementNS(SVG_NS, tag);
    Object.entries(attributes || {}).forEach(([name, value]) => node.setAttribute(name, String(value)));
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function position(index, score) {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / DIMENSIONS.length;
    const radius = RADIUS * score / 100;
    return {
      x: CENTER.x + Math.cos(angle) * radius,
      y: CENTER.y + Math.sin(angle) * radius
    };
  }

  function points(scores) {
    return scores.map((score, index) => {
      const point = position(index, score);
      return `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
    }).join(" ");
  }

  function shortCompany(title) {
    const company = title.split(/\s*[·•]\s*/)[0].trim() || title;
    const characters = Array.from(company);
    return characters.length > 12 ? `${characters.slice(0, 11).join("")}…` : company;
  }

  function makeChart(offers) {
    const root = document.createElement("div");
    root.className = "dimension-radar";
    root.dataset.dimensionRadar = "true";

    const svg = svgNode("svg", {
      class: "dimension-radar__svg",
      viewBox: "0 0 360 276",
      width: "360",
      height: "276",
      role: "img",
      "aria-labelledby": "dimension-radar-title dimension-radar-desc"
    });
    svg.appendChild(svgNode("title", { id: "dimension-radar-title" }, "Offer 六维得分对比"));
    const description = offers.map((offer) => `${offer.title}：${offer.scores.map((score, index) => `${DIMENSIONS[index].label} ${score} 分`).join("，")}`).join("；");
    svg.appendChild(svgNode("desc", { id: "dimension-radar-desc" }, `各维度范围为 0 到 100 分。${description}。`));

    const grid = svgNode("g", { class: "radar-grid", "aria-hidden": "true" });
    [20, 40, 60, 80, 100].forEach((score) => {
      grid.appendChild(svgNode("polygon", {
        class: "radar-grid__ring",
        points: points(DIMENSIONS.map(() => score)),
        fill: "none",
        stroke: "#e8edf2",
        "stroke-width": "1"
      }));
    });
    DIMENSIONS.forEach((dimension, index) => {
      const edge = position(index, 100);
      grid.appendChild(svgNode("line", {
        class: "radar-grid__axis",
        x1: CENTER.x,
        y1: CENTER.y,
        x2: edge.x,
        y2: edge.y,
        stroke: "#e8edf2",
        "stroke-width": "1"
      }));
      grid.appendChild(svgNode("text", {
        class: "radar-axis-label",
        x: LABELS[index].x,
        y: LABELS[index].y,
        "text-anchor": "middle",
        "font-size": "16",
        fill: "#667085"
      }, dimension.label));
    });
    [0, 20, 40, 60, 80, 100].forEach((score) => {
      grid.appendChild(svgNode("text", {
        class: "radar-scale-label",
        x: CENTER.x + 6,
        y: CENTER.y - RADIUS * score / 100 + 3,
        "font-size": "9",
        fill: "#a1abb8"
      }, score));
    });
    svg.appendChild(grid);

    const series = svgNode("g", { class: "radar-series-group", "aria-hidden": "true" });
    offers.forEach((offer, index) => {
      const polygon = svgNode("polygon", {
        class: "radar-series",
        "data-offer-index": index,
        points: points(offer.scores),
        fill: "none",
        stroke: offer.color,
        "stroke-width": index === 0 ? "2.25" : "1.75",
        "stroke-linejoin": "round"
      });
      polygon.style.setProperty("--radar-color", offer.color);
      series.appendChild(polygon);

      offer.scores.forEach((score, dimensionIndex) => {
        const point = position(dimensionIndex, score);
        const dot = svgNode("circle", {
          class: "radar-point",
          "data-offer-index": index,
          cx: point.x,
          cy: point.y,
          r: "2.6",
          fill: offer.color,
          stroke: "#ffffff",
          "stroke-width": "1"
        });
        dot.style.setProperty("--radar-color", offer.color);
        series.appendChild(dot);
      });
    });
    svg.appendChild(series);
    root.appendChild(svg);

    const legend = document.createElement("div");
    legend.className = "radar-legend";
    legend.setAttribute("role", "list");
    legend.setAttribute("aria-label", "Offer 图例");
    offers.forEach((offer, index) => {
      const item = document.createElement("span");
      item.className = "radar-legend__item";
      item.dataset.offerIndex = String(index);
      item.title = offer.title;
      item.setAttribute("role", "listitem");
      item.setAttribute("aria-label", offer.title);
      item.style.setProperty("--radar-color", offer.color);
      const dot = document.createElement("span");
      dot.className = "radar-legend__dot";
      dot.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.className = "radar-legend__label";
      label.textContent = shortCompany(offer.title);
      item.append(dot, label);
      legend.appendChild(item);
    });
    root.appendChild(legend);
    return root;
  }

  function init() {
    if (document.body.dataset.uiVariant !== "b") return;
    const wrapper = document.getElementById("dimensionTableWrapper");
    if (!wrapper) return;
    const scrollHint = wrapper.closest(".comparison-section")?.querySelector(".scroll-hint");
    let chart = null;
    let lastSignature = "";
    let pending = false;

    function render() {
      pending = false;
      const offers = readOffers(wrapper);
      const signature = JSON.stringify(offers);
      if (signature === lastSignature) return;
      lastSignature = signature;
      if (!offers) {
        if (chart) chart.remove();
        chart = null;
        return;
      }
      const nextChart = makeChart(offers);
      if (chart) chart.replaceWith(nextChart);
      else wrapper.before(nextChart);
      chart = nextChart;
      if (scrollHint) {
        const headingRow = scrollHint.closest('.section-title');
        wrapper.before(scrollHint);
        if (headingRow && !headingRow.textContent.trim()) headingRow.remove();
      }
    }

    render();
    new MutationObserver(() => {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(render);
    }).observe(wrapper, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
