/* ============================================
   FiuuMi's Blog — 交互脚本
   暗色模式 · 进度条 · TOC · 返回顶部
   ============================================ */

(function () {
  'use strict';

  // ── 暗色模式 ──────────────────────────────
  const THEME_KEY = 'blog-theme';
  const toggleBtn = document.getElementById('theme-toggle');

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (toggleBtn) {
      toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
      toggleBtn.setAttribute('aria-label', theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式');
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  }

  applyTheme(getPreferredTheme());

  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }

  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
    if (!localStorage.getItem(THEME_KEY)) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });

  // ── 阅读进度条 ──────────────────────────────
  const progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    function updateProgress() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const pct = Math.min((scrollTop / docHeight) * 100, 100);
        progressBar.style.width = pct + '%';
      }
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // ── 返回顶部按钮 ──────────────────────────────
  const backBtn = document.getElementById('back-to-top');
  if (backBtn) {
    function toggleBackBtn() {
      if (window.scrollY > 400) {
        backBtn.classList.add('visible');
      } else {
        backBtn.classList.remove('visible');
      }
    }
    window.addEventListener('scroll', toggleBackBtn, { passive: true });
    backBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    toggleBackBtn();
  }

  // ── 页眉滚动效果 ──────────────────────────────
  const header = document.querySelector('.site-header');
  if (header) {
    function toggleHeaderShadow() {
      if (window.scrollY > 10) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
    window.addEventListener('scroll', toggleHeaderShadow, { passive: true });
    toggleHeaderShadow();
  }

  // ── 文章目录 (TOC) ──────────────────────────
  const tocContainer = document.getElementById('toc');
  if (tocContainer) {
    const postContent = document.querySelector('.post-content');
    if (postContent) {
      const headings = postContent.querySelectorAll('h2, h3');
      if (headings.length >= 2) {
        const list = document.createElement('ul');

        headings.forEach(function (heading) {
          // 确保标题有 id
          if (!heading.id) {
            heading.id = heading.textContent
              .trim()
              .toLowerCase()
              .replace(/[^\w\u4e00-\u9fff]+/g, '-')
              .replace(/^-|-$/g, '');
          }

          const li = document.createElement('li');
          if (heading.tagName === 'H3') {
            li.classList.add('toc-h3');
          }

          const a = document.createElement('a');
          a.href = '#' + heading.id;
          a.textContent = heading.textContent.trim();

          li.appendChild(a);
          list.appendChild(li);
        });

        tocContainer.appendChild(list);

        // 高亮当前章节
        const tocLinks = tocContainer.querySelectorAll('a');
        const observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              const id = entry.target.id;
              const link = tocContainer.querySelector('a[href="#' + CSS.escape(id) + '"]');
              if (link) {
                if (entry.isIntersecting) {
                  tocLinks.forEach(function (l) { l.classList.remove('active'); });
                  link.classList.add('active');
                }
              }
            });
          },
          { rootMargin: '-80px 0px -70% 0px' }
        );

        headings.forEach(function (h) { observer.observe(h); });
      } else {
        tocContainer.style.display = 'none';
      }
    } else {
      tocContainer.style.display = 'none';
    }
  }

  // ── 表格响应式包装 ──────────────────────────
  document.querySelectorAll('.post-content table').forEach(function (table) {
    if (!table.parentElement.classList.contains('table-wrapper')) {
      const wrapper = document.createElement('div');
      wrapper.classList.add('table-wrapper');
      wrapper.style.overflowX = 'auto';
      wrapper.style.margin = '24px 0';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    }
  });

})();
