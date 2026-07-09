import { defineConfig } from 'vitepress'

export default defineConfig({
  // ===== 基本信息 =====
  title: 'AI Knowledge Base',           // 网站标题（显示在浏览器标签页）
  description: 'AI 论文追踪 · 行业动态 · Skills 推荐',  // 网站简介（搜索引擎会显示）
  lang: 'zh-CN',                        // 网站语言：中文

  // ===== 顶部导航栏 =====
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '论文', link: '/papers/' },
      { text: '资讯', link: '/news/' },
      { text: 'Skills', link: '/skills/' },
      { text: '关于', link: '/about' },
    ],

    // ===== 侧边栏（论文页面专用）=====
    sidebar: {
      '/papers/': [
        {
          text: '论文精选',
          items: [
            { text: '今日精选', link: '/papers/' },
            { text: '本周热门', link: '/papers/weekly' },
            { text: '论文搜索', link: '/papers/search' },
          ],
        },
        {
          text: '按领域分类',
          items: [
            { text: '大模型 (LLM)', link: '/papers/tags/llm' },
            { text: '计算机视觉 (CV)', link: '/papers/tags/cv' },
            { text: '自然语言处理 (NLP)', link: '/papers/tags/nlp' },
            { text: '强化学习 (RL)', link: '/papers/tags/rl' },
            { text: '多模态 (Multimodal)', link: '/papers/tags/multimodal' },
          ],
        },
      ],
      '/skills/': [
        {
          text: 'Skills 推荐',
          items: [
            { text: '全部 Skills', link: '/skills/' },
            { text: 'Claude Code Skills', link: '/skills/claude-code' },
            { text: 'MCP 服务器', link: '/skills/mcp' },
            { text: 'AI 效率工具', link: '/skills/tools' },
          ],
        },
      ],
    },

    // ===== 页脚 =====
    footer: {
      message: '由 GitHub Actions 自动更新',
      copyright: 'Copyright © 2026 AI Knowledge Base',
    },

    // ===== 搜索（使用 VitePress 内置搜索）=====
    search: {
      provider: 'local',               // 本地搜索（不需要外部服务）
      options: {
        translations: {
          button: {
            buttonText: '搜索',
            buttonAriaLabel: '搜索论文和内容',
          },
          modal: {
            displayDetails: '显示详情',
            resetButtonTitle: '清空',
            backButtonTitle: '返回',
            noResultsText: '没有找到结果',
            footer: {
              selectText: '选择',
              closeText: '关闭',
            },
          },
        },
      },
    },
  },
})
