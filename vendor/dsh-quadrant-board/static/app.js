/* 单机任务与知识看板 · 前端逻辑（原生 JS，兼容 Chrome 86） */
'use strict';

/* ---------------- 工具 ---------------- */

function $(s, r) { return (r || document).querySelector(s); }
function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function api(method, url, body) {
  var opt = { method: method, headers: {} };
  if (body !== undefined) {
    opt.headers['Content-Type'] = 'application/json';
    opt.body = JSON.stringify(body);
  }
  return fetch(url, opt).then(function (r) {
    return r.json().then(function (j) {
      if (!j.ok) throw new Error(j.error || ('HTTP ' + r.status));
      return j;
    });
  });
}

var toastTimer = null;
function toast(msg, isErr) {
  var t = $('#toast');
  t.textContent = msg;
  t.className = 'show' + (isErr ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.className = ''; }, 2200);
}

function pad(n) { return n < 10 ? '0' + n : '' + n; }

/* ---------------- 轻量 Markdown 渲染（离线、先转义再渲染，防注入） ---------------- */

function mdInline(s) {
  s = s.replace(/`([^`\n]+)`/g, function (m, c) { return '<code>' + c + '</code>'; });
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
    function (m, t, u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + t + '</a>'; });
  return s;
}

function mdRender(src) {
  var lines = esc(src == null ? '' : src).split('\n');
  var html = [], inCode = false, listTag = null, para = [];

  function flushPara() {
    if (para.length) { html.push('<p>' + para.map(mdInline).join('<br>') + '</p>'); para = []; }
  }
  function flushList() {
    if (listTag) { html.push('</' + listTag + '>'); listTag = null; }
  }

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^\s*```/.test(line)) {
      if (inCode) { html.push('</code></pre>'); inCode = false; }
      else { flushPara(); flushList(); html.push('<pre><code>'); inCode = true; }
      continue;
    }
    if (inCode) { html.push(line + '\n'); continue; }

    var m;
    if (/^\s*$/.test(line)) { flushPara(); flushList(); continue; }
    if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
      flushPara(); flushList();
      var lv = m[1].length;
      html.push('<h' + lv + '>' + mdInline(m[2]) + '</h' + lv + '>');
      continue;
    }
    if (/^\s*(---|\*\*\*)\s*$/.test(line)) { flushPara(); flushList(); html.push('<hr>'); continue; }
    if ((m = /^&gt;\s?(.*)$/.exec(line))) {
      flushPara(); flushList();
      html.push('<blockquote>' + mdInline(m[1]) + '</blockquote>');
      continue;
    }
    if ((m = /^\s*[-*]\s+(.*)$/.exec(line))) {
      flushPara();
      if (listTag !== 'ul') { flushList(); html.push('<ul>'); listTag = 'ul'; }
      html.push('<li>' + mdInline(m[1]) + '</li>');
      continue;
    }
    if ((m = /^\s*\d+[.、]\s*(.*)$/.exec(line))) {
      flushPara();
      if (listTag !== 'ol') { flushList(); html.push('<ol>'); listTag = 'ol'; }
      html.push('<li>' + mdInline(m[1]) + '</li>');
      continue;
    }
    flushList();
    para.push(line);
  }
  flushPara(); flushList();
  if (inCode) html.push('</code></pre>');
  return html.join('');
}

/* 把 "2026-08-27 15:30" 或 ISO 都解析为 Date */
function parseDT(s) {
  if (!s) return null;
  var d = new Date(s.replace(' ', 'T'));
  return isNaN(d.getTime()) ? null : d;
}

/* ---------------- SVG 图标库 ---------------- */

var SVG = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4m0 0l-5 5m5-5l5 5M4 20h16"/></svg>'
};

