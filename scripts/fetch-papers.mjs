/**
 * arXiv 论文抓取脚本
 * 每天从 arXiv API 获取最新 AI 论文，生成 Markdown 文件供 VitePress 展示
 *
 * 数据来源: arXiv API (免费，非商业用途)
 * 抓取分类: cs.AI, cs.CL, cs.CV, cs.LG, cs.MA
 * 筛选: 按提交日期排序，每天最多取 50 篇
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ============ 配置 ============

const ARXIV_CATEGORIES = [
  'cs.AI',   // 人工智能
  'cs.CL',   // 计算语言学 / NLP
  'cs.CV',   // 计算机视觉
  'cs.LG',   // 机器学习
  'cs.MA',   // 多智能体系统
];

const MAX_RESULTS = 50;
const ARXIV_API = 'http://export.arxiv.org/api/query';

// 领域中文名映射
const CATEGORY_NAMES = {
  'cs.AI': '人工智能',
  'cs.CL': '自然语言处理',
  'cs.CV': '计算机视觉',
  'cs.LG': '机器学习',
  'cs.MA': '多智能体',
};

// ============ 工具函数 ============

/**
 * 简单 XML 文本提取（不依赖第三方库）
 * 从 <tag>content</tag> 中提取 content
 */
function getTagContent(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  if (!match) return '';
  return match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
}

/**
 * 提取所有同名标签的内容
 */
function getAllTagContents(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim());
  }
  return results;
}

/**
 * 提取 <entry>...</entry> 块
 */
function splitEntries(xml) {
  const entries = [];
  const regex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    entries.push(match[1]);
  }
  return entries;
}

/**
 * 从 author 块中提取所有作者名
 */
function extractAuthors(entryXml) {
  const names = getAllTagContents(entryXml, 'name');
  return names;
}

/**
 * 从 id 中提取 arXiv ID
 * 例如: http://arxiv.org/abs/2301.12345v1 → 2301.12345
 */
function extractArxivId(entryXml) {
  const id = getTagContent(entryXml, 'id');
  const match = id.match(/arxiv\.org\/abs\/([0-9]+\.[0-9]+)/);
  return match ? match[1] : '';
}

/**
 * 从 link 中提取 PDF 链接
 */
function extractPdfLink(entryXml) {
  const links = entryXml.match(/<link[^>]*>/gi) || [];
  for (const link of links) {
    if (link.includes('title="pdf"')) {
      const href = link.match(/href="([^"]+)"/);
      if (href) return href[1];
    }
  }
  return '';
}

// ============ 质量评分 ============

/**
 * 对论文进行简单质量评分（0-100）
 * 评分维度：作者数量、摘要长度、是否有多个分类
 */
function scorePaper(paper) {
  let score = 50; // 基础分

  // 作者数量（合作研究通常质量更高）
  if (paper.authors.length >= 5) score += 10;
  if (paper.authors.length >= 8) score += 5;

  // 摘要长度（详细摘要通常质量更高）
  if (paper.summary.length > 500) score += 10;
  if (paper.summary.length > 1000) score += 5;

  // 多学科交叉
  if (paper.categories.length >= 2) score += 5;

  // 标题长度合理（不太短不太长）
  if (paper.title.length > 20 && paper.title.length < 200) score += 5;

  return Math.min(score, 95); // 最高 95 分
}

// ============ 主逻辑 ============

