# OfferShow Offer 选择工具

一个纯前端、规则驱动的六维 Offer 比较工具。

## 当前能力

- 2 个校准问题模块：理想年度总包，以及首选/可接受城市；
- 首选城市、其他可接受城市和 Offer 城市均使用省—市级联选择；按城市编码匹配并阻止重复选择；
- 6 道五级基础题贡献最终权重的 50%；
- 2 道固定取舍题贡献最终权重的 50%；
- 问卷权重生成后可选择不调整，或用滑块微调；保存微调后直接按微调权重分析；
- 支持录入 2～6 份 Offer，除备注外全部为必填；
- 按六维计算单项分、加权贡献、综合分与稳定排名；
- 未知信息按 50 分处理并展示完整度；
- 直接意愿只用于结果对照，不影响排名；
- 结果可生成并下载 3:4 PNG 分享卡；
- 结果页提供“匿名发布其他 Offer”的小程序中间弹窗；当前仅完成 UI，尚未配置跳转；
- 本地 `localStorage` 持久化。

省市选择数据使用 [cn-division](https://github.com/kk-418/cn-division) 的 2026 省市数据（MIT License），其项目说明的数据来源为民政部地名信息服务平台。

## 三步流程

```text
偏好设置 → Offer 录入 → 评分结果
```

## 关键文件

- `OfferShow-UI确认版-20261015/`：最新确认的小程序 UI，包含 HTML、样式、图片和纯页面交互；
- `scoring.js`：唯一的六维权重、Offer 评分和排名算法源；
- `state.js`、`storage.js`、`copywriting.js`：原项目的核心状态、本地存储和维度文案模块；
- `OfferShow-UI确认版-20261015/scripts/core-algorithm-adapter.js`：新 UI 字段与原算法字段的适配层，不重复评分公式；
- `OfferShow-UI确认版-20261015/scripts/six-dim-v5.js`：新 UI 的表单校验、页面渲染和跳转逻辑；
- `ALGORITHM.md`：完整算法规范；
- `scoring.test.js`、`production-flow.test.js`：核心算法与正式流程自动化测试。

## 本地运行

项目为纯静态页面。推荐在新 UI 目录使用自带的启动脚本，它会以项目根目录为服务根路径，使新 UI 能加载原算法模块：

```bash
cd OfferShow-UI确认版-20261015
python3 启动预览.py
```

启动后按终端显示的 `/ui/index.html` 本地地址访问。这个不含中文目录名的预览入口既保留最新 UI 的全部资源，也能加载项目根目录的原算法模块。首次从首页点击“开始比较你的 Offer”时为空白数据，不会自动填充演示答案。

## 测试

```bash
node scoring.test.js
node production-flow.test.js
```

当前正式 UI 入口为 `OfferShow-UI确认版-20261015/index.html`；根目录算法模块由新 UI 通过适配层调用。