/* 快捷区内置图标（离线 SVG，后期可在数组里直接扩充） */
var BUILTIN_ICONS = {
  app: { name: '应用', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>' },
  folder: { name: '文件夹', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>' },
  web: { name: '网页', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 4 5.7 4 9s-1.5 6.4-4 9c-2.5-2.6-4-5.7-4-9s1.5-6.4 4-9z"/></svg>' },
  doc: { name: '文档', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>' },
  term: { name: '命令行', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 9l3 3-3 3M12 15h6"/></svg>' },
  calc: { name: '计算', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/></svg>' },
  note: { name: '记事', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>' },
  code: { name: '代码', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>' },
  mail: { name: '邮件', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 6L2 7"/></svg>' },
  music: { name: '音乐', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>' },
  img: { name: '图片', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>' },
  gear: { name: '设置', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.9 2.9l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.9-2.9l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.9-2.9l.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.9 2.9l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z"/></svg>' },
  star: { name: '收藏', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>' },
  chart: { name: '图表', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>' },
  book: { name: '阅读', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M20 17v5H6.5a2.5 2.5 0 0 1 0-5"/></svg>' },
  db: { name: '数据', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/></svg>' },
  link: { name: '链接', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>' },
  game: { name: '娱乐', svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v4M5 13h4M15.5 11.5h.01M18 14h.01"/></svg>' }
};

/* ---------------- 全局状态 ---------------- */

var state = {
  tasks: [],
  shortcuts: [],
  weeks: [],
  notesWeek: '',
  noteEntries: [],
  filter: { q: '', tag: '', showDone: false },
  editingTaskId: null,
  editingScId: null,
  scIcon: 'builtin:app',
  sideEditing: false
};

var LS = window.localStorage;
function pref(k, d) {
  try { var v = LS.getItem('tb.' + k); return v === null ? d : JSON.parse(v); }
  catch (e) { return d; }
}
function setPref(k, v) { try { LS.setItem('tb.' + k, JSON.stringify(v)); } catch (e) {} }

/* ---------------- 主题 ---------------- */

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#btn-theme').innerHTML = t === 'dark' ? SVG.sun : SVG.moon;
}
applyTheme(pref('theme', 'light'));
/* 支持 ?theme=dark / ?theme=light 强制指定（便于演示与测试） */
(function () {
  var m = /[?&]theme=(dark|light)/.exec(location.search);
  if (m) { applyTheme(m[1]); setPref('theme', m[1]); }
})();
$('#btn-theme').addEventListener('click', function () {
  var t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(t); setPref('theme', t);
});

/* ---------------- 时钟（1s，成本极低） ---------------- */

function tick() {
  var d = new Date();
  $('#clock .t').textContent = pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  var wd = '日一二三四五六'.charAt(d.getDay());
  $('#clock .d').textContent = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' 周' + wd;
}
tick(); setInterval(tick, 1000);

/* ---------------- 任务看板 ---------------- */

function quadrant(t) { return t.important ? (t.urgent ? 1 : 2) : (t.urgent ? 3 : 4); }

function deadlineBadge(t) {
  if (!t.deadline) return '';
  var d = parseDT(t.deadline);
  if (!d) return '';
  var now = new Date();
  var label = (d.getMonth() + 1) + '月' + d.getDate() + '日 ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  if (t.done) return '<span class="badge dl">' + esc(label) + '</span>';
  var ms = d - now;
  if (ms < 0) return '<span class="badge dl over">已过期 · ' + esc(label) + '</span>';
  if (ms < 24 * 3600e3) return '<span class="badge dl soon">24h 内 · ' + esc(label) + '</span>';
  var days = Math.ceil(ms / (24 * 3600e3));
  return '<span class="badge dl">' + days + ' 天后 · ' + esc(label) + '</span>';
}

function taskCard(t) {
  var el = document.createElement('div');
  el.className = 'task' + (t.done ? ' done' : '');
  el.dataset.id = t.id;
  var tags = (t.tags || []).map(function (x) { return '<span class="t-tag">' + esc(x) + '</span>'; }).join('');
  el.innerHTML =
    '<div class="t-row">' +
      '<button class="t-check" title="完成/重开">' + SVG.check + '</button>' +
      '<div class="t-main">' +
        '<div class="t-title">' + esc(t.title) + '</div>' +
        '<div class="t-meta">' + deadlineBadge(t) + tags +
          (t.note ? '<span class="badge note">备注</span>' : '') +
        '</div>' +
        (t.note ? '<div class="t-note">' + esc(t.note) + '</div>' : '') +
      '</div>' +
      '<button class="t-edit" title="编辑">' + SVG.pen + '</button>' +
    '</div>';

  $('.t-check', el).addEventListener('click', function (e) {
    e.stopPropagation();
    api('PUT', '/taskboard/api/tasks/' + t.id, { done: !t.done })
      .then(function () { t.done = !t.done; renderBoard(); })
      .catch(function (err) { toast(err.message, true); });
  });
  $('.t-edit', el).addEventListener('click', function (e) {
    e.stopPropagation(); openTaskModal(t);
  });
  if (t.note) {
    el.addEventListener('click', function () { el.classList.toggle('show-note'); });
  }
  /* 跨象限拖拽用 Pointer Events（pointerDrag），不再依赖原生 HTML5 DnD */
  pointerDrag(el, {
    ignore: function (t) { return t.closest && t.closest('button'); },
    onMove: function (e) {
      var q = underPoint(e, '.quad');
      $$('.quad').forEach(function (x) { x.classList.toggle('dragover', x === q); });
    },
    onClear: function () { $$('.quad').forEach(function (x) { x.classList.remove('dragover'); }); },
    onDrop: function (e) {
      $$('.quad').forEach(function (x) { x.classList.remove('dragover'); });
      var q = underPoint(e, '.quad');
      if (!q) return;
      var n = +q.dataset.q;
      var imp = (n === 1 || n === 2), urg = (n === 1 || n === 3);
      if (t.important === imp && t.urgent === urg) return;
      api('PUT', '/taskboard/api/tasks/' + t.id, { important: imp, urgent: urg })
        .then(function () { t.important = imp; t.urgent = urg; renderBoard(); toast('已移动到象限 ' + n); })
        .catch(function (err) { toast(err.message, true); });
    }
  });
  return el;
}

function passFilter(t) {
  var f = state.filter;
  if (t.done && !f.showDone) return false;
  if (f.tag && (t.tags || []).indexOf(f.tag) < 0) return false;
  if (f.q) {
    var hay = (t.title + ' ' + (t.note || '') + ' ' + (t.tags || []).join(' ')).toLowerCase();
    if (hay.indexOf(f.q.toLowerCase()) < 0) return false;
  }
  return true;
}

function sortTasks(list) {
  return list.sort(function (a, b) {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    var da = parseDT(a.deadline), db = parseDT(b.deadline);
    if (da && db) return da - db;
    if (da) return -1;
    if (db) return 1;
    return (a.created || '') < (b.created || '') ? 1 : -1;
  });
}

function renderBoard() {
  var groups = { 1: [], 2: [], 3: [], 4: [] };
  state.tasks.forEach(function (t) { if (passFilter(t)) groups[quadrant(t)].push(t); });
  Object.keys(groups).forEach(function (q) { sortTasks(groups[q]); });

  $$('.quad').forEach(function (quad) {
    var q = +quad.dataset.q;
    var body = $('.quad-body', quad);
    body.innerHTML = '';
    $('.count', quad).textContent = groups[q].length;
    if (!groups[q].length) {
      body.innerHTML = '<div class="empty">暂无任务 —— 可从其他象限拖拽过来</div>';
      return;
    }
    groups[q].forEach(function (t) { body.appendChild(taskCard(t)); });
  });
  renderTagbar();
}

function renderTagbar() {
  var bar = $('#taglist');
  var all = [];
  state.tasks.forEach(function (t) {
    (t.tags || []).forEach(function (x) { if (all.indexOf(x) < 0) all.push(x); });
  });
  bar.innerHTML = '';
  all.forEach(function (tag) {
    var c = document.createElement('button');
    c.className = 'chip' + (state.filter.tag === tag ? ' on' : '');
    c.textContent = '#' + tag;
    c.addEventListener('click', function () {
      state.filter.tag = state.filter.tag === tag ? '' : tag;
      renderBoard();
    });
    bar.appendChild(c);
  });
}

/* ---------------- 指针拖拽（Pointer Events，嵌入 iframe 下原生 HTML5 DnD 不可靠） ---------------- */

/* 通用指针拖拽：按下 → 移动超 6px 进入拖拽 → 松手落点回调。
   opts: { ignore(target), onMove(e), onDrop(e), onClear() } */
function pointerDrag(el, opts) {
  var sx = 0, sy = 0, armed = false, dragging = false;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (opts.ignore && opts.ignore(e.target)) return;
    armed = true; dragging = false; sx = e.clientX; sy = e.clientY;
    e.preventDefault();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  });
  function move(e) {
    if (!armed) return;
    if (!dragging) {
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (dx * dx + dy * dy < 36) return;
      dragging = true;
      el.classList.add('ptr-dragging');
    }
    if (opts.onMove) opts.onMove(e);
  }
  function up(e) {
    if (!armed) return;
    armed = false;
    var was = dragging;
    dragging = false;
    el.classList.remove('ptr-dragging');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    if (opts.onClear) opts.onClear();
    if (was && opts.onDrop) opts.onDrop(e);
  }
}
/* 指针下的元素（拖拽中的元素 pointer-events:none，不挡命中） */
function underPoint(e, selector, self) {
  var el = document.elementFromPoint(e.clientX, e.clientY);
  var hit = el && el.closest ? el.closest(selector) : null;
  return (hit && hit !== self) ? hit : null;
}

/* ---------------- 6 磁贴自由布局（列数 + 拖拽换位，自动记忆） ---------------- */

var TILE_IDS = ['q1', 'q2', 'notes', 'q3', 'q4']; /* 默认布局：随手记在右列竖跨两行，无快捷区 */
var layout = { cols: 3, order: TILE_IDS.slice(), spans: {}, rowSpans: { notes: 2 } };

function loadLayout() {
  var saved = pref('layout.v4', null); /* v4：随手记改为纵向跨两行 */
  if (saved && typeof saved === 'object') {
    if (saved.cols >= 1 && saved.cols <= 6) layout.cols = saved.cols;
    if (Array.isArray(saved.order)) {
      /* 合并保存的顺序与当前已知磁贴（容错：新增/缺失都能自愈） */
      var order = saved.order.filter(function (id) { return TILE_IDS.indexOf(id) >= 0; });
      TILE_IDS.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
      layout.order = order;
    }
    if (saved.spans && typeof saved.spans === 'object') {
      TILE_IDS.forEach(function (id) {
        var s = +saved.spans[id];
        if (s >= 1 && s <= 6) layout.spans[id] = s;
      });
    }
    if (saved.rowSpans && typeof saved.rowSpans === 'object') {
      TILE_IDS.forEach(function (id) {
        var s = +saved.rowSpans[id];
        if (s >= 1 && s <= 6) layout.rowSpans[id] = s;
      });
    }
  }
}

function getSpan(id) { return layout.spans[id] || 1; }

function applyLayout() {
  $('#tiles').style.setProperty('--cols', layout.cols);
  $('#cols-num').textContent = layout.cols + ' 列';
  layout.order.forEach(function (id, i) {
    var el = $('[data-tile="' + id + '"]');
    if (!el || !el.classList.contains('tile')) return;
    el.style.order = i;
    var s = Math.max(1, Math.min(getSpan(id), layout.cols));
    el.style.gridColumn = 'span ' + s;
    var rs = (layout.rowSpans && layout.rowSpans[id]) || 1;
    el.style.gridRow = 'span ' + rs;
  });
  setPref('layout.v4', layout);
  renderMocks();
}

function setSpan(id, delta) {
  var s = Math.max(1, Math.min(getSpan(id) + delta, layout.cols));
  layout.spans[id] = s;
  applyLayout();
}

$('#cols-minus').addEventListener('click', function () {
  if (layout.cols > 1) { layout.cols--; applyLayout(); }
});
$('#cols-plus').addEventListener('click', function () {
  if (layout.cols < 6) { layout.cols++; applyLayout(); }
});

/* 布局设置面板：模型块拖拽换位 + 跨列微调（主界面不放任何控件） */

var TILE_META = {
  q1: { name: '紧急 · 重要', cls: 'q1' },
  q2: { name: '重要 · 不紧急', cls: 'q2' },
  q3: { name: '紧急 · 不重要', cls: 'q3' },
  q4: { name: '不紧急 · 不重要', cls: 'q4' },
  notes: { name: '随手记', cls: '' }
};

function renderMocks() {
  var box = $('#mock-tiles');
  if (!box) return;
  box.style.setProperty('--cols', layout.cols);
  box.innerHTML = '';
  layout.order.forEach(function (id) {
    var m = TILE_META[id];
    var s = Math.max(1, Math.min(getSpan(id), layout.cols));
    var d = document.createElement('div');
    d.className = 'mock ' + m.cls;
    d.dataset.tile = id;
    d.style.gridColumn = 'span ' + s;
    d.style.gridRow = 'span ' + ((layout.rowSpans && layout.rowSpans[id]) || 1);
    d.innerHTML =
      '<span class="mock-name">' + m.name + '</span>' +
      '<span class="span-ctl">' +
        '<button class="w-minus" title="少占一列">−</button>' +
        '<i class="w-num">' + s + '</i>' +
        '<button class="w-plus" title="多占一列">＋</button>' +
      '</span>';

    $('.w-minus', d).addEventListener('click', function (e) {
      e.stopPropagation(); setSpan(id, -1);
    });
    $('.w-plus', d).addEventListener('click', function (e) {
      e.stopPropagation(); setSpan(id, +1);
    });
    /* 点击微调按钮时不要触发拖拽 */
    $('.span-ctl', d).addEventListener('mousedown', function (e) { e.stopPropagation(); });

    pointerDrag(d, {
      ignore: function (t) { return t.closest && t.closest('button'); },
      onMove: function (e) {
        var t = underPoint(e, '.mock', d);
        $$('.mock').forEach(function (x) { x.classList.toggle('drop-target', x === t); });
      },
      onClear: function () { $$('.mock').forEach(function (x) { x.classList.remove('drop-target', 'drag-src'); }); },
      onDrop: function (e) {
        var t = underPoint(e, '.mock', d);
        if (!t) return;
        var srcId = d.dataset.tile, dstId = t.dataset.tile;
        if (!dstId || srcId === dstId) return;
        var order = layout.order.filter(function (x) { return x !== srcId; });
        var i = order.indexOf(dstId);
        var r = t.getBoundingClientRect();
        var after = (e.clientX - r.left) > r.width / 2;
        order.splice(after ? i + 1 : i, 0, srcId);
        layout.order = order;
        applyLayout();
      }
    });
    box.appendChild(d);
  });
}

$('#btn-layout').addEventListener('click', function () {
  renderMocks();
  openModal('layout-modal');
});
$('#btn-layout-reset').addEventListener('click', function () {
  layout = { cols: 3, order: TILE_IDS.slice(), spans: {}, rowSpans: { notes: 2 } };
  applyLayout();
  toast('已恢复默认布局');
});

loadLayout();
applyLayout();

/* 主界面直接拖磁贴：按住标题栏（quad-head / pane-head）拖到另一块上换位 */
$$('.tile').forEach(function (tile) {
  var head = $('.quad-head', tile) || $('.pane-head', tile);
  if (!head) return;
  pointerDrag(head, {
    ignore: function (t) { return t.closest && t.closest('button, select, input, textarea, a'); },
    onMove: function (e) {
      var t = underPoint(e, '.tile', tile);
      $$('.tile').forEach(function (x) { x.classList.toggle('drop-target', x === t); });
    },
    onClear: function () { $$('.tile').forEach(function (x) { x.classList.remove('drop-target'); }); },
    onDrop: function (e) {
      $$('.tile').forEach(function (x) { x.classList.remove('drop-target'); });
      var t = underPoint(e, '.tile', tile);
      if (!t) return;
      var srcId = tile.dataset.tile, dstId = t.dataset.tile;
      if (!dstId || srcId === dstId) return;
      var order = layout.order.filter(function (x) { return x !== srcId; });
      var i = order.indexOf(dstId);
      var r = t.getBoundingClientRect();
      var after = (e.clientX - r.left) > r.width / 2;
      order.splice(after ? i + 1 : i, 0, srcId);
      /* 磁贴重排后自动补齐跨度：确保网格不留洞 */
      layout.order = order;
      applyLayout();
      toast('布局已更新');
    }
  });
});
/* 支持 ?cols=N&order=q1,q2,…&spans=notes:2,q1:2 强制指定布局（便于演示与测试） */
(function () {
  var c = /[?&]cols=([1-6])/.exec(location.search);
  if (c) layout.cols = +c[1];
  var o = /[?&]order=([a-z0-9,]+)/.exec(location.search);
  if (o) {
    var ids = o[1].split(',').filter(function (id) { return TILE_IDS.indexOf(id) >= 0; });
    TILE_IDS.forEach(function (id) { if (ids.indexOf(id) < 0) ids.push(id); });
    if (ids.length) layout.order = ids;
  }
  var sp = /[?&]spans=([a-z0-9:,]+)/.exec(location.search);
  if (sp) {
    sp[1].split(',').forEach(function (kv) {
      var p = kv.split(':');
      if (TILE_IDS.indexOf(p[0]) >= 0 && +p[1] >= 1 && +p[1] <= 6) layout.spans[p[0]] = +p[1];
    });
  }
  applyLayout();
  /* ?panel=layout 直接打开布局设置面板 */
  if (/[?&]panel=layout/.test(location.search)) {
    renderMocks(); openModal('layout-modal');
  }
})();

function hasType(e, t) {
  var types = e.dataTransfer.types;
  if (!types) return false;
  if (typeof types.indexOf === 'function') return types.indexOf(t) >= 0;
  if (typeof types.contains === 'function') return types.contains(t);
  return false;
}

/* 象限间拖拽任务：改变重要/紧急属性 */
$$('.quad').forEach(function (quad) {
  quad.addEventListener('dragover', function (e) {
    if (!hasType(e, 'application/x-task')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    e.stopPropagation();
    quad.classList.add('dragover');
  });
  quad.addEventListener('dragleave', function () { quad.classList.remove('dragover'); });
  quad.addEventListener('drop', function (e) {
    if (!hasType(e, 'application/x-task')) return;
    e.preventDefault(); e.stopPropagation();
    quad.classList.remove('dragover');
    var id = e.dataTransfer.getData('application/x-task');
    var t = state.tasks.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    var q = +quad.dataset.q;
    var imp = (q === 1 || q === 2), urg = (q === 1 || q === 3);
    if (t.important === imp && t.urgent === urg) return;
    api('PUT', '/taskboard/api/tasks/' + id, { important: imp, urgent: urg })
      .then(function () { t.important = imp; t.urgent = urg; renderBoard(); toast('已移动到象限 ' + q); })
      .catch(function (err) { toast(err.message, true); });
  });
});

$('#search').addEventListener('input', function () {
  state.filter.q = this.value.trim(); renderBoard();
});
$('#chip-done').addEventListener('click', function () {
  state.filter.showDone = !state.filter.showDone;
  this.classList.toggle('on', state.filter.showDone);
  renderBoard();
});

/* ---------------- 任务弹窗 ---------------- */

var quadPick = { important: true, urgent: true };

function setQuadPick(i, u) {
  quadPick = { important: !!i, urgent: !!u };
  $$('#tf-quad button').forEach(function (b) {
    b.classList.toggle('on', (b.dataset.i === '1') === quadPick.important &&
                             (b.dataset.u === '1') === quadPick.urgent);
  });
}
$$('#tf-quad button').forEach(function (b) {
  b.addEventListener('click', function (e) {
    e.preventDefault(); setQuadPick(b.dataset.i === '1', b.dataset.u === '1');
  });
});

function openModal(id) { $('#' + id).classList.add('open'); }
function closeModal(id) { $('#' + id).classList.remove('open'); }
$$('[data-close]').forEach(function (b) {
  b.addEventListener('click', function () { closeModal(b.dataset.close); });
});
$$('.modal-mask').forEach(function (m) {
  m.addEventListener('click', function (e) { if (e.target === m) m.classList.remove('open'); });
});

function openTaskModal(t) {
  state.editingTaskId = t ? t.id : null;
  $('#tm-title').textContent = t ? '编辑任务' : '新建任务';
  $('#tf-title').value = t ? t.title : '';
  $('#tf-note').value = t ? (t.note || '') : '';
  $('#tf-tags').value = t ? (t.tags || []).join(', ') : '';
  $('#tf-delete').style.display = t ? '' : 'none';
  var dl = '';
  if (t && t.deadline) {
    var d = parseDT(t.deadline);
    if (d) dl = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
               'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  $('#tf-deadline').value = dl;
  setQuadPick(t ? t.important : true, t ? t.urgent : true);
  openModal('task-modal');
  setTimeout(function () { $('#tf-title').focus(); }, 60);
}

$('#btn-add').addEventListener('click', function () { openTaskModal(null); });

$('#tf-save').addEventListener('click', function () {
  var title = $('#tf-title').value.trim();
  if (!title) { toast('请填写标题', true); return; }
  var payload = {
    title: title,
    deadline: $('#tf-deadline').value ? $('#tf-deadline').value.replace('T', ' ') : '',
    note: $('#tf-note').value,
    tags: $('#tf-tags').value,
    important: quadPick.important,
    urgent: quadPick.urgent
  };
  var req = state.editingTaskId
    ? api('PUT', '/taskboard/api/tasks/' + state.editingTaskId, payload)
    : api('POST', '/taskboard/api/tasks', payload);
  req.then(function () { closeModal('task-modal'); return refreshTasks(); })
     .then(function () { toast(state.editingTaskId ? '已保存' : '已创建'); })
     .catch(function (err) { toast(err.message, true); });
});

$('#tf-delete').addEventListener('click', function () {
  if (!state.editingTaskId) return;
  if (!confirm('确定删除这个任务？')) return;
  api('DELETE', '/taskboard/api/tasks/' + state.editingTaskId)
    .then(function () { closeModal('task-modal'); return refreshTasks(); })
    .then(function () { toast('已删除'); })
    .catch(function (err) { toast(err.message, true); });
});

function refreshTasks() {
  return api('GET', '/taskboard/api/state').then(function (r) {
    state.tasks = r.state.tasks;
    renderBoard();
  });
}

/* ---------------- 随手记 ---------------- */

function renderNotes() {
  var list = $('#note-list');
  list.innerHTML = '';
  if (!state.noteEntries.length) {
    list.innerHTML = '<div class="empty">本周还没有记录，写下第一条吧</div>';
    return;
  }
  state.noteEntries.forEach(function (e2) {
    var d = document.createElement('div');
    d.className = 'note-item';
    d.innerHTML =
      '<time>' + esc(e2.time) + '</time>' +
      '<span class="note-ops">' +
        '<button class="edt" title="编辑">' + SVG.pen + '</button>' +
        '<button class="del" title="删除">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6"/></svg>' +
        '</button>' +
      '</span>' +
      '<div class="note-body md">' + mdRender(e2.content) + '</div>';

    $('.edt', d).addEventListener('click', function () { editNoteItem(d, e2); });
    $('.del', d).addEventListener('click', function () {
      if (!confirm('删除这条记录？（' + e2.time + '）')) return;
      api('DELETE', '/taskboard/api/notes', { week: state.notesWeek, idx: e2.idx })
        .then(function () { return loadWeek(state.notesWeek); })
        .then(function () { toast('已删除'); })
        .catch(function (err) { toast(err.message, true); });
    });
    list.appendChild(d);
  });
}

/* 把某条条目切换成行内编辑器 */
function editNoteItem(d, entry) {
  var body = $('.note-body', d);
  var box = document.createElement('div');
  box.className = 'note-edit';
  box.innerHTML =
    '<textarea></textarea>' +
    '<div class="row">' +
      '<button class="btn sm line cancel">取消</button>' +
      '<button class="btn sm accent save">保存</button>' +
    '</div>';
  var ta = $('textarea', box);
  ta.value = entry.content;
  body.style.display = 'none';
  d.appendChild(box);
  ta.focus();

  function exit() { box.remove(); body.style.display = ''; }
  $('.cancel', box).addEventListener('click', exit);
  $('.save', box).addEventListener('click', function () {
    var content = ta.value.trim();
    if (!content) { toast('内容不能为空', true); return; }
    api('PUT', '/taskboard/api/notes', { week: state.notesWeek, idx: entry.idx, content: content })
      .then(function () { return loadWeek(state.notesWeek); })
      .then(function () { toast('已保存'); })
      .catch(function (err) { toast(err.message, true); exit(); });
  });
}

/* 加载指定周的记录（保持下拉框选中态） */
function loadWeek(w) {
  return api('GET', '/taskboard/api/notes?week=' + w).then(function (r) {
    state.notesWeek = r.week;
    state.noteEntries = r.entries;
    renderWeeks(); renderNotes();
  });
}

function renderWeeks() {
  var sel = $('#week-sel');
  sel.innerHTML = '';
  var weeks = state.weeks.slice();
  if (weeks.indexOf(state.notesWeek) < 0) weeks.unshift(state.notesWeek);
  weeks.forEach(function (w) {
    var o = document.createElement('option');
    o.value = w; o.textContent = w + (w === state.notesWeek ? '（本周）' : '');
    if (w === state.notesWeek) o.selected = true;
    sel.appendChild(o);
  });
}

$('#week-sel').addEventListener('change', function () {
  loadWeek(this.value).catch(function (err) { toast(err.message, true); });
});

/* 草稿 Markdown 预览 */
$('#btn-note-preview').addEventListener('click', function () {
  var pv = $('#note-preview'), ta = $('#note-text');
  var showing = pv.style.display !== 'none';
  if (showing) {
    pv.style.display = 'none'; ta.style.display = '';
    this.classList.remove('on');
  } else {
    pv.innerHTML = ta.value.trim()
      ? mdRender(ta.value)
      : '<span style="color:var(--ink-3)">（还没有内容）</span>';
    pv.className = 'md-preview md';
    pv.style.display = ''; ta.style.display = 'none';
    this.classList.add('on');
  }
});

function saveNote() {
  var ta = $('#note-text');
  var content = ta.value.trim();
  if (!content) { toast('先写点内容', true); return; }
  api('POST', '/taskboard/api/notes', { content: content }).then(function (r) {
    ta.value = '';
    var pv = $('#note-preview');
    if (pv.style.display !== 'none') { pv.style.display = 'none'; ta.style.display = ''; $('#btn-note-preview').classList.remove('on'); }
    toast('已存入 ' + r.week + '.md');
    return api('GET', '/taskboard/api/state');
  }).then(function (r) {
    state.weeks = r.state.weeks;
    state.notesWeek = r.state.notes.week;
    state.noteEntries = r.state.notes.entries;
    renderWeeks(); renderNotes();
  }).catch(function (err) { toast(err.message, true); });
}
$('#btn-note-save').addEventListener('click', saveNote);
$('#note-text').addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.keyCode === 13) { e.preventDefault(); saveNote(); }
});

/* ---------------- 初始化 ---------------- */

function init() {
  api('GET', '/taskboard/api/state').then(function (r) {
    var s = r.state;
    state.tasks = s.tasks;
    state.weeks = s.weeks;
    state.notesWeek = s.notes.week;
    state.noteEntries = s.notes.entries;
    renderBoard(); renderWeeks(); renderNotes();
  }).catch(function (err) {
    document.body.innerHTML = '<div style="padding:40px;font-size:14px">初始化失败：' +
      esc(err.message) + '<br>请确认 DSH 已重启且 dsh-quadrant-board 插件已加载。</div>';
  });
}

/* 页面重新可见时静默同步一次（无轮询，省电） */
var lastSync = 0;
document.addEventListener('visibilitychange', function () {
  if (document.hidden) return;
  var now = Date.now();
  if (now - lastSync < 5000) return;
  lastSync = now;
  api('GET', '/taskboard/api/state').then(function (r) {
    var s = r.state;
    state.tasks = s.tasks;
    state.weeks = s.weeks; state.notesWeek = s.notes.week;
    state.noteEntries = s.notes.entries;
    renderBoard(); renderWeeks(); renderNotes();
  }).catch(function () {});
});

init();
