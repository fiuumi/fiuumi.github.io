---
layout: default
title: 首页
---

{% if site.posts.size > 0 %}
<h1 class="page-title">文章</h1>
<div class="post-list">
  {% for post in site.posts %}
  <article class="post-card">
    <h2><a href="{{ post.url | relative_url }}">{{ post.title }}</a></h2>
    <div class="post-meta">
      <time datetime="{{ post.date | date: '%Y-%m-%d' }}">{{ post.date | date: "%Y-%m-%d" }}</time>
    </div>
    {% if post.excerpt %}
    <p class="post-excerpt">{{ post.excerpt | strip_html | truncate: 160 }}</p>
    {% endif %}
    {% if post.tags %}
    <div class="tags">
      {% for tag in post.tags %}
      <span class="tag">{{ tag }}</span>
      {% endfor %}
    </div>
    {% endif %}
  </article>
  {% endfor %}
</div>
{% else %}
<div class="empty-state">
  <p>还没有文章，敬请期待。</p>
</div>
{% endif %}
