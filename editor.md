---
layout: default
title: 写文章
---

<div class="editor-page">
  <h1 class="page-title">写文章</h1>

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
