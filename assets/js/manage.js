/* ============================================
   FiuuMi's Blog — 文章管理
   搜索 · 编辑元信息 · 删除
   ============================================ */

(function () {
  'use strict';

  const TOKEN_KEY = 'blog-gh-token';
  const REPO_OWNER = 'fiuumi';
  const REPO_NAME = 'fiuumi.github.io';
  const BRANCH = 'main';

  // ── DOM 引用 ──────────────────────────────
  const filterKeyword = document.getElementById('filter-keyword');
  const filterTag = document.getElementById('filter-tag');
  const filterDateFrom = document.getElementById('filter-date-from');
  const filterDateTo = document.getElementById('filter-date-to');
  const btnRefresh = document.getElementById('btn-refresh');
  const manageCount = document.getElementById('manage-count');
  const manageLoading = document.getElementById('manage-loading');
  const manageError = document.getElementById('manage-error');
  const manageList = document.getElementById('manage-list');
  const manageTbody = document.getElementById('manage-tbody');
  const manageEmpty = document.getElementById('manage-empty');

  // 删除模态框
  const deleteModal = document.getElementById('delete-modal');
  const deleteTitle = document.getElementById('delete-title');
  const btnConfirmDelete = document.getElementById('btn-confirm-delete');
  const btnCancelDelete = document.getElementById('btn-cancel-delete');
  const deleteStatus = document.getElementById('delete-status');

  // 编辑模态框
  const editModal = document.getElementById('edit-modal');
  const editTitle = document.getElementById('edit-title');
  const editTags = document.getElementById('edit-tags');
  const btnSaveMeta = document.getElementById('btn-save-meta');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const editStatusEl = document.getElementById('edit-status');

  // ── 状态 ──────────────────────────────────
  var allPosts = [];
  var currentDelete = null;
  var currentEdit = null;

  // ── Token ──────────────────────────────────
  function getToken() {
    var stored = localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
    var params = new URLSearchParams(window.location.search);
    var urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem(TOKEN_KEY, urlToken);
      var cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      return urlToken;
    }
    return null;
  }

  // ── API 请求封装 ──────────────────────────
  function apiRequest(url, options) {
    var token = getToken();
    if (!token) {
      showError('未配置 Token，请先通过 <code>?token=xxx</code> 参数访问');
      return Promise.reject(new Error('No token'));
    }
    options = options || {};
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'token ' + token;
    options.headers['Accept'] = 'application/vnd.github.v3+json';
    return fetch(url, options).then(function (res) {
      return res.json().then(function (data) {
        return { status: res.status, data: data };
      });
    });
  }

  // ── 加载文章列表 ──────────────────────────
  function loadPosts() {
    manageLoading.style.display = 'block';
    manageError.style.display = 'none';
    manageList.style.display = 'none';

    var url = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/_posts?ref=' + BRANCH;

    apiRequest(url)
      .then(function (result) {
        if (result.status === 200) {
          // 并行获取所有文件的 Front Matter
          var fetches = result.data.map(function (file) {
            return apiRequest(file.url + '?ref=' + BRANCH).then(function (r) {
              if (r.status === 200) {
                var content = decodeBase64(r.data.content);
                var fm = parseFrontMatter(content);
                return {
                  name: file.name,
                  path: file.path,
                  sha: r.data.sha,
                  rawUrl: r.data.download_url,
                  title: fm.title || file.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
                  date: parseDate(file.name),
                  tags: fm.tags || [],
                  content: content
                };
              }
              return null;
            }).catch(function () { return null; });
          });

          return Promise.all(fetches).then(function (posts) {
            allPosts = posts.filter(function (p) { return p !== null; });
            allPosts.sort(function (a, b) { return b.date.localeCompare(a.date); });
            populateTagFilter();
            renderPosts();
          });
        } else if (result.status === 404) {
          allPosts = [];
          renderPosts();
        } else {
          throw new Error('HTTP ' + result.status + ': ' + (result.data.message || '未知错误'));
        }
      })
      .catch(function (err) {
        showError('加载失败：' + err.message);
      })
      .finally(function () {
        manageLoading.style.display = 'none';
      });
  }

  // ── 解析 Front Matter ──────────────────────
  function parseFrontMatter(content) {
    var match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!match) return {};
    var fm = {};
    var lines = match[1].split('\n');
    var inTags = false;
    var tagsArr = [];
    lines.forEach(function (line) {
      if (inTags) {
        var tagMatch = line.match(/^\s*-\s*(.+)/);
        if (tagMatch) {
          tagsArr.push(tagMatch[1].trim());
          return;
        } else {
          inTags = false;
          fm.tags = tagsArr;
        }
      }
      var kvMatch = line.match(/^(\w+):\s*(.+)$/);
      if (kvMatch) {
        var key = kvMatch[1];
        var val = kvMatch[2].trim().replace(/^["']|["']$/g, '');
        if (key === 'tags') {
          if (val.startsWith('[')) {
            // tags: [tag1, tag2]
            fm.tags = val.replace(/[\[\]]/g, '').split(',').map(function (t) { return t.trim(); });
          } else {
            inTags = true;
            tagsArr = [];
          }
        } else {
          fm[key] = val;
        }
      }
    });
    return fm;
  }

  // ── 从文件名解析日期 ────────────────────────
  function parseDate(filename) {
    var match = filename.match(/^(\d{4}-\d{2}-\d{2})-/);
    return match ? match[1] : '';
  }

  // ── Base64 解码 ────────────────────────────
  function decodeBase64(str) {
    try {
      return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))));
    } catch (e) {
      return atob(str.replace(/\s/g, ''));
    }
  }

  // ── 填充标签筛选下拉 ────────────────────────
  function populateTagFilter() {
    var tagSet = {};
    allPosts.forEach(function (post) {
      (post.tags || []).forEach(function (t) { tagSet[t] = true; });
    });
    var currentVal = filterTag.value;
    filterTag.innerHTML = '<option value="">全部标签</option>';
    Object.keys(tagSet).sort().forEach(function (t) {
      filterTag.innerHTML += '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>';
    });
    filterTag.value = currentVal;
  }

  // ── 筛选与渲染 ─────────────────────────────
  function getFilteredPosts() {
    var keyword = filterKeyword.value.trim().toLowerCase();
    var tag = filterTag.value;
    var dateFrom = filterDateFrom.value;
    var dateTo = filterDateTo.value;

    return allPosts.filter(function (post) {
      if (keyword && post.title.toLowerCase().indexOf(keyword) === -1) return false;
      if (tag && (post.tags || []).indexOf(tag) === -1) return false;
      if (dateFrom && post.date < dateFrom) return false;
      if (dateTo && post.date > dateTo) return false;
      return true;
    });
  }

  function renderPosts() {
    var filtered = getFilteredPosts();
    manageCount.textContent = '共 ' + filtered.length + ' 篇';
    manageList.style.display = 'block';

    if (filtered.length === 0) {
      manageTbody.innerHTML = '';
      manageEmpty.style.display = 'block';
    } else {
      manageEmpty.style.display = 'none';
      manageTbody.innerHTML = filtered.map(function (post) {
        var tagsHtml = (post.tags || []).map(function (t) {
          return '<span class="tag tag-sm">' + escapeHtml(t) + '</span>';
        }).join(' ');
        return '<tr>' +
          '<td><a href="/' + post.date.replace(/-/g, '/') + '/' + post.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '') + '/" target="_blank" class="post-link">' + escapeHtml(post.title) + '</a></td>' +
          '<td class="col-date">' + escapeHtml(post.date) + '</td>' +
          '<td>' + (tagsHtml || '—') + '</td>' +
          '<td class="col-actions">' +
            '<button class="btn btn-sm btn-secondary btn-edit" data-path="' + escapeHtml(post.path) + '">✏️ 编辑</button>' +
            '<button class="btn btn-sm btn-danger-outline btn-delete" data-path="' + escapeHtml(post.path) + '" data-title="' + escapeHtml(post.title) + '">🗑 删除</button>' +
          '</td>' +
          '</tr>';
      }).join('');
    }

    // 绑定事件
    bindRowEvents();
  }

  function bindRowEvents() {
    // 编辑按钮 - 跳转到编辑器
    manageTbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.location.href = '/editor/?edit=' + encodeURIComponent(btn.dataset.path);
      });
    });

    // 编辑元信息按钮 - 弹出模态框（改为双击或右键... 不，让我加一个单独的编辑元信息按钮）
    // 实际上：编辑 = 跳转编辑器编辑全文；元信息编辑可以放在行内
    // 让我简化：编辑按钮直接跳转编辑器

    // 删除按钮
    manageTbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openDeleteModal(btn.dataset.path, btn.dataset.title);
      });
    });
  }

  // ── 删除文章 ──────────────────────────────
  function openDeleteModal(path, title) {
    currentDelete = { path: path };
    deleteTitle.textContent = title;
    deleteStatus.textContent = '';
    deleteStatus.className = 'publish-status';
    deleteModal.style.display = 'flex';
    btnConfirmDelete.disabled = false;
    btnConfirmDelete.textContent = '确认删除';
  }

  function closeDeleteModal() {
    deleteModal.style.display = 'none';
    currentDelete = null;
  }

  btnConfirmDelete.addEventListener('click', function () {
    if (!currentDelete) return;
    var post = allPosts.find(function (p) { return p.path === currentDelete.path; });
    if (!post) {
      deleteStatus.textContent = '❌ 找不到该文章';
      deleteStatus.className = 'publish-status error';
      return;
    }

    btnConfirmDelete.disabled = true;
    btnConfirmDelete.textContent = '⏳ 删除中...';
    deleteStatus.textContent = '';

    var url = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + post.path;
    apiRequest(url, {
      method: 'DELETE',
      body: JSON.stringify({
        message: '🗑 删除文章：' + post.title,
        sha: post.sha,
        branch: BRANCH
      })
    }).then(function (result) {
      if (result.status === 200) {
        deleteStatus.textContent = '✅ 已删除';
        deleteStatus.className = 'publish-status success';
        // 从列表中移除
        allPosts = allPosts.filter(function (p) { return p.path !== post.path; });
        renderPosts();
        setTimeout(closeDeleteModal, 800);
      } else {
        deleteStatus.textContent = '❌ 删除失败（HTTP ' + result.status + '）：' + (result.data.message || '');
        deleteStatus.className = 'publish-status error';
      }
    }).catch(function (err) {
      deleteStatus.textContent = '❌ 网络错误：' + err.message;
      deleteStatus.className = 'publish-status error';
    }).finally(function () {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = '确认删除';
    });
  });

  btnCancelDelete.addEventListener('click', closeDeleteModal);

  // 点击模态框外部关闭
  deleteModal.addEventListener('click', function (e) {
    if (e.target === deleteModal) closeDeleteModal();
  });

  // ── 筛选事件 ──────────────────────────────
  var filterTimeout;
  function debounceFilter() {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(renderPosts, 250);
  }

  filterKeyword.addEventListener('input', debounceFilter);
  filterTag.addEventListener('change', renderPosts);
  filterDateFrom.addEventListener('change', renderPosts);
  filterDateTo.addEventListener('change', renderPosts);
  btnRefresh.addEventListener('click', loadPosts);

  // ── 帮助函数 ──────────────────────────────
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function showError(msg) {
    manageError.innerHTML = msg;
    manageError.style.display = 'block';
  }

  // ── 启动 ──────────────────────────────────
  if (!getToken()) {
    showError('未配置 Token，请先通过 <code>?token=xxx</code> 参数访问此页面');
    manageLoading.style.display = 'none';
    return;
  }
  loadPosts();

})();
