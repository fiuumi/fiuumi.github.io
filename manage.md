---
layout: default
title: 文章管理
---

<div class="manage-page">
  <h1 class="page-title">文章管理</h1>

  <!-- 搜索筛选 -->
  <div class="manage-filters">
    <div class="input-row">
      <div class="input-group" style="flex:2">
        <label for="filter-keyword">搜索</label>
        <input type="text" id="filter-keyword" placeholder="标题关键词..." autocomplete="off">
      </div>
      <div class="input-group" style="flex:1">
        <label for="filter-tag">标签</label>
        <select id="filter-tag">
          <option value="">全部标签</option>
        </select>
      </div>
      <div class="input-group" style="flex:1">
        <label for="filter-date-from">日期从</label>
        <input type="date" id="filter-date-from">
      </div>
      <div class="input-group" style="flex:1">
        <label for="filter-date-to">日期至</label>
        <input type="date" id="filter-date-to">
      </div>
    </div>
    <div class="filter-actions">
      <button id="btn-refresh" class="btn btn-secondary">🔄 刷新</button>
      <span id="manage-count" class="manage-count"></span>
    </div>
  </div>

  <!-- 加载状态 -->
  <div id="manage-loading" class="manage-loading">⏳ 正在加载文章列表...</div>
  <div id="manage-error" class="manage-error" style="display:none"></div>

  <!-- 文章列表 -->
  <div id="manage-list" class="manage-list" style="display:none">
    <table class="manage-table">
      <thead>
        <tr>
          <th>标题</th>
          <th>日期</th>
          <th>标签</th>
          <th class="col-actions">操作</th>
        </tr>
      </thead>
      <tbody id="manage-tbody"></tbody>
    </table>
    <div id="manage-empty" class="manage-empty" style="display:none">
      <p>没有匹配的文章</p>
    </div>
  </div>

  <!-- 删除确认模态框 -->
  <div id="delete-modal" class="modal-overlay" style="display:none">
    <div class="modal">
      <h3>确认删除</h3>
      <p>确定要删除 <strong id="delete-title"></strong> 吗？此操作不可撤销。</p>
      <div class="modal-actions">
        <button id="btn-confirm-delete" class="btn btn-danger">确认删除</button>
        <button id="btn-cancel-delete" class="btn btn-secondary">取消</button>
      </div>
      <p id="delete-status" class="publish-status" style="margin-top:12px"></p>
    </div>
  </div>

  <!-- 编辑元信息模态框 -->
  <div id="edit-modal" class="modal-overlay" style="display:none">
    <div class="modal">
      <h3>编辑文章信息</h3>
      <div class="input-group">
        <label for="edit-title">标题</label>
        <input type="text" id="edit-title" autocomplete="off">
      </div>
      <div class="input-group">
        <label for="edit-tags">标签（逗号分隔）</label>
        <input type="text" id="edit-tags" autocomplete="off">
      </div>
      <div class="modal-actions">
        <button id="btn-save-meta" class="btn btn-primary">保存</button>
        <button id="btn-cancel-edit" class="btn btn-secondary">取消</button>
      </div>
      <p id="edit-status" class="publish-status" style="margin-top:12px"></p>
    </div>
  </div>
</div>

<script src="{{ '/assets/js/manage.js' | relative_url }}"></script>
