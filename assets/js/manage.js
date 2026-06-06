/* ============================================
   FiuuMi's Blog — 文章管理
   搜索 · 编辑 · 删除
   ============================================ */

(function () {
  'use strict';

  var TOKEN_KEY = 'blog-gh-token';
  var REPO_OWNER = 'fiuumi';
  var REPO_NAME = 'fiuumi.github.io';
  var BRANCH = 'main';

  // ── DOM ───────────────────────────────────
  var filterKeyword = document.getElementById('filter-keyword');
  var filterTag = document.getElementById('filter-tag');
  var filterDateFrom = document.getElementById('filter-date-from');
  var filterDateTo = document.getElementById('filter-date-to');
  var btnRefresh = document.getElementById('btn-refresh');
  var manageCount = document.getElementById('manage-count');
  var manageLoading = document.getElementById('manage-loading');
  var manageError = document.getElementById('manage-error');
  var manageList = document.getElementById('manage-list');
  var manageTbody = document.getElementById('manage-tbody');
  var manageEmpty = document.getElementById('manage-empty');
  var deleteModal = document.getElementById('delete-modal');
  var deleteTitle = document.getElementById('delete-title');
  var btnConfirmDelete = document.getElementById('btn-confirm-delete');
  var btnCancelDelete = document.getElementById('btn-cancel-delete');
  var deleteStatus = document.getElementById('delete-status');

  var allPosts = [];
  var currentDelete = null;

  // ── Token ─────────────────────────────────
  function getToken() {
    var s = localStorage.getItem(TOKEN_KEY);
    if (s) return s;
    var p = new URLSearchParams(window.location.search);
    var t = p.get('token');
    if (t) {
      localStorage.setItem(TOKEN_KEY, t);
      window.history.replaceState({}, '', window.location.origin + window.location.pathname);
      return t;
    }
    return null;
  }

  // ── API ───────────────────────────────────
  function api(url, opts) {
    var token = getToken();
    if (!token) return Promise.reject(new Error('NO_TOKEN'));
    opts = opts || {};
    opts.headers = opts.headers || {};
    opts.headers['Authorization'] = 'token ' + token;
    opts.headers['Accept'] = 'application/vnd.github.v3+json';
    return fetch(url, opts).then(function (r) {
      return r.json().then(function (d) { return { ok: r.ok, status: r.status, data: d }; });
    });
  }

  function b64decode(s) {
    try { return decodeURIComponent(escape(atob(s.replace(/\s/g, '')))); }
    catch (e) { return atob(s.replace(/\s/g, '')); }
  }

  // ── Front Matter 解析 ────────────────────
  function parseFM(raw) {
    var m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!m) return {};
    var fm = {};
    var lines = m[1].split('\n');
    var inTags = false, tagBuf = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      // 多行 tags
      if (inTags) {
        var tm = line.match(/^\s*-[ ]*(.+)/);
        if (tm) { tagBuf.push(tm[1].trim()); continue; }
        else { inTags = false; fm.tags = tagBuf; }
      }
      var kv = line.match(/^(\w+):\s*(.*)$/);
      if (!kv) continue;
      var key = kv[1], val = kv[2].trim();
      if (key === 'tags') {
        // 支持 ['a','b'] 或 [a, b] 或 "a, b" 等格式
        val = val.replace(/^["']|["']$/g, '');
        if (val.startsWith('[')) {
          fm.tags = val.replace(/[\[\]'"]/g, '').split(/[,，]/).map(function(t){return t.trim();}).filter(Boolean);
        } else if (val) {
          // 单值 tags: tag1
          fm.tags = [val];
        } else {
          inTags = true; tagBuf = [];
        }
      } else {
        fm[key] = val.replace(/^["']|["']$/g, '');
      }
    }
    return fm;
  }

  function fileDate(name) {
    var m = name.match(/^(\d{4}-\d{2}-\d{2})-/);
    return m ? m[1] : '';
  }

  // ── 加载 ──────────────────────────────────
  function load() {
    if (!manageLoading || !manageError || !manageList) return;
    manageLoading.style.display = 'block';
    manageError.style.display = 'none';
    manageList.style.display = 'none';

    var token = getToken();
    if (!token) {
      manageLoading.style.display = 'none';
      showErr('未配置 Token。<br>请通过 <code>?token=你的token</code> 参数访问此页面来激活（仅需一次）。');
      return;
    }

    api('https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/_posts?ref=' + BRANCH)
      .then(function (r) {
        if (r.status === 404) { allPosts = []; render(); return; }
        if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + (r.data.message || '未知'));

        var jobs = r.data.map(function (f) {
          return api(f.url + '?ref=' + BRANCH).then(function (fr) {
            if (!fr.ok) return null;
            var raw = b64decode(fr.data.content);
            var fm = parseFM(raw);
            return {
              name: f.name, path: f.path, sha: fr.data.sha,
              title: fm.title || f.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''),
              date: fileDate(f.name),
              tags: fm.tags || [],
              content: raw
            };
          }).catch(function () { return null; });
        });

        return Promise.all(jobs).then(function (posts) {
          allPosts = posts.filter(Boolean);
          allPosts.sort(function (a, b) { return b.date.localeCompare(a.date); });
          fillTags();
          render();
        });
      })
      .catch(function (err) {
        if (err.message === 'NO_TOKEN') { showErr('未配置 Token。'); return; }
        showErr('加载失败：' + err.message + '<br>请检查 Token 是否有效，或刷新重试。');
      })
      .finally(function () { manageLoading.style.display = 'none'; });
  }

  // ── 标签下拉 ──────────────────────────────
  function fillTags() {
    var set = {};
    allPosts.forEach(function (p) { (p.tags||[]).forEach(function (t) { set[t]=true; }); });
    var cur = filterTag.value;
    filterTag.innerHTML = '<option value="">全部标签</option>';
    Object.keys(set).sort().forEach(function (t) {
      filterTag.innerHTML += '<option value="' + esc(t) + '">' + esc(t) + '</option>';
    });
    filterTag.value = cur;
  }

  // ── 筛选 ──────────────────────────────────
  function filtered() {
    var kw = filterKeyword.value.trim().toLowerCase();
    var tg = filterTag.value;
    var df = filterDateFrom.value;
    var dt = filterDateTo.value;
    return allPosts.filter(function (p) {
      if (kw && p.title.toLowerCase().indexOf(kw) === -1) return false;
      if (tg && (p.tags||[]).indexOf(tg) === -1) return false;
      if (df && p.date < df) return false;
      if (dt && p.date > dt) return false;
      return true;
    });
  }

  // ── 渲染 ──────────────────────────────────
  function render() {
    var posts = filtered();
    manageCount.textContent = '共 ' + posts.length + ' 篇';
    manageList.style.display = 'block';

    if (!manageTbody) return;

    if (posts.length === 0) {
      manageTbody.innerHTML = '';
      manageEmpty.style.display = 'block';
    } else {
      manageEmpty.style.display = 'none';
      manageTbody.innerHTML = posts.map(function (p) {
        var tagHtml = (p.tags||[]).map(function (t) {
          return '<span class="tag tag-sm">' + esc(t) + '</span>';
        }).join(' ');
        var slug = p.name.replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, '');
        var link = '/' + p.date.replace(/-/g, '/') + '/' + slug + '/';
        return '<tr>' +
          '<td><a href="' + link + '" target="_blank" class="post-link">' + esc(p.title) + '</a></td>' +
          '<td class="col-date">' + esc(p.date) + '</td>' +
          '<td>' + (tagHtml || '—') + '</td>' +
          '<td class="col-actions">' +
            '<button class="btn btn-sm btn-secondary btn-edit" data-path="' + esc(p.path) + '">✏️</button> ' +
            '<button class="btn btn-sm btn-danger-outline btn-delete" data-path="' + esc(p.path) + '" data-title="' + esc(p.title) + '">🗑</button>' +
          '</td></tr>';
      }).join('');
    }
    bind();
  }

  function bind() {
    if (!manageTbody) return;
    manageTbody.querySelectorAll('.btn-edit').forEach(function (b) {
      b.addEventListener('click', function () {
        window.location.href = '/editor/?edit=' + encodeURIComponent(b.dataset.path);
      });
    });
    manageTbody.querySelectorAll('.btn-delete').forEach(function (b) {
      b.addEventListener('click', function () {
        openDel(b.dataset.path, b.dataset.title);
      });
    });
  }

  // ── 删除 ──────────────────────────────────
  function openDel(path, title) {
    currentDelete = { path: path };
    deleteTitle.textContent = title;
    deleteStatus.textContent = '';
    deleteStatus.className = 'publish-status';
    deleteModal.style.display = 'flex';
    btnConfirmDelete.disabled = false;
    btnConfirmDelete.textContent = '确认删除';
  }

  function closeDel() { deleteModal.style.display = 'none'; currentDelete = null; }

  btnConfirmDelete.addEventListener('click', function () {
    if (!currentDelete) return;
    var post = allPosts.find(function (p) { return p.path === currentDelete.path; });
    if (!post) { deleteStatus.innerHTML = '❌ 找不到该文章'; deleteStatus.className = 'publish-status error'; return; }
    btnConfirmDelete.disabled = true;
    btnConfirmDelete.textContent = '⏳';
    deleteStatus.textContent = '';

    api('https://api.github.com/repos/' + REPO_OWNER + '/' + REPO_NAME + '/contents/' + post.path, {
      method: 'DELETE',
      body: JSON.stringify({ message: '🗑 删除：' + post.title, sha: post.sha, branch: BRANCH })
    }).then(function (r) {
      if (r.ok) {
        deleteStatus.textContent = '✅ 已删除'; deleteStatus.className = 'publish-status success';
        allPosts = allPosts.filter(function (p) { return p.path !== post.path; });
        render();
        setTimeout(closeDel, 800);
      } else {
        deleteStatus.textContent = '❌ 失败 HTTP ' + r.status + ': ' + (r.data.message||'');
        deleteStatus.className = 'publish-status error';
      }
    }).catch(function (e) {
      deleteStatus.textContent = '❌ ' + e.message;
      deleteStatus.className = 'publish-status error';
    }).finally(function () {
      btnConfirmDelete.disabled = false;
      btnConfirmDelete.textContent = '确认删除';
    });
  });

  btnCancelDelete.addEventListener('click', closeDel);
  deleteModal.addEventListener('click', function (e) { if (e.target === deleteModal) closeDel(); });

  // ── 事件 ──────────────────────────────────
  var filterTimer;
  filterKeyword.addEventListener('input', function () {
    clearTimeout(filterTimer);
    filterTimer = setTimeout(render, 250);
  });
  filterTag.addEventListener('change', render);
  filterDateFrom.addEventListener('change', render);
  filterDateTo.addEventListener('change', render);
  btnRefresh.addEventListener('click', load);

  // ── 工具 ──────────────────────────────────
  function esc(s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }
  function showErr(msg) {
    if (manageError) { manageError.innerHTML = msg; manageError.style.display = 'block'; }
  }

  // ── 启动 ──────────────────────────────────
  load();

})();
