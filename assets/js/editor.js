/* ============================================
   FiuuMi's Blog — 文章编辑器
   EasyMDE + GitHub API
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

  // ── 日期默认值 ──────────────────────────────
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = yyyy + '-' + mm + '-' + dd;
  }

  // ── Token 管理（从 URL 参数注入）────────────
  function getToken() {
    var stored = localStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
    // 尝试从 URL 参数 ?token=xxx 读取
    var params = new URLSearchParams(window.location.search);
    var urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem(TOKEN_KEY, urlToken);
      // 清除 URL 中的 token 参数，避免泄露
      var cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      showStatus('✅ Token 已保存，开始写作吧', 'info');
      return urlToken;
    }
    return null;
  }

  // ── EasyMDE ────────────────────────────────
  const easyMDE = new EasyMDE({
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

  // ── 标题输入时自动更新 slug ──────────────────
  titleInput.addEventListener('input', function () {
    if (!slugInput.dataset.manual) {
      slugInput.value = titleInput.value
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);
    }
  });

  slugInput.addEventListener('input', function () {
    slugInput.dataset.manual = slugInput.value ? 'true' : '';
  });

  // ── 构建 Front Matter ────────────────────────
  function buildFrontMatter(title, date, tags, slug) {
    const tagList = tags
      .split(/[,，]/)
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length > 0; });

    const slugFinal = slug || title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);

    let fm = '---\n';
    fm += 'layout: post\n';
    fm += 'title: "' + title.replace(/"/g, '\\"') + '"\n';
    fm += 'date: ' + date + ' 12:00:00 +0800\n';
    if (tagList.length > 0) {
      fm += 'tags: [' + tagList.join(', ') + ']\n';
    }
    fm += '---\n\n';

    return { frontMatter: fm, slugFinal: slugFinal };
  }

  // ── 生成文件路径 ─────────────────────────────
  function buildFilePath(date, slug) {
    return '_posts/' + date + '-' + slug + '.md';
  }

  // ── 调用 GitHub API 发布 ──────────────────────
  function publishPost() {
    const token = getToken();
    if (!token) {
      showStatus('❌ 请先配置 GitHub Token', 'error');
      return;
    }

    const title = titleInput.value.trim();
    if (!title) {
      showStatus('❌ 请输入标题', 'error');
      titleInput.focus();
      return;
    }

    const date = dateInput.value;
    if (!date) {
      showStatus('❌ 请选择日期', 'error');
      return;
    }

    const tags = tagsInput.value.trim();
    const slug = slugInput.value.trim();
    const rawContent = easyMDE.value();

    const result = buildFrontMatter(title, date, tags, slug);
    const content = result.frontMatter + rawContent;
    const filePath = buildFilePath(date, result.slugFinal);

    // base64 编码（支持中文）
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    btnPublish.disabled = true;
    btnPublish.textContent = '⏳ 发布中...';
    showStatus('⏳ 正在发布到 GitHub...', 'info');

    var apiUrl = 'https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + filePath;

    fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: '📝 新文章：' + title,
        content: base64Content,
        branch: BRANCH
      })
    })
    .then(function (response) {
      return response.json().then(function (data) {
        return { status: response.status, data: data };
      });
    })
    .then(function (result) {
      if (result.status === 201) {
        var postUrl = buildPostUrl(date, result.data.content.path);
        showStatus('✅ 发布成功！<a href="' + postUrl + '" target="_blank">查看文章 →</a>', 'success');

        // 清空编辑器
        easyMDE.value('');
        easyMDE.clearAutosavedValue();
        titleInput.value = '';
        tagsInput.value = '';
        slugInput.value = '';
        slugInput.dataset.manual = '';
      } else if (result.status === 422) {
        showStatus('❌ 文件已存在：' + filePath + '（请修改日期或标题）', 'error');
      } else if (result.status === 401) {
        showStatus('❌ Token 无效或已过期，请重新设置', 'error');
      } else {
        showStatus('❌ 发布失败（HTTP ' + result.status + '）：' + (result.data.message || '未知错误'), 'error');
      }
    })
    .catch(function (err) {
      showStatus('❌ 网络错误：' + err.message, 'error');
    })
    .finally(function () {
      btnPublish.disabled = false;
      btnPublish.textContent = '🚀 发布文章';
    });
  }

  // ── 计算文章发布后的 URL ──────────────────────
  function buildPostUrl(date, path) {
    // 从路径中提取 slug：_posts/YYYY-MM-DD-slug.md → /YYYY/MM/DD/slug/
    var match = path.match(/_posts\/(\d{4})-(\d{2})-(\d{2})-(.+)\.md$/);
    if (match) {
      return '/' + match[1] + '/' + match[2] + '/' + match[3] + '/' + match[4] + '/';
    }
    return '/';
  }

  // ── 状态提示 ──────────────────────────────────
  function showStatus(msg, type) {
    publishStatus.innerHTML = msg;
    publishStatus.className = 'publish-status ' + type;
  }

  // ── 绑定发布按钮 ──────────────────────────────
  btnPublish.addEventListener('click', publishPost);

  // ── Ctrl+Enter 快捷发布 ────────────────────────
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      publishPost();
    }
  });

  // ── Token 检查 ──────────────────────────────
  if (!getToken()) {
    showStatus('💡 首次使用请通过 <code>?token=你的token</code> 参数访问此页面来激活（仅需一次）', 'info');
  }

})();
