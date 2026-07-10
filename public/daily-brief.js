/**
 * 📋 Daily Brief 前端渲染器
 *
 * 功能：
 *   - 从 daily-brief.json 读取每日简报数据
 *   - 渲染今日头条卡片
 *   - 渲染 Top 3 必看推荐
 *   - 渲染分类统计
 *   - 加载失败时优雅降级
 */

(function () {
  'use strict';

  const BASE = (window.__VP_SITE_DATA__ && window.__VP_SITE_DATA__.base) || '/';

  // ============ 获取数据 ============

  async function fetchBrief() {
    try {
      const resp = await fetch(BASE + 'daily-brief.json', { cache: 'no-cache' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return await resp.json();
    } catch (err) {
      console.log('Daily Brief 数据暂不可用:', err.message);
      return null;
    }
  }

  // ============ 渲染函数 ============

  function renderStars(n) {
    if (n >= 4.5) return '★★★★★';
    if (n >= 3.5) return '★★★★☆';
    if (n >= 2.5) return '★★★☆☆';
    if (n >= 1.5) return '★★☆☆☆';
    return '★☆☆☆☆';
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderBrief(data) {
    const container = document.getElementById('daily-brief');
    if (!container) return;

    if (!data || !data.top3 || data.top3.length === 0) {
      container.innerHTML = `
        <div class="brief-card muted">
          <div class="brief-header">
            <span class="brief-title">📅 Daily Brief</span>
            <span class="brief-date">${data ? data.date : '---'}</span>
          </div>
          <div class="brief-empty">
            <p>📭 今天的简报还在生成中...</p>
            <p style="font-size:13px;color:var(--vp-c-text-3)">请稍后再来，或直接浏览 <a href="${BASE}papers/">论文</a> 和 <a href="${BASE}news/">资讯</a></p>
          </div>
        </div>`;
      return;
    }

    let html = '<div class="brief-card">';

    // --- 头部 ---
    html += `
      <div class="brief-header">
        <span class="brief-title">📅 Daily Brief</span>
        <span class="brief-date">${escapeHtml(data.date)}</span>
      </div>`;

    // --- 今日头条 ---
    if (data.headline) {
      html += `
        <div class="brief-headline">
          <div class="brief-label">🔥 今日头条</div>
          <a href="${escapeHtml(data.headline.link)}" target="_blank" class="brief-headline-title">${escapeHtml(data.headline.title)}</a>
          <div class="brief-headline-summary">${escapeHtml(data.headline.summary)}</div>
          <div class="brief-headline-why">→ <strong>为什么重要：</strong>${escapeHtml(data.headline.why)}</div>
          <div class="brief-headline-meta">
            <span>${escapeHtml(data.headline.source)}</span>
            <span class="brief-dot">·</span>
            <span>${escapeHtml(data.headline.category)}</span>
          </div>
        </div>`;
    }

    // --- 趋势 ---
    if (data.trend) {
      html += `
        <div class="brief-trend">
          <span class="brief-label">📈 今日趋势</span>
          <span class="brief-trend-text">${escapeHtml(data.trend)}</span>
        </div>`;
    }

    // --- Top 3 ---
    html += '<div class="brief-top3">';
    html += '<div class="brief-label">⭐ 今日必看 Top 3</div>';

    data.top3.forEach((item, i) => {
      html += `
        <a href="${escapeHtml(item.link)}" target="_blank" class="brief-top3-item">
          <span class="brief-top3-rank">${i + 1}</span>
          <div class="brief-top3-content">
            <div class="brief-top3-title">
              <span class="brief-top3-stars">${renderStars(item.stars)}</span>
              ${escapeHtml(item.title)}
            </div>
            <div class="brief-top3-summary">${escapeHtml(item.summary)}</div>
            <div class="brief-top3-meta">
              <span class="brief-tag">${escapeHtml(item.category)}</span>
              <span>${escapeHtml(item.source)}</span>
            </div>
          </div>
        </a>`;
    });

    html += '</div>';

    // --- 一句话 ---
    html += `
      <div class="brief-oneliner">
        💬 ${escapeHtml(data.oneLiner)}
      </div>`;

    // --- 分类统计 ---
    if (data.categories && Object.keys(data.categories).length > 0) {
      html += '<div class="brief-categories">';
      html += '<div class="brief-label">📊 今日分类统计</div>';
      html += '<div class="brief-cat-list">';

      const cats = Object.entries(data.categories).sort((a, b) => b[1].count - a[1].count);
      cats.forEach(([cid, info]) => {
        let catLink = BASE + 'papers/search';
        if (cid === 'agent') catLink = BASE + 'papers/search';
        if (cid === 'model') catLink = BASE + 'papers/tags/llm';
        if (cid === 'paper') catLink = BASE + 'papers/';
        if (cid === 'tool') catLink = BASE + 'skills/tools';
        if (cid === 'tutorial') catLink = BASE + 'news/';

        html += `
          <a href="${catLink}" class="brief-cat-item">
            <span class="brief-cat-icon">${escapeHtml(info.icon)}</span>
            <span class="brief-cat-name">${escapeHtml(info.name)}</span>
            <span class="brief-cat-count">${info.count} 条</span>
          </a>`;
      });

      html += '</div></div>';
    }

    // --- 页脚 ---
    html += `
      <div class="brief-footer">
        <span>📊 今日共 ${data.stats ? data.stats.total : '?'} 条资讯</span>
        <span class="brief-dot">·</span>
        <span>Top 3 平均 ${data.top3 ? renderStars(data.top3.reduce((s, i) => s + i.stars, 0) / data.top3.length) : '---'}</span>
      </div>`;

    html += '</div>';
    container.innerHTML = html;
  }

  // ============ 初始化 ============

  let rendered = false;

  async function init() {
    const container = document.getElementById('daily-brief');
    if (!container) return; // 不在首页，跳过

    const data = await fetchBrief();
    renderBrief(data);
    rendered = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // SPA 导航：VitePress 客户端路由切换时重新检查
  window.addEventListener('popstate', () => {
    setTimeout(() => {
      const container = document.getElementById('daily-brief');
      if (container && !rendered) {
        init();
      }
    }, 200);
  });

  // MutationObserver：监听 DOM 中 daily-brief 元素出现
  let observerTimer = null;
  const observer = new MutationObserver(() => {
    const container = document.getElementById('daily-brief');
    if (container && !rendered) {
      if (observerTimer) clearTimeout(observerTimer);
      observerTimer = setTimeout(() => init(), 150);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => observer.disconnect(), 8000); // 8 秒后停止观察
})();
