---
layout: page
---

# 🔌 MCP 服务器

> **MCP（Model Context Protocol，模型上下文协议）** 是 Anthropic 发布的开放标准协议。它让 Claude 能够安全地连接各种外部工具和服务——就像 USB 协议让电脑连接各种外设一样。

---

## 什么是 MCP？为什么重要？

在没有 MCP 之前，每个 AI 工具和每个外部服务之间的连接都需要单独开发，"M 对 N"的集成问题非常痛苦。MCP 统一了这个协议：

```
之前：每个 AI × 每个服务 = 专用集成
Claude ──── 专用代码 ──── GitHub
Claude ──── 专用代码 ──── 数据库
Claude ──── 专用代码 ──── 浏览器

之后：AI → MCP ← 服务
Claude ──── MCP 协议 ──── GitHub
                          ├── 数据库
                          ├── 浏览器
                          └── ...任意服务
```

---

## 🔧 如何安装 MCP 服务器？

MCP 服务器在 Claude Code 中的配置非常简单。你需要编辑 Claude Code 的配置文件：

**配置文件位置：**
- Windows: `C:\Users\你的用户名\.claude\settings.json`
- Mac/Linux: `~/.claude/settings.json`

**基本格式：**

```json
{
  "mcpServers": {
    "服务器名称": {
      "command": "启动命令",
      "args": ["参数1", "参数2"],
      "env": {
        "API_KEY": "你的密钥"
      }
    }
  }
}
```

你可以用 `/config` 命令在 Claude Code 中直接编辑，也可以手动修改文件。

---

## 📋 MCP 服务器推荐

### Filesystem MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟢 新手友好 |
| **官方** | ✅ Anthropic 官方维护 |
| **用途** | 让 Claude 安全地读写本地文件系统 |

**配置方法：**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-filesystem",
        "E:\\你的项目目录"
      ]
    }
  }
}
```

**功能：**
- 读取、创建、编辑文件
- 列出目录结构
- 搜索文件内容
- 移动和复制文件

**安全说明：** 只有配置中指定的目录可被访问，其他目录对 Claude 不可见。

**实测评价：** ✅ Claude Code 本身已有文件访问能力，但 MCP 版本更灵活，适合需要精细控制访问范围的场景。

</div>

---

### GitHub MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟡 需配置 |
| **官方** | ✅ Anthropic 官方维护 |
| **用途** | 让 Claude 直接操作 GitHub 仓库 |

**准备工作：**
1. 打开 [GitHub Personal Access Token 页面](https://github.com/settings/tokens)
2. 点击 "Generate new token (classic)"
3. 勾选 `repo`、`read:org`、`workflow` 权限
4. 复制生成的 Token

**配置方法：**

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_你的Token"
      }
    }
  }
}
```

**功能：**
- 创建和管理 Issue
- 提交和审查 Pull Request
- 搜索仓库代码
- 查看 Actions 工作流状态
- 管理 Release

**实测评价：** ✅ 非常实用。最常用的场景是让 Claude 帮你创建 Issue 和提交 PR，省去手动操作 GitHub 网页的麻烦。

</div>

---

### Brave Search MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟡 需配置 |
| **官方** | ✅ Anthropic 官方维护 |
| **用途** | 为 Claude 提供联网搜索能力，获取最新信息 |

**准备工作：**
1. 打开 [Brave Search API](https://brave.com/search/api/) 注册页面
2. 免费注册账号（每月 2000 次免费查询）
3. 在 Dashboard 中复制 API Key

**配置方法：**

```json
{
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-brave-search"],
      "env": {
        "BRAVE_API_KEY": "你的API Key"
      }
    }
  }
}
```

**功能：**
- 网页搜索（获取最新信息）
- 新闻搜索（按时间筛选）
- 本地搜索（搜索附近的商家/地点）

**实测评价：** ✅ Claude Code 自带搜索功能，但 Brave Search MCP 结果更丰富、更稳定。免费额度对个人使用足够。中国用户需要注意网络环境。

</div>

---

### Puppeteer MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟡 需配置 |
| **官方** | ✅ Anthropic 官方维护 |
| **用途** | 让 Claude 控制无头浏览器，实现网页自动化操作 |

**配置方法：**

```json
{
  "mcpServers": {
    "puppeteer": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-puppeteer"]
    }
  }
}
```

**功能：**
- 打开网页并截图
- 自动填写表单
- 点击按钮和链接
- 提取网页数据（爬虫）

**适用场景：**
- 自动抓取论文信息
- 测试网页功能是否正常
- 批量截图文档页面
- 监控网页内容变化

**实测评价：** ✅ 功能强大，但偶尔会遇到网页反爬虫机制。适合做数据采集和自动化测试。

</div>

---

### SQLite MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟡 需配置 |
| **官方** | ❌ 社区维护 |
| **用途** | 让 Claude 操作 SQLite 数据库——查询、建表、分析数据 |

**配置方法：**

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-sqlite", "database.db"]
    }
  }
}
```

**功能：**
- 执行 SQL 查询
- 创建和修改表结构
- 导入/导出数据
- 数据分析（配合 Claude 的自然语言理解）

**适用场景：**
- 让 Claude 帮你分析数据库中的数据
- 用自然语言描述需求，Claude 转为 SQL 执行
- 快速查看数据统计和趋势

**实测评价：** ✅ "帮我分析这个数据库中用户的行为模式"——一句话就能让 Claude 写 SQL 并解释结果，效率极高。

</div>

---

### Memory MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟢 新手友好 |
| **官方** | ✅ Anthropic 官方维护 |
| **用途** | 给 Claude 一个持久化的知识图谱记忆系统 |

**配置方法：**

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-memory"]
    }
  }
}
```

