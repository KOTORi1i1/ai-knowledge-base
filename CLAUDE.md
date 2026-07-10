# AI Knowledge Base — 项目开发指南

## 产品定位

**V1 → V2 转变**：从「资讯聚合器」（今天有什么）→「AI 研究助手」（今天什么值得看、为什么、和我有什么关系）

## 三个核心问题（所有功能围绕它设计）

1. 这条信息为什么重要？
2. 我应该花时间读吗？
3. 它会对 AI 技术发展产生什么影响？

## V2 功能优先级

### P0 — 必须最先做（核心竞争力）

- [ ] **AI 自动总结**：每条资讯/论文附一句话总结 + 推荐指数（★★★★★），这是整个产品最大的价值
- [ ] **今日 Top 3**：首页顶部精选 3 条，30 秒了解今天 AI 最重要的事
- [ ] **Daily Brief**：首页顶部卡片，包含今日头条、今日趋势、一句话总结

### P1 — 重要（提升浏览效率）

- [ ] **自动分类**：模型 / Agent / 工具 / 论文 / 教程 五大类，不用混在一起
- [ ] **搜索框放首页**：第一行就是搜索框，搜关键词直达
- [ ] **论文 AI 解读**：不说 Abstract，说创新点 / 解决问题 / 是否值得读 / 阅读时间

### P2 — 长期价值（后续迭代）

- [ ] **AI 工具数据库**：Claude Code、Cursor、Bolt 等，含介绍/官网/价格/教程/最近更新/替代产品
- [ ] **学习路线**：每天推荐一个主题，论文 → 教程 → GitHub 仓库
- [ ] **时间轴**：GPT/Claude/Gemini/DeepSeek/Qwen 每个模型的更新历史
- [ ] **HuggingFace Daily 精简**：每天只保留评分最高 3 篇，其余折叠

### P3 — 暂时不做

- [ ] RAG

## 实施阶段

### Phase 1（当前）：首页改版 + AI 总结 + 分类
1. 首页改版：搜索框 + Daily Brief + Top 3
2. AI 自动总结：接入免费 LLM API 生成一句话摘要 + 推荐指数
3. 自动分类：模型/Agent/工具/论文/教程 五大类

### Phase 2：论文增强 + 工具数据库
1. 论文 AI 解读页面
2. AI 工具数据库

### Phase 3：学习路线 + 时间轴
1. 每日学习推荐
2. 模型更新历史时间轴

## 技术约束

- 必须完全免费（GitHub Pages + 免费 API）
- 静态网站，不能有后端服务器
- 所有脚本运行在 GitHub Actions 中
- base 路径：`/ai-knowledge-base/`（所有 raw HTML href/src 必须手动加此前缀）
- Markdown 链接 VitePress 会自动处理 base，但 HTML 中的不会

## 关键文件

| 文件 | 用途 |
|------|------|
| `scripts/fetch-papers.mjs` | arXiv 论文抓取 + 质量评分 + 生成 md 文件 |
| `scripts/fetch-news.mjs` | RSS 资讯抓取 + 生成 md 文件 |
| `public/favorites.js` | 客户端收藏系统（localStorage） |
| `.vitepress/theme/index.js` | 自定义主题入口 |
| `.vitepress/config.mjs` | VitePress 配置（导航/侧边栏/base） |
| `.github/workflows/daily-update.yml` | 每日自动更新工作流 |
| `.github/workflows/deploy.yml` | 构建部署工作流 |

## 安全规则

- 每次 git push 后必须从 remote URL 中移除 PAT
- PAT 不能出现在任何提交的文件中
