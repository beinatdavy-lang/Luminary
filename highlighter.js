(function() {
  'use strict';

  // Eviter double injection
  if (window.__luminaryActive) {
    window.__luminaryToggle && window.__luminaryToggle();
    return;
  }
  window.__luminaryActive = true;

  var BASE_URL = (function() {
    var s = document.currentScript;
    if (s && s.src) return s.src.replace(/highlighter\.js.*$/, '');
    // fallback: try to find the script tag
    var tags = document.querySelectorAll('script[src*="highlighter"]');
    if (tags.length) return tags[tags.length-1].src.replace(/highlighter\.js.*$/, '');
    return window.location.origin + '/';
  })();

  var highlights   = [];
  var hlCounter    = 0;
  var savedRange   = null;   // Range saved at mouseup — survives popup click
  var savedText    = '';

  /* ── STYLES ── */
  var style = document.createElement('style');
  style.textContent = [
    '.lum-hl {',
    '  background: rgba(255, 213, 0, 0.45) !important;',
    '  border-radius: 3px;',
    '  cursor: pointer;',
    '  transition: background .15s;',
    '  position: relative;',
    '}',
    '.lum-hl:hover {',
    '  background: rgba(255, 180, 0, 0.65) !important;',
    '}',
    '.lum-hl-remove {',
    '  display: none;',
    '  position: absolute;',
    '  top: -18px;',
    '  right: -4px;',
    '  background: #333;',
    '  color: #fff;',
    '  border-radius: 50%;',
    '  width: 16px;',
    '  height: 16px;',
    '  font-size: 10px;',
    '  line-height: 16px;',
    '  text-align: center;',
    '  cursor: pointer;',
    '  z-index: 9999999;',
    '  user-select: none;',
    '}',
    '.lum-hl:hover .lum-hl-remove { display: block; }',
    '',
    '#lum-toolbar {',
    '  position: fixed;',
    '  bottom: 28px;',
    '  left: 50%;',
    '  transform: translateX(-50%);',
    '  z-index: 99999999;',
    '  background: #17171f;',
    '  border: 1px solid rgba(255,255,255,.12);',
    '  border-radius: 50px;',
    '  padding: 8px 14px;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '  box-shadow: 0 8px 32px rgba(0,0,0,.55);',
    '  font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
    '  user-select: none;',
    '  white-space: nowrap;',
    '}',
    '#lum-toolbar-logo {',
    '  font-size: 14px;',
    '  font-weight: 700;',
    '  color: #c9a96e;',
    '  margin-right: 2px;',
    '}',
    '#lum-toolbar-count {',
    '  font-size: 12px;',
    '  color: #6a6778;',
    '  min-width: 80px;',
    '}',
    '.lum-tb-btn {',
    '  padding: 7px 16px;',
    '  border-radius: 50px;',
    '  border: none;',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  font-family: inherit;',
    '  transition: opacity .15s;',
    '}',
    '.lum-tb-btn:hover { opacity: .85; }',
    '.lum-tb-btn.send {',
    '  background: #c9a96e;',
    '  color: #0f0f14;',
    '}',
    '.lum-tb-btn.send:disabled {',
    '  opacity: .4;',
    '  cursor: not-allowed;',
    '}',
    '.lum-tb-btn.close {',
    '  background: rgba(255,255,255,.07);',
    '  color: #6a6778;',
    '  padding: 7px 10px;',
    '}',
    '',
    '#lum-popup {',
    '  position: fixed;',
    '  z-index: 99999999;',
    '  background: #17171f;',
    '  border: 1px solid rgba(255,255,255,.12);',
    '  border-radius: 10px;',
    '  padding: 6px 6px;',
    '  display: flex;',
    '  gap: 6px;',
    '  box-shadow: 0 4px 20px rgba(0,0,0,.5);',
    '  font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
    '}',
    '#lum-popup button {',
    '  padding: 8px 14px;',
    '  border-radius: 8px;',
    '  border: none;',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  font-family: inherit;',
    '}',
    '#lum-popup .hl-btn {',
    '  background: rgba(255,213,0,.2);',
    '  color: #f0c040;',
    '}',
    '#lum-popup .hl-btn:hover { background: rgba(255,213,0,.32); }',
    '#lum-popup .cancel-btn {',
    '  background: rgba(255,255,255,.06);',
    '  color: #6a6778;',
    '}',
    '',
    '#lum-toast {',
    '  position: fixed;',
    '  bottom: 90px;',
    '  left: 50%;',
    '  transform: translateX(-50%) translateY(30px);',
    '  background: rgba(30,30,40,.95);',
    '  color: #edeae3;',
    '  border-radius: 8px;',
    '  padding: 8px 16px;',
    '  font-size: 13px;',
    '  font-weight: 500;',
    '  opacity: 0;',
    '  transition: all .25s;',
    '  z-index: 99999999;',
    '  pointer-events: none;',
    '  font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
    '}',
    '#lum-toast.show {',
    '  opacity: 1;',
    '  transform: translateX(-50%) translateY(0);',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  /* ── TOOLBAR ── */
  var toolbar = document.createElement('div');
  toolbar.id = 'lum-toolbar';
  toolbar.innerHTML = [
    '<span id="lum-toolbar-logo">✦ Luminary</span>',
    '<span id="lum-toolbar-count">0 surlignage</span>',
    '<button class="lum-tb-btn send" id="lum-send-btn" disabled onclick="window.__lumSend()">',
    '  Envoyer tout →',
    '</button>',
    '<button class="lum-tb-btn close" onclick="window.__lumClose()" title="Quitter">✕</button>'
  ].join('');
  document.body.appendChild(toolbar);

  /* ── POPUP (bulle flottante au-dessus de la sélection) ── */
  var popup = document.createElement('div');
  popup.id  = 'lum-popup';
  popup.style.display = 'none';
  popup.innerHTML = [
    '<button class="hl-btn" onclick="window.__lumHighlight()">✦ Surligner</button>',
    '<button class="cancel-btn" onclick="window.__lumHidePopup()">✕</button>'
  ].join('');
  // Prevent mousedown from clearing the text selection before click fires
  popup.addEventListener('mousedown', function(e) { e.preventDefault(); });
  document.body.appendChild(popup);

  /* ── TOAST ── */
  var toast = document.createElement('div');
  toast.id = 'lum-toast';
  document.body.appendChild(toast);

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 2000);
  }

  function updateCount() {
    var n = highlights.length;
    document.getElementById('lum-toolbar-count').textContent =
      n === 0 ? '0 surlignage'
      : n === 1 ? '1 surlignage'
      : n + ' surlignages';
    var btn = document.getElementById('lum-send-btn');
    btn.disabled = n === 0;
  }

  /* ── POPUP POSITIONING ── */
  function showPopup(x, y) {
    popup.style.display = 'flex';
    var pw = popup.offsetWidth || 180;
    var vw = window.innerWidth;
    var left = Math.min(x, vw - pw - 12);
    popup.style.left = Math.max(8, left) + 'px';
    popup.style.top  = (y - 52) + 'px';
  }

  window.__lumHidePopup = function() {
    popup.style.display = 'none';
  };

  /* ── SELECTION LISTENER ── */


  document.addEventListener('mouseup', function(e) {
    if (e.target.closest && (e.target.closest('#lum-toolbar') || e.target.closest('#lum-popup'))) return;
    setTimeout(function() {
      var sel = window.getSelection();
      var txt = sel ? sel.toString().trim() : '';
      if (!txt || txt.length < 5) {
        window.__lumHidePopup();
        pendingSel = null;
        return;
      }
      pendingSel  = sel;
      var range   = sel.getRangeAt(0);
      var rect    = range.getBoundingClientRect();
      pendingRect = rect;
      showPopup(
        rect.left + window.scrollX + rect.width / 2,
        rect.top  + window.scrollY
      );
    }, 10);
  });

  /* ── HIGHLIGHT ACTION ── */
  window.__lumHighlight = function() {
    if (!savedRange && !savedText) {
      window.__lumHidePopup();
      showToast('Selectionnez du texte dabord');
      return;
    }
    var text = savedText;
    var range = savedRange;
    if (!text) { window.__lumHidePopup(); return; }
    // Restore the range into the selection so surroundContents works
    if (range) {
      try {
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch(err) { /* ignore */ }
    }

    var id = 'lum-' + (++hlCounter);

    // Wrap selection in a span
    try {
      var span = document.createElement('mark');
      span.className     = 'lum-hl';
      span.dataset.lumId = id;

      // Remove button inside the mark
      var rmBtn = document.createElement('span');
      rmBtn.className = 'lum-hl-remove';
      rmBtn.textContent = '✕';
      rmBtn.title = 'Supprimer ce surlignage';
      rmBtn.onclick = function(e) {
        e.stopPropagation();
        removeHighlight(id);
      };

      range.surroundContents(span);
      span.appendChild(rmBtn);
    } catch(err) {
      // surroundContents fails on cross-element selections — use extractContents instead
      try {
        var frag = range.extractContents();
        var span2 = document.createElement('mark');
        span2.className     = 'lum-hl';
        span2.dataset.lumId = id;
        span2.appendChild(frag);
        var rmBtn2 = document.createElement('span');
        rmBtn2.className = 'lum-hl-remove';
        rmBtn2.textContent = '✕';
        rmBtn2.onclick = function(e) { e.stopPropagation(); removeHighlight(id); };
        span2.appendChild(rmBtn2);
        range.insertNode(span2);
      } catch(err2) {
        showToast('Sélection trop complexe — essayez un passage plus court');
        window.__lumHidePopup();
        window.getSelection().removeAllRanges();
        return;
      }
    }

    highlights.push({ id: id, text: text });
    try { window.getSelection().removeAllRanges(); } catch(e) {}
    savedRange = null;
    savedText  = '';
    window.__lumHidePopup();
    updateCount();
    showToast('Surlignage ' + highlights.length + ' ajoute !');
  };

  function removeHighlight(id) {
    var el = document.querySelector('[data-lum-id="' + id + '"]');
    if (el) {
      var parent = el.parentNode;
      while (el.firstChild) { parent.insertBefore(el.firstChild, el); }
      parent.removeChild(el);
    }
    highlights = highlights.filter(function(h) { return h.id !== id; });
    updateCount();
    showToast('Surlignage retiré');
  }

  /* ── SEND ALL ── */
  window.__lumSend = function() {
    if (!highlights.length) return;

    var pageUrl    = window.location.href;
    var pageTitle  = document.title || pageUrl;
    var pageSource = new URL(pageUrl).hostname.replace('www.', '');

    // Detect source type (email client check)
    var srcType = 'web';
    if (/mail\.google|outlook\.live|outlook\.office|mail\.yahoo|mail\.proton/.test(pageUrl)) {
      srcType = 'email';
    }

    // Build multi-highlight payload
    var payload = highlights.map(function(h) {
      return {
        quote:  h.text,
        url:    pageUrl,
        source: pageTitle,
        src:    srcType
      };
    });

    // Open Luminary with all highlights encoded
    var lumUrl = BASE_URL + '?capture=multi&data=' + encodeURIComponent(JSON.stringify(payload));

    // If URL is too long (>4000 chars), chunk
    if (lumUrl.length > 4000) {
      // Send them one by one sequentially
      highlights.forEach(function(h, i) {
        var u = BASE_URL + '?capture=1'
          + '&quote='  + encodeURIComponent(h.text)
          + '&url='    + encodeURIComponent(pageUrl)
          + '&source=' + encodeURIComponent(pageTitle)
          + '&src='    + srcType;
        setTimeout(function() { window.open(u, '_blank'); }, i * 600);
      });
    } else {
      window.open(lumUrl, '_blank');
    }

    showToast('✦ Envoi de ' + highlights.length + ' highlight' + (highlights.length > 1 ? 's' : '') + '…');
  };

  /* ── CLOSE / TOGGLE ── */
  window.__lumClose = function() {
    // Remove all visual highlights
    document.querySelectorAll('.lum-hl').forEach(function(el) {
      var parent = el.parentNode;
      while (el.firstChild && el.firstChild.className !== 'lum-hl-remove') {
        parent.insertBefore(el.firstChild, el);
      }
      parent.removeChild(el);
    });
    // Remove UI
    toolbar.remove();
    popup.remove();
    toast.remove();
    style.remove();
    highlights = [];
    window.__luminaryActive = false;
    delete window.__lumSend;
    delete window.__lumClose;
    delete window.__lumHighlight;
    delete window.__lumHidePopup;
    delete window.__luminaryToggle;
  };

  window.__luminaryToggle = function() {
    toolbar.style.display = toolbar.style.display === 'none' ? 'flex' : 'none';
  };

  showToast('✦ Mode surlignage actif — sélectionnez du texte');

})();