**功能：**
- 跨会话记住信息（比 `/memory` 更强大）
- 建立知识图谱：实体 → 关系 → 实体
- 自动关联相关信息
- 支持中文内容

**适用场景：**
- 长期项目：让 Claude 记住所有设计决策
- 学习助手：追踪你的学习进度和知识点
- 个人知识库：和本项目配合使用效果更佳

**实测评价：** ✅ Claude Code 内置的 `/memory` 已经很好用，但 Memory MCP 的知识图谱能力更强，适合需要复杂记忆的场景。

</div>

---

### Sequential Thinking MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟡 需配置 |
| **官方** | ✅ Anthropic 官方维护 |
| **用途** | 增强 Claude 的逐步推理能力，适合复杂问题分析 |

**配置方法：**

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-sequential-thinking"]
    }
  }
}
```

**功能：**
- 强制 Claude 逐步思考
- 每一步都可以修正和回溯
- 适合数学、逻辑、算法等复杂推理

**适用场景：**
- 复杂算法设计
- 数学证明
- 系统架构决策
- 调试难以复现的 bug

**实测评价：** ✅ 对复杂问题的回答质量有明显提升。代价是响应时间变长。建议只在真正需要深度思考时使用。

</div>

---

### Google Drive MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟡 需配置 |
| **官方** | ❌ 社区维护 |
| **用途** | 让 Claude 读取和管理 Google Drive 中的文件 |

**准备工作：**
1. 在 Google Cloud Console 创建项目
2. 启用 Google Drive API
3. 创建 OAuth 2.0 凭据
4. 下载凭据 JSON 文件

**配置方法：**

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-gdrive"],
      "env": {
        "GOOGLE_CREDENTIALS_PATH": "credentials.json"
      }
    }
  }
}
```

**功能：**
- 列出和搜索文件
- 读取文档、表格、幻灯片
- 创建和编辑文件
- 管理文件夹

**实测评价：** ⚠️ 配置步骤较多，需要 Google Cloud Console 操作。但配置好后非常方便——可以直接让 Claude 分析你 Drive 里的文档。

</div>

---

### Slack MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🟡 需配置 |
| **官方** | ✅ Anthropic 官方维护 |
| **用途** | 让 Claude 在 Slack 工作空间中收发消息、搜索内容 |

**准备工作：**
1. 在 Slack API 页面创建 App
2. 配置 OAuth 权限（channels:history, chat:write 等）
3. 安装到工作空间并获取 Bot Token

**配置方法：**

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-你的Token"
      }
    }
  }
}
```

**功能：**
- 搜索频道中的历史消息
- 发送消息到频道
- 查看频道列表
- 获取用户信息

**实测评价：** ✅ 适合需要从 Slack 中检索信息的场景。比如："帮我总结 #general 频道里最近关于这次上线的讨论"。

</div>

---

### Postgres MCP

<div class="skill-detail">

| 属性 | 内容 |
|------|------|
| **难度** | 🔴 需开发基础 |
| **官方** | ❌ 社区维护 |
| **用途** | 让 Claude 连接和操作 PostgreSQL 数据库 |

**配置方法：**

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://用户名:密码@主机:5432/数据库名"
      }
    }
  }
}
```

**功能：**
- 执行 SQL 查询
- 查看表结构和索引
- 分析查询性能
- 导出数据

**安全提醒：** 建议使用**只读**数据库账户，避免 Claude 误操作修改数据。

**实测评价：** ✅ 数据库管理员的得力助手。用自然语言描述需求，Claude 自动生成 SQL 并解释结果。**强烈建议只给只读权限。**

</div>

---

## 🗂️ MCP 服务器快速对比

| 服务器 | 难度 | 最适合 | 配置时间 |
|--------|------|--------|---------|
| Filesystem | 🟢 | 文件操作 | 1 分钟 |
| Memory | 🟢 | 知识记忆 | 1 分钟 |
| GitHub | 🟡 | 代码管理 | 3 分钟 |
| Brave Search | 🟡 | 联网搜索 | 3 分钟 |
| SQLite | 🟡 | 数据分析 | 2 分钟 |
| Sequential Thinking | 🟡 | 深度推理 | 1 分钟 |
| Puppeteer | 🟡 | 网页自动化 | 2 分钟 |
| Slack | 🟡 | 团队协作 | 10 分钟 |
| Google Drive | 🟡 | 文档管理 | 15 分钟 |
| Postgres | 🔴 | 数据库操作 | 5 分钟 |

---

## 🎯 推荐安装顺序

### 新手必装（零门槛）

```
1. Memory MCP      — 让 Claude 记忆更强大
2. Filesystem MCP  — 灵活的文件操作
```

### 进阶推荐（值得配置）

```
3. GitHub MCP      — 如果你用 GitHub
4. Brave Search MCP — 需要稳定搜索
5. SQLite MCP      — 有数据分析需求
```

### 按需选择

```
6. Sequential Thinking — 解决复杂问题
7. Puppeteer        — 需要网页自动化
8. Slack            — 团队用 Slack
9. Postgres         — 有 PostgreSQL 数据库
10. Google Drive    — 文档在 Google Drive
```

---

## 📚 发现更多 MCP 服务器

MCP 生态正在快速发展，每天都有新的服务器发布：

- **官方仓库**: [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- **社区精选**: [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- **npm 搜索**: 在 [npmjs.com](https://www.npmjs.com) 搜索 `mcp-server`

> 💡 **提示**：安装新的 MCP 服务器后，需要重启 Claude Code 才能生效。
