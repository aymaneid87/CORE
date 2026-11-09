/* مكونات الواجهة المشتركة */
(function (g) {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function mmss(s) { s = Math.max(0, Math.floor(s || 0)); var h = Math.floor(s / 3600); s -= h * 3600; return (h ? h + ":" + pad(Math.floor(s / 60)) : Math.floor(s / 60)) + ":" + pad(s % 60); }
  function hm(ts) { var d = new Date(ts * 1000); return "\u2066" + pad(d.getHours()) + ":" + pad(d.getMinutes()) + "\u2069"; }
  var AR = "٠١٢٣٤٥٦٧٨٩";
  function toAr(n) { return String(n).replace(/\d/g, function (d) { return AR.charAt(d); }); }
  function cssUrl(u) { return u ? "background-image:url('" + String(u).replace(/'/g, "%27").replace(/"/g, "%22") + "')" : ""; }

  var P = {
    live: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
    vod: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    series: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12.5l9 5 9-5M3 17l9 5 9-5"/>',
    fav: '<path d="M12 3.5l2.6 5.5 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.8l6-.8z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
    settings: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>'
  };
  function icon(n) { return '<svg class="ico" viewBox="0 0 24 24">' + P[n] + '</svg>'; }
  var LOGO = '<svg viewBox="0 0 54 54"><rect x="2" y="2" width="50" height="50" rx="14" fill="#B8763E"/><circle cx="27" cy="27" r="11" fill="#F5F1E8"/><circle cx="27" cy="27" r="5" fill="#0F3D48"/></svg>';
  function logo() { return '<div class="logo">' + LOGO + '<span class="w">CORE</span><span class="pill">IPTV</span></div>'; }
  function top(titleHtml, chip) {
    return '<div class="top"><div class="top-r">' + titleHtml + '</div><div class="top-l">' + (chip ? '<span class="chip">' + chip + '</span>' : '') + '<span class="clk"></span></div></div>';
  }

  /* قائمة رأسية مُجزّأة: ترسم الصفوف الظاهرة فقط (آلاف القنوات بدون بطء) */
  function VList(root, o) {
    this.root = root; this.o = o; this.items = []; this.idx = 0; this.active = false;
    root.className = (root.className ? root.className + " " : "") + "vl";
    root.style.height = o.rows * o.rowH + "px";
  }
  VList.prototype.set = function (items, idx) { this.items = items || []; this.idx = Math.max(0, Math.min(idx || 0, this.items.length - 1)); this.render(); };
  VList.prototype.cur = function () { return this.items[this.idx]; };
  VList.prototype.setActive = function (a) { this.active = a; this.render(); };
  VList.prototype.move = function (d) {
    var n = this.items.length; if (!n) return false;
    var i = Math.max(0, Math.min(n - 1, this.idx + d)); if (i === this.idx) return false;
    this.idx = i; this.render(); return true;
  };
  VList.prototype.render = function () {
    var o = this.o, n = this.items.length, h = "", i;
    if (!n) { this.root.innerHTML = o.empty ? '<div class="none">' + o.empty + '</div>' : ""; return; }
    var top = Math.max(0, Math.min(this.idx - Math.floor(o.rows / 2), n - o.rows)), end = Math.min(n, top + o.rows);
    for (i = top; i < end; i++) {
      h += '<div class="row' + (i === this.idx ? (this.active ? " sel" : " cur") : "") + '" style="top:' + (i - top) * o.rowH + 'px;height:' + (o.rowH - 6) + 'px">' + o.row(this.items[i], i) + '</div>';
    }
    this.root.innerHTML = h;
  };

  /* شبكة ملصقات (RTL) */
  function Grid(root, o) {
    this.root = root; this.o = o; this.items = []; this.idx = 0; this.top = 0; this.active = false;
    root.className = (root.className ? root.className + " " : "") + "gr";
    this.pad = 16; root.style.height = (o.rows * (o.ch + o.gy) + 2 * this.pad) + "px"; root.style.width = (o.cols * (o.cw + o.gx) + 2 * this.pad) + "px";
  }
  Grid.prototype.set = function (items, idx) { this.items = items || []; this.idx = Math.max(0, Math.min(idx || 0, this.items.length - 1)); this.top = 0; this.render(); };
  Grid.prototype.cur = function () { return this.items[this.idx]; };
  Grid.prototype.setActive = function (a) { this.active = a; this.render(); };
  Grid.prototype.col = function () { return this.idx % this.o.cols; };
  Grid.prototype.move = function (d) {
    var n = this.items.length; if (!n) return false;
    var i = Math.max(0, Math.min(n - 1, this.idx + d)); if (i === this.idx) return false;
    this.idx = i; this.render(); return true;
  };
  Grid.prototype.render = function () {
    var o = this.o, n = this.items.length, h = "", i;
    if (!n) { this.root.innerHTML = o.empty ? '<div class="none">' + o.empty + '</div>' : ""; return; }
    var sr = Math.floor(this.idx / o.cols);
    if (sr < this.top) this.top = sr; if (sr >= this.top + o.rows) this.top = sr - o.rows + 1;
    var from = this.top * o.cols, to = Math.min(n, (this.top + o.rows) * o.cols);
    for (i = from; i < to; i++) {
      var r = Math.floor(i / o.cols) - this.top, c = i % o.cols;
      h += '<div class="cell' + (i === this.idx ? (this.active ? " sel" : " cur") : "") + '" style="right:' + (c * (o.cw + o.gx) + this.pad) + 'px;top:' + (r * (o.ch + o.gy) + this.pad) + 'px">' + o.cell(this.items[i], i) + '</div>';
    }
    this.root.innerHTML = h;
  };

  var toastT;
  function toast(m, ms) { var t = $("toast"); t.textContent = m; t.style.display = "block"; clearTimeout(toastT); toastT = setTimeout(function () { t.style.display = "none"; }, ms || 3000); }
  function busy(on, msg) { var b = $("busy"); b.style.display = on ? "block" : "none"; if (msg) $("busyMsg").textContent = msg; }

  function fit() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080), st = $("stage");
    st.style.webkitTransform = st.style.transform = "scale(" + s + ")";
    st.style.left = Math.max(0, (window.innerWidth - 1920 * s) / 2) + "px"; st.style.top = Math.max(0, (window.innerHeight - 1080 * s) / 2) + "px";
  }
  function tickClock() {
    var d = new Date(), t = pad(d.getHours()) + ":" + pad(d.getMinutes()), a = document.querySelectorAll(".clk"), i;
    for (i = 0; i < a.length; i++) a[i].textContent = t;
  }
  window.addEventListener("resize", fit); fit(); tickClock(); setInterval(tickClock, 15000);

  g.UI = { $: $, esc: esc, pad: pad, mmss: mmss, hm: hm, toAr: toAr, cssUrl: cssUrl, icon: icon, logo: logo, top: top, VList: VList, Grid: Grid, toast: toast, busy: busy, tickClock: tickClock };
})(window);
