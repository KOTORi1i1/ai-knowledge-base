/**
 * arXiv 论文抓取 + 质量评分 + 自动分类 + 中文摘要 一体化脚本
 *
 * 数据来源: arXiv API (免费，非商业用途)
 * 抓取分类: cs.AI, cs.CL, cs.CV, cs.LG, cs.MA, cs.NE, cs.IR
 *
 * 阶段四新增:
 *   - 多维质量评分算法（5 个维度，0-100 分）
 *   - 关键词自动分类（9 大领域）
 *   - 模板化中文摘要生成（无需 API）
 *   - 自动生成分类标签页
 *   - 自动生成每周精选
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ============ 配置 ============

const ARXIV_CATEGORIES = [
  'cs.AI', 'cs.CL', 'cs.CV', 'cs.LG', 'cs.MA', 'cs.NE', 'cs.IR',
];

const MAX_RESULTS = 80;
const ARXIV_API = 'http://export.arxiv.org/api/query';

// arXiv 分类到中文名
const CATEGORY_NAMES = {
  'cs.AI': '人工智能', 'cs.CL': '自然语言处理', 'cs.CV': '计算机视觉',
  'cs.LG': '机器学习', 'cs.MA': '多智能体', 'cs.NE': '神经进化',
  'cs.IR': '信息检索', 'stat.ML': '统计机器学习',
};

// ============ 领域分类系统（9 大领域 + 关键词匹配）============

const DOMAIN_CLASSIFIER = [
  {
    id: 'llm', name: '大语言模型', icon: '🧠', weight: 1.0,
    keywords: [
      'large language model', 'LLM', 'LLMs', 'language model',
      'transformer', 'attention mechanism', 'self-attention',
      'pretraining', 'pre-training', 'fine-tuning', 'fine tuning',
      'instruction tuning', 'instruction-tuned',
      'RLHF', 'reinforcement learning from human feedback',
      'alignment', 'aligning language model',
      'prompt', 'prompting', 'in-context learning', 'few-shot',
      'chain-of-thought', 'chain of thought', 'CoT',
      'emergent ability', 'scaling law',
      'GPT', 'GPT-4', 'LLaMA', 'Llama', 'Mistral', 'Falcon',
      'Claude', 'Gemini', 'DeepSeek', 'Qwen', 'ChatGLM',
      'mixture of experts', 'MoE', 'retrieval-augmented',
      'RAG', 'knowledge distillation', 'model compression',
      'tokeniz', 'decoding strategy',
    ],
  },
  {
    id: 'cv', name: '计算机视觉', icon: '👁️', weight: 1.0,
    keywords: [
      'image', 'video', 'visual', 'vision transformer', 'ViT',
      'object detection', 'image segmentation', 'semantic segmentation',
      'instance segmentation', 'image classification',
      'pose estimation', 'depth estimation', 'optical flow',
      'face recognition', 'facial', 'image generation',
      'image synthesis', 'style transfer', 'super-resolution',
      'convolutional neural', 'CNN', 'ResNet', 'YOLO',
      '3D reconstruction', 'point cloud', 'neural radiance field', 'NeRF',
      'diffusion model', 'stable diffusion', 'DALL-E',
      'GAN', 'generative adversarial', 'VAE',
      'contrastive learning', 'SimCLR',
      'medical image', 'CT scan', 'MRI', 'X-ray',
    ],
  },
  {
    id: 'nlp', name: '自然语言处理', icon: '📝', weight: 1.0,
    keywords: [
      'natural language', 'NLP', 'text classification',
      'named entity recognition', 'NER', 'relation extraction',
      'sentiment analysis', 'text summarization', 'machine translation',
      'question answering', 'reading comprehension',
      'dialogue system', 'chatbot', 'conversational AI',
      'speech recognition', 'text-to-speech', 'TTS',
      'syntax', 'semantic parsing', 'dependency parsing',
      'word embedding', 'word2vec', 'GloVe', 'BERT',
      'cross-lingual', 'multilingual',
      'information extraction', 'entity linking',
      'text generation', 'paraphrase', 'grammar correction',
      'knowledge graph', 'ontology',
    ],
  },
  {
    id: 'rl', name: '强化学习', icon: '🎮', weight: 1.0,
    keywords: [
      'reinforcement learning', 'RL', 'deep reinforcement',
      'policy gradient', 'Q-learning', 'DQN', 'PPO', 'SAC',
      'actor-critic', 'Markov decision', 'MDP',
      'multi-armed bandit', 'exploration-exploitation',
      'reward function', 'reward model', 'value function',
      'model-based RL', 'model-free', 'offline RL',
      'imitation learning', 'inverse reinforcement',
      'multi-agent', 'MARL', 'game theory',
      'AlphaGo', 'AlphaZero', 'MuZero',
      'RLHF', 'DPO', 'GRPO',
    ],
  },
  {
    id: 'multimodal', name: '多模态', icon: '🔗', weight: 1.0,
    keywords: [
      'multimodal', 'multi-modal', 'cross-modal', 'crossmodal',
      'vision-language', 'visual question answering', 'VQA',
      'image caption', 'text-to-image', 'text-to-video',
      'audio-visual', 'speech-vision',
      'CLIP', 'BLIP', 'LLaVA', 'Flamingo',
      'visual grounding', 'referring expression',
      'video understanding', 'video captioning',
      'audio generation', 'music generation',
      'embodied', 'robot', 'human-robot',
      'sensor fusion', 'multi-sensor',
    ],
  },
  {
    id: 'gnn', name: '图神经网络', icon: '🕸️', weight: 0.9,
    keywords: [
      'graph neural network', 'GNN', 'graph convolution',
      'graph attention', 'GAT', 'GraphSAGE',
      'node embedding', 'graph embedding', 'network embedding',
      'knowledge graph', 'graph representation',
      'molecular graph', 'drug discovery', 'protein',
      'social network', 'recommendation system',
      'graph transformer', 'geometric deep learning',
      'message passing', 'topology',
    ],
  },
  {
    id: 'efficient', name: '高效模型', icon: '⚡', weight: 0.85,
    keywords: [
      'model compression', 'pruning', 'quantization', 'quantized',
      'knowledge distillation', 'distillation',
      'efficient transformer', 'linear attention', 'sparse attention',
      'low-rank', 'LoRA', 'adapter', 'parameter-efficient',
      'network architecture search', 'NAS',
      'tinyML', 'edge device', 'on-device', 'mobile',
      'inference optimization', 'latency', 'throughput',
      'memory efficient', 'lightweight',
    ],
  },
  {
    id: 'safety', name: 'AI安全与对齐', icon: '🛡️', weight: 0.9,
    keywords: [
      'AI safety', 'robustness', 'adversarial attack', 'adversarial example',
      'backdoor', 'poisoning', 'jailbreak', 'red-teaming',
      'fairness', 'bias', 'biased', 'discrimination',
      'privacy', 'differential privacy', 'federated learning',
      'explainability', 'interpretability', 'XAI',
      'hallucination', 'factual', 'factuality',
      'toxicity', 'harmful', 'safe RL', 'constitutional AI',
      'out-of-distribution', 'OOD', 'uncertainty',
      'anomaly detection', 'outlier',
    ],
  },
  {
    id: 'generative', name: '生成式AI', icon: '🎨', weight: 0.9,
    keywords: [
      'generative model', 'generative AI', 'generation',
      'diffusion', 'score-based', 'flow-based',
      'autoregressive model', 'variational autoencoder',
      'text-to-image', 'text-to-video', 'text-to-3D',
      'image synthesis', 'image editing', 'inpainting',
      'code generation', 'program synthesis',
      'music generation', 'audio synthesis',
      'molecular generation', 'drug design',
      'data augmentation', 'synthetic data',
    ],
  },
];

// ============ 中文术语映射（用于摘要生成）============

const CN_TERMS = {
  'transformer': 'Transformer架构',
  'attention mechanism': '注意力机制',
  'self-attention': '自注意力',
  'mixture of experts': '混合专家模型(MoE)',
  'pretraining': '预训练',
  'fine-tuning': '微调',
  'instruction tuning': '指令微调',
  'reinforcement learning': '强化学习',
  'RLHF': '人类反馈强化学习(RLHF)',
  'knowledge distillation': '知识蒸馏',
  'contrastive learning': '对比学习',
  'self-supervised': '自监督学习',
  'chain-of-thought': '思维链推理',
  'in-context learning': '上下文学习',
  'scaling law': '缩放定律',
  'generalization': '泛化能力',
  'text classification': '文本分类',
  'machine translation': '机器翻译',
  'question answering': '问答系统',
  'text summarization': '文本摘要',
  'image classification': '图像分类',
  'object detection': '目标检测',
  'image segmentation': '图像分割',
  'image generation': '图像生成',
  'code generation': '代码生成',
  'LoRA': '低秩适配(LoRA)',
  'quantization': '模型量化',
  'pruning': '模型剪枝',
  'retrieval-augmented': '检索增强生成(RAG)',
  'diffusion model': '扩散模型',
  'state-of-the-art': '最先进水平(SOTA)',
  'graph neural network': '图神经网络(GNN)',
  'large language model': '大语言模型(LLM)',
  'generative adversarial': '生成对抗网络(GAN)',
  'reinforcement learning from human feedback': 'RLHF',
  'multi-agent': '多智能体',
  'federated learning': '联邦学习',
  'neural radiance field': '神经辐射场(NeRF)',
  'visual question answering': '视觉问答(VQA)',
};

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

function splitEntries(xml) {
  const entries = [];
  const regex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    entries.push(match[1]);
  }
  return entries;
}

function extractAuthors(entryXml) {
  return getAllTagContents(entryXml, 'name');
}

function extractArxivId(entryXml) {
  const id = getTagContent(entryXml, 'id');
  const match = id.match(/arxiv\.org\/abs\/([0-9]+\.[0-9]+)/);
  return match ? match[1] : '';
}

// ============ 领域分类函数 ============

function classifyPaper(paper) {
  const text = (paper.title + ' ' + paper.summary).toLowerCase();
  const results = [];

  for (const domain of DOMAIN_CLASSIFIER) {
    let matchCount = 0;
    let weightedCount = 0;

    for (const kw of domain.keywords) {
      const kwLower = kw.toLowerCase();
      const isPhrase = kw.includes(' ');
      const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      const matches = (text.match(regex) || []).length;

      if (matches > 0) {
        const weight = isPhrase ? 3 : 1;
        matchCount += matches;
        weightedCount += matches * weight;
      }
    }

    if (matchCount >= 1) {
      const confidence = Math.min(100, Math.round(
        (weightedCount / (domain.keywords.length * 0.3)) * 100
      ));
      results.push({
        id: domain.id, name: domain.name, icon: domain.icon,
        matchCount, confidence,
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

// ============ 中文摘要生成（模板化，无需 API）============

function generateChineseSummary(paper) {
  const summary = paper.summary || '';
  const summaryLower = summary.toLowerCase();
  const parts = [];

  // 1. 研究主题
  const shortTitle = paper.title.length > 80
    ? paper.title.slice(0, 77) + '...'
    : paper.title;
  parts.push(`**研究主题**：${shortTitle}`);

  // 2. 识别关键技术术语
  const foundTerms = [];
  for (const [en, cn] of Object.entries(CN_TERMS)) {
    if (summaryLower.includes(en.toLowerCase())) {
      foundTerms.push(cn);
    }
  }
  const uniqueTerms = [...new Set(foundTerms)].slice(0, 6);
  if (uniqueTerms.length > 0) {
    parts.push(`**核心技术**：涉及 ${uniqueTerms.join('、')}`);
  }

  // 3. 方法论动词
  const methodSet = new Set();
  if (/\b(propose|present|introduce|novel|new)\b/gi.test(summary)) methodSet.add('提出新方法');
  if (/\b(improve|enhance|boost|better)\b/gi.test(summary)) methodSet.add('改进现有方案');
  if (/\b(achieve|obtain|reach|surpass)\b/gi.test(summary)) methodSet.add('取得优异结果');
  if (/\b(compare|outperform|beat|exceed)\b/gi.test(summary)) methodSet.add('超越基线模型');
  if (methodSet.size > 0) {
    parts.push(`**研究方法**：${[...methodSet].join('、')}`);
  }

  // 4. 数据集
  const datasetPatterns = [
    'ImageNet', 'COCO', 'CIFAR', 'MNIST', 'GLUE', 'SuperGLUE',
    'SQuAD', 'WMT', 'MMLU', 'HumanEval', 'GSM8K', 'MATH',
    'BBH', 'HellaSwag', 'ARC', 'TruthfulQA', 'OpenWebText',
  ];
  const datasets = datasetPatterns.filter(d =>
    summaryLower.includes(d.toLowerCase())
  );
  if (datasets.length > 0) {
    parts.push(`**实验数据**：在 ${datasets.join('、')} 上验证`);
  }

  // 5. 百分比提升
  const percentMatches = summary.match(/(\d+\.?\d*)\s*%/g) || [];
  if (percentMatches.length > 0) {
    parts.push(`**性能提升**：${percentMatches.slice(0, 2).join('、')}`);
  }

  // 6. 领域标签
  if (paper.domains && paper.domains.length > 0) {
    const domainNames = paper.domains.slice(0, 3).map(d => d.name).join('、');
    parts.push(`**所属领域**：${domainNames}`);
  }

  return parts.join('\n');
}

// ============ 多维质量评分算法 ============

function scorePaper(paper) {
  const title = paper.title || '';
  const summary = paper.summary || '';
  const summaryLower = summary.toLowerCase();
  const titleLower = title.toLowerCase();
  let score = 0;

  // ---- 维度 1: 基础分 (0-20) ----
  const summaryLen = summary.length;
  if (summaryLen > 300) score += 4;
  if (summaryLen > 600) score += 4;
  if (summaryLen > 1000) score += 2;

  const titleLen = title.length;
  if (titleLen > 15 && titleLen < 200) score += 4;
  if (titleLen > 30 && titleLen < 150) score += 3;
  if (title.includes(':') || title.includes('：')) score += 3;

  // ---- 维度 2: 内容质量 (0-30) ----
  const methodWords = [
    'propose', 'present', 'introduce', 'novel', 'framework',
    'method', 'approach', 'architecture', 'algorithm', 'model',
  ];
  let methodHits = 0;
  for (const w of methodWords) {
    if (summaryLower.includes(w)) methodHits++;
  }
  score += Math.min(methodHits * 3, 12);

  const experimentWords = [
    'experiment', 'evaluate', 'benchmark', 'dataset',
    'result', 'performance', 'accuracy', 'achieve',
    'compare', 'baseline', 'outperform', 'state-of-the-art', 'SOTA',
  ];
  let expHits = 0;
  for (const w of experimentWords) {
    if (summaryLower.includes(w)) expHits++;
  }
  score += Math.min(expHits * 2, 12);

  const mathCount = (summary.match(/[=><≤≥±×∑∏∫]/g) || []).length;
  score += Math.min(Math.floor(mathCount / 3), 6);

  // ---- 维度 3: 结构质量 (0-15) ----
  if (paper.authors.length >= 3) score += 3;
  if (paper.authors.length >= 6) score += 3;
  if (paper.authors.length >= 10) score += 2;

  const csCats = paper.categories.filter(c => c.startsWith('cs.'));
  if (csCats.length >= 2) score += 4;
  if (csCats.length >= 3) score += 3;

  // ---- 维度 4: AI 相关性 (0-20) ----
  const aiTerms = [
    'deep learning', 'neural network', 'transformer', 'attention',
    'language model', 'vision', 'reinforcement learning',
    'representation learning', 'generative', 'diffusion',
    'self-supervised', 'contrastive', 'embedding',
    'classification', 'detection', 'segmentation',
    'optimization', 'gradient', 'training',
    'inference', 'prediction', 'generation',
  ];
  let aiHits = 0;
  for (const term of aiTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    if (regex.test(summary)) aiHits++;
    if (regex.test(title)) aiHits += 2;
  }
  score += Math.min(aiHits, 20);

  // ---- 维度 5: 新颖性信号 (0-10) ----
  const noveltyWords = [
    'novel', 'new', 'first', 'state-of-the-art', 'SOTA',
    'breakthrough', 'unprecedented', 'surpass', 'outperform',
    'simple yet effective', 'efficient', 'scalable',
  ];
  let novHits = 0;
  for (const w of noveltyWords) {
    if (titleLower.includes(w)) novHits += 2;
    if (summaryLower.includes(w)) novHits += 1;
  }
  score += Math.min(novHits, 10);

  // ---- 惩罚项 ----
  const vagueTitles = [
    'a survey', 'a review', 'an overview', 'literature review',
  ];
  for (const vt of vagueTitles) {
    if (titleLower.includes(vt)) score -= 3;
  }
  if (summaryLen < 150) score -= 10;

  return Math.max(0, Math.min(score, 98));
}

function scoreToStars(score) {
  if (score >= 80) return '⭐⭐⭐⭐⭐';
  if (score >= 65) return '⭐⭐⭐⭐';
  if (score >= 50) return '⭐⭐⭐';
  if (score >= 35) return '⭐⭐';
  return '⭐';
}

function scoreToGrade(score) {
  if (score >= 80) return 'S — 必读';
  if (score >= 65) return 'A — 推荐';
  if (score >= 50) return 'B — 可读';
  if (score >= 35) return 'C — 泛读';
  return 'D — 略读';
}

// ============ Markdown 生成函数 ============

function generateDailyMarkdown(date, papers) {
  const lines = [];
  lines.push('---');
  lines.push(`title: 📅 ${date} 每日论文精选`);
  lines.push(`date: ${date}`);
  lines.push('---');
  lines.push('');
  lines.push(`# 📅 ${date} 每日论文精选`);
  lines.push('');
  lines.push(`> 共 ${papers.length} 篇论文，经多维质量评分排序`);
  lines.push('');

  // 快速跳转
  lines.push('<div style="display:flex;gap:8px;flex-wrap:wrap;margin:16px 0">');
  papers.forEach((p, i) => {
    const icon = p.domains[0]?.icon || '📄';
    lines.push(`<a href="#p${i + 1}" style="font-size:12px;padding:4px 8px;border:1px solid var(--vp-c-divider);border-radius:4px;text-decoration:none">${icon} ${i + 1}</a>`);
  });
  lines.push('</div>');
  lines.push('');

  papers.forEach((paper, i) => {
    const domainLabels = paper.domains.slice(0, 3).map(d => `${d.icon} ${d.name}`);

    lines.push(`<div id="p${i + 1}">`);
    lines.push('');
    lines.push(`## ${i + 1}. ${paper.title}`);
    lines.push('');

    lines.push('| 属性 | 内容 |');
    lines.push('|------|------|');
    lines.push(`| **arXiv** | [${paper.id}](${paper.links.abs}) |`);
    const authorStr = paper.authors.slice(0, 4).join('; ');
    const authorMore = paper.authors.length > 4 ? ` 等 ${paper.authors.length} 人` : '';
    lines.push(`| **作者** | ${authorStr}${authorMore} |`);
    lines.push(`| **领域** | ${domainLabels.join('&nbsp;&nbsp;') || '未分类'} |`);
    lines.push(`| **日期** | ${paper.published} |`);
    lines.push(`| **评分** | ${paper.stars} (${paper.score}/100 · ${paper.grade}) |`);
    lines.push(`| **PDF** | [📥 下载](${paper.links.pdf}) |`);
    lines.push('');

    lines.push('<details>');
    lines.push('<summary><b>📖 英文摘要</b></summary>');
    lines.push('');
    const shortSum = paper.summary.length > 400 ? paper.summary.slice(0, 397) + '...' : paper.summary;
    lines.push(`> ${shortSum}`);
    lines.push('');
    lines.push('</details>');
    lines.push('');

    if (paper.summaryCN) {
      lines.push('<details open>');
      lines.push('<summary><b>🌐 中文概要</b></summary>');
      lines.push('');
      lines.push(paper.summaryCN);
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    lines.push('---');
    lines.push('</div>');
    lines.push('');
  });

  return lines.join('\n');
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

  // 解析
  let papers = entries.map(entry => {
    const title = getTagContent(entry, 'title').replace(/\s+/g, ' ');
    const summary = getTagContent(entry, 'summary').replace(/\s+/g, ' ');

    return {
      id: extractArxivId(entry),
      title,
      authors: extractAuthors(entry),
      summary,
      published: getTagContent(entry, 'published').substring(0, 10),
      categories: getAllTagContents(entry, 'category')
        .filter(c => c.startsWith('cs.') || c.startsWith('stat.')),
      primaryCategory: '',
      links: { abs: '', pdf: '' },
    };
  });

  papers.forEach(p => {
    p.links.abs = `https://arxiv.org/abs/${p.id}`;
    p.links.pdf = `https://arxiv.org/pdf/${p.id}`;
    p.primaryCategory = p.categories[0] || 'unknown';
  });

  // ---- 分类 ----
  console.log('🏷️  进行领域分类...\n');
  papers.forEach(p => { p.domains = classifyPaper(p); });

  // ---- 评分 ----
  console.log('📊 进行质量评分...\n');
  papers.forEach(p => {
    p.score = scorePaper(p);
    p.stars = scoreToStars(p.score);
    p.grade = scoreToGrade(p.score);
  });

  papers.sort((a, b) => b.score - a.score);

  // 统计
  const sCount = papers.filter(p => p.score >= 80).length;
  const aCount = papers.filter(p => p.score >= 65 && p.score < 80).length;
  const bCount = papers.filter(p => p.score >= 50 && p.score < 65).length;
  const cCount = papers.filter(p => p.score >= 35 && p.score < 50).length;
  const dCount = papers.filter(p => p.score < 35).length;
  console.log(`  质量分布: S=${sCount} | A=${aCount} | B=${bCount} | C=${cCount} | D=${dCount}\n`);

  // ---- 中文摘要 ----
  console.log('🌐 生成中文摘要...\n');
  papers.forEach(p => { p.summaryCN = generateChineseSummary(p); });

  // ============ 输出文件 ============

  // 1. 每日归档
  const papersByDate = {};
  papers.forEach(p => {
    const date = p.published;
    if (!papersByDate[date]) papersByDate[date] = [];
    papersByDate[date].push(p);
  });

  const dailyDir = join(ROOT, 'papers', 'daily');
  if (!existsSync(dailyDir)) mkdirSync(dailyDir, { recursive: true });

  for (const [date, dayPapers] of Object.entries(papersByDate)) {
    const md = generateDailyMarkdown(date, dayPapers);
    writeFileSync(join(dailyDir, `${date}.md`), md, 'utf-8');
    console.log(`  ✅ papers/daily/${date}.md (${dayPapers.length} 篇)`);
  }

  // 2. 论文索引 JSON
  const dataDir = join(ROOT, 'papers', 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

  let allPapers = [];
  const indexFile = join(dataDir, 'papers-index.json');
  if (existsSync(indexFile)) {
    try { allPapers = JSON.parse(readFileSync(indexFile, 'utf-8')); } catch {}
  }

  const existingIds = new Set(allPapers.map(p => p.id));
  const newPapers = papers.filter(p => !existingIds.has(p.id));
  allPapers = [...newPapers, ...allPapers].slice(0, 5000);

  // 用新评分算法重新计算历史论文（只处理缺少 domains/grade 的旧格式数据）
  console.log('  🔄 迁移历史论文数据...');
  let migrated = 0;
  allPapers.forEach(p => {
    if (!p.domains || !p.grade) {
      p.score = scorePaper(p);
      p.stars = scoreToStars(p.score);
      p.grade = scoreToGrade(p.score);
      p.domains = classifyPaper(p);
      p.summaryCN = generateChineseSummary(p);
      migrated++;
    }
  });
  if (migrated > 0) console.log(`    已迁移 ${migrated} 篇历史论文到新评分系统`);

  writeFileSync(indexFile, JSON.stringify(allPapers, null, 2), 'utf-8');
  console.log(`  📊 论文索引已更新 (总计 ${allPapers.length} 篇，新增 ${newPapers.length} 篇)`);

  // 3. 论文主页（分类卡片）
  generatePapersIndex(papers);

  // 4. 分类标签页
  generateTagPages(allPapers);

  // 5. 每周精选
  generateWeeklyDigest(allPapers);

  // 6. 搜索页
  generateSearchPage(allPapers);

  console.log('\n🎉 阶段四全部完成：多维评分 + 自动分类 + 中文摘要 + 标签页 + 周报');
}

// ============ 页面生成 ============

function generatePapersIndex(latestPapers) {
  const today = new Date().toISOString().substring(0, 10);
  const top30 = latestPapers.slice(0, 30);

  const lines = [];
  lines.push('---');
  lines.push('layout: page');
  lines.push('---');
  lines.push('');
  lines.push('# 🔬 论文追踪');
  lines.push('');
  lines.push('> 每天自动从 arXiv 获取最新 AI 论文，经**多维质量评分** + **自动分类** + **中文摘要**后展示。');
  lines.push('');

  // 统计卡片
  lines.push('## 📊 今日统计');
  lines.push('');

  const domainCounts = {};
  latestPapers.forEach(p => {
    p.domains.forEach(d => {
      domainCounts[d.name] = (domainCounts[d.name] || 0) + 1;
    });
  });
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5);
  const highQ = latestPapers.filter(p => p.score >= 65).length;

  lines.push('<div class="stats-grid">');
  lines.push(`<div class="stat-card"><div class="stat-num">${top30.length}</div><div class="stat-label">今日论文</div></div>`);
  lines.push(`<div class="stat-card highlight"><div class="stat-num">${highQ}</div><div class="stat-label">高质量(≥A级)</div></div>`);
  topDomains.forEach(([name, count]) => {
    lines.push(`<div class="stat-card"><div class="stat-num">${count}</div><div class="stat-label">${name}</div></div>`);
  });
  lines.push('</div>');
  lines.push('');

  // 分类入口
  lines.push('## 🏷️ 按领域浏览');
  lines.push('');
  lines.push('<div class="category-grid">');
  DOMAIN_CLASSIFIER.forEach(d => {
    const count = latestPapers.filter(p => p.domains.some(pd => pd.id === d.id)).length;
    if (count > 0) {
      lines.push(`<a href="/papers/tags/${d.id}" class="category-card">`);
      lines.push(`<div class="category-icon">${d.icon}</div>`);
      lines.push(`<div class="category-title">${d.name}</div>`);
      lines.push(`<div class="category-desc">今日 ${count} 篇</div>`);
      lines.push('<div class="category-count">浏览 →</div>');
      lines.push('</a>');
    }
  });
  lines.push('</div>');
  lines.push('');

  // 论文列表
  lines.push('## 📋 今日精选');
  lines.push('');
  lines.push(`> 最近更新: **${today}** · ${top30.length} 篇`);
  lines.push('');
  lines.push('| # | 领域 | 论文 | 作者 | 评分 |');
  lines.push('|---|------|------|------|------|');

  top30.forEach((paper, i) => {
    const firstAuthor = paper.authors[0] || '未知';
    const etAl = paper.authors.length > 1 ? ' et al.' : '';
    const icon = paper.domains[0]?.icon || '📄';
    const dname = paper.domains[0]?.name || paper.primaryCategory;
    const title = paper.title.length > 55 ? paper.title.slice(0, 52) + '...' : paper.title;
    lines.push(`| ${i + 1} | ${icon} ${dname} | [${title}](${paper.links.abs}) | ${firstAuthor}${etAl} | ${paper.stars} |`);
  });
  lines.push('');

  // 每日归档
  lines.push('---');
  lines.push('');
  lines.push('## 📂 每日归档');
  lines.push('');

  if (existsSync(join(ROOT, 'papers', 'daily'))) {
    const files = readdirSync(join(ROOT, 'papers', 'daily'))
      .filter(f => f.endsWith('.md')).sort().reverse().slice(0, 30);
    lines.push('<div style="display:flex;flex-wrap:wrap;gap:8px">');
    files.forEach(f => {
      const d = f.replace('.md', '');
      lines.push(`<a href="/papers/daily/${d}" style="font-size:13px;padding:6px 12px;border:1px solid var(--vp-c-divider);border-radius:20px;text-decoration:none">📅 ${d}</a>`);
    });
    lines.push('</div>');
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push('## 📌 快捷入口');
  lines.push('');
  lines.push('<div class="quick-links">');
  lines.push('<a href="/papers/weekly" class="quick-link">🔥 本周热门</a>');
  lines.push('<a href="/papers/search" class="quick-link">🔍 论文搜索</a>');
  lines.push('<a href="/news/" class="quick-link">📰 AI 资讯</a>');
  lines.push('</div>');

  writeFileSync(join(ROOT, 'papers', 'index.md'), lines.join('\n'), 'utf-8');
  console.log('  ✅ papers/index.md (分类卡片布局)');
}

function generateTagPages(allPapers) {
  const tagsDir = join(ROOT, 'papers', 'tags');
  if (!existsSync(tagsDir)) mkdirSync(tagsDir, { recursive: true });

  for (const domain of DOMAIN_CLASSIFIER) {
    const domainPapers = allPapers
      .filter(p => p.domains && p.domains.some(d => d.id === domain.id))
      .slice(0, 50);

    if (domainPapers.length === 0) continue;

    const lines = [];
    lines.push('---');
    lines.push('layout: page');
    lines.push('---');
    lines.push('');
    lines.push(`# ${domain.icon} ${domain.name}`);
    lines.push('');
    lines.push(`> 自动分类 · 共 ${domainPapers.length} 篇相关论文`);
    lines.push('');
    lines.push('---');
    lines.push('');

    const sC = domainPapers.filter(p => p.score >= 80).length;
    const aC = domainPapers.filter(p => p.score >= 65 && p.score < 80).length;
    const bC = domainPapers.filter(p => p.score >= 50 && p.score < 65).length;
    lines.push('## 📊 质量分布');
    lines.push('');
    lines.push('| S (必读) | A (推荐) | B (可读) |');
    lines.push('|----------|----------|----------|');
    lines.push(`| ${sC} 篇 | ${aC} 篇 | ${bC} 篇 |`);
    lines.push('');

    lines.push('## 📋 论文列表');
    lines.push('');
    lines.push('| # | 论文 | 作者 | 日期 | 评分 |');
    lines.push('|---|------|------|------|------|');

    domainPapers.forEach((paper, i) => {
      const firstAuthor = paper.authors[0] || '未知';
      const etAl = paper.authors.length > 1 ? ' et al.' : '';
      const title = (paper.title || '').length > 55 ? paper.title.slice(0, 52) + '...' : (paper.title || '');
      const stars = paper.stars || scoreToStars(paper.score || 0);
      lines.push(`| ${i + 1} | [${title}](${paper.links?.abs || '#'}) | ${firstAuthor}${etAl} | ${paper.published || ''} | ${stars} |`);
    });

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('> 💡 此页面由脚本自动生成。论文分类基于标题和摘要关键词匹配。');

    writeFileSync(join(tagsDir, `${domain.id}.md`), lines.join('\n'), 'utf-8');
    console.log(`  ✅ papers/tags/${domain.id}.md (${domainPapers.length} 篇)`);
  }
}

function generateWeeklyDigest(allPapers) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekStr = sevenDaysAgo.toISOString().substring(0, 10);
  const todayStr = now.toISOString().substring(0, 10);

  const weekPapers = allPapers.filter(p => p.published && p.published >= weekStr);
  const top20 = weekPapers.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 20);

  const lines = [];
  lines.push('---');
  lines.push('layout: page');
  lines.push('---');
  lines.push('');
  lines.push('# 🔥 本周热门论文');
  lines.push('');
  lines.push(`> ${weekStr} ~ ${todayStr} · 从 ${weekPapers.length} 篇中精选 Top 20`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 各领域最佳
  lines.push('## 🏆 各领域最佳');
  lines.push('');

  for (const domain of DOMAIN_CLASSIFIER) {
    const dp = weekPapers
      .filter(p => p.domains && p.domains.some(pd => pd.id === domain.id))
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
    if (dp.length === 0) continue;

    lines.push(`### ${domain.icon} ${domain.name}`);
    lines.push('');
    dp.forEach(p => {
      const firstAuthor = p.authors[0] || '未知';
      const stars = p.stars || '⭐⭐⭐';
      const title = (p.title || '').length > 70 ? p.title.slice(0, 67) + '...' : (p.title || '');
      lines.push(`- ${stars} [${title}](${p.links?.abs || '#'}) — ${firstAuthor}`);
    });
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // Top 20
  lines.push('## 📋 本周 Top 20');
  lines.push('');
  lines.push('| # | 领域 | 论文 | 评分 |');
  lines.push('|---|------|------|------|');

  top20.forEach((paper, i) => {
    const icon = (paper.domains && paper.domains[0]?.icon) || '📄';
    const dname = (paper.domains && paper.domains[0]?.name) || '';
    const title = (paper.title || '').length > 55 ? paper.title.slice(0, 52) + '...' : (paper.title || '');
    const stars = paper.stars || scoreToStars(paper.score || 0);
    lines.push(`| ${i + 1} | ${icon} ${dname} | [${title}](${paper.links?.abs || '#'}) | ${stars} |`);
  });

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('> 💡 每周精选基于多维质量评分自动生成。评分维度包括：内容质量、AI 相关性、方法新颖性、实验充分度。');

  writeFileSync(join(ROOT, 'papers', 'weekly.md'), lines.join('\n'), 'utf-8');
  console.log(`  ✅ papers/weekly.md (本周 ${weekPapers.length} 篇，精选 ${top20.length} 篇)`);
}

function generateSearchPage(allPapers) {
  const lines = [];
  lines.push('---');
  lines.push('layout: page');
  lines.push('---');
  lines.push('');
  lines.push('# 🔍 论文搜索');
  lines.push('');
  lines.push('> 使用 VitePress 内置搜索（`Ctrl+K`），或按领域浏览。');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 📊 数据库统计');
  lines.push('');
  lines.push(`| 指标 | 数值 |`);
  lines.push('|------|------|');
  lines.push(`| 📄 论文总数 | **${allPapers.length}** 篇 |`);
  lines.push(`| 📅 收录天数 | **${new Set(allPapers.map(p => p.published)).size}** 天 |`);
  lines.push(`| 🏷️ 覆盖领域 | **${DOMAIN_CLASSIFIER.length}** 个 |`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 🏷️ 按领域浏览');
  lines.push('');
  lines.push('<div class="category-grid">');
  DOMAIN_CLASSIFIER.forEach(d => {
    const count = allPapers.filter(p => p.domains && p.domains.some(pd => pd.id === d.id)).length;
    lines.push(`<a href="/papers/tags/${d.id}" class="category-card">`);
    lines.push(`<div class="category-icon">${d.icon}</div>`);
    lines.push(`<div class="category-title">${d.name}</div>`);
    lines.push(`<div class="category-desc">${count} 篇论文</div>`);
    lines.push('<div class="category-count">浏览 →</div>');
    lines.push('</a>');
  });
  lines.push('</div>');

  writeFileSync(join(ROOT, 'papers', 'search.md'), lines.join('\n'), 'utf-8');
  console.log(`  ✅ papers/search.md (${allPapers.length} 篇索引)`);
}

// ============ 执行 ============

fetchPapers().catch(err => {
  console.error('❌ 论文抓取失败:', err.message);
  process.exit(1);
});
