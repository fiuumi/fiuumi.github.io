/* ============================================
   FiuuMi's Blog — 文章管理 v2
   ============================================ */

(function () {
  'use strict';

  var TK = 'blog-gh-token';
  var OWNER = 'fiuumi', REPO = 'fiuumi.github.io', BR = 'main';

  // DOM
  var fKw = id('filter-keyword'), fTag = id('filter-tag');
  var fFrom = id('filter-date-from'), fTo = id('filter-date-to');
  var btnR = id('btn-refresh'), cnt = id('manage-count');
  var loadEl = id('manage-loading'), errEl = id('manage-error');
  var listEl = id('manage-list'), tbody = id('manage-tbody'), emptyEl = id('manage-empty');
  var dModal = id('delete-modal'), dTitle = id('delete-title');
  var dOk = id('btn-confirm-delete'), dCancel = id('btn-cancel-delete'), dStatus = id('delete-status');

  var posts = [], delTarget = null;

  function id(s) { return document.getElementById(s); }

  // Token
  function token() {
    var s = localStorage.getItem(TK); if (s) return s;
    var t = new URLSearchParams(location.search).get('token');
    if (t) { localStorage.setItem(TK, t); history.replaceState({},'',location.origin+location.pathname); return t; }
    return null;
  }

  // API
  function api(url, opts) {
    var t = token();
    if (!t) { err('请先配置 Token：用 <code>?token=你的token</code> 访问一次即可。'); return Promise.reject('NO_TOKEN'); }
    opts = opts || {}; opts.headers = opts.headers || {};
    opts.headers['Authorization'] = 'token ' + t;
    opts.headers['Accept'] = 'application/vnd.github.v3+json';
    return fetch(url, opts).then(function(r){
      return r.json().then(function(d){ return {ok:r.ok, code:r.status, body:d}; });
    });
  }

  function b64(s) {
    try { return decodeURIComponent(escape(atob(s.replace(/\s/g,'')))); }
    catch(e) { return atob(s.replace(/\s/g,'')); }
  }

  // Front Matter
  function fmParse(raw) {
    var m = raw.match(/^---\s*\n([\s\S]*?)\n---/);
    if (!m) return {};
    var o = {}, lines = m[1].split('\n'), inT = false, tb = [];
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (inT) { var tm = L.match(/^\s*-[ ]*(.+)/); if (tm) { tb.push(tm[1].trim()); continue; } else { inT=false; o.tags=tb; } }
      var kv = L.match(/^(\w+):\s*(.*)/);
      if (!kv) continue;
      var k = kv[1], v = kv[2].trim().replace(/^["']|["']$/g,'');
      if (k === 'tags') {
        if (v.startsWith('[')) { o.tags = v.replace(/[\[\]'"]/g,'').split(/[,，]/).map(function(x){return x.trim();}).filter(Boolean); }
        else if (v) { o.tags = [v]; }
        else { inT = true; tb = []; }
      } else { o[k] = v; }
    }
    return o;
  }

  function fileDate(n) { var m = n.match(/^(\d{4}-\d{2}-\d{2})-/); return m?m[1]:''; }

  // 加载
  function load() {
    loadEl.style.display = 'block'; errEl.style.display = 'none'; listEl.style.display = 'none';
    api('https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/_posts?ref='+BR)
    .then(function(r){
      if (r.code === 404) { posts=[]; render(); return; }
      if (!r.ok) throw new Error('HTTP '+r.code+': '+(r.body.message||''));
      var jobs = r.body.map(function(f){
        return api(f.url+'?ref='+BR).then(function(fr){
          if (!fr.ok) return null;
          var raw = b64(fr.body.content), fm = fmParse(raw);
          return { name:f.name, path:f.path, sha:fr.body.sha,
            title: fm.title || f.name.replace(/^\d{4}-\d{2}-\d{2}-/,'').replace(/\.md$/,''),
            date: fileDate(f.name), tags: fm.tags||[], content:raw };
        }).catch(function(){return null;});
      });
      return Promise.all(jobs).then(function(ps){
        posts = ps.filter(Boolean);
        posts.sort(function(a,b){return b.date.localeCompare(a.date);});
        fillTags(); render();
      });
    }).catch(function(e){
      if (e === 'NO_TOKEN') return;
      err('加载失败：'+e.message+'<br>Token 可能已过期或无权限。');
    }).finally(function(){ loadEl.style.display = 'none'; });
  }

  function fillTags() {
    var set = {}; posts.forEach(function(p){(p.tags||[]).forEach(function(t){set[t]=true;});});
    var cur = fTag.value;
    fTag.innerHTML = '<option value="">全部标签</option>';
    Object.keys(set).sort().forEach(function(t){ fTag.innerHTML += '<option value="'+esc(t)+'">'+esc(t)+'</option>'; });
    fTag.value = cur;
  }

  // 筛选
  function filtered() {
    var kw = fKw.value.trim().toLowerCase(), tg = fTag.value, df = fFrom.value, dt = fTo.value;
    return posts.filter(function(p){
      if (kw && p.title.toLowerCase().indexOf(kw) === -1) return false;
      if (tg && (p.tags||[]).indexOf(tg) === -1) return false;
      if (df && p.date < df) return false;
      if (dt && p.date > dt) return false;
      return true;
    });
  }

  // 渲染
  function render() {
    var list = filtered();
    cnt.textContent = '共 ' + list.length + ' 篇（总计 ' + posts.length + ' 篇）';
    listEl.style.display = 'block';

    if (!tbody) { err('页面结构异常，请刷新重试。'); return; }

    if (list.length === 0) {
      tbody.innerHTML = '';
      emptyEl.style.display = 'block';
    } else {
      emptyEl.style.display = 'none';
      tbody.innerHTML = list.map(function(p){
        var tg = (p.tags||[]).map(function(t){return '<span class="tag tag-sm">'+esc(t)+'</span>';}).join(' ');
        var slug = p.name.replace(/^\d{4}-\d{2}-\d{2}-/,'').replace(/\.md$/,'');
        var lnk = '/'+p.date.replace(/-/g,'/')+'/'+slug+'/';
        return '<tr><td><a href="'+lnk+'" target="_blank" class="post-link">'+esc(p.title)+'</a></td>'+
          '<td class="col-date">'+esc(p.date)+'</td><td>'+(tg||'—')+'</td>'+
          '<td class="col-actions">'+
            '<button class="btn btn-sm btn-secondary" data-edit="'+esc(p.path)+'">✏️</button> '+
            '<button class="btn btn-sm btn-danger-outline" data-del="'+esc(p.path)+'" data-dtitle="'+esc(p.title)+'">🗑</button>'+
          '</td></tr>';
      }).join('');
    }
    bind();
  }

  function bind() {
    if (!tbody) return;
    tbody.querySelectorAll('[data-edit]').forEach(function(b){
      b.onclick = function(){ location.href='/editor/?edit='+encodeURIComponent(b.dataset.edit); };
    });
    tbody.querySelectorAll('[data-del]').forEach(function(b){
      b.onclick = function(){ delOpen(b.dataset.del, b.dataset.dtitle); };
    });
  }

  // 删除
  function delOpen(path, title) {
    delTarget = path; dTitle.textContent = title;
    dStatus.textContent = ''; dStatus.className = 'publish-status';
    dModal.style.display = 'flex'; dOk.disabled = false; dOk.textContent = '确认删除';
  }
  function delClose() { dModal.style.display = 'none'; delTarget = null; }

  dOk.onclick = function(){
    if (!delTarget) return;
    var p = posts.find(function(x){return x.path===delTarget;});
    if (!p) { dStatus.textContent = '❌ 找不到'; dStatus.className = 'publish-status error'; return; }
    dOk.disabled = true; dOk.textContent = '⏳'; dStatus.textContent = '';
    api('https://api.github.com/repos/'+OWNER+'/'+REPO+'/contents/'+p.path, {
      method:'DELETE', body: JSON.stringify({message:'🗑 '+p.title, sha:p.sha, branch:BR})
    }).then(function(r){
      if (r.ok) {
        dStatus.textContent = '✅ 已删除'; dStatus.className = 'publish-status success';
        posts = posts.filter(function(x){return x.path!==p.path;});
        render(); setTimeout(delClose, 800);
      } else {
        dStatus.textContent = '❌ HTTP '+r.code+': '+(r.body.message||''); dStatus.className = 'publish-status error';
      }
    }).catch(function(e){
      dStatus.textContent = '❌ '+e.message; dStatus.className = 'publish-status error';
    }).finally(function(){ dOk.disabled = false; dOk.textContent = '确认删除'; });
  };
  dCancel.onclick = delClose;
  dModal.onclick = function(e){ if (e.target===dModal) delClose(); };

  // 搜索事件 —— 同时监听 input 和 keyup 确保触发
  var t;
  function scheduleRender() { clearTimeout(t); t = setTimeout(render, 200); }
  fKw.addEventListener('input', scheduleRender);
  fKw.addEventListener('keyup', scheduleRender);
  fTag.addEventListener('change', render);
  fFrom.addEventListener('change', render);
  fTo.addEventListener('change', render);
  btnR.addEventListener('click', load);

  // 工具
  function esc(s) { var d = document.createElement('div'); d.appendChild(document.createTextNode(s)); return d.innerHTML; }
  function err(msg) { if (errEl) { errEl.innerHTML = msg; errEl.style.display = 'block'; } }

  // 启动
  load();
})();
