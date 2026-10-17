(function () {
  const WIDTH = 750;
  const HEIGHT = 1000;

  function wrapText(ctx, text, maxWidth) {
    const chars = Array.from(text || "");
    const lines = [];
    let current = "";
    chars.forEach((ch) => {
      const test = current + ch;
      if (ctx.measureText(test).width > maxWidth && current.length > 0) {
        lines.push(current);
        current = ch;
      } else {
        current = test;
      }
    });
    if (current) {
      lines.push(current);
    }
    return lines;
  }

  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawRadar(ctx, centerX, centerY, radius, scores, labels) {
    const count = labels.length;
    const angleStep = (Math.PI * 2) / count;

    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.strokeStyle = "rgba(15, 23, 42, 0.1)";
    ctx.lineWidth = 1;
    for (let level = 1; level <= 4; level += 1) {
      const r = (radius * level) / 4;
      ctx.beginPath();
      for (let i = 0; i < count; i += 1) {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(15, 23, 42, 0.12)";
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + i * angleStep;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      ctx.stroke();
    }

    ctx.beginPath();
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + i * angleStep;
      const ratio = Math.max(0, Math.min(1, scores[i] / 100));
      const r = radius * ratio;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 113, 227, 0.2)";
    ctx.strokeStyle = "rgba(0, 113, 227, 0.9)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0071E3";
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + i * angleStep;
      const ratio = Math.max(0, Math.min(1, scores[i] / 100));
      const x = Math.cos(angle) * (radius * ratio);
      const y = Math.sin(angle) * (radius * ratio);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.font = "600 20px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI / 2 + i * angleStep;
      const labelX = Math.cos(angle) * (radius + 28);
      const labelY = Math.sin(angle) * (radius + 28);
      ctx.fillText(labels[i], labelX, labelY);
    }

    ctx.restore();
  }

  function buildPunchline(analysis, urgency) {
    if (!analysis || !analysis.topOffer) {
      return "";
    }
    if (urgency && urgency.level === "go") {
      return "可以冲，别再纠结";
    }
    if (urgency && urgency.level === "hold") {
      return "先问清再决定";
    }
    if (urgency && urgency.level === "rethink") {
      return "不是 Offer 的问题";
    }

    const weights = analysis.weights || {};
    const topPriority = Object.keys(weights).sort((left, right) => (weights[right] || 0) - (weights[left] || 0))[0];
    const priorityMap = {
      totalPackage: "总包是否值得，是这次选择的关键",
      growth: "你是来升级自己的，别被稳定感绑架",
      stability: "你需要的是结构化成长，不是冒险",
      workIntensity: "可持续的节奏，才能走得更远",
      cityLife: "工作机会也要和想要的生活相匹配",
      teamFit: "合适的领导和团队，会决定日常体验"
    };
    return priorityMap[topPriority] || "选它，是选你现阶段真正想要的";
  }

  function drawCard(options) {
    const { analysis, urgency, nickname } = options;
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext("2d");

    const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    gradient.addColorStop(0, "#F5F5F7");
    gradient.addColorStop(1, "#FFFFFF");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "#0071E3";
    ctx.font = "700 28px -apple-system, 'PingFang SC', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("OfferShow · Offer 选择工具", 56, 56);

    ctx.fillStyle = "rgba(15, 23, 42, 0.48)";
    ctx.font = "400 22px -apple-system, 'PingFang SC', sans-serif";
    ctx.textAlign = "right";
    const dateLabel = new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
    ctx.fillText(dateLabel, WIDTH - 56, 62);

    const topOffer = analysis.topOffer;
    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.font = "500 24px -apple-system, 'PingFang SC', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(nickname ? `${nickname} 的推荐` : "本轮最推荐", 56, 140);

    ctx.fillStyle = "#0F172A";
    ctx.font = "800 52px -apple-system, 'PingFang SC', sans-serif";
    const titleLines = wrapText(ctx, topOffer.label, WIDTH - 112);
    let titleY = 180;
    titleLines.slice(0, 2).forEach((line) => {
      ctx.fillText(line, 56, titleY);
      titleY += 64;
    });

    const scoreBoxY = titleY + 16;
    drawRoundedRect(ctx, 56, scoreBoxY, 280, 120, 20);
    ctx.fillStyle = "#0071E3";
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "500 22px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText("综合匹配度", 80, scoreBoxY + 22);
    ctx.font = "800 56px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText(`${topOffer.totalScore}`, 80, scoreBoxY + 54);
    ctx.font = "500 22px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText(" / 100", 176, scoreBoxY + 76);

    drawRoundedRect(ctx, 356, scoreBoxY, WIDTH - 56 - 356, 120, 20);
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "rgba(15, 23, 42, 0.08)";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.55)";
    ctx.font = "500 20px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText("预计年度总包", 380, scoreBoxY + 22);
    ctx.fillStyle = "#0F172A";
    ctx.font = "800 40px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText(`${topOffer.annualPackage || "--"} 万元`, 380, scoreBoxY + 58);

    const punchline = buildPunchline(analysis, urgency);
    const punchY = scoreBoxY + 160;
    drawRoundedRect(ctx, 56, punchY, WIDTH - 112, 96, 18);
    ctx.fillStyle = "#111827";
    ctx.fill();

    ctx.fillStyle = "#FCD34D";
    ctx.font = "700 22px -apple-system, 'PingFang SC', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("一句锐评", 80, punchY + 22);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "600 26px -apple-system, 'PingFang SC', sans-serif";
    const punchLines = wrapText(ctx, punchline, WIDTH - 160);
    let pY = punchY + 56;
    punchLines.slice(0, 1).forEach((line) => {
      ctx.fillText(line, 80, pY);
      pY += 32;
    });

    const radarY = punchY + 160;
    const dimensions = ["totalPackage", "stability", "growth", "workIntensity", "cityLife", "teamFit"];
    const dimLabels = ["总包", "稳定", "成长", "强度", "城市", "团队"];
    const scores = dimensions.map((key) => topOffer.dimensionScores[key] || 0);
    drawRadar(ctx, WIDTH / 2, radarY + 130, 130, scores, dimLabels);

    const footY = HEIGHT - 120;
    ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
    ctx.font = "500 22px -apple-system, 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    const secondOffer = analysis.secondOffer;
    if (secondOffer) {
      const gap = topOffer.totalScore - secondOffer.totalScore;
      const gapText = gap <= 0 ? "与第二名打平" : `领先第二名 ${gap} 分`;
      ctx.fillText(`${gapText} · 本轮比较了 ${analysis.scoredOffers.length} 份 Offer`, WIDTH / 2, footY);
    } else {
      ctx.fillText("本轮只有 1 份 Offer，建议加入对比项", WIDTH / 2, footY);
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    ctx.font = "500 20px -apple-system, 'PingFang SC', sans-serif";
    ctx.fillText("OfferShow · 用六维模型理清 Offer 选择", WIDTH / 2, footY + 44);

    return canvas;
  }

  function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("图片生成失败"));
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = filename || "offer-card.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 4000);
          resolve(blob);
        }, "image/png", 0.95);
      } catch (error) {
        reject(error);
      }
    });
  }

  window.OfferHelperShareCard = {
    drawCard,
    downloadCanvas
  };
})();
