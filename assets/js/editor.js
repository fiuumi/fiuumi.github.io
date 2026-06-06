/* ============================================
   FiuuMi's Blog — 文章编辑器
   EasyMDE + GitHub API · 支持新建和编辑
   ============================================ */

(function () {
  'use strict';

  const TOKEN_KEY = 'blog-gh-token';
  const REPO_OWNER = 'fiuumi';
  const REPO_NAME = 'fiuumi.github.io';
  const BRANCH = 'main';

  // ── DOM 引用 ──────────────────────────────
  const titleInput = document.getElementById('post-title');
  const dateInput = document.getElementById('post-date');
  const tagsInput = document.getElementById('post-tags');
  const slugInput = document.getElementById('post-slug');
  const btnPublish = document.getElementById('btn-publish');
  const publishStatus = document.getElementById('publish-status');

  // ── 编辑模式状态 ──────────────────────────
  var editMode = false;
  var editSha = null;

  // ── 日期默认值 ──────────────────────────────
  if (dateInput) {
    var today = new Date();
    var yyyy = today.getFullYear();
    var mm = String(today.getMonth() + 1).padStart(2, '0');
    var dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = yyyy + '-' + mm + '-' + dd;
  }

  // ── Token 管理（从 URL 参数注入）────────────
  function getToken() {
    var stored = localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
    var params = new URLSearchParams(window.location.search);
    var urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem(TOKEN_KEY, urlToken);
      var cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      showStatus('✅ Token 已保存，开始写作吧', 'info');
      return urlToken;
    }
    return null;
  }

  // ── API 请求封装 ──────────────────────────
  function apiRequest(url, options) {
    var token = getToken();
    if (!token) {
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

  function decodeBase64(str) {
    try {
      return decodeURIComponent(escape(atob(str.replace(/\s/g, ''))));
    } catch (e) {
      return atob(str.replace(/\s/g, ''));
    }
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

  // ── EasyMDE ────────────────────────────────
  var easyMDE = new EasyMDE({
    element: document.getElementById('editor'),
    spellChecker: false,
    placeholder: '开始写作...',
    autosave: {
      enabled: true,
      uniqueId: 'blog-editor',
      delay: 3000
    },
    toolbar: [
      'heading', 'bold', 'italic', 'strikethrough', '|',
      'quote', 'code', 'unordered-list', 'ordered-list', '|',
      'link', 'image', 'table', 'horizontal-rule', '|',
      'preview', 'side-by-side', 'fullscreen', '|',
      'guide'
    ],
    status: ['lines', 'words', 'cursor'],
    tabSize: 2,
    renderingConfig: {
      codeSyntaxHighlighting: true
    }
  });

  // ── 标题自动更新 slug ──────────────────────
  titleInput.addEventListener('input', function () {
    if (!slugInput.dataset.manual) {
      slugInput.value = titleInput.value
        .trim().toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
        .replace(/\s+/g, '-').replace(/-+/g, '-')
        .replace(/^-|-$/g, '').substring(0, 80);
    }
  });
  slugInput.addEventListener('input', function () {
    slugInput.dataset.manual = slugInput.value ? 'true' : '';
  });

  // ── 构建 Front Matter ──────────────────────
  function buildFrontMatter(title, date, tags, slug) {
    var tagList = tags.split(/[,，]/).map(function (t) { return t.trim(); }).filter(function (t) { return t.length > 0; });
    var slugFinal = slug || title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 80);
    var fm = '---\nlayout: post\n';
    fm += 'title: "' + title.replace(/"/g, '\\"') + '"\n';
    fm += 'date: ' + date + ' 12:00:00 +0800\n';
    if (tagList.length > 0) fm += 'tags: [' + tagList.join(', ') + ']\n';
    fm += '---\n\n';
    return { frontMatter: fm, slugFinal: slugFinal };
  }

  function buildFilePath(date, slug) {
    return '_posts/' + date + '-' + slug + '.md';
  }

  // ── 发布/更新文章 ──────────────────────────
  function publishPost() {
    var token = getToken();
    if (!token) { showStatus('❌ 请先配置 Token', 'error'); return; }
    var title = titleInput.value.trim();
    if (!title) { showStatus('❌ 请输入标题', 'error'); titleInput.focus(); return; }
    var date = dateInput.value;
    if (!date) { showStatus('❌ 请选择日期', 'error'); return; }
    var tags = tagsInput.value.trim();
    var slug = slugInput.value.trim();
    var rawContent = easyMDE.value();

    var result = buildFrontMatter(title, date, tags, slug);
    var content = result.frontMatter + rawContent;
    var filePath = buildFilePath(date, result.slugFinal);
    var base64Content = btoa(unescape(encodeURIComponent(content)));

    btnPublish.disabled = true;
    btnPublish.textContent = '⏳ ' + (editMode ? '更新中...' : '发布中...');
    showStatus('⏳ 正在' + (editMode ? '更新' : '发布') + '到 GitHub...', 'info');

    var apiUrl = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + (editMode ? filePath : filePath);

    var body = {
      message: (editMode ? '✏️ 更新文章：' : '📝 新文章：') + title,
      content: base64Content,
      branch: BRANCH
    };
    if (editMode && editSha) body.sha = editSha;

    apiRequest(apiUrl, {
      method: 'PUT',
      body: JSON.stringify(body)
    }).then(function (result) {
      if (result.status === 201 || result.status === 200) {
        var postUrl = result.data.content ? buildPostUrl(date, result.data.content.path) : '/';
        showStatus('✅ ' + (editMode ? '更新成功' : '发布成功') + '！<a href="' + postUrl + '" target="_blank">查看文章 →</a>', 'success');
        if (!editMode) resetEditor();
        // 更新 sha（编辑后 SHA 会变）
        if (editMode && result.data.content) editSha = result.data.content.sha;
      } else if (result.status === 422) {
        showStatus('❌ 文件已存在：' + filePath + '（请修改日期或标题）', 'error');
      } else if (result.status === 401) {
        showStatus('❌ Token 无效或已过期', 'error');
      } else {
        showStatus('❌ 失败（HTTP ' + result.status + '）：' + (result.data.message || '未知错误'), 'error');
      }
    }).catch(function (err) {
      showStatus('❌ 网络错误：' + err.message, 'error');
    }).finally(function () {
      btnPublish.disabled = false;
      btnPublish.textContent = editMode ? '💾 更新文章' : '🚀 发布文章';
    });
  }

  function buildPostUrl(date, path) {
    var match = path.match(/_posts\/(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/);
    if (match) return '/' + match[1] + '/' + match[2] + '/' + match[3] + '/' + match[4] + '/';
    return '/';
  }

  function resetEditor() {
    easyMDE.value('');
    easyMDE.clearAutosavedValue();
    titleInput.value = '';
    tagsInput.value = '';
    slugInput.value = '';
    slugInput.dataset.manual = '';
    editMode = false;
    editSha = null;
    btnPublish.textContent = '🚀 发布文章';
    if (dateInput) {
      var t = new Date();
      dateInput.value = t.getFullYear() + '-' + String(t.getMonth()+1).padStart(2,'0') + '-' + String(t.getDate()).padStart(2,'0');
    }
  }

  function showStatus(msg, type) {
    publishStatus.innerHTML = msg;
    publishStatus.className = 'publish-status ' + type;
  }

  // ── 加载编辑模式 ──────────────────────────
  function loadEditMode(filePath) {
    var token = getToken();
    if (!token) { showStatus('❌ 请先配置 Token', 'error'); return; }

    showStatus('⏳ 正在加载文章...', 'info');
    var apiUrl = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + filePath + '?ref=' + BRANCH;

    apiRequest(apiUrl, {}).then(function (result) {
      if (result.status === 200) {
        editSha = result.data.sha;
        var content = decodeBase64(result.data.content);
        var fm = parseFrontMatter(content);
        // 去掉 Front Matter，保留正文
        var body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');

        titleInput.value = fm.title || '';
        // 从文件名解析日期
        var dateMatch = filePath.match(/_posts\/(\d{4}-\d{2}-\d{2})-/);
        if (dateMatch && dateInput) dateInput.value = dateMatch[1];
        tagsInput.value = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');
        slugInput.value = filePath.replace(/_posts\/\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
        slugInput.dataset.manual = 'true';

        easyMDE.value(body);
        easyMDE.clearAutosavedValue();

        editMode = true;
        btnPublish.textContent = '💾 更新文章';
        showStatus('✅ 文章已加载，修改后点击「更新文章」保存', 'success');
      } else {
        showStatus('❌ 加载文章失败（HTTP ' + result.status + '）', 'error');
      }
    }).catch(function (err) {
      showStatus('❌ 网络错误：' + err.message, 'error');
    });
  }

  // ── 绑定发布按钮 ──────────────────────────
  btnPublish.addEventListener('click', publishPost);
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); publishPost(); }
  });

  // ── 初始化 ────────────────────────────────
  var params = new URLSearchParams(window.location.search);
  var editFile = params.get('edit');
  if (editFile) {
    if (!getToken()) {
      showStatus('💡 请先通过 <code>?token=xxx</code> 参数访问此页面来激活', 'info');
    } else {
      loadEditMode(editFile);
    }
  } else {
    if (!getToken()) {
      showStatus('💡 首次使用请通过 <code>?token=你的token</code> 参数访问此页面来激活（仅需一次）', 'info');
    }
  }

})();
