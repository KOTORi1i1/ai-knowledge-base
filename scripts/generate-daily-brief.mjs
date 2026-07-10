/**
 * 📋 每日简报生成器 (Daily Brief Generator)
 *
 * 功能：
 *   1. 抓取最新 AI 资讯（RSS + HuggingFace Daily）
 *   2. 自动分类：模型 / Agent / 工具 / 论文 / 教程
 *   3. 多维评分（来源权威度 + 内容关键词 + 时效性）
 *   4. 生成 Top 3 必看推荐
 *   5. 识别今日趋势
 *   6. 输出为 public/daily-brief.json（前端渲染用）
 *
 * 运行时机：在 fetch-papers.mjs 和 fetch-news.mjs 之后运行
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE = '/ai-knowledge-base/';

// ============ 配置 ============

const RSS_SOURCES = [
  {
    name: 'MarkTechPost',
    url: 'https://www.marktechpost.com/feed/',
    baseScore: 3,
  },
  {
    name: 'SyncedReview',
    url: 'https://syncedreview.com/feed/',
    baseScore: 2.5,
  },
  {
    name: 'Machine Learning Mastery',
    url: 'https://machinelearningmastery.com/blog/feed/',
    baseScore: 2,
  },
];

const HF_DAILY_API = 'https://huggingface.co/api/daily_papers';

// ============ 分类规则 ============
// 按优先级从高到低匹配，命中即停止

const CATEGORY_RULES = [
  {
    id: 'model',
    name: '模型',
    icon: '🔥',
    keywords: [
      'gpt-', 'gpt ', 'claude', 'gemini', 'llama', 'deepseek', 'qwen', 'mistral', 'mixtral',
      'open source model', 'release.*model', 'weights', 'parameters', 'large language model',
      'language model', 'foundation model', 'frontier model', 'llm', 'moe', 'mixture of expert',
      'transformer', 'diffusion model', 'vision model', 'audio model',
    ],
  },
  {
    id: 'agent',
    name: 'Agent',
    icon: '🤖',
    keywords: [
      'agent', 'agentic', 'mcp', 'langgraph', 'crewai', 'autogpt', 'tool use',
      'function call', 'multi-agent', 'agent framework', 'agent system',
      'proactive agent', 'agent benchmark', 'orchestration',
    ],
  },
  {
    id: 'tool',
    name: '工具',
    icon: '🛠',
    keywords: [
      'cursor', 'claude code', 'codex', 'v0', 'bolt', 'continue', 'copilot',
      'ide', 'editor', 'plugin', 'extension', 'cli tool', 'sdk', 'api',
      'open source', 'github', 'devtool', 'developer tool', 'coding assistant',
    ],
  },
  {
    id: 'paper',
    name: '论文',
    icon: '📄',
    keywords: [
      'arxiv', 'paper', 'benchmark', 'dataset', 'sota', 'state-of-the-art',
      'method', 'approach', 'survey', 'framework', 'architecture',
      'training', 'fine-tun', 'pretrain', 'pre-train', 'evaluation',
    ],
  },
  {
    id: 'tutorial',
    name: '教程',
    icon: '📚',
    keywords: [
      'tutorial', 'guide', 'how-to', 'how to', 'learn', 'course', 'master',
      'introduction', 'explained', 'complete guide', 'beginner', 'step by step',
      'hands-on', 'build', 'building',
    ],
  },
];

// ============ 关键词权重（用于评分加成）============

const BOOST_KEYWORDS = [
  { pattern: /\b(openai|google|deepseek|anthropic|meta|microsoft|nvidia|tencent|alibaba|baidu)\b/i, weight: 0.5, label: '大厂' },
  { pattern: /\b(release|launch|announce|unveil)\b/i, weight: 0.5, label: '发布' },
  { pattern: /\b(first|breakthrough|revolutionary|novel)\b/i, weight: 0.5, label: '首次/突破' },
  { pattern: /\b(open.?source|open.?weight)\b/i, weight: 0.5, label: '开源' },
  { pattern: /\b(sota|state.of.the.art|best)\b/i, weight: 0.3, label: 'SOTA' },
  { pattern: /\b(github|code|implementation)\b/i, weight: 0.2, label: '有代码' },
];

// ============ 工具函数 ============

function getTagContent(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
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

// ============ 分类引擎 ============

function classify(title, description) {
  const text = (title + ' ' + description).toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return { id: rule.id, name: rule.name, icon: rule.icon };
      }
    }
  }

  // 默认归类为「其他资讯」
  return { id: 'other', name: '📋 其他', icon: '📋' };
}

// ============ 评分引擎 ============

function score(title, description, source, date) {
  let s = 3; // 基础分（满分 5）

  // 来源加成
  const sourceScores = { 'MarkTechPost': 0.5, 'HuggingFace Daily': 0.5, 'SyncedReview': 0, 'Machine Learning Mastery': -0.5 };
  s += sourceScores[source] || 0;

  // 关键词加成
  const text = title + ' ' + description;
  for (const boost of BOOST_KEYWORDS) {
    if (boost.pattern.test(text)) {
      s += boost.weight;
    }
  }

  // 时效性加成
  const today = new Date().toISOString().substring(0, 10);
  if (date === today) s += 0.3;

  // 标题长度（过短或过长扣分）
  if (title.length < 10) s -= 0.5;
  if (title.length > 150) s -= 0.2;

  return Math.max(0, Math.min(5, Math.round(s * 10) / 10));
}

function toStars(s) {
  if (s >= 4.5) return '★★★★★';
  if (s >= 3.5) return '★★★★☆';
  if (s >= 2.5) return '★★★☆☆';
  if (s >= 1.5) return '★★☆☆☆';
  return '★☆☆☆☆';
}

// ============ RSS 抓取 ============

async function fetchRSS(source) {
  console.log(`  📡 ${source.name}...`);
  try {
    const response = await fetch(source.url, {
      headers: {
        'User-Agent': 'AI-Knowledge-Base/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return [];
    const xml = await response.text();
    const items = [];
    const rawItems = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];

    for (const raw of rawItems) {
      const title = getTagContent(raw, 'title');
      const link = getTagContent(raw, 'link');
      const description = stripHtml(getTagContent(raw, 'description')).slice(0, 300);
      const pubDate = getTagContent(raw, 'pubDate');
      const date = formatDate(pubDate) || new Date().toISOString().substring(0, 10);

      if (title && link) {
        items.push({ title, link, description, date, source: source.name });
      }
    }

    console.log(`    ✅ ${items.length} 条`);
    return items;
  } catch (err) {
    console.log(`    ❌ ${err.message}`);
    return [];
  }
}

// ============ HuggingFace Daily 抓取 ============

async function fetchHuggingFaceDaily() {
  console.log('  📡 HuggingFace Daily Papers...');
  try {
    const response = await fetch(HF_DAILY_API, {
      headers: { 'User-Agent': 'AI-Knowledge-Base/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return [];
    const papers = await response.json();

    const items = papers.slice(0, 15).map(paper => ({
      title: paper.title || 'Untitled',
      link: paper.paper?.url || `https://huggingface.co/papers/${paper.paper?.id}`,
      description: (paper.paper?.summary || '').slice(0, 300),
      date: new Date().toISOString().substring(0, 10),
      source: 'HuggingFace Daily',
      upvotes: paper.upvotes || 0,
    }));

    console.log(`    ✅ ${items.length} 条`);
    return items;
  } catch (err) {
    console.log(`    ❌ ${err.message}`);
    return [];
  }
}

// ============ 趋势检测 ============

function detectTrend(classifiedItems) {
  // 统计各类别数量
  const catCount = {};
  classifiedItems.forEach(item => {
    catCount[item.category.id] = (catCount[item.category.id] || 0) + 1;
  });

  // 找数量最多的类别
  let topCat = null;
  let maxCount = 0;
  for (const [cat, count] of Object.entries(catCount)) {
    if (count > maxCount) {
      maxCount = count;
      topCat = cat;
    }
  }

  // 找标题中出现最多的关键词
  const allTitles = classifiedItems.map(i => i.title.toLowerCase()).join(' ');
  const trendKeywords = ['agent', 'memory', 'reasoning', 'multimodal', 'open source', 'safety',
    'alignment', 'efficient', 'scaling', 'voice', 'video', 'code', 'robot'];
  let topKW = '';
  let topKWCount = 0;
  trendKeywords.forEach(kw => {
    const count = (allTitles.match(new RegExp(kw, 'gi')) || []).length;
    if (count > topKWCount) {
      topKWCount = count;
      topKW = kw;
    }
  });

  // 构建趋势文本
  const catName = CATEGORY_RULES.find(r => r.id === topCat);
  const trendParts = [];
  if (catName && maxCount >= 3) {
    trendParts.push(`${catName.icon} ${catName.name}方向最活跃（${maxCount} 条）`);
  }
  if (topKW && topKWCount >= 3) {
    const kwName = topKW.charAt(0).toUpperCase() + topKW.slice(1);
    trendParts.push(`「${kwName}」是今日热词（${topKWCount} 次）`);
  }

  return trendParts.length > 0 ? trendParts.join('，') : '今日 AI 领域动态均衡发展';
}

// ============ 主逻辑 ============

async function generate() {
  console.log('📋 开始生成每日简报...\n');

  const today = new Date().toISOString().substring(0, 10);

  // 1. 抓取所有数据
  console.log('📥 抓取数据...');
  const rssResults = await Promise.all(RSS_SOURCES.map(s => fetchRSS(s)));
  const hfResults = await fetchHuggingFaceDaily();
  let allItems = [...rssResults.flat(), ...hfResults];

  // 去重
  const seen = new Set();
  allItems = allItems.filter(item => {
    const key = item.title.toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 按日期排序，取最近 3 天
  allItems.sort((a, b) => b.date.localeCompare(a.date));
  const recentItems = allItems.filter(item => {
    const d = new Date(item.date);
    const now = new Date();
    const diff = now - d;
    return diff < 3 * 24 * 60 * 60 * 1000; // 3天内
  });

  console.log(`  📊 去重后 ${recentItems.length} 条近期资讯\n`);

  // 2. 分类 + 评分
  console.log('🏷️  分类 + 评分...');
  const classified = recentItems.map(item => ({
    ...item,
    category: classify(item.title, item.description),
    rating: score(item.title, item.description, item.source, item.date),
  }));

  // 按评分排序
  classified.sort((a, b) => b.rating - a.rating);

  // 3. 统计分类
  const catMap = {};
  classified.forEach(item => {
    const cid = item.category.id;
    if (!catMap[cid]) catMap[cid] = { count: 0, top: '' };
    catMap[cid].count++;
    if (!catMap[cid].top) catMap[cid].top = item.title.slice(0, 60);
  });

  // 4. 选 Top 3 必看（跨类别，取评分最高）
  const top3 = classified.slice(0, 3).map((item, i) => ({
    rank: i + 1,
    title: item.title,
    summary: item.description.slice(0, 120) || '(暂无摘要)',
    stars: item.rating,
    starsText: toStars(item.rating),
    category: item.category.name,
    categoryId: item.category.id,
    link: item.link,
    source: item.source,
    date: item.date,
  }));

  // 5. 头条（评分最高的那条）
  const headline = top3[0] ? {
    title: top3[0].title,
    summary: top3[0].summary,
    why: top3[0].stars >= 4 ? '今日最重要的一条 AI 资讯，建议优先阅读' :
         top3[0].stars >= 3 ? '今天值得关注的重要动态' : '今日 AI 资讯精选',
    link: top3[0].link,
    source: top3[0].source,
    category: top3[0].category,
  } : null;

  // 6. 趋势
  const trend = detectTrend(classified);

  // 7. 一句话总结
  const catEntries = Object.entries(catMap).sort((a, b) => b[1].count - a[1].count);
  const topCats = catEntries.slice(0, 2).map(([cid, info]) => {
    const catDef = CATEGORY_RULES.find(r => r.id === cid);
    return catDef ? (catDef.icon + ' ' + catDef.name) : cid;
  }).join(' + ');
  const oneLiner = topCats
    ? `今天的主题是 ${topCats}${headline ? '，头条是「' + headline.title.slice(0, 40) + '」' : ''}`
    : '今日 AI 领域动态更新，请查看详情';

  // 8. 组装输出
  const brief = {
    date: today,
    generated: new Date().toISOString(),
    headline,
    trend,
    top3,
    categories: Object.fromEntries(
      Object.entries(catMap).map(([cid, info]) => [
        cid,
        {
          name: (CATEGORY_RULES.find(r => r.id === cid) || { name: cid }).name,
          icon: (CATEGORY_RULES.find(r => r.id === cid) || { icon: '📋' }).icon,
          count: info.count,
          top: info.top,
        },
      ])
    ),
    oneLiner,
    stats: {
      total: classified.length,
      avgRating: Math.round(classified.reduce((sum, i) => sum + i.rating, 0) / classified.length * 10) / 10,
      topRated: classified.filter(i => i.rating >= 4).length,
    },
  };

  // 9. 写入文件
  const publicDir = join(ROOT, 'public');
  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

  const outPath = join(publicDir, 'daily-brief.json');
  writeFileSync(outPath, JSON.stringify(brief, null, 2), 'utf-8');
  console.log(`✅ 每日简报已生成: public/daily-brief.json`);
  console.log(`   📊 ${classified.length} 条资讯, Top3 平均评分: ${Math.round(top3.reduce((s, i) => s + i.stars, 0) / top3.length * 10) / 10}`);
  console.log(`   🔥 头条: ${headline ? headline.title.slice(0, 60) : '无'}`);
  console.log(`   📈 趋势: ${trend}`);
}

// ============ 执行 ============

generate().catch(err => {
  console.error('❌ 每日简报生成失败:', err.message);
  process.exit(1);
});
