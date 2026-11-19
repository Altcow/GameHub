(function () {
  'use strict';
  var STATUS = { dev: '開發中', live: '已上線', paused: '暫停' };
  var data = { categories: [], games: [] };
  var state = { cat: 'all', q: '', type: 'all', view: 'simple' };
  var ICON = { product: '產', boardgame: '桌', card: '卡', brawl2d: '鬥', sim25d: '營', sandbox3d: '創', face3d: '捏', brawl3d: '鬥', kids: '學', other: '雜' };
  var TYPES = { product: '產品', game: '遊戲' };
  function typeOf(g) { return g.category === 'product' ? 'product' : 'game'; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
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
      if (state.type !== 'all' && typeOf(g) !== state.type) return false;
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

  function renderSeg(boxId, items, cur, onPick) {
    var box = $(boxId); box.textContent = '';
    items.forEach(function (it) {
      var b = el('button', cur === it[0] ? 'on' : '', it[1]);
      b.type = 'button'; b.setAttribute('aria-pressed', cur === it[0] ? 'true' : 'false');
      b.onclick = function () { onPick(it[0]); };
      box.appendChild(b);
    });
  }
  function renderBar() {
    renderSeg('types', [['all', '全部類型'], ['product', '產品'], ['game', '遊戲']], state.type,
      function (v) { state.type = v; renderBar(); renderGrid(); });
    renderSeg('views', [['simple', '簡化'], ['detail', '詳細']], state.view,
      function (v) { state.view = v; lsSet('gamehub.view2', v); renderBar(); renderGrid(); });
  }

  function typeTag(g) {
    var t = typeOf(g);
    return el('span', 'type ' + t, TYPES[t]);
  }
  function thumb(g) {
    var d = el('div', 'thumb'), u = g.cover || '';
    function stamp() {
      d.textContent = ''; d.className = 'thumb stamp';
      d.appendChild(el('span', '', ICON[g.category] || ICON.other));
    }
    if (/^(https?:\/\/|[^:?#]+$)/i.test(u) && u) {
      var im = document.createElement('img');
      im.alt = ''; im.loading = 'lazy';
      im.onerror = stamp;
      im.src = u; d.appendChild(im);
    } else stamp();
    d.setAttribute('aria-hidden', 'true');
    return d;
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

  function linksOf(g) {
    var out = [];
    (Array.isArray(g.links) ? g.links : []).forEach(function (l) {
      var u = l && safeUrl(l.url);
      if (u) out.push({ label: l.label || '開啟', url: u, kind: l.kind === 'admin' || l.kind === 'other' ? l.kind : 'public' });
    });
    if (!out.length && safeUrl(g.url)) out.push({ label: '開啟', url: safeUrl(g.url), kind: 'public' });
    return out;
  }
  function mkA(cls, text, u) {
    var a = el('a', cls, text); a.href = u; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.onclick = function (e) { e.stopPropagation(); };
    return a;
  }
  function openLink(g) {
    var ls = linksOf(g), u = safeUrl(g.url), p = null, i;
    for (i = 0; i < ls.length; i++) if (ls[i].url === u) p = ls[i];
    for (i = 0; i < ls.length && !p; i++) if (ls[i].kind !== 'admin') p = ls[i];
    if (!p) p = ls[0];
    return p ? mkA('open', '開啟', p.url) : el('span', 'open off', '尚無網址');
  }
  function adminLink(g, except) {
    var ls = linksOf(g);
    for (var i = 0; i < ls.length; i++) if (ls[i].kind === 'admin' && ls[i].url !== except) return mkA('open admin', '後台', ls[i].url);
    return null;
  }
  function linkBtns(g) {
    var ls = linksOf(g);
    if (!ls.length) return el('span', 'open off', '尚無網址');
    var box = el('div', 'links');
    ls.forEach(function (l) {
      var a = mkA('lk ' + l.kind, l.label, l.url);
      if (l.kind === 'admin') a.appendChild(el('small', 'lock', '需密碼'));
      box.appendChild(a);
    });
    return box;
  }
  function recentLog(g, n) {
    var cl = (g.changelog || []).slice().sort(function (a, c) { return (ts(c.date) - ts(a.date)) || 0; }).slice(0, n);
    if (!cl.length) return null;
    var ul = el('ul', 'mini');
    cl.forEach(function (e) {
      ul.appendChild(el('li', '', (e.version || '') + (e.date ? ' ' + e.date : '') + ((e.notes || [])[0] ? ' — ' + e.notes[0] : '')));
    });
    return ul;
  }

  function renderGrid() {
    var grid = $('grid'), list = visible(), lm = state.view === 'simple';
    grid.textContent = '';
    grid.className = 'grid' + (lm ? ' list' : '');
    $('empty').hidden = list.length > 0;
    list.forEach(function (g) {
      var c = el('article', lm ? 'item' : 'card');
      if (lm) {
        c.appendChild(thumb(g));
        var h = el('h3', '', g.name || g.id);
        h.tabIndex = 0; h.setAttribute('role', 'button');
        h.onclick = function () { showModal(g); };
        h.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showModal(g); } };
        c.appendChild(h);
        var m = el('div', 'row meta');
        m.appendChild(typeTag(g));
        m.appendChild(el('span', 'tag', catName(g.category)));
        m.appendChild(el('span', 'badge ' + (STATUS[g.status] ? g.status : 'dev'), STATUS[g.status] || '開發中'));
        if (g.version) m.appendChild(el('span', '', g.version));
        m.appendChild(el('span', '', rel(g.updatedAt)));
        c.appendChild(m);
        var ob = openLink(g), ad = adminLink(g, ob.href);
        if (ad) { var w = el('div', 'acts'); w.appendChild(ob); w.appendChild(ad); c.appendChild(w); } else c.appendChild(ob);
        grid.appendChild(c);
        return;
      }
      c.appendChild(thumb(g));
      c.appendChild(el('h3', '', g.name || g.id));
      var r = el('div', 'row');
      r.appendChild(typeTag(g));
      r.appendChild(el('span', 'tag', catName(g.category)));
      r.appendChild(el('span', 'badge ' + (STATUS[g.status] ? g.status : 'dev'), STATUS[g.status] || '開發中'));
      if (g.version) r.appendChild(el('span', '', g.version));
      var sn = syncNode(g); if (sn) r.appendChild(sn);
      c.appendChild(r);
      if (g.summary) c.appendChild(el('p', 'sum', g.summary));
      c.appendChild(el('div', 'row', '更新:' + rel(g.updatedAt) + (fmtDate(g.updatedAt) ? '(' + fmtDate(g.updatedAt) + ')' : '')));
      c.appendChild(linkBtns(g));
      var rl = recentLog(g, 3); if (rl) c.appendChild(rl);
      c.onclick = function () { showModal(g); };
      grid.appendChild(c);
    });
  }

  function showModal(g) {
    var b = $('modalBody'); b.textContent = '';
    b.appendChild(el('h2', '', g.name || g.id));
    var r = el('div', 'row');
    r.appendChild(typeTag(g));
    r.appendChild(el('span', 'tag', catName(g.category)));
    r.appendChild(el('span', 'badge ' + (STATUS[g.status] ? g.status : 'dev'), STATUS[g.status] || '開發中'));
    if (g.version) r.appendChild(el('span', '', g.version));
    var sn = syncNode(g); if (sn) r.appendChild(sn);
    b.appendChild(r);
    if (g.summary) b.appendChild(el('p', '', g.summary));
    b.appendChild(linkBtns(g));
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
    state.view = lsGet('gamehub.view2') === 'detail' ? 'detail' : 'simple';
    renderBar();
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
