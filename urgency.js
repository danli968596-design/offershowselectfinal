(function () {
  function getWeakestDimension(topOffer) {
    if (!topOffer || !topOffer.dimensionScores) {
      return null;
    }
    return Object.entries(topOffer.dimensionScores)
      .sort((left, right) => left[1] - right[1])[0];
  }

  function getTopDimension(topOffer) {
    if (!topOffer || !topOffer.dimensionScores) {
      return null;
    }
    return Object.entries(topOffer.dimensionScores)
      .sort((left, right) => right[1] - left[1])[0];
  }

  function buildUrgency(analysis) {
    if (!analysis || !analysis.topOffer) {
      return null;
    }

    const top = analysis.topOffer;
    const second = analysis.secondOffer;
    const gap = second ? top.totalScore - second.totalScore : top.totalScore;

    if (!second) {
      const strongest = getTopDimension(top);
      const strongestLabel = strongest
        ? window.OfferHelperCopy.getDimensionLabel(strongest[0])
        : "核心维度";
      return {
        level: "single",
        gap: 0,
        headline: "只有一份 Offer，先别着急拍板",
        punchline: "把它放进你的画像里，看它到底配不配得上你现阶段的野心",
        copy: `它的最强项是${strongestLabel}（${strongest ? strongest[1] : "-"} 分）。如果这一项恰好不是你最在意的，那这份 Offer 就只是「勉强能接」，不是「非它不可」。`,
        action: "去录入对比 Offer",
        tone: "neutral"
      };
    }

    if (gap >= 15) {
      return {
        level: "go",
        gap,
        headline: "可以冲，别再纠结",
        punchline: `${top.label} 领先 ${second.label} ${gap} 分，差距已经是肉眼可见`,
        copy: "继续比较的边际收益很低了。把时间花在跟 HR 确认细节、谈薪资包上，比你再翻来覆去做决定更值。",
        action: "直接去追问细节",
        tone: "go"
      };
    }

    if (gap >= 5) {
      const weakest = getWeakestDimension(top);
      const weakestLabel = weakest
        ? window.OfferHelperCopy.getDimensionLabel(weakest[0])
        : "关键维度";
      return {
        level: "hold",
        gap,
        headline: `先去问清${weakestLabel}，再决定`,
        punchline: `${top.label} 暂时领先 ${gap} 分，但${weakestLabel}只拿到 ${weakest ? weakest[1] : "-"} 分`,
        copy: `差距不小但不绝对。如果补上${weakestLabel}这块信息后，它还能领先 5 分以上，你就可以放心冲；否则得重新掂量。`,
        action: "生成追问清单",
        tone: "hold"
      };
    }

    const topDim = Object.entries(analysis.weights)
      .sort((left, right) => right[1] - left[1])[0];
    const topDimLabel = topDim ? window.OfferHelperCopy.getDimensionLabel(topDim[0]) : "你的偏好";

    return {
      level: "rethink",
      gap,
      headline: "这不是选 Offer 的问题，是你还没想清楚自己",
      punchline: `两家只差 ${gap} 分，相当于抛硬币`,
      copy: `当前两份 Offer 打平意味着你的权重分布还不够「有棱角」。回去把${topDimLabel}再拉高一档，或者换一个最在意的维度，结果就会出来。`,
      action: "回去重做偏好画像",
      tone: "rethink"
    };
  }

  window.OfferHelperUrgency = {
    buildUrgency
  };
})();
