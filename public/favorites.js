/**
 * 📑 论文收藏系统 — 基于 localStorage 的轻量书签功能
 *
 * 功能：
 *   - ⭐ 收藏/取消收藏论文
 *   - 📋 查看收藏列表（favorites 页面自动渲染）
 *   - 📊 显示收藏数量
 *   - 🔄 导出/导入收藏数据（备份恢复）
 *
 * 数据存储格式 (localStorage key: 'ai-kb-favorites')：
 *   [{id, title, authors, link, date, domain, stars, savedAt}, ...]
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'ai-kb-favorites';
  const MAX_FAVORITES = 200;

  // ============ 核心 API ============

  function getAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  function save(favs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs.slice(0, MAX_FAVORITES)));
  }

  function isBookmarked(id) {
    return getAll().some(f => f.id === id);
  }

  function add(paper) {
    const favs = getAll();
    if (favs.some(f => f.id === paper.id)) return false; // 已存在
    favs.unshift({
      id: paper.id,
      title: paper.title || '',
      authors: paper.authors || '',
      link: paper.link || '',
      date: paper.date || '',
      domain: paper.domain || '',
      stars: paper.stars || '',
      savedAt: new Date().toISOString(),
    });
    save(favs);
    return true;
  }

  function remove(id) {
    const favs = getAll().filter(f => f.id !== id);
    save(favs);
    return favs.length;
  }

  function toggle(paper) {
    if (isBookmarked(paper.id)) {
      remove(paper.id);
      return false; // 已取消收藏
    } else {
      add(paper);
      return true; // 已收藏
    }
  }

  function count() {
    return getAll().length;
  }

  // ============ UI 渲染 ============

  /**
   * 在页面上渲染收藏列表（用于 favorites 页面）
   */
  function renderList(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const favs = getAll();

    if (favs.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:60px 20px">
          <div style="font-size:64px;margin-bottom:16px">📭</div>
          <h3>还没有收藏任何论文</h3>
          <p style="color:var(--vp-c-text-2)">浏览论文时点击 ⭐ 即可收藏</p>
          <a href="/papers/" style="display:inline-block;margin-top:16px;padding:10px 24px;background:var(--vp-c-brand);color:white;border-radius:8px;text-decoration:none;font-weight:600">📄 浏览论文</a>
        </div>`;
      return;
    }

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="color:var(--vp-c-text-2);font-size:14px">共 <strong>${favs.length}</strong> 篇收藏</span>
        <div style="display:flex;gap:8px">
          <button onclick="window.__fav_export()" style="padding:6px 14px;border:1px solid var(--vp-c-divider);border-radius:6px;background:var(--vp-c-bg-soft);color:var(--vp-c-text-1);cursor:pointer;font-size:13px">📥 导出</button>
          <button onclick="window.__fav_clear()" style="padding:6px 14px;border:1px solid var(--vp-c-divider);border-radius:6px;background:var(--vp-c-bg-soft);color:var(--vp-c-text-1);cursor:pointer;font-size:13px">🗑️ 清空</button>
        </div>
      </div>
      <div style="border:1px solid var(--vp-c-divider);border-radius:10px;overflow:hidden">`;

    favs.forEach((f, i) => {
      html += `
        <div class="fav-item" style="display:flex;align-items:center;gap:12px;padding:14px 18px;border-bottom:1px solid var(--vp-c-divider);${i === favs.length - 1 ? 'border-bottom:none' : ''};background:${i % 2 === 0 ? 'var(--vp-c-bg-soft)' : 'transparent'}">
          <span style="font-size:13px;color:var(--vp-c-text-3);min-width:24px">${i + 1}</span>
          <div style="flex:1;min-width:0">
            <a href="${f.link}" target="_blank" style="font-weight:600;font-size:14px;color:var(--vp-c-text-1);text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(f.title)}</a>
            <div style="font-size:12px;color:var(--vp-c-text-3);margin-top:4px">
              ${f.stars ? f.stars + ' · ' : ''}${escapeHtml(f.authors)}${f.date ? ' · ' + f.date : ''}
            </div>
          </div>
          <button onclick="window.__fav_remove('${f.id}')" title="取消收藏" style="flex-shrink:0;padding:4px 10px;border:1px solid var(--vp-c-divider);border-radius:6px;background:transparent;color:var(--vp-c-text-2);cursor:pointer;font-size:13px;white-space:nowrap">✕ 取消</button>
        </div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============ 全局函数（页面按钮调用）============

  window.__fav_add = function (id, title, authors, link, date, domain, stars) {
    const result = toggle({ id, title, authors, link, date, domain, stars });
    updateAllButtons();
    showToast(result ? '⭐ 已收藏' : '已取消收藏');
  };

  window.__fav_remove = function (id) {
    remove(id);
    renderList('favorites-list');
    updateAllButtons();
    showToast('已取消收藏');
  };

  window.__fav_export = function () {
    const data = JSON.stringify(getAll(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-kb-favorites-' + new Date().toISOString().substring(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('📥 收藏数据已导出');
  };

  window.__fav_import = function () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function () {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const data = JSON.parse(reader.result);
          if (!Array.isArray(data)) throw new Error('格式错误');
          save(data);
          renderList('favorites-list');
          updateAllButtons();
          showToast('📥 已导入 ' + data.length + ' 条收藏');
        } catch {
          showToast('❌ 文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  window.__fav_clear = function () {
    if (confirm('确定要清空所有收藏吗？此操作不可恢复。')) {
      localStorage.removeItem(STORAGE_KEY);
      renderList('favorites-list');
      updateAllButtons();
      showToast('已清空所有收藏');
    }
  };

  // ============ Toast 提示 ============

  function showToast(msg) {
    const existing = document.querySelector('.fav-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'fav-toast';
    toast.textContent = msg;
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '10px 24px',
      background: 'var(--vp-c-text-1)',
      color: 'var(--vp-c-bg)',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      zIndex: '9999',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      pointerEvents: 'none',
    });
    document.body.appendChild(toast);

    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // ============ 页面按钮注入 ============

  /**
   * 自动在论文链接旁注入收藏按钮
   * 适配论文列表页（点击后通过 data 属性传递论文信息）
   */
  function injectBookmarkButtons() {
    // 只在论文相关页面注入（兼容 base 路径和根路径）
    const path = window.location.pathname;
    const papersPath = (window.__VP_SITE_DATA__ && window.__VP_SITE_DATA__.base || '') + 'papers';
    if (!path.startsWith(papersPath)) return;

    // 查找论文表格行（index 页和 tag 页的表格格式）
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach(row => {
      const link = row.querySelector('a[href*="arxiv.org"]');
      if (!link) return;

      const cells = row.querySelectorAll('td');
      if (cells.length < 3) return;

      // 提取论文信息
      const paperLink = link.href;
      const paperId = paperLink.match(/arxiv\.org\/abs\/([0-9]+\.[0-9]+)/)?.[1] || paperLink;
      const paperTitle = link.textContent.trim();
      const authorsCell = cells[cells.length - 2] || cells[2];
      const paperAuthors = authorsCell ? authorsCell.textContent.trim() : '';

      // 查找或创建操作列
      let actionCell = row.querySelector('td:last-child');
      if (!actionCell || actionCell.querySelector('button')) return; // 已有按钮，跳过

      // 在行尾添加收藏按钮
      const lastCell = cells[cells.length - 1];
      if (!lastCell) return;

      const isActive = isBookmarked(paperId);
      const btn = document.createElement('button');
      btn.className = 'fav-btn';
      btn.title = isActive ? '取消收藏' : '收藏论文';
      btn.innerHTML = isActive ? '⭐' : '☆';
      btn.setAttribute('data-paper-id', paperId);
      btn.setAttribute('data-paper-title', paperTitle);
      btn.setAttribute('data-paper-authors', paperAuthors);
      btn.setAttribute('data-paper-link', paperLink);
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        window.__fav_add(paperId, paperTitle, paperAuthors, paperLink, '', '', '');
      };
      Object.assign(btn.style, {
        cursor: 'pointer',
        border: 'none',
        background: 'transparent',
        fontSize: '16px',
        padding: '2px 6px',
        lineHeight: '1',
      });

      // 追加到最后一个单元格
      lastCell.innerHTML = lastCell.innerHTML + ' ';
      lastCell.appendChild(btn);
    });

    // 论文详情页（daily/*.md）的标题注入
    const headings = document.querySelectorAll('h2');
    headings.forEach(h2 => {
      if (h2.querySelector('.fav-btn-inline')) return;

      // 检查是否是论文标题（包含序号）
      const text = h2.textContent;
      const match = text.match(/^\d+\.\s+(.+)/);
      if (!match) return;

      const title = match[1].trim();
      // 查找最近的 arxiv 链接
      const section = h2.closest('div');
      if (!section) return;

      const arxivLink = section.querySelector('a[href*="arxiv.org/abs/"]');
      if (!arxivLink) return;

      const paperId = arxivLink.href.match(/arxiv\.org\/abs\/([0-9]+\.[0-9]+)/)?.[1] || '';
      const isActive = isBookmarked(paperId);

      const btn = document.createElement('button');
      btn.className = 'fav-btn-inline';
      btn.innerHTML = isActive ? '⭐ 已收藏' : '☆ 收藏';
      btn.setAttribute('data-paper-id', paperId);
      btn.onclick = function () {
        window.__fav_add(paperId, title, '', arxivLink.href, '', '', '');
      };
      Object.assign(btn.style, {
        cursor: 'pointer',
        border: `1px solid var(--vp-c-divider)`,
        borderRadius: '6px',
        background: isActive ? 'var(--vp-c-brand)' : 'var(--vp-c-bg-soft)',
        color: isActive ? 'white' : 'var(--vp-c-text-1)',
        fontSize: '13px',
        padding: '4px 12px',
        marginLeft: '8px',
        verticalAlign: 'middle',
        fontWeight: '600',
      });

      h2.appendChild(btn);
    });
  }

  /**
   * 更新页面上所有收藏按钮的状态
   */
  function updateAllButtons() {
    document.querySelectorAll('.fav-btn, .fav-btn-inline').forEach(btn => {
      const id = btn.getAttribute('data-paper-id');
      if (!id) return;
      const active = isBookmarked(id);
      btn.innerHTML = active ? '⭐' : '☆';
      btn.title = active ? '取消收藏' : '收藏论文';
      if (btn.classList.contains('fav-btn-inline')) {
        btn.innerHTML = active ? '⭐ 已收藏' : '☆ 收藏';
        btn.style.background = active ? 'var(--vp-c-brand)' : 'var(--vp-c-bg-soft)';
        btn.style.color = active ? 'white' : 'var(--vp-c-text-1)';
      }
    });
  }

  // ============ 初始化 ============

  // 页面加载完成后注入按钮并渲染
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // 渲染收藏列表（如果在 favorites 页面）
    renderList('favorites-list');

    // 注入收藏按钮
    injectBookmarkButtons();

    // 更新按钮状态
    updateAllButtons();

    // 监听 VitePress 路由切换（SPA 导航）
    if (window.__vitepress_router_hooked) return;
    window.__vitepress_router_hooked = true;

    // VitePress 使用 history API，监听 popstate
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        injectBookmarkButtons();
        updateAllButtons();
      }, 300);
    });

    // 也监听 DOM 变化（VitePress 客户端导航可能触发）
    const observer = new MutationObserver(() => {
      injectBookmarkButtons();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 5000); // 5 秒后停止观察
  }
})();
