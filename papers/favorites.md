---
layout: page
---

# ⭐ 我的收藏

> 已收藏的论文列表。数据保存在浏览器本地存储中，不会丢失。

---

<div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap">
  <button onclick="window.__fav_import()" style="padding:8px 18px;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg-soft);color:var(--vp-c-text-1);cursor:pointer;font-size:14px;font-weight:600">📥 导入备份</button>
  <a href="/papers/" style="padding:8px 18px;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg-soft);color:var(--vp-c-text-1);text-decoration:none;font-size:14px;font-weight:600">📄 浏览论文</a>
  <a href="/papers/search" style="padding:8px 18px;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg-soft);color:var(--vp-c-text-1);text-decoration:none;font-size:14px;font-weight:600">🔍 搜索论文</a>
</div>

---

<div id="favorites-list">
  <p style="text-align:center;color:var(--vp-c-text-3);padding:40px">加载中...</p>
</div>

---

## 💡 使用说明

| 操作 | 方法 |
|------|------|
| **收藏论文** | 在论文列表或详情页点击 ⭐ / ☆ 按钮 |
| **取消收藏** | 再次点击已收藏的 ⭐ 按钮 |
| **导出备份** | 点击上方"📥 导入备份"旁的导出按钮（在收藏列表右上角） |
| **导入备份** | 点击上方"📥 导入备份"按钮，选择之前导出的 JSON 文件 |
| **清空收藏** | 在收藏列表右上角点击"🗑️ 清空" |

> ⚠️ 收藏数据存储在浏览器的 **localStorage** 中。清除浏览器数据会导致收藏丢失，建议定期导出备份。
