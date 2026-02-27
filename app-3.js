'use strict';

function esc(s) {
  var r = String(s || '');
  r = r.split('&').join('&amp;');
  r = r.split('<').join('&lt;');
  r = r.split('>').join('&gt;');
  r = r.split('"').join('&quot;');
  return r;
}

var HL = [];
var PAGES = [];
var obsVault = '';
var obsFolder = 'Luminary';
var curTab = 'web';
var curView = 'home';
var curPage = null; // page en cours de lecture
var dailyHL = null;
var selectedLines = [];
var transcriptData = [];

function loadState() {
  try { HL    = JSON.parse(localStorage.getItem('lum_hl')    || '[]'); } catch(e) { HL = []; }
  try { PAGES = JSON.parse(localStorage.getItem('lum_pages') || '[]'); } catch(e) { PAGES = []; }
  obsVault  = localStorage.getItem('lum_vault')  || '';
  obsFolder = localStorage.getItem('lum_folder') || 'Luminary';
}

function persist() {
  localStorage.setItem('lum_hl',    JSON.stringify(HL));
  localStorage.setItem('lum_pages', JSON.stringify(PAGES));
  updateBadges();
}

function saveObs() {
  obsVault  = document.getElementById('obsVault').value;
  obsFolder = document.getElementById('obsFolder').value || 'Luminary';
  localStorage.setItem('lum_vault',  obsVault);
  localStorage.setItem('lum_folder', obsFolder);
  updateMdPreview();
}

function seedDemo() {
  if (HL.length > 0) return;
  HL = [
    { id:'d1', type:'web',     quote:'The best ideas start as contradictions.',                             source:'Paul Graham',    url:'https://paulgraham.com', note:'',                tags:['startup'],       date:new Date().toISOString(),                     fav:false, transcript:'' },
    { id:'d2', type:'email',   quote:'Attention is the most precious resource we have.',                    source:'Dense Discovery', url:'',                       note:'Sujet cle',       tags:['attention'],     date:new Date(Date.now()-86400000).toISOString(),  fav:true,  transcript:'' },
    { id:'d3', type:'youtube', quote:'The goal is not to manage time, it is to manage energy.',             source:'Marie Forleo',   url:'https://youtube.com',    note:'Changer mon approche', tags:['productivite'], date:new Date(Date.now()-2*86400000).toISOString(), fav:false, transcript:'[0:00] Bienvenue\n[0:15] The goal is not to manage time, it is to manage energy.' },
    { id:'d4', type:'pdf',     quote:'La carte n\'est pas le territoire.',                                  source:'Korzybski',      url:'',                       note:'',                tags:['philosophie'],   date:new Date(Date.now()-3*86400000).toISOString(), fav:true,  transcript:'' }
  ];
  persist();
}

var TITLES = { home:'Accueil', all:'Tous', web:'Web', email:'Email', youtube:'YouTube', pdf:'PDF', podcast:'Podcasts', kindle:'Kindle', fav:'Favoris', review:'Revue du jour', setup:'Configuration', obsidian:'Obsidian', pages:'Pages sauvegardées', reader:'Lecture' };
var TYPE_EMO = { web:'🌐', email:'✉️', youtube:'▶️', pdf:'📄', podcast:'🎙️', kindle:'📚' };

