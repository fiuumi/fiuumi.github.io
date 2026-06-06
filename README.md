# 静态博客实现方案

## 概览

基于 **Jekyll + GitHub Pages** 的个人静态博客，绑定自定义域名，零成本托管。

## 技术选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 静态站点生成器 | Jekyll | GitHub Pages 原生支持，无需构建流水线 |
| 托管 | GitHub Pages | 免费 HTTPS，支持自定义域名 |
| 域名 DNS | 域名提供商控制台 | 添加 CNAME / A 记录指向 GitHub |
| 主题 | 自写极简主题 | 轻量、无依赖、加载快 |

## 文件结构

```
static-blog/
├── _config.yml          # Jekyll 配置
├── _layouts/
│   ├── default.html     # 默认布局（页眉+页脚）
│   └── post.html        # 文章布局
├── _includes/
│   ├── header.html      # 导航栏
│   └── footer.html      # 页脚
├── _posts/              # 文章（文件名格式 YYYY-MM-DD-title.md）
├── assets/css/
│   └── style.css        # 样式
├── index.md             # 首页（文章列表）
├── about.md             # 关于页
├── CNAME                # 自定义域名（例：example.com）
├── .gitignore
└── README.md            # 本文件
```

## 部署步骤

### 1. GitHub 仓库
- 创建仓库 `{username}.github.io`（用户站点）或任意仓库名（项目站点）
- 推送到 `main` 分支

### 2. 启用 GitHub Pages
- 仓库 → Settings → Pages
- Source: `Deploy from a branch`，分支 `main`，目录 `/ (root)`
- 等待构建完成（约 1 分钟）

### 3. 配置自定义域名
- 将域名写入仓库根目录的 `CNAME` 文件（已包含）
- Settings → Pages → Custom domain，填入域名，勾选 Enforce HTTPS
- GitHub 自动申请 Let's Encrypt 证书

### 4. DNS 配置（在域名提供商处操作）

**方式 A - 子域名（推荐 blog.example.com）：**
```
类型: CNAME
名称: blog
值:   {username}.github.io
```

**方式 B - 裸域名（example.com）：**
```
类型: A
名称: @
值:   185.199.108.153
值:   185.199.109.153
值:   185.199.110.153
值:   185.199.111.153

类型: AAAA（可选，IPv6）
名称: @
值:   2606:50c0:8000::153
值:   2606:50c0:8001::153
值:   2606:50c0:8002::153
值:   2606:50c0:8003::153
```

> 以上 IP 为 GitHub Pages 当前 IP，可能变更，以 [GitHub 官方文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) 为准。

### 5. DNS 生效
- CNAME 记录通常 10 分钟内生效
- A 记录可能需要 1-24 小时
- 等待 DNS 传播完成后，HTTPS 证书自动签发（约 15 分钟）

## 日常使用

```bash
# 本地预览（需安装 Ruby + Jekyll）
gem install bundler jekyll
bundle exec jekyll serve

# 新建文章
cp _posts/2026-06-04-hello-world.md _posts/2026-06-05-my-post.md
# 编辑内容，push 即发布
```

## 扩展方向
- RSS 订阅（`jekyll-feed` 插件）
- 评论系统（Giscus / utterances）
- 站内搜索（lunr.js）
- 图片懒加载
- 标签 / 分类页
