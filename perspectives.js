(function () {
  const PERSPECTIVES = [
    { id: "ai", label: "AI 分析", emoji: "🤖", tone: "理性 · 数据" },
    { id: "parent", label: "爸妈视角", emoji: "👨‍👩‍👧", tone: "要稳 · 要近" },
    { id: "partner", label: "对象视角", emoji: "💞", tone: "要陪 · 要轻" },
    { id: "senior", label: "学长视角", emoji: "🎓", tone: "看 3 年后" },
    { id: "critic", label: "杠精视角", emoji: "🧨", tone: "挑毛病" }
  ];

  const CITY_HINTS = {
    no: "你只想留在本地",
    general: "你对异地态度中性",
    yes: "你愿意去新城市"
  };

  const STAGE_HINTS = {
    early: "这家公司还在拼速度，今天的稳定不代表明天",
    growth: "公司在上升期，坐上火箭的时间窗口就是这一两年",
    mature: "公司体量稳，但组织里有的是萝卜坑",
    unknown: "公司阶段信息缺失，得自己去打听"
  };

  function dim(analysis, key) {
    return analysis.topOffer.dimensionScores[key];
  }

  function label(key) {
    return window.OfferHelperCopy.getDimensionLabel(key);
  }

  const VERDICT_EMOJI = {
    "优势": "✅",
    "均衡": "⚖️",
    "劣势": "⚠️"
  };

  function formatDimensionPoint(item) {
    const emoji = VERDICT_EMOJI[item.verdict] || "•";
    const scorePart = Number.isFinite(item.score) ? ` ${item.score} 分` : "";
    const weightPart = Number.isFinite(item.weight) && item.weight > 0 ? ` · 权重 ${item.weight}%` : "";
    const head = `${emoji} 【${item.dimension}${scorePart}${weightPart}】${item.verdict || ""}`.trim();
    return `${head}：${item.reasoning}`;
  }

  function buildAiView(analysis, aiRecommendation) {
    if (aiRecommendation) {
      const dimensionPoints = Array.isArray(aiRecommendation.dimensionReasons)
        ? aiRecommendation.dimensionReasons.map(formatDimensionPoint)
        : [];

      let points;
      if (dimensionPoints.length > 0) {
        points = [...dimensionPoints];
        if (aiRecommendation.personalAdvantages && aiRecommendation.personalAdvantages.length > 0) {
          points.push(`🎯 【为什么特别适合你】${aiRecommendation.personalAdvantages[0]}`);
        }
        if (aiRecommendation.risksToValidate && aiRecommendation.risksToValidate.length > 0) {
          points.push(`🔍 【决策前再确认】${aiRecommendation.risksToValidate.join("；")}`);
        }
      } else {
        points = [
          ...(aiRecommendation.macroAdvantages || []),
          ...(aiRecommendation.personalAdvantages || [])
        ].slice(0, 4);
      }

      let summary = aiRecommendation.summary;
      if (aiRecommendation.confidence) {
        const confLabel = {
          high: "推荐置信度：高",
          medium: "推荐置信度：中",
          low: "推荐置信度：低，建议再多看一轮"
        }[aiRecommendation.confidence] || "";
        if (confLabel) {
          summary = `${summary}（${confLabel}）`;
        }
      }

      return {
        summary,
        points,
        source: aiRecommendation.source === "ai" ? "large-model" : "rule"
      };
    }
    return {
      summary: analysis.topSummary,
      points: analysis.reasons.slice(0, 4),
      source: "rule"
    };
  }

  function buildParentView(analysis) {
    const top = analysis.topOffer;
    const bal = dim(analysis, "balance");
    const sta = dim(analysis, "stability");
    const city = dim(analysis, "city");
    const prefs = analysis.preferences;

    const points = [];

    if (sta >= 70) {
      points.push(`${top.label} 在稳定性上拿到 ${sta} 分，爸妈一听「业务稳定、编制/合同清楚」基本就点头了。`);
    } else if (sta >= 50) {
      points.push(`稳定性 ${sta} 分——爸妈最担心的就是「干两年公司就黄了」，这个分数他们会反复追问你一句「这家公司能走多远」。`);
    } else {
      points.push(`稳定性只有 ${sta} 分，爸妈会直接劝你「稳一点，别折腾」。除非你能用其他理由说服他们，这轮家庭讨论大概率过不了。`);
    }

    if (bal >= 70) {
      points.push(`工作强度评分 ${bal}，算「像样的打工人」节奏，爸妈不会半夜担心你猝死。`);
    } else if (bal >= 50) {
      points.push(`工作强度 ${bal} 分，爸妈会问「晚上几点回家」「周末加不加班」「有没有时间回家吃饭」——最好自己先想好回答。`);
    } else {
      points.push(`工作强度只有 ${bal} 分，这在爸妈嘴里叫「拿命换钱」。他们不会支持，除非薪资高到能堵住他们的嘴。`);
    }

    if (city >= 80 || prefs.relocation === "no") {
      points.push(`城市这块 ${city} 分，离家近/符合预期，爸妈这一关基本就放行了。`);
    } else if (city >= 50) {
      points.push(`城市匹配 ${city} 分，爸妈会开始问「逢年过节能不能回来」「以后结婚了怎么办」这种长远问题。`);
    } else {
      points.push(`城市匹配只有 ${city} 分，在爸妈眼里这是「跑太远了」。准备一套「为什么非去不可」的话术，不然这顿饭吃不完。`);
    }

    return {
      summary: "爸妈关心的从来不是 KPI，是「稳定吗、累不累、离家远不远」这三件事。",
      points,
      source: "rule"
    };
  }

  function buildPartnerView(analysis) {
    const top = analysis.topOffer;
    const bal = dim(analysis, "balance");
    const city = dim(analysis, "city");
    const sal = dim(analysis, "salary");
    const prefs = analysis.preferences;

    const points = [];

    if (bal >= 70) {
      points.push(`${bal} 分的工作强度，基本意味着晚上还能陪伴、周末还能出门。这一条就够 TA 投一票了。`);
    } else if (bal >= 50) {
      points.push(`工作强度 ${bal} 分，下班时间不稳定。TA 嘴上不说，但心里会开始数「这周我们见了几次」。`);
    } else {
      points.push(`工作强度只有 ${bal} 分，这对一段关系是硬考验。你愿不愿意为这份 Offer 牺牲陪伴时间，得当面说清楚。`);
    }

    if (prefs.relocation === "no" && city < 60) {
      points.push(`你当初说过不想异地，可 ${top.label} 的城市匹配只有 ${city} 分。TA 现在不说什么，但会记一辈子。`);
    } else if (city < 50) {
      points.push(`城市匹配 ${city} 分，意味着这是一段「异地关系」起点。要么提前聊好节奏，要么做好阶段性独立生活的准备。`);
    } else {
      points.push(`城市匹配 ${city} 分，至少不用先在「在哪生活」上吵架，省下一大块情感成本。`);
    }

    if (sal >= 75) {
      points.push(`薪资 ${sal} 分算得上「有底气」。未来讨论买房、生娃这些大事时，你说话的声音会更稳。`);
    } else if (sal >= 55) {
      points.push(`薪资 ${sal} 分属于「够用但不轻松」。短期没问题，长期一旦涉及两个人合力承担的大开销，就需要提前算账。`);
    } else {
      points.push(`薪资只有 ${sal} 分，加上你在这份工作上的时间投入，TA 会忍不住想「这一切到底值不值得」。`);
    }

    return {
      summary: "对象最在意的不是你拿多少年包，是你晚上几点回家、周末还剩不剩自己。",
      points,
      source: "rule"
    };
  }

  function buildSeniorView(analysis) {
    const top = analysis.topOffer;
    const growth = dim(analysis, "growth");
    const sal = dim(analysis, "salary");
    const stage = top.businessStage || "unknown";

    const points = [];

    points.push(STAGE_HINTS[stage] || STAGE_HINTS.unknown);

    if (growth >= 75) {
      points.push(`成长空间 ${growth} 分——学长会直接说「这种位置别挑、去就是了，3 年后出来你履历就不一样」。`);
    } else if (growth >= 55) {
      points.push(`成长 ${growth} 分，不算天花板但也不是死水。关键看你接手的第一个项目有没有肉——入职前务必问清。`);
    } else {
      points.push(`成长只有 ${growth} 分，学长会警告你「这种岗位呆久了你会变成一颗螺丝钉，跳出来连自己会什么都说不清」。`);
    }

    if (sal < 60) {
      points.push(`薪资 ${sal} 分偏低。学长的逻辑是：现在每少拿的钱，三年后要用下一份 Offer 的议价权补回来。你扛得住这段成本吗？`);
    } else if (sal >= 80) {
      points.push(`薪资 ${sal} 分够高，但学长会提醒你：钱多有时候是风险溢价——要么活重，要么业务不稳。先搞清楚它属于哪种。`);
    } else {
      points.push(`薪资 ${sal} 分在同届里算中等偏上，不是筹码但也不拖后腿。下一步重点看谁带你、有没有 Mentor。`);
    }

    points.push(`如果这是你第一份工作，学长的最后一句话永远是——「跟对人，比进对公司更重要」。去问清楚你的直接 leader 是什么风格。`);

    return {
      summary: "学长看的是 3 年后这份工作能把你带到哪里，而不是今天年包涨了多少。",
      points: points.slice(0, 4),
      source: "rule"
    };
  }

  function buildCriticView(analysis) {
    const top = analysis.topOffer;
    const second = analysis.secondOffer;
    const scores = top.dimensionScores;

    const points = [];

    const gap = second ? top.totalScore - second.totalScore : 0;
    if (second && gap <= 5) {
      points.push(`所谓「推荐」只领先 ${gap} 分——这分差在数据噪声里都算不上显著。产品给你一个「最佳选择」，其实是在给你一个错觉。`);
    } else if (second && gap <= 12) {
      points.push(`领先 ${gap} 分听起来多，其实等价于你某一项主观打分手抖 1 档就翻盘。这结论没你想得那么稳。`);
    } else {
      points.push(`分数差很大？小心——大概率是你的权重过于集中，产品顺着你的偏见给出了「你最想听的答案」，不是「最对的答案」。`);
    }

    const weakest = Object.entries(scores).sort((left, right) => left[1] - right[1])[0];
    if (weakest) {
      points.push(`${label(weakest[0])}只有 ${weakest[1]} 分，你却能接受？一个维度低于 50 就是硬伤，别拿「整体不错」自欺欺人。`);
    }

    if (Number(top.gutFeeling) >= 4) {
      points.push(`你对它的直觉打了 ${top.gutFeeling} 分——直觉本身就是偏见的加速器。越是喜欢，越该去找拒绝的理由。`);
    } else {
      points.push(`你对它的直觉只有 ${top.gutFeeling} 分，连自己都没打动，却被算法推荐上来了？要么数据错了，要么你在骗自己。`);
    }

    points.push(`最诚实的问题是：如果把 offer 名字去掉，你还会选它吗？如果答案是「不一定」，那你选的是公司光环，不是这份工作。`);

    return {
      summary: "先别急着认可结论，这里至少有三个洞值得你戳一戳。",
      points: points.slice(0, 4),
      source: "rule"
    };
  }

  function mergeWithAiPerspective(ruleView, aiEntry) {
    if (!aiEntry) {
      return ruleView;
    }
    if (aiEntry.failed) {
      return {
        ...ruleView,
        fallbackNote: "AI 不可用，以下为本地规则版"
      };
    }
    if (Array.isArray(aiEntry.points) && aiEntry.points.length >= 2 && aiEntry.summary) {
      return {
        summary: aiEntry.summary,
        points: aiEntry.points,
        mood: aiEntry.mood || "中立",
        source: "large-model"
      };
    }
    return ruleView;
  }

  function buildAllViews(analysis, aiRecommendation, aiPerspectives) {
    const aiMap = aiPerspectives || {};
    return {
      ai: buildAiView(analysis, aiRecommendation),
      parent: mergeWithAiPerspective(buildParentView(analysis), aiMap.parent),
      partner: mergeWithAiPerspective(buildPartnerView(analysis), aiMap.partner),
      senior: mergeWithAiPerspective(buildSeniorView(analysis), aiMap.senior),
      critic: mergeWithAiPerspective(buildCriticView(analysis), aiMap.critic)
    };
  }

  window.OfferHelperPerspectives = {
    PERSPECTIVES,
    buildAllViews
  };
})();
