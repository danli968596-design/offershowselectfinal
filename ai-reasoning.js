(function () {
  const DIMENSION_KEYS = ["salary", "growth", "stability", "balance", "city"];

  function getDefaultConfig() {
    return {
      endpoint: "https://api.deepseek.com/v1/chat/completions",
      apiKey: "",
      model: "deepseek-chat"
    };
  }

  function normalizeConfig(config) {
    return {
      ...getDefaultConfig(),
      ...(config || {})
    };
  }

  function isConfigured(config) {
    const nextConfig = normalizeConfig(config || window.OfferHelperStorage.loadAiConfig());
    return Boolean(nextConfig.endpoint && nextConfig.apiKey && nextConfig.model);
  }

  function promptForConfig(existingConfig) {
    const currentConfig = normalizeConfig(existingConfig || window.OfferHelperStorage.loadAiConfig());
    const endpoint = window.prompt("请输入 OpenAI 兼容接口地址：", currentConfig.endpoint);
    if (endpoint === null) {
      return null;
    }

    const apiKey = window.prompt("请输入 API Key：", currentConfig.apiKey);
    if (apiKey === null) {
      return null;
    }

    const model = window.prompt("请输入模型名：", currentConfig.model);
    if (model === null) {
      return null;
    }

    const nextConfig = normalizeConfig({
      endpoint: endpoint.trim(),
      apiKey: apiKey.trim(),
      model: model.trim()
    });

    if (!isConfigured(nextConfig)) {
      throw new Error("AI 配置不完整，请至少填写接口地址、API Key 和模型名。");
    }

    window.OfferHelperStorage.saveAiConfig(nextConfig);
    return nextConfig;
  }

  const SCHEDULE_LABELS = {
    unknown: "暂不清楚",
    flexible: "弹性制",
    "five-day": "双休",
    "995": "995",
    "996": "996"
  };

  const OVERTIME_LABELS = {
    unknown: "暂不清楚",
    low: "低",
    medium: "中",
    high: "高"
  };

  const BUSINESS_STAGE_LABELS = {
    unknown: "暂不清楚",
    early: "早期",
    growth: "增长期",
    mature: "成熟期"
  };

  function buildWeightedBreakdownPayload(offer) {
    return offer.weightedBreakdown.map((item) => ({
      key: item.key,
      dimension: window.OfferHelperCopy.getDimensionLabel(item.key),
      score: item.score,
      weight: item.weight,
      weightedScore: item.weightedScore
    }));
  }

  function buildOfferPageSnapshot(offer) {
    return {
      label: offer.label,
      company: (offer.company || "").trim(),
      role: (offer.role || "").trim(),
      city: (offer.city || "").trim(),
      monthlySalary: offer.monthlySalary,
      bonusMonths: offer.bonusMonths,
      annualPackageK: offer.annualPackage,
      schedule: offer.schedule,
      scheduleLabel: SCHEDULE_LABELS[offer.schedule] || String(offer.schedule || ""),
      overtimeLevel: offer.overtimeLevel,
      overtimeLevelLabel: OVERTIME_LABELS[offer.overtimeLevel] || String(offer.overtimeLevel || ""),
      businessStage: offer.businessStage,
      businessStageLabel: BUSINESS_STAGE_LABELS[offer.businessStage] || String(offer.businessStage || ""),
      growthSelfScore: offer.growthScore,
      stabilitySelfScore: offer.stabilityScore,
      gutFeeling: offer.gutFeeling,
      notes: offer.notes || "",
      totalScore: offer.totalScore,
      dimensionScores: offer.dimensionScores,
      weightedBreakdown: buildWeightedBreakdownPayload(offer)
    };
  }

  function buildPayload(analysis) {
    const focusDimensions = Object.entries(analysis.weights)
      .sort((left, right) => right[1] - left[1])
      .map(([key, value]) => ({
        key,
        dimension: window.OfferHelperCopy.getDimensionLabel(key),
        weight: value
      }));

    const weightsLabeled = Object.entries(analysis.weights).map(([key, value]) => ({
      key,
      dimension: window.OfferHelperCopy.getDimensionLabel(key),
      weightPercent: value
    }));

    const prefs = analysis.preferences || {};
    const preferenceLabels = window.OfferHelperCopy.getPreferenceLabels
      ? window.OfferHelperCopy.getPreferenceLabels(prefs)
      : {};

    return {
      preferences: {
        ...prefs,
        labels: preferenceLabels
      },
      weights: analysis.weights,
      weightsLabeled,
      focusDimensions,
      topOffer: buildOfferPageSnapshot(analysis.topOffer),
      secondOffer: analysis.secondOffer ? buildOfferPageSnapshot(analysis.secondOffer) : null,
      scoredOffers: analysis.scoredOffers.map((offer) => buildOfferPageSnapshot(offer)),
      topSummary: analysis.topSummary,
      risks: analysis.risks,
      questions: analysis.questions
    };
  }

  function buildSystemPrompt() {
    return [
      "# 角色",
      "你是一位资深的求职 Offer 决策顾问，面向中文求职者，风格专业、克制、有观点，不和稀泥。",
      "",
      "# 任务",
      "基于用户提供的结构化数据（偏好画像含中文标签、五维权重、各 Offer 在页面表单中填写的**完整原始字段**、系统算出的五维分数与加权明细、备注与风险追问），帮助 TA：",
      "1. 明确指出**当前最合适的那份 Offer** 是哪一个；",
      "2. 按「薪资回报 / 成长空间 / 稳定性 / 生活平衡 / 城市匹配」**五个维度**逐项给出推荐理由；",
      "3. 从「候选对比层面」和「用户个人适配层面」两个角度再分别提炼 3 条宏观/个人化优势（见下方「优势段落」硬性要求）；",
      "4. 标注这份推荐的置信度，以及决策前最值得再确认的 1-3 个关键信息。",
      "",
      "# 优势段落（macroAdvantages / personalAdvantages）硬性要求",
      "- **macroAdvantages**：必须显式结合多份 Offer 的**页面原始字段**做对比（例如公司/岗位/城市、月薪与年终奖月数推成的年包、作息 scheduleLabel、加班 overtimeLevelLabel、业务阶段 businessStageLabel、成长与稳定自评分、直觉分、备注 notes）。不要只复述五维分数；若某字段用户未填（如 schedule 为暂不清楚），要承认信息缺口而不是编造。",
      "- **personalAdvantages**：必须显式引用 `preferences.labels`（阶段、最优先维度、加班容忍、迁移意愿、最大顾虑）以及 `preferredCity`，说明为何当前推荐与用户画像一致或存在张力。若 `preferences.labels.mbti` 不是 unknown 且 `mbtiLabel` 不是「未填写」，可在 1 条个人化优势中**适度**结合该性格自测（避免刻板印象长篇展开）。",
      "",
      "# 核心原则（必须严格遵守）",
      "- **只基于输入数据**：不得编造公司背景、行业前景、团队状况、薪资市场数据。若输入里没有，就明确说「信息不足」或用「你的备注里提到…」来引用。",
      "- **观点要具体、有数字**：每条理由尽量引用维度分数、权重、两家差值、年包数字等。避免「比较不错」「整体均衡」这类空话。",
      "- **优劣势都要说**：如果推荐 Offer 在某个维度其实是劣势或均衡（不是优势），也必须如实标注 `verdict: 均衡` 或 `劣势`，并解释为什么整体仍然推荐它。**不要全部写成优势。**",
      "- **贴合用户权重**：当某维度权重高（≥25%），它的推荐理由必须更详细、更靠前；权重低（≤15%）时可以简短。",
      "- **语气专业但有温度**：像资深学长在咖啡馆给你分析，不是管理咨询报告。避免使用「该候选人」「综合得分」这种官样措辞。",
      "- **严格输出 JSON**：不得使用 Markdown、不得输出任何 JSON 外的解释文字、不得使用 ```json``` 代码块包裹。",
      "",
      "# 输出 JSON 结构",
      "{",
      '  "recommendedOffer": "<推荐 Offer 的 label，必须与输入中的 topOffer.label 完全一致>",',
      '  "confidence": "<high | medium | low>",',
      '  "summary": "<2-3 句结论摘要，明确为什么推 TA，而非别家>",',
      '  "dimensionReasons": [',
      '    {',
      '      "dimension": "薪资回报",',
      '      "dimensionKey": "salary",',
      '      "verdict": "<优势 | 均衡 | 劣势>",',
      '      "score": <该维度分数 0-100>,',
      '      "weight": <该维度权重 0-100>,',
      '      "reasoning": "<1-2 句，基于数据说清楚为什么是这个判断>"',
      '    },',
      '    { "dimension": "成长空间", "dimensionKey": "growth", ... },',
      '    { "dimension": "稳定性", "dimensionKey": "stability", ... },',
      '    { "dimension": "生活平衡", "dimensionKey": "balance", ... },',
      '    { "dimension": "城市匹配", "dimensionKey": "city", ... }',
      '  ],',
      '  "macroAdvantages": ["<3 条，必须引用多份 Offer 的页面字段（公司/岗位/城市/作息/加班/阶段/自评/备注等）与加权结果做对比，说明推荐赢在何处>"],',
      '  "personalAdvantages": ["<3 条，必须引用 preferences.labels 与 ideal 城市等，说明与用户画像的匹配或冲突>"],',
      '  "risksToValidate": ["<1-3 条，决策前最值得向 HR/前员工/朋友再确认的具体信息点>"]',
      "}",
      "",
      "# 置信度判定",
      "- `high`：推荐 Offer 与第二名差 ≥15 分，且在最高权重维度上明显领先；",
      "- `medium`：差 5-15 分，或在高权重维度上与第二名接近；",
      "- `low`：差 <5 分，或推荐依据高度依赖用户主观直觉/备注。",
      "",
      "# 五维度分析顺序",
      "按用户的 focusDimensions 权重从高到低排列 dimensionReasons 数组（最在意的排第一）。"
    ].join("\n");
  }

  function buildMessages(analysis) {
    const payload = buildPayload(analysis);
    const userContent = [
      "以下是用户本轮决策的完整结构化数据，请按系统指令输出 JSON：",
      "",
      "```json",
      JSON.stringify(payload, null, 2),
      "```"
    ].join("\n");

    return [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: userContent }
    ];
  }

  function extractContent(responseJson) {
    return responseJson
      && responseJson.choices
      && responseJson.choices[0]
      && responseJson.choices[0].message
      && responseJson.choices[0].message.content
      ? String(responseJson.choices[0].message.content).trim()
      : "";
  }

  function extractJsonString(content) {
    if (!content) {
      throw new Error("模型没有返回内容。");
    }

    const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/```\s*([\s\S]*?)```/i);
    if (fencedMatch) {
      return fencedMatch[1].trim();
    }

    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return content.slice(start, end + 1);
    }

    return content;
  }

  function normalizeDimensionReasons(rawList) {
    if (!Array.isArray(rawList)) {
      return [];
    }
    return rawList
      .map((item) => {
        if (!item || typeof item !== "object") {
          return null;
        }
        const dimension = typeof item.dimension === "string" ? item.dimension.trim() : "";
        const dimensionKey = typeof item.dimensionKey === "string" ? item.dimensionKey.trim() : "";
        const verdict = typeof item.verdict === "string" ? item.verdict.trim() : "";
        const reasoning = typeof item.reasoning === "string" ? item.reasoning.trim() : "";
        const score = Number.isFinite(Number(item.score)) ? Number(item.score) : null;
        const weight = Number.isFinite(Number(item.weight)) ? Number(item.weight) : null;
        if (!dimension || !reasoning) {
          return null;
        }
        return { dimension, dimensionKey, verdict, score, weight, reasoning };
      })
      .filter(Boolean);
  }

  function normalizeReasoning(result) {
    if (!result || typeof result !== "object") {
      throw new Error("模型返回格式无效。");
    }

    const summary = typeof result.summary === "string" ? result.summary.trim() : "";
    const macroAdvantages = Array.isArray(result.macroAdvantages)
      ? result.macroAdvantages.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const personalAdvantages = Array.isArray(result.personalAdvantages)
      ? result.personalAdvantages.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const dimensionReasons = normalizeDimensionReasons(result.dimensionReasons);
    const risksToValidate = Array.isArray(result.risksToValidate)
      ? result.risksToValidate.map((item) => String(item).trim()).filter(Boolean)
      : [];
    const recommendedOffer = typeof result.recommendedOffer === "string" ? result.recommendedOffer.trim() : "";
    const confidence = typeof result.confidence === "string" ? result.confidence.trim().toLowerCase() : "";

    if (!summary) {
      throw new Error("模型返回缺少 summary 字段。");
    }
    if (dimensionReasons.length === 0 && macroAdvantages.length === 0 && personalAdvantages.length === 0) {
      throw new Error("模型返回缺少任何推荐理由，无法展示。");
    }

    return {
      recommendedOffer,
      confidence,
      summary,
      dimensionReasons,
      macroAdvantages,
      personalAdvantages,
      risksToValidate,
      source: "ai"
    };
  }

  async function generateRecommendation(analysis, config) {
    const nextConfig = normalizeConfig(config || window.OfferHelperStorage.loadAiConfig());
    if (!isConfigured(nextConfig)) {
      throw new Error("尚未配置 AI 接口。");
    }

    const response = await fetch(nextConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nextConfig.apiKey}`
      },
      body: JSON.stringify({
        model: nextConfig.model,
        temperature: 0.5,
        messages: buildMessages(analysis),
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI 请求失败（${response.status}）：${errorText.slice(0, 200)}`);
    }

    const responseJson = await response.json();
    const content = extractContent(responseJson);
    const parsed = JSON.parse(extractJsonString(content));
    return normalizeReasoning(parsed);
  }

  function ensureDefaultConfig() {
    const existing = window.OfferHelperStorage.loadAiConfig();
    const defaults = getDefaultConfig();
    if (!existing) {
      window.OfferHelperStorage.saveAiConfig(defaults);
      return defaults;
    }

    const usingLegacyOpenAi = typeof existing.endpoint === "string"
      && existing.endpoint.includes("api.openai.com");
    const missingKey = !existing.apiKey || !String(existing.apiKey).trim();

    if (usingLegacyOpenAi || missingKey) {
      const merged = { ...existing, ...defaults };
      window.OfferHelperStorage.saveAiConfig(merged);
      return merged;
    }

    return existing;
  }

  window.OfferHelperAI = {
    getDefaultConfig,
    normalizeConfig,
    isConfigured,
    promptForConfig,
    generateRecommendation,
    ensureDefaultConfig,
    buildPayload,
    extractContent,
    extractJsonString,
    DIMENSION_KEYS
  };

  if (window.OfferHelperStorage && typeof window.OfferHelperStorage.loadAiConfig === "function") {
    ensureDefaultConfig();
  }
})();
