(function () {
  'use strict';
  var STATUS = { dev: '開發中', live: '已上線', paused: '暫停' };
  var data = { categories: [], games: [] };
  var state = { cat: 'all', q: '' };
  var online = {}; // id -> {state:'ok'|'warn'|'none', v}

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }
  function ts(s) { var t = Date.parse(s); return isNaN(t) ? 0 : t; }
  function fmtDate(s) {
    var t = ts(s); if (!t) return '';
    var d = new Date(t), p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function rel(s) {
    var t = ts(s); if (!t) return '尚無紀錄';
    var m = Math.floor((Date.now() - t) / 60000);
    if (m < 1) return '剛剛';
    if (m < 60) return m + ' 分鐘前';
    var h = Math.floor(m / 60);
    if (h < 24) return h + ' 小時前';
    var d = Math.floor(h / 24);
    if (d < 30) return d + ' 天前';
    var mo = Math.floor(d / 30);
    return mo < 12 ? mo + ' 個月前' : Math.floor(mo / 12) + ' 年前';
  }
  function catName(id) {
    for (var i = 0; i < data.categories.length; i++) if (data.categories[i].id === id) return data.categories[i].name;
    return id || '未分類';
  }

  function visible() {
    var q = state.q.trim().toLowerCase();
    return data.games.filter(function (g) {
      if (state.cat !== 'all' && g.category !== state.cat) return false;
      if (!q) return true;
      return [g.name, g.summary, g.id, catName(g.category)].join(' ').toLowerCase().indexOf(q) >= 0;
    });
  }

  function renderFilters() {
    var box = $('filters'); box.textContent = '';
    function add(id, label, n) {
      var b = el('button', state.cat === id ? 'on' : '', label + ' ' + n);
      b.type = 'button';
      b.onclick = function () { state.cat = id; renderFilters(); renderGrid(); };
      box.appendChild(b);
    }
    add('all', '全部', data.games.length);
    data.categories.forEach(function (c) {
      var n = data.games.filter(function (g) { return g.category === c.id; }).length;
      if (n > 0) add(c.id, c.name, n);
    });
  }

  function syncNode(g) {
    var o = online[g.id];
    if (!g.versionUrl) return null;
    var s = el('span', 'sync'), d = el('span', 'dot');
    s.appendChild(d);
    if (!o || o.state === 'none') { s.appendChild(document.createTextNode('無法取得線上版本')); }
    else if (o.state === 'ok') { d.className = 'dot ok'; s.appendChild(document.createTextNode('已同步')); }
    else { d.className = 'dot warn'; s.appendChild(document.createTextNode('線上為 ' + o.v)); }
    return s;
  }

  function openLink(g) {
    var u = safeUrl(g.url), a;
    if (u) {
      a = el('a', 'open', '開啟'); a.href = u; a.target = '_blank'; a.rel = 'noopener';
      a.onclick = function (e) { e.stopPropagation(); };
    } else a = el('span', 'open off', '尚無網址');
    return a;
  }

  function renderGrid() {
    var grid = $('grid'), list = visible();
    grid.textContent = '';
    $('empty').hidden = list.length > 0;
    list.forEach(function (g) {
      var c = el('article', 'card');
      c.appendChild(el('h3', '', g.name || g.id));
      var r = el('div', 'row');
      r.appendChild(el('span', 'tag', catName(g.category)));
      r.appendChild(el('span', 'badge ' + (STATUS[g.status] ? g.status : 'dev'), STATUS[g.status] || '開發中'));
      if (g.version) r.appendChild(el('span', '', g.version));
      var sn = syncNode(g); if (sn) r.appendChild(sn);
      c.appendChild(r);
      if (g.summary) c.appendChild(el('p', 'sum', g.summary));
      c.appendChild(el('div', 'row', '更新:' + rel(g.updatedAt) + (fmtDate(g.updatedAt) ? '(' + fmtDate(g.updatedAt) + ')' : '')));
      c.appendChild(openLink(g));
      c.onclick = function () { showModal(g); };
      grid.appendChild(c);
    });
  }

  function showModal(g) {
    var b = $('modalBody'); b.textContent = '';
    b.appendChild(el('h2', '', g.name || g.id));
    var r = el('div', 'row');
    r.appendChild(el('span', 'tag', catName(g.category)));
    r.appendChild(el('span', 'badge ' + (STATUS[g.status] ? g.status : 'dev'), STATUS[g.status] || '開發中'));
    if (g.version) r.appendChild(el('span', '', g.version));
    var sn = syncNode(g); if (sn) r.appendChild(sn);
    b.appendChild(r);
    if (g.summary) b.appendChild(el('p', '', g.summary));
    b.appendChild(openLink(g));
    var log = el('div', 'log');
    log.appendChild(el('h3', '', '更新紀錄'));
    var cl = (g.changelog || []).slice().sort(function (a, c) {
      return (ts(c.date) - ts(a.date)) || 0;
    });
    if (!cl.length) log.appendChild(el('p', 'sum', '尚無更新紀錄'));
    cl.forEach(function (e) {
      log.appendChild(el('h4', '', (e.version || '') + (e.date ? '  ' + e.date : '')));
      var ul = el('ul');
      (e.notes || []).forEach(function (n) { ul.appendChild(el('li', '', n)); });
      log.appendChild(ul);
    });
    b.appendChild(log);
    $('modal').hidden = false;
  }

  function renderRecent() {
    var items = [];
    data.games.forEach(function (g) {
      (g.changelog || []).forEach(function (e) {
        items.push({ g: g, e: e, t: ts(e.date) });
      });
    });
    items.sort(function (a, b) { return b.t - a.t; });
    items = items.slice(0, 5);
    $('recentBox').hidden = !items.length;
    var ul = $('recent'); ul.textContent = '';
    items.forEach(function (i) {
      var li = el('li');
      li.appendChild(el('strong', '', i.g.name || i.g.id));
      li.appendChild(document.createTextNode(' ' + (i.e.version || '') + ' '));
      li.appendChild(el('small', '', i.e.date || ''));
      var n = (i.e.notes || [])[0];
      if (n) li.appendChild(el('small', '', ' — ' + n));
      ul.appendChild(li);
    });
  }

  function checkOnline() {
    data.games.forEach(function (g) {
      var u = safeUrl(g.versionUrl);
      if (!u) return;
      var sep = u.indexOf('?') >= 0 ? '&' : '?';
      fetch(u + sep + 't=' + Date.now(), { cache: 'no-cache' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) {
          var v = j && j.version != null ? String(j.version) : '';
          if (!v) throw 0;
          online[g.id] = { state: v === g.version ? 'ok' : 'warn', v: v };
        })
        .catch(function () { online[g.id] = { state: 'none' }; })
        .then(renderGrid);
    });
  }

  function init() {
    $('search').addEventListener('input', function (e) { state.q = e.target.value; renderGrid(); });
    $('close').onclick = function () { $('modal').hidden = true; };
    $('modal').onclick = function (e) { if (e.target === $('modal')) $('modal').hidden = true; };
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('modal').hidden = true; });
    fetch('registry/games.json?t=' + Date.now(), { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) {
        data.categories = j.categories || [];
        data.games = j.games || [];
        $('stats').textContent = '共 ' + data.games.length + ' 個產品 · 最近更新:' +
          (j.updated ? rel(j.updated) + '(' + fmtDate(j.updated) + ')' : '無');
        renderFilters(); renderRecent(); renderGrid(); checkOnline();
      })
      .catch(function (e) { document.body.classList.add('loaderr'); $('stats').textContent = '無法載入登記簿:' + e.message; });
  }
  window.GameHubStart = init;
})();
