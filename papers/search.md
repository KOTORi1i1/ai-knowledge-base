---
layout: page
---

<link href="/pagefind/pagefind-ui.css" rel="stylesheet">

# 🔍 论文搜索

> 支持中英文全文搜索。输入关键词即可搜索论文标题、摘要和作者。

---

## 🔎 全文搜索

<div id="search"></div>

<script>
(function(){
  if(typeof document==="undefined")return;
  var s=document.createElement("script");
  s.src="/pagefind/pagefind-ui.js";
  s.onload=function(){
    new PagefindUI({
      element: "#search",
      showSubResults: false,
      showImages: false,
      translations: {
        placeholder: "搜索论文标题、摘要、作者...",
        clear_search: "清空",
        load_more: "加载更多",
        search_label: "搜索此网站",
        zero_results: "未找到匹配的论文，请尝试其他关键词"
      }
    });
  };
  document.head.appendChild(s);
})();
</script>

> 💡 **提示**：也可以按 `Ctrl+K`（Mac: `Cmd+K`）使用 VitePress 内置搜索。

---

## 📊 数据库统计

| 指标 | 数值 |
|------|------|
| 📄 论文总数 | **160** 篇 |
| 📅 收录天数 | **2** 天 |
| 🏷️ 覆盖领域 | **9** 个 |

---

## 🏷️ 按领域浏览

<div class="category-grid">
<a href="/papers/tags/llm" class="category-card">
<div class="category-icon">🧠</div>
<div class="category-title">大语言模型</div>
<div class="category-desc">118 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
<a href="/papers/tags/cv" class="category-card">
<div class="category-icon">👁️</div>
<div class="category-title">计算机视觉</div>
<div class="category-desc">66 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
<a href="/papers/tags/nlp" class="category-card">
<div class="category-icon">📝</div>
<div class="category-title">自然语言处理</div>
<div class="category-desc">87 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
<a href="/papers/tags/rl" class="category-card">
<div class="category-icon">🎮</div>
<div class="category-title">强化学习</div>
<div class="category-desc">85 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
<a href="/papers/tags/multimodal" class="category-card">
<div class="category-icon">🔗</div>
<div class="category-title">多模态</div>
<div class="category-desc">29 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
<a href="/papers/tags/gnn" class="category-card">
<div class="category-icon">🕸️</div>
<div class="category-title">图神经网络</div>
<div class="category-desc">63 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
<a href="/papers/tags/efficient" class="category-card">
<div class="category-icon">⚡</div>
<div class="category-title">高效模型</div>
<div class="category-desc">39 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
<a href="/papers/tags/safety" class="category-card">
<div class="category-icon">🛡️</div>
<div class="category-title">AI安全与对齐</div>
<div class="category-desc">53 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
<a href="/papers/tags/generative" class="category-card">
<div class="category-icon">🎨</div>
<div class="category-title">生成式AI</div>
<div class="category-desc">46 篇论文</div>
<div class="category-count">浏览 →</div>
</a>
</div>