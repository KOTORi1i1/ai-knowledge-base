/**
 * AI 资讯抓取脚本
 * 从多个 RSS 源和 API 获取最新 AI 新闻，生成 Markdown 文件
 *
 * 数据来源: RSS feeds + Hugging Face Daily Papers API (全部免费)
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ============ 配置 ============

// RSS 源列表（免费、可靠的 AI 资讯源）
const RSS_SOURCES = [
  {
    name: 'MarkTechPost',
    url: 'https://www.marktechpost.com/feed/',
    category: 'AI 技术新闻',
    lang: 'en',
  },
  {
    name: 'SyncedReview',
    url: 'https://syncedreview.com/feed/',
    category: 'AI 学术动态',
    lang: 'en',
  },
  {
    name: 'Machine Learning Mastery',
    url: 'https://machinelearningmastery.com/blog/feed/',
    category: '机器学习教程',
    lang: 'en',
  },
];

// Hugging Face Daily Papers API（社区精选每日热门论文，附带讨论）
const HF_DAILY_API = 'https://huggingface.co/api/daily_papers';

// ============ 工具函数 ============

function getTagContent(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
}

function getAllTagContents(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim());
  }
  return results;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim();
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().substring(0, 10);
  } catch {
    return '';
  }
}

// ============ RSS 解析 ============

function parseRssItems(xml) {
  const items = [];
  const rawItems = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

  for (const raw of rawItems) {
    const title = getTagContent(raw, 'title');
    const link = getTagContent(raw, 'link');
    const description = stripHtml(getTagContent(raw, 'description'));
    const pubDate = getTagContent(raw, 'pubDate');
    const date = formatDate(pubDate);

    if (title && link) {
      items.push({
        title,
        link,
        description: description.slice(0, 300),
        date: date || new Date().toISOString().substring(0, 10),
      });
    }
  }

  return items;
}

// ============ 主逻辑 ============

async function fetchRSS(source) {
  console.log(`  📡 抓取: ${source.name} (${source.url})`);

  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'AI-Knowledge-Base/1.0 (mailto:1528927697@qq.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000), // 15秒超时
    });

    if (!response.ok) {
      console.log(`    ⚠️ HTTP ${response.status}，跳过`);
      return [];
    }

    const text = await response.text();
    const items = parseRssItems(text);

    console.log(`    ✅ 获取 ${items.length} 条`);
    return items.map(item => ({
      ...item,
      source: source.name,
      category: source.category,
      lang: source.lang,
    }));
  } catch (err) {
    console.log(`    ❌ 失败: ${err.message}`);
    return [];
  }
}

async function fetchHuggingFaceDaily() {
  console.log(`  📡 抓取: Hugging Face Daily Papers`);

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(HF_DAILY_API, {
        headers: { 'User-Agent': 'AI-Knowledge-Base/1.0' },
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        console.log(`    ⚠️ HTTP ${response.status}, 尝试 ${attempt}/${MAX_RETRIES}`);
        if (attempt < MAX_RETRIES) { await sleep(2000); continue; }
        return [];
      }

      const papers = await response.json();
      const items = papers.slice(0, 10).map(paper => ({
        title: paper.title || 'Untitled',
        link: paper.paper?.url || `https://huggingface.co/papers/${paper.paper?.id}`,
        description: (paper.paper?.summary || '').slice(0, 300),
        date: new Date().toISOString().substring(0, 10),
        source: 'HuggingFace Daily',
        category: '社区热门论文',
        lang: 'en',
        upvotes: paper.upvotes || 0,
      }));

      console.log(`    ✅ 获取 ${items.length} 条`);
      return items;
    } catch (err) {
      console.log(`    ⚠️ 尝试 ${attempt}/${MAX_RETRIES}: ${err.message}`);
      if (attempt < MAX_RETRIES) { await sleep(2000); }
    }
  }
  console.log(`    ⚠️ HF Daily 暂时不可用，将仅使用 RSS 数据`);
  return [];
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllNews() {
  console.log('📰 开始获取 AI 资讯...\n');

  // 并行抓取所有 RSS 源
  const rssResults = await Promise.all(
    RSS_SOURCES.map(source => fetchRSS(source))
  );

  // 抓取 Hugging Face Daily
  const hfResults = await fetchHuggingFaceDaily();

  // 合并所有结果
  let allNews = [...rssResults.flat(), ...hfResults];

  // 去重（按标题相似度）
  const seen = new Set();
  allNews = allNews.filter(item => {
    const key = item.title.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 按日期排序
  allNews.sort((a, b) => b.date.localeCompare(a.date));

  console.log(`\n  📊 共获取 ${allNews.length} 条独特资讯\n`);

  // 按日期分组
  const newsByDate = {};
  allNews.forEach(item => {
    const date = item.date;
    if (!newsByDate[date]) newsByDate[date] = [];
    newsByDate[date].push(item);
  });

  // 生成每日资讯文件
  const newsDir = join(ROOT, 'news');
  if (!existsSync(newsDir)) mkdirSync(newsDir, { recursive: true });

  for (const [date, items] of Object.entries(newsByDate)) {
    const mdContent = generateNewsMarkdown(date, items);
    const filePath = join(newsDir, `${date}.md`);
    writeFileSync(filePath, mdContent, 'utf-8');
    console.log(`  ✅ 生成: news/${date}.md (${items.length} 条)`);
  }

  // 更新资讯首页
  generateNewsIndex(allNews);
}

function generateNewsMarkdown(date, items) {
  const lines = [];
  lines.push('---');
  lines.push(`title: 📰 ${date} AI 资讯汇总`);
  lines.push(`date: ${date}`);
  lines.push('---');
  lines.push('');
  lines.push(`# 📰 ${date} AI 资讯汇总`);
  lines.push('');
  lines.push(`> 共 ${items.length} 条资讯，来自多个 AI 资讯源`);
  lines.push('');

  items.forEach((item, i) => {
    const upvoteStr = item.upvotes ? ` 👍 ${item.upvotes}` : '';
    lines.push(`## ${i + 1}. ${item.title}`);
    lines.push('');
    lines.push(`| 属性 | 内容 |`);
    lines.push('|------|------|');
    lines.push(`| **来源** | ${item.source} |`);
    lines.push(`| **分类** | ${item.category} |`);
    lines.push(`| **日期** | ${item.date} |`);
    lines.push(`| **链接** | [阅读原文](${item.link})${upvoteStr} |`);
    lines.push('');
    if (item.description) {
      lines.push(`> ${item.description}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

function generateNewsIndex(latestNews) {
  const today = new Date().toISOString().substring(0, 10);
  const top50 = latestNews.slice(0, 50);

  const lines = [];
  lines.push('---');
  lines.push('layout: page');
  lines.push('title: 📰 AI 资讯');
  lines.push('---');
  lines.push('');
  lines.push('# 📰 AI 资讯');
  lines.push('');
  lines.push('> 每天自动从多个 AI 资讯源聚合最新动态。');
  lines.push('');
  lines.push(`## 📅 最近更新: ${today}`);
  lines.push('');
  lines.push('| # | 标题 | 来源 | 日期 |');
  lines.push('|---|------|------|------|');

  top50.forEach((item, i) => {
    const title = item.title.length > 70 ? item.title.slice(0, 67) + '...' : item.title;
    lines.push(`| ${i + 1} | [${title}](${item.link}) | ${item.source} | ${item.date} |`);
  });

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🗄️ 历史归档');
  lines.push('');

  const newsDir = join(ROOT, 'news');
  if (existsSync(newsDir)) {
    const files = readdirSync(newsDir)
      .filter(f => f.endsWith('.md') && f !== 'index.md')
      .sort().reverse()
      .slice(0, 30);
    files.forEach(f => {
      const d = f.replace('.md', '');
      lines.push(`- [📰 ${d}](/news/${d})`);
    });
  }

  const indexPath = join(ROOT, 'news', 'index.md');
  writeFileSync(indexPath, lines.join('\n'), 'utf-8');
  console.log(`  ✅ 更新: news/index.md`);
}

// ============ 执行 ============

fetchAllNews().catch(err => {
  console.error('❌ 资讯抓取失败:', err.message);
  process.exit(1);
});
