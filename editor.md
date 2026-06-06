---
layout: default
title: 写文章
---

<div class="editor-page">
  <h1 class="page-title">写文章</h1>

  <!-- 设置区域 -->
  <div class="editor-section">
    <details id="settings-toggle">
      <summary>⚙️ 设置（GitHub Token）</summary>
      <div class="settings-body">
        <p class="settings-hint">
          需要 GitHub Personal Access Token 才能发布文章。
          <a href="https://github.com/settings/tokens/new?scopes=repo&description=Blog+Editor" target="_blank" rel="noopener">
            点击这里创建 Token →
          </a>
          勾选 <strong>repo</strong> 权限，生成后粘贴到下方。
          Token 仅保存在你的浏览器本地。
        </p>
        <div class="input-row">
          <input type="password" id="gh-token" placeholder="ghp_xxxxxxxxxxxx" autocomplete="off">
          <button id="save-token" class="btn btn-secondary">保存</button>
          <button id="clear-token" class="btn btn-ghost">清除</button>
        </div>
        <p id="token-status" class="token-status"></p>
      </div>
    </details>
  </div>

  <!-- 文章信息 -->
  <div class="editor-section">
    <div class="input-row">
      <div class="input-group" style="flex:2">
        <label for="post-title">标题</label>
        <input type="text" id="post-title" placeholder="文章标题" autocomplete="off">
      </div>
      <div class="input-group" style="flex:1">
        <label for="post-date">日期</label>
        <input type="date" id="post-date">
      </div>
    </div>
    <div class="input-group">
      <label for="post-tags">标签（逗号分隔）</label>
      <input type="text" id="post-tags" placeholder="技术, 随笔, ..." autocomplete="off">
    </div>
    <div class="input-group">
      <label for="post-slug">URL 标识（英文，可选，默认从标题生成）</label>
      <input type="text" id="post-slug" placeholder="my-awesome-post" autocomplete="off">
    </div>
  </div>

  <!-- 编辑器 -->
  <div class="editor-section editor-main">
    <textarea id="editor"></textarea>
  </div>

  <!-- 操作按钮 -->
  <div class="editor-section editor-actions">
    <button id="btn-publish" class="btn btn-primary">🚀 发布文章</button>
    <span id="publish-status" class="publish-status"></span>
  </div>
</div>

<!-- EasyMDE -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css">
<script src="https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js"></script>
<script src="{{ '/assets/js/editor.js' | relative_url }}"></script>