async function fetchPapers() {
  console.log('📄 开始获取 arXiv 论文...\n');

  const categoryQuery = ARXIV_CATEGORIES.map(c => `cat:${c}`).join('+OR+');
  const url = `${ARXIV_API}?search_query=${categoryQuery}&sortBy=submittedDate&sortOrder=descending&start=0&max_results=${MAX_RESULTS}`;

  console.log(`  请求 URL: ${url}\n`);

  const response = await fetch(url, {
    headers: { 'User-Agent': 'AI-Knowledge-Base/1.0 (mailto:1528927697@qq.com)' }
  });

  if (!response.ok) {
    throw new Error(`arXiv API 返回错误: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const entries = splitEntries(xml);

  console.log(`  获取到 ${entries.length} 篇论文\n`);

  // 解析每篇论文
  const papers = entries.map(entry => {
    const title = getTagContent(entry, 'title').replace(/\s+/g, ' ');
    const summary = getTagContent(entry, 'summary').replace(/\s+/g, ' ');
    const published = getTagContent(entry, 'published');
    const authors = extractAuthors(entry);
    const arxivId = extractArxivId(entry);
    const pdfLink = extractPdfLink(entry);
    const absLink = `https://arxiv.org/abs/${arxivId}`;
    const categories = getAllTagContents(entry, 'category')
      .filter(c => c.startsWith('cs.') || c.startsWith('stat.'));

    return {
      id: arxivId,
      title,
      authors,
      summary,
      published: published.substring(0, 10), // 只取日期部分 YYYY-MM-DD
      categories,
      primaryCategory: categories[0] || 'unknown',
      links: {
        abs: absLink,
        pdf: pdfLink || `https://arxiv.org/pdf/${arxivId}`,
      },
    };
  });

  // 评分并排序
  papers.forEach(p => {
    p.score = scorePaper(p);
  });
  papers.sort((a, b) => b.score - a.score);

  // 按日期分组
  const papersByDate = {};
  papers.forEach(p => {
    const date = p.published;
    if (!papersByDate[date]) papersByDate[date] = [];
    papersByDate[date].push(p);
  });

  // 生成每日 Markdown 文件
  const dailyDir = join(ROOT, 'papers', 'daily');
  if (!existsSync(dailyDir)) mkdirSync(dailyDir, { recursive: true });

  for (const [date, dayPapers] of Object.entries(papersByDate)) {
    const mdContent = generateDailyMarkdown(date, dayPapers);
    const filePath = join(dailyDir, `${date}.md`);
    writeFileSync(filePath, mdContent, 'utf-8');
    console.log(`  ✅ 生成: papers/daily/${date}.md (${dayPapers.length} 篇)`);
  }

  // 生成论文索引 JSON（供搜索使用）
  const dataDir = join(ROOT, 'papers', 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  // 合并历史数据
  let allPapers = [];
  const indexFile = join(dataDir, 'papers-index.json');
  if (existsSync(indexFile)) {
    try {
      allPapers = JSON.parse(readFileSync(indexFile, 'utf-8'));
    } catch (e) {
      console.log('  历史索引文件损坏，重新生成');
    }
  }

  // 去重合并
  const existingIds = new Set(allPapers.map(p => p.id));
  const newPapers = papers.filter(p => !existingIds.has(p.id));
  allPapers = [...newPapers, ...allPapers].slice(0, 5000); // 保留最近 5000 篇
  writeFileSync(indexFile, JSON.stringify(allPapers, null, 2), 'utf-8');
  console.log(`\n  📊 论文索引已更新 (总计 ${allPapers.length} 篇，新增 ${newPapers.length} 篇)`);

  // 生成摘要统计
  generateDigestMarkdown(papers);
}

/**
 * 生成单日论文 Markdown
 */
function generateDailyMarkdown(date, papers) {
  const lines = [];
  lines.push('---');
  lines.push(`title: 📅 ${date} 每日论文精选`);
  lines.push(`date: ${date}`);
  lines.push('---');
  lines.push('');
  lines.push(`# 📅 ${date} 每日论文精选`);
  lines.push('');
  lines.push(`> 共 ${papers.length} 篇论文，按质量评分排序`);
  lines.push('');

  papers.forEach((paper, i) => {
    const categoryLabels = paper.categories
      .map(c => CATEGORY_NAMES[c] || c)
      .filter(Boolean);

    lines.push(`## ${i + 1}. ${paper.title}`);
    lines.push('');
    lines.push('| 属性 | 内容 |');
    lines.push('|------|------|');
    lines.push(`| **arXiv ID** | [${paper.id}](${paper.links.abs}) |`);
    lines.push(`| **作者** | ${paper.authors.slice(0, 5).join('; ')}${paper.authors.length > 5 ? ` 等 ${paper.authors.length} 人` : ''} |`);
    lines.push(`| **领域** | ${categoryLabels.join(', ') || '未分类'} |`);
    lines.push(`| **发表日期** | ${paper.published} |`);
    lines.push(`| **质量评分** | ${'⭐'.repeat(Math.ceil(paper.score / 20))} (${paper.score}/100) |`);
    lines.push(`| **PDF** | [📥 下载](${paper.links.pdf}) |`);
    lines.push('');
    lines.push('**摘要**');
    lines.push('');
    lines.push(`> ${paper.summary.slice(0, 500)}${paper.summary.length > 500 ? '...' : ''}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * 生成论文概览页面
 */
function generateDigestMarkdown(latestPapers) {
  const top30 = latestPapers.slice(0, 30);
  const today = new Date().toISOString().substring(0, 10);

  const lines = [];
  lines.push('# 🔬 论文追踪');
  lines.push('');
  lines.push('> 每天自动从 arXiv 获取最新 AI 论文，经质量筛选后展示。数据来源：[arXiv.org](https://arxiv.org)');
  lines.push('');
  lines.push(`## 📅 最近更新: ${today}`);
  lines.push('');
  lines.push(`共收录最新 ${top30.length} 篇论文，按质量评分排序。`);
  lines.push('');
  lines.push('| # | 论文 | 作者 | 领域 | 评分 |');
  lines.push('|---|------|------|------|------|');

  top30.forEach((paper, i) => {
    const firstAuthor = paper.authors[0] || '未知';
    const etAl = paper.authors.length > 1 ? ' et al.' : '';
    const categoryLabel = CATEGORY_NAMES[paper.primaryCategory] || paper.primaryCategory;
    const title = paper.title.length > 60 ? paper.title.slice(0, 57) + '...' : paper.title;
    const stars = '⭐'.repeat(Math.ceil(paper.score / 20));

    lines.push(`| ${i + 1} | [${title}](${paper.links.abs}) | ${firstAuthor}${etAl} | ${categoryLabel} | ${stars} |`);
  });

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 📂 每日归档');
  lines.push('');

  // 列出所有每日文件
  const dailyDir = join(ROOT, 'papers', 'daily');
  if (existsSync(dailyDir)) {
    const files = readdirSync(dailyDir).filter(f => f.endsWith('.md')).sort().reverse();
    files.forEach(f => {
      const d = f.replace('.md', '');
      lines.push(`- [📅 ${d}](/papers/daily/${d})`);
    });
  }

  const indexPath = join(ROOT, 'papers', 'index.md');
  writeFileSync(indexPath, lines.join('\n'), 'utf-8');
  console.log(`  ✅ 更新: papers/index.md`);
}

// ============ 执行 ============

fetchPapers().catch(err => {
  console.error('❌ 论文抓取失败:', err.message);
  process.exit(1);
});