function go(v, btn, mobId) {
  curView = v;
  document.querySelectorAll('.view').forEach(function(x) { x.classList.remove('active'); });
  var el = document.getElementById('v-' + v);
  if (el) el.classList.add('active');
  document.getElementById('topTitle').textContent = TITLES[v] || v;
  document.querySelectorAll('.nav-btn').forEach(function(x) { x.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.mob-btn').forEach(function(x) { x.classList.remove('active'); });
  if (mobId) { var mb = document.getElementById(mobId); if (mb) mb.classList.add('active'); }
  renderView(v);
  closeSidebar();
}

function renderView(v) {
  if      (v === 'home')    renderHome();
  else if (v === 'all')     renderGrid('allGrid',   'emptyAll',   HL);
  else if (v === 'web')     renderGrid('webGrid',   'emptyWeb',   HL.filter(function(h) { return h.type === 'web'; }));
  else if (v === 'email')   renderGrid('emailGrid', 'emptyEmail', HL.filter(function(h) { return h.type === 'email'; }));
  else if (v === 'youtube') renderGrid('ytGrid',    'emptyYt',    HL.filter(function(h) { return h.type === 'youtube'; }));
  else if (v === 'pdf')     renderGrid('pdfGrid',   'emptyPdf',   HL.filter(function(h) { return h.type === 'pdf'; }));
  else if (v === 'podcast') renderGrid('podGrid',   'emptyPod',   HL.filter(function(h) { return h.type === 'podcast'; }));
  else if (v === 'kindle')  renderGrid('kindleGrid','emptyKindle',HL.filter(function(h) { return h.type === 'kindle'; }));
  else if (v === 'fav')     renderGrid('favGrid',   'emptyFav',   HL.filter(function(h) { return h.fav; }));
  else if (v === 'review')  renderReview();
  else if (v === 'setup')   renderSetup();
  else if (v === 'obsidian') renderObsidian();
  else if (v === 'pages')   renderPages();
  else if (v === 'reader')  renderReader();
}

function renderHome() {
  var week = HL.filter(function(h) { return new Date(h.date) > new Date(Date.now() - 7*86400000); }).length;
  document.getElementById('statTotal').textContent = HL.length;
  document.getElementById('statWeek').textContent  = week;
  document.getElementById('statFav').textContent   = HL.filter(function(h) { return h.fav; }).length;
  if (HL.length > 0) {
    if (!dailyHL) dailyHL = HL[Math.floor(Math.random() * HL.length)];
    document.getElementById('dailyBox').style.display = '';
    document.getElementById('dailyQ').textContent = '"' + dailyHL.quote + '"';
    document.getElementById('dailyS').textContent = '— ' + dailyHL.source;
    document.getElementById('dailyObsBtn').onclick = function() { send2obs(dailyHL.id); };
  } else {
    document.getElementById('dailyBox').style.display = 'none';
  }
  var recent = HL.slice().sort(function(a,b) { return new Date(b.date) - new Date(a.date); }).slice(0, 6);
  document.getElementById('recentSub').textContent = HL.length + ' au total';
  renderGrid('recentGrid', null, recent);
}

function refreshDaily() {
  dailyHL = HL[Math.floor(Math.random() * HL.length)];
  renderHome();
}

function renderGrid(gridId, emptyId, items) {
  var g = document.getElementById(gridId);
  if (!g) return;
  g.innerHTML = items.map(cardHTML).join('');
  if (emptyId) {
    var e = document.getElementById(emptyId);
    if (e) e.style.display = items.length ? 'none' : '';
  }
}

function renderReview() {
  renderGrid('reviewGrid', null, HL.slice().sort(function() { return Math.random() - .5; }).slice(0, 5));
}

function renderSetup() {
  var base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
  var urlEl = document.getElementById('captureUrlText');
  if (urlEl) urlEl.textContent = base + '?capture=1&quote=TEXTE&url=URL&src=web';
  // Highlighter bookmarklet: loads highlighter.js from the app, or runs inline if already loaded
  var bk = 'javascript:(function(){'
    + 'if(window.__luminaryActive){window.__luminaryToggle&&window.__luminaryToggle();return;}'
    + 'var s=document.createElement("script");'
    + 's.src="' + base + 'highlighter.js?v="+Date.now();'
    + 'document.head.appendChild(s);'
    + '})();';
  var bkEl = document.getElementById('bkLetLink');
  if (bkEl) bkEl.textContent = bk;
}

function renderObsidian() {
  loadObsSettings();
}

function buildSourceUrl(h) {
  if (!h.url) return null;
  var words = h.quote.substring(0, 40).trim();
  return h.url + '#:~:text=' + encodeURIComponent(words);
}

function cardHTML(h) {
  var ico  = TYPE_EMO[h.type] || 'o';
  var date = new Date(h.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  var tags = h.tags.map(function(t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
  var id   = h.id;
  var srcUrl = buildSourceUrl(h);
  return '<div class="hcard ' + h.type + '" onclick="openDetail('' + id + '')">'
    + '<div class="hcard-meta">'
    + '<span class="type-pill ' + h.type + '">' + ico + ' ' + h.type + '</span>'
    + '<span class="hcard-source">' + esc(h.source) + '</span>'
    + '<span class="hcard-date">' + date + (h.fav ? ' ★' : '') + '</span>'
    + '</div>'
    + '<div class="hcard-quote">' + esc(h.quote) + '</div>'
    + (h.note ? '<div class="hcard-note">💭 ' + esc(h.note) + '</div>' : '')
    + (tags   ? '<div class="hcard-tags">' + tags + '</div>' : '')
    + (h.transcript ? '<div class="hcard-tr-badge">📝 Retranscription disponible</div>' : '')
    + '<div class="hcard-actions">'
    + '<span class="act" onclick="event.stopPropagation();toggleFav('' + id + '')">' + (h.fav ? '★ Retirer' : '☆ Favori') + '</span>'
    + (srcUrl ? '<span class="act" onclick="event.stopPropagation();window.open(buildSourceUrl(HL.find(function(x){return x.id==='' + id + '\';})),'_blank')">🔗 Source</span>' : '')
    + '<span class="act" onclick="event.stopPropagation();copyText('' + id + '')">⎘ Copier</span>'
    + '<span class="act obs" onclick="event.stopPropagation();send2obs('' + id + '')">◆ Obsidian</span>'
    + '<span class="act danger" onclick="event.stopPropagation();delHL('' + id + '')">✕</span>'
    + '</div></div>';
}

function updateBadges() {
  var m = {
    bAll:    HL.length,
    bFav:    HL.filter(function(h) { return h.fav; }).length,
    bWeb:    HL.filter(function(h) { return h.type === 'web'; }).length,
    bEmail:  HL.filter(function(h) { return h.type === 'email'; }).length,
    bYt:     HL.filter(function(h) { return h.type === 'youtube'; }).length,
    bPdf:    HL.filter(function(h) { return h.type === 'pdf'; }).length,
    bPod:    HL.filter(function(h) { return h.type === 'podcast'; }).length,
    bKindle: HL.filter(function(h) { return h.type === 'kindle'; }).length,
    bPages:  PAGES.length
  };
  Object.keys(m).forEach(function(k) { var el = document.getElementById(k); if (el) el.textContent = m[k]; });
}

/* ── CAPTURE PANEL ── */
function openCapture(prefill) {
  curTab = (prefill && prefill.src) || 'web';
  selectedLines = [];
  transcriptData = [];
  setField('cpQuote',  (prefill && prefill.quote)  || '');
  setField('cpSource', (prefill && prefill.source) || '');
  setField('cpUrl',    (prefill && prefill.url)    || '');
  setField('cpNote',   '');
  setField('cpTags',   '');
  setField('ytUrlInput', '');
  var yi = document.getElementById('ytInfoBox');    if (yi) yi.style.display = 'none';
  var yt = document.getElementById('transcriptBox'); if (yt) yt.style.display = 'none';
  switchTab(curTab);
  document.getElementById('capturePanel').style.display = 'flex';
  document.getElementById('mainShell').style.display    = 'none';
  document.getElementById('mobNav').style.display       = 'none';
  document.getElementById('mobFab').style.display       = 'none';
  setTimeout(function() {
    if (curTab !== 'youtube') { var q = document.getElementById('cpQuote'); if (q && !q.value) q.focus(); }
  }, 150);
}

function closeCapture() {
  document.getElementById('capturePanel').style.display = 'none';
  document.getElementById('mainShell').style.display    = '';
  document.getElementById('mobNav').style.display       = '';
  document.getElementById('mobFab').style.display       = '';
}

function setField(id, val) { var el = document.getElementById(id); if (el) el.value = val; }

function switchTab(t) {
  curTab = t;
  document.querySelectorAll('.stab').forEach(function(b) {
    var bt = b.getAttribute('data-tab');
    b.className = 'stab' + (bt === t ? ' active ' + t : '');
  });
  ['web','email','youtube','pdf','podcast','kindle'].forEach(function(n) {
    var el = document.getElementById('fields-' + n);
    if (el) el.style.display = n === t ? '' : 'none';
  });
}

/* ── YOUTUBE TRANSCRIPT ── */
function extractVideoId(url) {
  var pats = [/[?&]v=([^&#]+)/, /youtu\.be\/([^?&#]+)/, /youtube\.com\/embed\/([^?&#]+)/, /youtube\.com\/shorts\/([^?&#]+)/];
  for (var i = 0; i < pats.length; i++) { var m = url.match(pats[i]); if (m) return m[1]; }
  return null;
}

function fetchTranscript() {
  var url = document.getElementById('ytUrlInput').value.trim();
  if (!url) { showToast('Collez d\'abord l\'URL YouTube'); return; }
  var vid = extractVideoId(url);
  if (!vid) { showToast('URL YouTube non reconnue'); return; }
  var btn = document.getElementById('fetchBtn');
  btn.disabled = true;
  btn.textContent = 'Chargement...';

  fetch('https://noembed.com/embed?url=https://www.youtube.com/watch?v=' + vid)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      setField('cpSource', data.author_name || data.title || 'YouTube');
      setField('cpUrl', 'https://www.youtube.com/watch?v=' + vid);
      document.getElementById('ytThumb').src = 'https://img.youtube.com/vi/' + vid + '/mqdefault.jpg';
      document.getElementById('ytTitle').textContent   = data.title || '';
      document.getElementById('ytChannel').textContent = data.author_name || '';
      document.getElementById('ytInfoBox').style.display = '';
      return fetchYtTranscript(vid);
    })
    .then(function(lines) {
      btn.disabled = false;
      btn.textContent = '▶️ Charger';
      if (!lines || lines.length === 0) { showToast('Pas de sous-titres disponibles pour cette vidéo'); return; }
      transcriptData = lines;
      renderTranscript(lines);
    })
    .catch(function() {
      btn.disabled = false;
      btn.textContent = '▶️ Charger';
      showToast('Erreur réseau — vérifiez l\'URL');
    });
}

function fetchYtTranscript(vid) {
  return fetch('https://corsproxy.io/?https://www.youtube.com/watch?v=' + vid)
    .then(function(r) { return r.text(); })
    .then(function(html) {
      var m = html.match(/"captionTracks":\s*\[\s*\{"[^}]*"baseUrl":"([^"]+)"/);
      if (!m) {
        var m2 = html.match(/playerCaptionsTracklistRenderer[\s\S]*?"baseUrl":"([^"]+)"/);
        if (!m2) return [];
        return fetchCaptionXml(m2[1].split('\\u0026').join('&').split('\\').join(''));
      }
      return fetchCaptionXml(m[1].split('\\u0026').join('&').split('\\').join(''));
    });
}

function fetchCaptionXml(url) {
  return fetch('https://corsproxy.io/?' + url)
    .then(function(r) { return r.text(); })
    .then(function(xml) {
      var lines = [];
      var q = '"';
      var reStr = '<text start=' + q + '([^' + q + ']+)' + q + ' dur=' + q + '([^' + q + ']+)' + q + '[^>]*>([\s\S]*?)<\/text>';
      var re = new RegExp(reStr, 'g');
      var m;
      while ((m = re.exec(xml)) !== null) {
        var start = parseFloat(m[1]);
        var apos = String.fromCharCode(39);
        var text = m[3]
          .split('&amp;').join('&')
          .split('&lt;').join('<')
          .split('&gt;').join('>')
          .split('&quot;').join(q)
          .split('&#39;').join(apos)
          .replace(/<[^>]+>/g, '')
          .trim();
        if (text) lines.push({ start: start, text: text, ts: formatTime(start) });
      }
      return lines;
    });
}

function formatTime(secs) {
  var s = Math.floor(secs);
  var m = Math.floor(s / 60);
  var h = Math.floor(m / 60);
  s = s % 60; m = m % 60;
  if (h > 0) return h + ':' + pad(m) + ':' + pad(s);
  return m + ':' + pad(s);
}
function pad(n) { return n < 10 ? '0' + n : '' + n; }

function renderTranscript(lines) {
  var scroll = document.getElementById('transcriptScroll');
  document.getElementById('transcriptBox').style.display = '';
  scroll.innerHTML = lines.map(function(l, i) {
    return '<div class="transcript-line" data-idx="' + i + '" onclick="toggleLine(' + i + ')">'
      + '<span class="ts">' + l.ts + '</span>' + esc(l.text) + '</div>';
  }).join('');
  selectedLines = [];
  updateTranscriptQuote();
}

function toggleLine(idx) {
  var pos = selectedLines.indexOf(idx);
  if (pos === -1) { selectedLines.push(idx); selectedLines.sort(function(a,b) { return a - b; }); }
  else { selectedLines.splice(pos, 1); }
  document.querySelectorAll('.transcript-line').forEach(function(el) {
    var i = parseInt(el.getAttribute('data-idx'));
    el.classList.toggle('selected', selectedLines.indexOf(i) !== -1);
  });
  updateTranscriptQuote();
}

function updateTranscriptQuote() {
  if (selectedLines.length === 0) { setField('cpQuote', ''); return; }
  var text = selectedLines.map(function(i) { return transcriptData[i].text; }).join(' ');
  setField('cpQuote', text);
  var ts = transcriptData[selectedLines[0]].ts;
  var note = document.getElementById('cpNote').value || '';
  if (!note || /^\[\d/.test(note)) {
    setField('cpNote', '[' + ts + '] ' + note.replace(/^\[\d[^\]]*\] */, ''));
  }
}

function selectAllTranscript() {
  selectedLines = transcriptData.map(function(_, i) { return i; });
  document.querySelectorAll('.transcript-line').forEach(function(el) { el.classList.add('selected'); });
  updateTranscriptQuote();
  showToast('Toute la retranscription sélectionnée');
}

function clearTranscriptSelection() {
  selectedLines = [];
  document.querySelectorAll('.transcript-line').forEach(function(el) { el.classList.remove('selected'); });
  setField('cpQuote', '');
}

function saveCapture() {
  var quote = document.getElementById('cpQuote').value.trim();
  if (!quote) { showToast('Sélectionnez du texte ou collez un passage'); return; }
  var tags = document.getElementById('cpTags').value
    .split(',').map(function(t) { return t.trim(); }).filter(function(t) { return t.length > 0; });
  var transcript = '';
  if (curTab === 'youtube' && transcriptData.length > 0) {
    transcript = transcriptData.map(function(l) { return '[' + l.ts + '] ' + l.text; }).join('\n');
  }
  var h = {
    id:         Date.now().toString(),
    type:       curTab,
    quote:      quote,
    source:     document.getElementById('cpSource').value.trim() || curTab,
    url:        document.getElementById('cpUrl').value.trim(),
    note:       document.getElementById('cpNote').value.trim(),
    tags:       tags,
    date:       new Date().toISOString(),
    fav:        false,
    transcript: transcript
  };
  HL.unshift(h);
  persist();
  closeCapture();
  renderView(curView);
  showToast('✦ Sauvegardé !');
}

/* ── DETAIL SHEET ── */
function openDetail(id) {
  var h = null;
  for (var i = 0; i < HL.length; i++) { if (HL[i].id === id) { h = HL[i]; break; } }
  if (!h) return;
  var ico  = TYPE_EMO[h.type] || 'o';
  var date = new Date(h.date).toLocaleDateString('fr-FR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  var tags = h.tags.map(function(t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
  document.getElementById('detailContent').innerHTML =
      '<div class="sheet-meta">'
    + '<span class="type-pill ' + h.type + '">' + ico + ' ' + h.type + '</span>'
    + '<span class="sheet-source">' + esc(h.source) + (h.fav ? ' ★' : '') + '</span>'
    + '</div>'
    + '<div class="sheet-quote">' + esc(h.quote) + '</div>'
    + (h.note       ? '<div class="sheet-note">💭 ' + esc(h.note) + '</div>' : '')
    + (tags         ? '<div class="hcard-tags" style="margin-bottom:12px">' + tags + '</div>' : '')
    + (h.transcript ? '<div class="sheet-tr-label">📝 Retranscription complète</div><div class="sheet-transcript">' + esc(h.transcript) + '</div>' : '')
    + (h.url        ? '<div class="sheet-url">🔗 <a href="' + esc(h.url) + '" target="_blank">' + esc(h.url) + '</a></div>' : '')
    + '<div class="sheet-date">' + date + '</div>';
  document.getElementById('detailFooter').innerHTML =
      '<button class="btn" onclick="toggleFav(\'' + id + '\');closeDetail()">' + (h.fav ? '★ Retirer' : '☆ Favori') + '</button>'
    + '<button class="btn" onclick="copyText(\'' + id + '\')">⎘ Copier</button>'
    + '<button class="btn obs" onclick="send2obs(\'' + id + '\')">◆ Obsidian</button>'
    + '<button class="btn danger" onclick="delHL(\'' + id + '\');closeDetail()">🗑 Supprimer</button>';
  document.getElementById('detailOverlay').classList.add('open');
}

function closeDetail(e) {
  if (!e || e.target === document.getElementById('detailOverlay'))
    document.getElementById('detailOverlay').classList.remove('open');
}

function toggleFav(id) {
  for (var i = 0; i < HL.length; i++) {
    if (HL[i].id === id) { HL[i].fav = !HL[i].fav; persist(); renderView(curView); showToast(HL[i].fav ? '★ Favori ajouté' : 'Retiré'); return; }
  }
}
function delHL(id) {
  if (!confirm('Supprimer ce highlight ?')) return;
  HL = HL.filter(function(x) { return x.id !== id; });
  persist(); renderView(curView); showToast('Supprimé');
}
function copyText(id) {
  for (var i = 0; i < HL.length; i++) {
    if (HL[i].id === id) { if (navigator.clipboard) navigator.clipboard.writeText(HL[i].quote); showToast('⎘ Copié !'); return; }
  }
}

function handleSearch(q) {
  q = q.toLowerCase().trim();
  var map = { home:'recentGrid', all:'allGrid', web:'webGrid', email:'emailGrid', youtube:'ytGrid', pdf:'pdfGrid', fav:'favGrid' };
  var gid = map[curView]; if (!gid) return;
  var base = curView === 'home'  ? HL.slice().sort(function(a,b) { return new Date(b.date) - new Date(a.date); }).slice(0, 6)
           : curView === 'fav'   ? HL.filter(function(h) { return h.fav; })
           : curView === 'all'   ? HL
           : HL.filter(function(h) { return h.type === curView; });
  var items = !q ? base : base.filter(function(h) {
    return h.quote.toLowerCase().indexOf(q) > -1
      || (h.source || '').toLowerCase().indexOf(q) > -1
      || h.tags.some(function(t) { return t.toLowerCase().indexOf(q) > -1; });
  });
  renderGrid(gid, null, items);
}

/* ── OBSIDIAN ── */
function buildMD(h) {
  var date    = new Date(h.date).toISOString().split('T')[0];
  var created = new Date(h.date).toISOString().replace('T',' ').substring(0,16);
  var defAuteur = localStorage.getItem('lum_auteur') || '';
  var defStatus = localStorage.getItem('lum_status') || 'a traiter';
  var auteur  = h.auteur || defAuteur;
  var status  = defStatus;
  var tl = { web:'Web', email:'Email', youtube:'YouTube', pdf:'PDF', podcast:'Podcast', kindle:'Kindle' };
  var tags = h.tags.length
    ? '[' + h.tags.map(function(t){ return '"'+t+'"'; }).join(', ') + ']'
    : '[]';

  var md = '---\n'
    + 'source: "' + (h.source || '') + '"\n'
    + 'url: "' + (h.url || '') + '"\n'
    + 'auteur: "' + auteur + '"\n'
    + 'date: ' + date + '\n'
    + 'status: ' + status + '\n'
    + 'tags: ' + tags + '\n'
    + '---\n\n'
    + '## ' + (h.source || 'Highlight') + '\n\n'
    + '> ' + h.quote + '\n\n';
  if (h.note)       md += '**Note :** ' + h.note + '\n\n';
  if (h.transcript) md += '### Retranscription\n\n' + h.transcript + '\n\n';
  md += '---\n*Capturé via Luminary — ' + created + '*';
  return md;
}

function buildURI(h) {
  if (!obsVault.trim()) return null;
  var name = (h.source || 'Highlight').replace(/[\/\\:*?"<>|]/g, '').substring(0, 50) + '-' + h.id.slice(-4);
  var file = '1 - Inbox/' + name;
  return 'obsidian://new?vault=' + encodeURIComponent(obsVault.trim()) + '&file=' + encodeURIComponent(file) + '&content=' + encodeURIComponent(buildMD(h));
}

function send2obs(id) {
  var h = null;
  for (var i = 0; i < HL.length; i++) { if (HL[i].id === id) { h = HL[i]; break; } }
  if (!h) return;
  if (!obsVault.trim()) { showToast('Configurez votre vault d\'abord'); go('obsidian'); return; }
  window.location.href = buildURI(h);
  showToast('◆ Ouverture dans Obsidian…');
}

function testObs() {
  if (!obsVault.trim()) { showToast('Entrez le nom du vault'); return; }
  window.location.href = 'obsidian://open?vault=' + encodeURIComponent(obsVault.trim());
}

function updateMdPreview() {
  var el = document.getElementById('mdPreview'); if (!el) return;
  var s = HL[0] || { source:'Paul Graham', quote:'Keep it simple.', note:'', tags:['startup'], date:new Date().toISOString(), type:'web', url:'', transcript:'' };
  el.textContent = buildMD(s);
}

function exportAll() {
  if (!obsVault.trim()) { showToast('Configurez votre vault'); return; }
  if (!confirm('Envoyer ' + HL.length + ' highlights dans Obsidian ?')) return;
  HL.forEach(function(h, i) { setTimeout(function() { var u = buildURI(h); if (u) window.location.href = u; }, i * 900); });
  showToast('◆ Export en cours…');
}
function exportFavs() {
  var f = HL.filter(function(h) { return h.fav; });
  if (!obsVault.trim()) { showToast('Configurez votre vault'); return; }
  if (!f.length) { showToast('Aucun favori'); return; }
  f.forEach(function(h, i) { setTimeout(function() { var u = buildURI(h); if (u) window.location.href = u; }, i * 900); });
  showToast('◆ Export de ' + f.length + ' favoris…');
}
function dlMd() {
  var date = new Date().toISOString().split('T')[0];
  var md = '# Luminary — ' + date + '\n\n' + HL.length + ' highlights\n\n---\n\n';
  HL.forEach(function(h) { md += buildMD(h) + '\n\n---\n\n'; });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type:'text/markdown' }));
  a.download = 'luminary-' + date + '.md';
  a.click();
  showToast('⬇ Téléchargé');
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('bgOverlay').classList.toggle('show'); }
function closeSidebar()   { document.getElementById('sidebar').classList.remove('open'); document.getElementById('bgOverlay').classList.remove('show'); }

function showToast(m) {
  var t = document.getElementById('toast');
  t.textContent = m; t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2400);
}

function copyUrl() { var el = document.getElementById('captureUrlText'); if (el && navigator.clipboard) navigator.clipboard.writeText(el.textContent); showToast('URL copiée !'); }
function copyBookmarklet() { var el = document.getElementById('bkLetLink'); if (el && navigator.clipboard) navigator.clipboard.writeText(el.textContent); showToast('Copié !'); }

function checkCapture() {
  var p = new URLSearchParams(window.location.search);
  if (p.get('capture') === 'multi') {
    history.replaceState({}, '', window.location.pathname);
    try {
      var data = JSON.parse(decodeURIComponent(p.get('data') || '[]'));
      openCaptureMulti(data);
    } catch(e) { showToast('Erreur de capture multiple'); }
    return;
  }
  if (p.get('capture') === '1') {
    history.replaceState({}, '', window.location.pathname);
    openCapture({
      quote:  decodeURIComponent(p.get('quote')  || ''),
      url:    decodeURIComponent(p.get('url')    || ''),
      source: decodeURIComponent(p.get('source') || ''),
      src:    p.get('src') || 'web'
    });
  }
}

loadState();
seedDemo();
updateBadges();
renderHome();
checkCapture();

/* ── MULTI HIGHLIGHT CAPTURE ── */
function openCaptureMulti(items) {
  if (!items || !items.length) return;
  var valid = items.filter(function(i){ return (i.quote||'').trim(); });
  if (!valid.length) return;

  // Construire et afficher le panel de révision
  var existing = document.getElementById('rl-multi-panel');
  if (existing) existing.remove();

  var panel = document.createElement('div');
  panel.id = 'rl-multi-panel';
  panel.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#09090d;overflow-y:auto;font-family:-apple-system,sans-serif;';

  var source = (valid[0].source || valid[0].url || 'Page web').substring(0, 60);
  var pageUrl = valid[0].url || '';

  var html = '<div style="max-width:680px;margin:0 auto;padding:24px 16px 80px">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">'
    + '<button onclick="document.getElementById('rl-multi-panel').remove()" style="background:rgba(255,255,255,.07);border:none;color:#aaa;font-size:13px;padding:8px 14px;border-radius:20px;cursor:pointer">← Annuler</button>'
    + '<div style="flex:1">'
    + '<div style="font-size:11px;color:#6a6778;text-transform:uppercase;letter-spacing:.08em">✦ Surlignages capturés</div>'
    + '<div style="font-size:14px;color:#edeae3;margin-top:2px">' + esc(source) + '</div>'
    + '</div>'
    + '<button onclick="saveMultiAll()" style="background:#c9a96e;color:#0f0f14;border:none;font-size:13px;font-weight:700;padding:10px 20px;border-radius:20px;cursor:pointer">Tout sauvegarder ✓</button>'
    + '</div>';

  valid.forEach(function(item, i) {
    var q = (item.quote || '').trim();
    var fragUrl = pageUrl ? pageUrl + '#:~:text=' + encodeURIComponent(q.substring(0, 40)) : '';
    html += '<div style="background:#17171f;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:16px;margin-bottom:12px">'
      + '<div style="font-size:11px;color:#c9a96e;margin-bottom:8px">Extrait ' + (i+1) + '</div>'
      + '<div style="font-size:15px;color:#edeae3;line-height:1.6;font-style:italic">"' + esc(q) + '"</div>'
      + (fragUrl ? '<div style="margin-top:10px"><a href="' + esc(fragUrl) + '" target="_blank" style="font-size:12px;color:#6a6778;text-decoration:none">🔗 Voir dans la page →</a></div>' : '')
      + '</div>';
  });

  html += '</div>';
  panel.innerHTML = html;
  document.body.appendChild(panel);

  // Stocker les items pour la sauvegarde
  window._multiPending = valid;
}

function saveMultiAll() {
  var items = window._multiPending;
  if (!items || !items.length) return;
  var saved = 0;
  items.forEach(function(item) {
    var quote = (item.quote || '').trim();
    if (!quote) return;
    var h = {
      id:         Date.now().toString() + Math.random().toString(36).slice(2),
      type:       item.src || 'web',
      quote:      quote,
      source:     (item.source || item.url || 'web').substring(0, 80),
      url:        item.url || '',
      note:       '',
      tags:       [],
      date:       new Date().toISOString(),
      fav:        false,
      transcript: ''
    };
    HL.unshift(h);
    saved++;
  });
  persist();
  var panel = document.getElementById('rl-multi-panel');
  if (panel) panel.remove();
  window._multiPending = null;
  renderView(curView);
  showToast('\u2736 ' + saved + ' surlignage' + (saved > 1 ? 's' : '') + ' sauvegardé' + (saved > 1 ? 's' : '') + ' !');
}



/* ── OBSIDIAN SETTINGS ── */
function loadObsSettings() {
  document.getElementById('obsVault').value  = localStorage.getItem('lum_vault')  || '';
  document.getElementById('obsAuteur').value = localStorage.getItem('lum_auteur') || '';
  document.getElementById('obsStatus').value = localStorage.getItem('lum_status') || 'a traiter';
  updateMdPreview();
}

function saveObsSettings() {
  localStorage.setItem('lum_vault',  document.getElementById('obsVault').value.trim());
  localStorage.setItem('lum_auteur', document.getElementById('obsAuteur').value.trim());
  localStorage.setItem('lum_status', document.getElementById('obsStatus').value.trim());
  obsVault = localStorage.getItem('lum_vault');
  updateMdPreview();
  showToast('Réglages Obsidian sauvegardés');
}


/* ══════════════════════════════
   PODCAST CAPTURE
══════════════════════════════ */

var podTranscriptData = [];
var podSelectedLines  = [];

function fetchPodcast() {
  var url = document.getElementById('podUrlInput').value.trim();
  if (!url) { showToast('Collez l URL de l episode'); return; }

  var btn = document.getElementById('podFetchBtn');
  btn.disabled = true; btn.textContent = 'Chargement...';

  // Try to get episode metadata via noembed / oEmbed (Spotify, Deezer, etc.)
  // Then fetch transcript via Taddy public API or fall back to manual
  var proxyUrl = 'https://noembed.com/embed?url=' + encodeURIComponent(url);

  fetch(proxyUrl)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.title) {
        document.getElementById('podTitle').textContent   = data.title;
        document.getElementById('podChannel').textContent = data.author_name || '';
        document.getElementById('podInfoBox').style.display = '';
        setField('cpSource', data.author_name || data.title);
        setField('cpUrl', url);
      }
      // Try Taddy public transcript API
      return fetchPodTranscript(url);
    })
    .then(function(lines) {
      btn.disabled = false; btn.textContent = '🎙️ Charger';
      if (!lines || lines.length === 0) {
        // No transcript — show manual input
        document.getElementById('podManualBox').style.display = '';
        showToast('Pas de retranscription auto — saisie manuelle');
        return;
      }
      podTranscriptData = lines;
      renderPodTranscript(lines);
    })
    .catch(function() {
      btn.disabled = false; btn.textContent = '🎙️ Charger';
      // On any error, fall back to manual
      document.getElementById('podManualBox').style.display = '';
      document.getElementById('podInfoBox').style.display = '';
      setField('cpSource', url);
      setField('cpUrl', url);
      showToast('Saisie manuelle — collez votre passage');
    });
}

function fetchPodTranscript(podUrl) {
  // Taddy public search - limited but free
  // Falls back gracefully if unavailable
  var taddyUrl = 'https://api.taddy.org/';
  // Since Taddy requires auth, try Spotify embed transcript via proxy
  // For now return empty to trigger manual fallback
  return Promise.resolve([]);
}

function renderPodTranscript(lines) {
  var box    = document.getElementById('podTranscriptBox');
  var scroll = document.getElementById('podTranscriptScroll');
  box.style.display = '';
  scroll.innerHTML = lines.map(function(l, i) {
    return '<div class="transcript-line" data-idx="' + i + '" onclick="togglePodLine(' + i + ')">'
      + '<span class="ts">' + l.ts + '</span>' + esc(l.text) + '</div>';
  }).join('');
  podSelectedLines = [];
  updatePodQuote();
}

function togglePodLine(idx) {
  var pos = podSelectedLines.indexOf(idx);
  if (pos === -1) { podSelectedLines.push(idx); podSelectedLines.sort(function(a,b){return a-b;}); }
  else { podSelectedLines.splice(pos, 1); }
  document.querySelectorAll('#podTranscriptScroll .transcript-line').forEach(function(el) {
    var i = parseInt(el.getAttribute('data-idx'));
    el.classList.toggle('selected', podSelectedLines.indexOf(i) !== -1);
  });
  updatePodQuote();
}

function updatePodQuote() {
  if (!podSelectedLines.length) { setField('cpQuote', ''); return; }
  var text = podSelectedLines.map(function(i){ return podTranscriptData[i].text; }).join(' ');
  setField('cpQuote', text);
  var ts = podTranscriptData[podSelectedLines[0]].ts;
  var note = document.getElementById('cpNote').value || '';
  if (!note || /^\[\d/.test(note)) setField('cpNote', '[' + ts + '] ' + note.replace(/^\[\d[^\]]*\] */, ''));
}

function selectAllPodcast() {
  podSelectedLines = podTranscriptData.map(function(_, i){ return i; });
  document.querySelectorAll('#podTranscriptScroll .transcript-line').forEach(function(el){ el.classList.add('selected'); });
  updatePodQuote();
  showToast('Toute la retranscription sélectionnée');
}

function clearPodSelection() {
  podSelectedLines = [];
  document.querySelectorAll('#podTranscriptScroll .transcript-line').forEach(function(el){ el.classList.remove('selected'); });
  setField('cpQuote', '');
}

function openPodCapture() {
  podTranscriptData = []; podSelectedLines = [];
  setField('podUrlInput', '');
  setField('cpQuote', ''); setField('cpSource', ''); setField('cpUrl', '');
  setField('cpNote', ''); setField('cpTags', '');
  var pi = document.getElementById('podInfoBox');       if (pi) pi.style.display = 'none';
  var pt = document.getElementById('podTranscriptBox'); if (pt) pt.style.display = 'none';
  var pm = document.getElementById('podManualBox');     if (pm) pm.style.display = 'none';
  switchTab('podcast');
  document.getElementById('capturePanel').style.display = 'flex';
  document.getElementById('mainShell').style.display    = 'none';
  document.getElementById('mobNav').style.display       = 'none';
  document.getElementById('mobFab').style.display       = 'none';
}

/* ══════════════════════════════
   KINDLE IMPORT
══════════════════════════════ */

function handleKindleFile(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    parseKindleHTML(ev.target.result, file.name);
  };
  reader.readAsText(file, 'utf-8');
}

function handleKindlePaste() {
  var raw = document.getElementById('kindlePasteArea').value.trim();
  if (!raw) { showToast('Collez le contenu de read.amazon.com'); return; }
  parseKindleHTML(raw, 'Kindle');
}

function parseKindleHTML(html, filename) {
  var parser  = new DOMParser();
  var doc     = parser.parseFromString(html, 'text/html');
  var results = [];

  // read.amazon.com format: .kp-notebook-highlight (text) + .kp-notebook-metadata (location/date)
  // Try structured format first
  var noteItems = doc.querySelectorAll('.kp-notebook-row-separator');

  if (noteItems.length > 0) {
    // Structured HTML format from read.amazon.com
    noteItems.forEach(function(sep) {
      var section  = sep.previousElementSibling;
      if (!section) return;
      var textEl   = section.querySelector('#highlight, .kp-notebook-highlight');
      var metaEl   = section.querySelector('#annotationHighlightHeader, .kp-notebook-metadata');
      var noteEl   = section.querySelector('#note, .kp-notebook-note');
      if (!textEl) return;
      var quote = textEl.textContent.trim();
      var meta  = metaEl ? metaEl.textContent.trim() : '';
      var note  = noteEl ? noteEl.textContent.trim() : '';
      if (quote) results.push({ quote: quote, meta: meta, note: note });
    });
  }

  // Fallback: try .kp-notebook-highlight directly
  if (results.length === 0) {
    var highlights = doc.querySelectorAll('.kp-notebook-highlight, #highlight');
    highlights.forEach(function(el) {
      var quote = el.textContent.trim();
      if (quote && quote.length > 5) {
        var meta = '';
        var next = el.nextElementSibling;
        if (next && next.classList && (next.classList.contains('kp-notebook-metadata') || next.id === 'annotationHighlightHeader')) {
          meta = next.textContent.trim();
        }
        results.push({ quote: quote, meta: meta, note: '' });
      }
    });
  }

  // Fallback 2: plain text lines (if user pasted raw text)
  if (results.length === 0) {
    var lines = html.split('\n').filter(function(l){ return l.trim().length > 20; });
    lines.forEach(function(l) {
      results.push({ quote: l.trim(), meta: '', note: '' });
    });
  }

  if (results.length === 0) {
    showToast('Aucun surlignage trouvé — vérifiez le format');
    return;
  }

  // Show preview
  renderKindlePreview(results, filename);
}

function renderKindlePreview(results, filename) {
  var bookTitle = filename.replace(/\.[^.]+$/, '').replace(/_/g, ' ');

  // Try to extract book title from first H1/H2 in doc if available
  var preview = document.getElementById('kindlePreviewBox');
  var count   = document.getElementById('kindleCount');
  var list    = document.getElementById('kindlePreviewList');

  if (count) count.textContent = results.length + ' surlignage' + (results.length > 1 ? 's' : '') + ' trouvé' + (results.length > 1 ? 's' : '');
  if (list) {
    list.innerHTML = results.slice(0, 5).map(function(r) {
      return '<div class="kindle-preview-item">' + esc(r.quote.substring(0, 120)) + (r.quote.length > 120 ? '…' : '') + '</div>';
    }).join('') + (results.length > 5 ? '<div class="kindle-preview-more">+ ' + (results.length - 5) + ' autres…</div>' : '');
  }
  if (preview) preview.style.display = '';

  // Store globally for import
  window._kindlePending = { results: results, title: bookTitle };
}

function importKindleAll() {
  if (!window._kindlePending) return;
  var results   = window._kindlePending.results;
  var bookTitle = document.getElementById('kindleBookTitle').value.trim()
    || window._kindlePending.title
    || 'Livre Kindle';

  var imported = 0;
  results.forEach(function(r) {
    if (!r.quote.trim()) return;
    var h = {
      id:         Date.now().toString() + Math.random().toString(36).slice(2,6),
      type:       'kindle',
      quote:      r.quote.trim(),
      source:     bookTitle,
      url:        '',
      note:       r.note || '',
      tags:       ['kindle'],
      date:       new Date().toISOString(),
      fav:        false,
      transcript: r.meta || ''
    };
    HL.unshift(h);
    imported++;
  });

  persist();
  renderView(curView);

  // Close kindle panel if open, go to kindle view
  closeCapture();
  go('kindle');
  showToast('📚 ' + imported + ' surlignage' + (imported > 1 ? 's' : '') + ' Kindle importé' + (imported > 1 ? 's' : '') + ' !');
  window._kindlePending = null;
}


/* ══════════════════════════════
   PAGES SAUVEGARDÉES
══════════════════════════════ */

function renderPages() {
  var g = document.getElementById('pagesGrid');
  var e = document.getElementById('emptyPages');
  if (!g) return;
  if (!PAGES.length) {
    g.innerHTML = '';
    if (e) e.style.display = '';
    return;
  }
  if (e) e.style.display = 'none';
  g.innerHTML = PAGES.map(function(p) {
    var date = new Date(p.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
    var hlCount = (p.highlights || []).length;
    var preview = p.content ? p.content.substring(0, 120).replace(/\n+/g, ' ') + '…' : '';
    return '<div class="hcard web" onclick="openReader('' + p.id + '')" style="cursor:pointer">'
      + '<div class="hcard-meta">'
      + '<span class="type-pill web">🌐 page</span>'
      + '<span class="hcard-source">' + esc(p.title || p.url) + '</span>'
      + '<span class="hcard-date">' + date + '</span>'
      + '</div>'
      + '<div class="hcard-quote" style="font-style:normal;color:#aaa;font-size:13px">' + esc(preview) + '</div>'
      + (hlCount ? '<div class="hcard-note">✦ ' + hlCount + ' surlignage' + (hlCount > 1 ? 's' : '') + '</div>' : '')
      + '<div class="hcard-actions">'
      + '<span class="act" onclick="event.stopPropagation();openReader('' + p.id + '')">📖 Lire</span>'
      + '<span class="act danger" onclick="event.stopPropagation();delPage('' + p.id + '')">✕</span>'
      + '</div></div>';
  }).join('');
}

function delPage(id) {
  if (!confirm('Supprimer cette page sauvegardée ?')) return;
  PAGES = PAGES.filter(function(p) { return p.id !== id; });
  persist();
  renderPages();
  showToast('Page supprimée');
}

/* ══════════════════════════════
   READER VIEW
══════════════════════════════ */

function openReader(id) {
  curPage = null;
  for (var i = 0; i < PAGES.length; i++) { if (PAGES[i].id === id) { curPage = PAGES[i]; break; } }
  if (!curPage) return;
  go('reader');
}

function renderReader() {
  var el = document.getElementById('v-reader');
  if (!el || !curPage) return;

  var p = curPage;
  var highlights = p.highlights || [];

  // Construire le texte avec les surlignages marqués
  var content = esc(p.content || '');
  highlights.forEach(function(h) {
    var escaped = esc(h.text);
    content = content.replace(escaped,
      '<mark class="rl-reader-hl" data-hlid="' + h.id + '" title="Clic pour supprimer" onclick="deleteReaderHL('' + p.id + "','" + h.id + '')">' + escaped + '</mark>');
  });

  el.innerHTML =
    '<div style="max-width:680px;margin:0 auto;padding:0 0 80px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;flex-wrap:wrap">'
    + '<button onclick="go('pages')" style="background:rgba(255,255,255,.07);border:none;color:#aaa;font-size:13px;padding:8px 14px;border-radius:20px;cursor:pointer">← Pages</button>'
    + '<div style="flex:1;min-width:0">'
    + '<div style="font-size:15px;font-weight:600;color:#edeae3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(p.title || p.url) + '</div>'
    + (p.url ? '<a href="' + esc(p.url) + '" target="_blank" style="font-size:12px;color:#6a6778;text-decoration:none">🔗 Voir original</a>' : '')
    + '</div>'
    + '<div style="font-size:12px;color:#c9a96e">✦ ' + highlights.length + ' surlignage' + (highlights.length !== 1 ? 's' : '') + '</div>'
    + '</div>'
    + '<div id="reader-hint" style="background:#17171f;border:1px solid rgba(201,169,110,.25);border-radius:10px;padding:10px 14px;font-size:12px;color:#c9a96e;margin-bottom:16px">✦ Sélectionnez du texte pour le surligner</div>'
    + '<div id="reader-content" style="font-size:16px;line-height:1.8;color:#d4d0c8;white-space:pre-wrap;font-family:Georgia,serif">' + content + '</div>'
    + '</div>';

  // Écouter les sélections dans le reader
  var rc = document.getElementById('reader-content');
  if (rc) {
    rc.addEventListener('mouseup', function() {
      var sel = window.getSelection();
      var txt = sel ? sel.toString().trim() : '';
      if (!txt || txt.length < 3) return;
      addReaderHL(p.id, txt);
      sel.removeAllRanges();
    });
  }
}

function addReaderHL(pageId, text) {
  var p = null;
  for (var i = 0; i < PAGES.length; i++) { if (PAGES[i].id === pageId) { p = PAGES[i]; break; } }
  if (!p) return;
  if (!p.highlights) p.highlights = [];

  // Éviter les doublons
  var exists = p.highlights.some(function(h) { return h.text === text; });
  if (exists) { showToast('Déjà surligné'); return; }

  var hlId = Date.now().toString() + Math.random().toString(36).slice(2,5);
  p.highlights.push({ id: hlId, text: text, date: new Date().toISOString() });

  // Sauvegarder aussi dans HL principal
  HL.unshift({
    id:         hlId,
    type:       'web',
    quote:      text,
    source:     p.title || p.url,
    url:        p.url || '',
    note:       '',
    tags:       [],
    date:       new Date().toISOString(),
    fav:        false,
    transcript: ''
  });

  persist();
  renderReader();
  showToast('✦ Surligné !');
}

function deleteReaderHL(pageId, hlId) {
  var p = null;
  for (var i = 0; i < PAGES.length; i++) { if (PAGES[i].id === pageId) { p = PAGES[i]; break; } }
  if (!p || !p.highlights) return;
  if (!confirm('Retirer ce surlignage ?')) return;
  p.highlights = p.highlights.filter(function(h) { return h.id !== hlId; });
  HL = HL.filter(function(h) { return h.id !== hlId; });
  persist();
  renderReader();
  showToast('Retiré');
}

/* ══════════════════════════════
   RÉCEPTION POSTMESSAGE
══════════════════════════════ */

window.addEventListener('message', function(e) {
  var allowed = 'https://beinatdavy-lang.github.io';
  // Accepter le message si c'est une page sauvegardée
  if (!e.data || e.data.type !== 'rl-save-page') return;

  var data = e.data;
  var page = {
    id:         Date.now().toString() + Math.random().toString(36).slice(2),
    title:      (data.title || data.url || 'Page').substring(0, 100),
    url:        data.url || '',
    content:    (data.content || '').substring(0, 200000), // max ~200k chars
    date:       new Date().toISOString(),
    highlights: []
  };

  PAGES.unshift(page);
  persist();

  // Accuser réception
  if (e.source) {
    try { e.source.postMessage({ type: 'rl-ack', pageId: page.id }, '*'); } catch(err) {}
  }

  // Ouvrir directement le reader
  curPage = page;
  go('reader');
  showToast('✦ Page sauvegardée — sélectionnez pour surligner');
});
