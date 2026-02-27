function buildSourceUrl(h) {
  if (!h.url) return null;
  var words = h.quote.substring(0, 40).trim();
  return h.url + '#:~:text=' + encodeURIComponent(words);
}

function goToSource(id) {
  var h = null;
  for (var i = 0; i < HL.length; i++) { if (HL[i].id === id) { h = HL[i]; break; } }
  if (!h) return;
  var url = buildSourceUrl(h);
  if (url) window.open(url, '_blank');
}

function cardHTML(h) {
  var ico  = TYPE_EMO[h.type] || 'o';
  var date = new Date(h.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
  var tags = h.tags.map(function(t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('');
  var id   = h.id;
  var hasSrc = !!(h.url);
  var html = '<div class="hcard ' + h.type + '" onclick="openDetail(&quot;' + id + '&quot;)">';
  html += '<div class="hcard-meta">';
  html += '<span class="type-pill ' + h.type + '">' + ico + ' ' + h.type + '</span>';
  html += '<span class="hcard-source">' + esc(h.source) + '</span>';
  html += '<span class="hcard-date">' + date + (h.fav ? ' ★' : '') + '</span>';
  html += '</div>';
  html += '<div class="hcard-quote">' + esc(h.quote) + '</div>';
  if (h.note) html += '<div class="hcard-note">💭 ' + esc(h.note) + '</div>';
  if (tags)   html += '<div class="hcard-tags">' + tags + '</div>';
  if (h.transcript) html += '<div class="hcard-tr-badge">📝 Retranscription disponible</div>';
  html += '<div class="hcard-actions">';
  html += '<span class="act" onclick="event.stopPropagation();toggleFav(\'' + id + '\')">' + (h.fav ? '★ Retirer' : '☆ Favori') + '</span>';
  if (hasSrc) html += '<span class="act" onclick="event.stopPropagation();goToSource(\'' + id + '\')">Source</span>';
  html += '<span class="act" onclick="event.stopPropagation();copyText(\'' + id + '\')">Copier</span>';
  html += '<span class="act obs" onclick="event.stopPropagation();send2obs(\'' + id + '\')">Obsidian</span>';
  html += '<span class="act danger" onclick="event.stopPropagation();delHL(\'' + id + '\')">✕</span>';
  html += '</div></div>';
  return html;
}
