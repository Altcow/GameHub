(function () {
  'use strict';
  var HASH = '1d8ae2100a57ab8ec7aa26c20fe71c11c794fb6335012a48e24998722a76e705';
  var KEY = 'gamehub_ok';
  var $ = function (id) { return document.getElementById(id); };

  function sha(text) {
    var bytes = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-256', bytes).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return ('0' + b.toString(16)).slice(-2);
      }).join('');
    });
  }
  function unlock() {
    document.body.classList.remove('locked');
    $('gate').hidden = true;
    if (window.GameHubStart) window.GameHubStart();
  }
  // 每次開啟都要重新輸入密碼:不再記住,並清掉舊版留下的記錄
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }

  function dots() {
    var n = $('gateInput').value.length;
    Array.prototype.forEach.call($('gateDots').children, function (d, i) {
      d.className = i < n ? 'on' : '';
    });
  }

  $('gateInput').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '');
    $('gateMsg').textContent = '';
    dots();
  });
  $('gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    sha('gamehub-v1:' + $('gateInput').value).then(function (h) {
      if (h === HASH) { unlock(); return; }
      $('gateMsg').textContent = '密碼不對';
      $('gateInput').value = '';
      dots();
      var box = document.querySelector('.gate-box');
      box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake');
    });
  });
  $('gate').addEventListener('click', function () { $('gateInput').focus(); });
  $('gateInput').focus();
})();
