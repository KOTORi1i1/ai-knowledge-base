---
layout: home

hero:
  name: "AI Knowledge Base"
  text: "AI 研究助手"
  tagline: 每天 30 秒，了解 AI 最重要的事
  actions:
    - theme: brand
      text: 📄 浏览论文
      link: /papers/
    - theme: alt
      text: 🔍 搜索
      link: /papers/search
    - theme: alt
      text: 🧩 Skills
      link: /skills/

features:
  - icon: ⭐
    title: Daily Brief
    details: 每天 30 秒读懂 AI 大事件，AI 自动筛选 + 一句话总结今日趋势
    link: /papers/
  - icon: 🤖
    title: 智能分类
    details: 自动归类：模型 · Agent · 工具 · 论文 · 教程，快速找到想看的内容
    link: /papers/search
  - icon: 🔬
    title: 论文追踪
    details: arXiv 最新论文，AI 解读创新点 + 是否值得读 + 阅读时间
    link: /papers/
  - icon: 📰
    title: 行业动态
    details: 多源 AI 资讯聚合，自动分类排序，重要资讯不沉底
    link: /news/
  - icon: 🧩
    title: Skills 推荐
    details: Claude Code、MCP 服务器、AI 工具精选推荐
    link: /skills/
  - icon: 🛠
    title: 工具数据库
    details: AI 工具大全：介绍、价格、教程、替代品（即将上线）
    link: /skills/tools
  - icon: ⭐
    title: 论文收藏
    details: 一键收藏感兴趣的论文，浏览器本地存储，支持导出备份
    link: /papers/favorites
  - icon: 🔥
    title: 每周精选
    details: 本周最热论文 + 趋势分析，不再错过重要研究
    link: /papers/weekly
---

<!-- ====== Daily Brief 每日简报 ====== -->
<div id="daily-brief">
  <div class="brief-card brief-skeleton-card">
    <div class="brief-header">
      <span class="brief-title">📅 Daily Brief</span>
      <span class="brief-date">加载中...</span>
    </div>
    <div class="brief-skeleton">
      <div class="skeleton-line short"></div>
      <div class="skeleton-line"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line short"></div>
    </div>
  </div>
</div>

<!-- ====== 分类浏览 ====== -->
<div class="home-section">
  <h2>📂 按分类浏览</h2>
  <div class="home-cat-grid">
    <a href="/ai-knowledge-base/papers/tags/llm" class="home-cat-card">
      <span class="home-cat-icon">🧠</span>
      <span class="home-cat-label">大语言模型</span>
      <span class="home-cat-desc">LLM / GPT / Claude</span>
    </a>
    <a href="/ai-knowledge-base/papers/tags/cv" class="home-cat-card">
      <span class="home-cat-icon">👁️</span>
      <span class="home-cat-label">计算机视觉</span>
      <span class="home-cat-desc">CV / 图像 / 视频</span>
    </a>
    <a href="/ai-knowledge-base/papers/tags/nlp" class="home-cat-card">
      <span class="home-cat-icon">📝</span>
      <span class="home-cat-label">自然语言处理</span>
      <span class="home-cat-desc">NLP / 文本 / 翻译</span>
    </a>
    <a href="/ai-knowledge-base/papers/tags/rl" class="home-cat-card">
      <span class="home-cat-icon">🎮</span>
      <span class="home-cat-label">强化学习</span>
      <span class="home-cat-desc">RL / 决策 / 控制</span>
    </a>
    <a href="/ai-knowledge-base/papers/tags/multimodal" class="home-cat-card">
      <span class="home-cat-icon">🔗</span>
      <span class="home-cat-label">多模态</span>
      <span class="home-cat-desc">视觉-语言 / 音频</span>
    </a>
    <a href="/ai-knowledge-base/papers/tags/safety" class="home-cat-card">
      <span class="home-cat-icon">🛡️</span>
      <span class="home-cat-label">AI 安全</span>
      <span class="home-cat-desc">对齐 / 安全 / 隐私</span>
    </a>
    <a href="/ai-knowledge-base/papers/tags/generative" class="home-cat-card">
      <span class="home-cat-icon">🎨</span>
      <span class="home-cat-label">生成式 AI</span>
      <span class="home-cat-desc">图像生成 / 视频生成</span>
    </a>
    <a href="/ai-knowledge-base/news/" class="home-cat-card">
      <span class="home-cat-icon">📰</span>
      <span class="home-cat-label">AI 资讯</span>
      <span class="home-cat-desc">行业动态 / 新闻</span>
    </a>
  </div>
</div>

<!-- ====== 快捷入口 ====== -->
<div class="home-section">
  <h2>🔗 快捷入口</h2>
  <div class="home-quick-links">
    <a href="/ai-knowledge-base/papers/weekly" class="home-quick-card">
      <span class="home-quick-icon">🔥</span>
      <span class="home-quick-text">本周热门</span>
    </a>
    <a href="/ai-knowledge-base/papers/search" class="home-quick-card">
      <span class="home-quick-icon">🔍</span>
      <span class="home-quick-text">论文搜索</span>
    </a>
    <a href="/ai-knowledge-base/papers/favorites" class="home-quick-card">
      <span class="home-quick-icon">⭐</span>
      <span class="home-quick-text">我的收藏</span>
    </a>
    <a href="/ai-knowledge-base/skills/" class="home-quick-card">
      <span class="home-quick-icon">🧩</span>
      <span class="home-quick-text">Skills</span>
    </a>
  </div>
</div>
