/* ════════════════════════════════════════════════════════════════════
   Vue « Médiathèque » (/galerie) — photos et vidéos réelles des événements.
   Reprend le fonctionnement actuel : filtres ?event= / ?departement=
   (exclusifs), onglets Tout / Photos / Vidéos, 24 médias par page,
   sélection de photos téléchargeables (50 max) → ZIP, ZIP de l'événement,
   délai de téléchargement par événement, lien profond ?lightbox=ID,
   formats encadrés (Story 9:16, Carré, Paysage 3:2, TV 16:9) quand
   l'événement a un cadre de marque. Dans la maquette, cadres et ZIP sont
   générés dans le navigateur (canvas + JSZip) ; sur le site final, par le serveur.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var V = window.NWCV = window.NWCV || {};
  var NOW = Date.now();
  var EV = {
    'festi-grill-26': { t: 'Festi Grill ’26', dept: 'evangelisation', frames: true, until: '2026-10-03', n: 16, k: 'fg', ori: 'pppppppppppplplpp' },
    'a-dark-night-in-elegance': { t: 'A Dark Night in Elegance', dept: 'protocole', frames: true, until: '2026-11-20', n: 16, k: 'dn', ori: 'llppplllllllllpl' },
    'babi-giant-cypher-for-christ-vol-1': { t: 'Babi Giant Cypher for Christ · Vol. 1', dept: 'rap-et-musique-urbaine', frames: false, until: '2026-07-01', n: 14, k: 'cy', ori: 'llppplllpllplpl' },
    'saveurs-sunday-vol-1': { t: 'Saveurs Sunday · Vol. 1', dept: 'restauration', frames: false, until: '2026-11-12', n: 11, k: 'sv', ori: 'lllllllllll' }
  };
  var DEPN = { 'evangelisation': 'Évangélisation', 'protocole': 'Protocole', 'rap-et-musique-urbaine': 'Rap et Musique Urbaine', 'restauration': 'Restauration' };
  var ITEMS = [], id = 600;
  Object.keys(EV).forEach(function (slug) {
    var e = EV[slug];
    for (var i = 1; i <= e.n; i++) ITEMS.push({ id: id++, type: 'photo', src: 'img/g/' + e.k + '-' + String(i).padStart(2, '0') + '.webp', ev: slug, dept: e.dept, ori: e.ori[i - 1] === 'l' ? 'l' : 'p' });
    if (slug === 'babi-giant-cypher-for-christ-vol-1') {
      ITEMS.push({ id: id++, type: 'video', src: 'video/cypher-1.mp4', poster: 'img/g/cy-09.webp', ev: slug, dept: e.dept, ori: 'p' });
      ITEMS.push({ id: id++, type: 'video', src: 'video/cypher-2.mp4', poster: 'img/g/cy-06.webp', ev: slug, dept: e.dept, ori: 'p' });
    }
  });
  function open(it) { return Date.parse(EV[it.ev].until + 'T23:59:59Z') > NOW; }
  function canDl(it) { return it.type === 'photo' && open(it); }
  var PER = 24, MAXSEL = 50;
  var FORMATS = [['auto', 'Recommandé'], ['story', 'Story 9:16'], ['carre', 'Carré 1:1'], ['paysage', 'Paysage 3:2'], ['tv', 'TV 16:9']];

  V.galerie = {
    render: function (P) {
      P.host.innerHTML = '<section class="phero light"><span class="phero-star" aria-hidden="true"></span><div class="wrap phero-grid">' +
        '<div><div class="gcrumbs" id="gCrumbs"></div><p class="kicker">Médiathèque</p><h1 class="phero-title display" id="gTitle">Nos moments,<br><em class="serif">en images.</em></h1></div>' +
        '<div class="phero-side"><p class="lead" id="gLead">Les photos et vidéos de nos événements, prises par le département Média Photo. Télécharge-les en haute qualité, avec le cadre de l\'événement, pendant la période ouverte.</p>' +
        '<ul class="phero-stats"><li><b>487</b><span>médias en ligne</span></li><li><b>4</b><span>événements</span></li><li><b>15 j</b><span>pour télécharger</span></li></ul></div></div></section>' +
        '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap">' +
        '<div class="gevents" id="gEvents">' + Object.keys(EV).map(function (s) {
          var e = EV[s], first = ITEMS.filter(function (x) { return x.ev === s; })[0];
          return '<button type="button" class="gev" data-ev="' + s + '"><img src="' + first.src + '" alt="" loading="lazy"><span><b>' + P.esc(e.t) + '</b><small>' + ITEMS.filter(function (x) { return x.ev === s; }).length + ' médias · ' + (Date.parse(e.until + 'T23:59:59Z') > NOW ? 'téléchargement ouvert' : 'téléchargement clos') + '</small></span></button>';
        }).join('') + '</div>' +
        '<div class="fbar fbar-3"><div class="seg2" role="tablist" aria-label="Type de média" id="gTypes"><button type="button" data-t="" aria-selected="true">Tout</button><button type="button" data-t="photo" aria-selected="false">Photos</button><button type="button" data-t="video" aria-selected="false">Vidéos</button></div>' +
        '<div id="gZip" class="gzip"></div>' +
        '<select class="select" id="gDept" aria-label="Département"><option value="">Tous les départements</option>' + Object.keys(DEPN).map(function (k) { return '<option value="' + k + '">' + DEPN[k] + '</option>'; }).join('') + '</select></div>' +
        '<div class="results-line"><span id="gCount"></span><span id="gPageInfo"></span></div>' +
        '<div class="ggrid" id="gGrid"></div>' +
        '<div class="gpager"><button class="btn btn-ghost btn-sm" type="button" id="gPrev">Précédent</button><span class="mono" id="gPage"></span><button class="btn btn-ghost btn-sm" type="button" id="gNext">Suivant</button></div>' +
        '</div></section>' +
        '<div class="gsel" id="gSel" hidden><span id="gSelN"></span><button class="btn-text" type="button" id="gSelClear" style="margin:0;color:var(--ivoire)">Annuler</button><button class="btn btn-ivoire btn-sm" type="button" id="gSelZip">Télécharger .zip</button></div>' +
        '<div class="gview" id="gView" role="dialog" aria-modal="true" aria-label="Aperçu du média" hidden>' +
        '<div class="gview-top"><span class="mono" id="gvCount"></span><button class="lb-close" type="button" id="gvClose" aria-label="Fermer">' + P.I.close + '</button></div>' +
        '<button class="lb-nav lb-prev" type="button" id="gvPrev" aria-label="Média précédent"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg></button>' +
        '<div class="gview-stage" id="gvStage"></div>' +
        '<button class="lb-nav lb-next" type="button" id="gvNext" aria-label="Média suivant"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button>' +
        '<div class="gview-bar"><div class="gview-meta" id="gvMeta"></div><div class="gview-fmt" id="gvFmt"></div><div id="gvDl"></div></div></div>';
    },
    setup: function (N, P) {
      var $ = N.$, $$ = N.$$, esc = P.esc;
      var st = { ev: P.qs('event') || '', dept: P.qs('departement') || '', type: '', page: 1, sel: [] };
      if (st.ev && !EV[st.ev]) st.ev = '';
      if (st.ev) st.dept = '';
      var list = [];

      function sync() {
        var p = new URLSearchParams();
        if (st.ev) p.set('event', st.ev); else if (st.dept) p.set('departement', st.dept);
        try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) { /* rien */ }
      }
      function header() {
        var cr = '';
        if (st.ev) cr = '<span class="gpill">Événement : ' + esc(EV[st.ev].t) + '<button type="button" data-clear="ev" aria-label="Retirer le filtre événement">×</button></span>';
        else if (st.dept) cr = '<span class="gpill">Département : ' + esc(DEPN[st.dept]) + '<button type="button" data-clear="dept" aria-label="Retirer le filtre département">×</button></span>';
        $('#gCrumbs').innerHTML = cr;
        $('#gTitle').innerHTML = st.ev ? esc(EV[st.ev].t) : st.dept ? 'Les activités<br><em class="serif">' + esc(DEPN[st.dept]) + '</em>' : 'Nos moments,<br><em class="serif">en images.</em>';
        $$('[data-clear]').forEach(function (b) { b.addEventListener('click', function () { st.ev = ''; st.dept = ''; st.page = 1; draw(); }); });
        $$('.gev').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.ev === st.ev ? 'true' : 'false'); });
        $$('#gTypes [data-t]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.t === st.type ? 'true' : 'false'); });
        $('#gDept').value = st.dept;
        // ZIP de l'événement + délai
        var z = $('#gZip');
        if (st.ev) {
          var e = EV[st.ev], ok = Date.parse(e.until + 'T23:59:59Z') > NOW, n = ITEMS.filter(function (x) { return x.ev === st.ev && x.type === 'photo'; }).length;
          z.innerHTML = ok ? '<button class="btn btn-bordeaux btn-sm" type="button" id="gEvZip">' + P.I.dl + ' Tout l\'événement (.zip, ' + n + ' photos)</button><span>Téléchargement possible jusqu\'au ' + P.fdate(e.until, { day: 'numeric', month: 'long' }) + '</span>'
            : '<span class="gclosed">Téléchargements clos depuis le ' + P.fdate(e.until, { day: 'numeric', month: 'long' }) + '</span>';
          var zb = $('#gEvZip'); if (zb) zb.addEventListener('click', function () { zip(ITEMS.filter(function (x) { return x.ev === st.ev && x.type === 'photo'; }), 'nwc-' + st.ev); });
        } else z.innerHTML = '';
      }
      function draw() {
        list = ITEMS.filter(function (x) { return (!st.ev || x.ev === st.ev) && (!st.dept || x.dept === st.dept) && (!st.type || x.type === st.type); });
        var pages = Math.max(1, Math.ceil(list.length / PER)); st.page = Math.min(st.page, pages);
        var slice = list.slice((st.page - 1) * PER, st.page * PER);
        header(); sync();
        $('#gCount').textContent = list.length + (list.length > 1 ? ' médias' : ' média');
        $('#gPage').textContent = st.page + ' / ' + pages;
        $('#gPrev').disabled = st.page <= 1; $('#gNext').disabled = st.page >= pages;
        $('#gGrid').innerHTML = slice.length ? slice.map(function (it, i) {
          var dl = canDl(it), on = st.sel.indexOf(it.id) >= 0;
          return '<div class="gtile' + (on ? ' is-sel' : '') + '"><button class="gopen" type="button" data-i="' + i + '" aria-label="Ouvrir le média ' + (i + 1) + '">' +
            (it.type === 'video' ? '<video src="' + it.src + '" poster="' + it.poster + '" muted loop playsinline preload="none"></video><span class="gplay">' + P.I.play + '</span>' : '<img src="' + it.src + '" alt="" loading="lazy">') +
            '<span class="gcap">' + esc(EV[it.ev].t) + '</span></button>' +
            (dl ? '<label class="gcheck" title="Sélectionner"><input type="checkbox" data-sel="' + it.id + '"' + (on ? ' checked' : '') + ' aria-label="Sélectionner cette photo"><span></span></label>' : '') + '</div>';
        }).join('') : '<div class="empty" style="grid-column:1/-1"><b>Galerie en construction</b><span>Aucun média pour ce filtre pour le moment.</span></div>';
        $$('.gopen').forEach(function (b) { b.addEventListener('click', function () { view(slice, +b.dataset.i); }); });
        $$('[data-sel]').forEach(function (c) { c.addEventListener('change', function () { toggleSel(+c.dataset.sel, c.checked, c); }); });
        // Vidéos : lecture muette quand elles sont visibles
        if ('IntersectionObserver' in window) {
          var io = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) x.target.play().catch(function () {}); else x.target.pause(); }); }, { threshold: .4 });
          $$('.gtile video').forEach(function (v) { io.observe(v); });
        }
        selBar();
      }
      function toggleSel(itemId, on, box) {
        var i = st.sel.indexOf(itemId);
        if (on && i < 0) { if (st.sel.length >= MAXSEL) { box.checked = false; N.toast('Maximum ' + MAXSEL + ' photos par téléchargement.'); return; } st.sel.push(itemId); }
        if (!on && i >= 0) st.sel.splice(i, 1);
        box.closest('.gtile').classList.toggle('is-sel', on);
        selBar();
      }
      function selBar() {
        var b = $('#gSel'); b.hidden = !st.sel.length;
        $('#gSelN').textContent = st.sel.length + (st.sel.length > 1 ? ' photos sélectionnées' : ' photo sélectionnée');
        $('#gSelZip').textContent = 'Télécharger .zip (' + st.sel.length + ')';
      }
      $('#gSelClear').addEventListener('click', function () { st.sel = []; draw(); });
      $('#gSelZip').addEventListener('click', function () { zip(ITEMS.filter(function (x) { return st.sel.indexOf(x.id) >= 0; }), 'nwc-selection'); });

      function zip(items, name) {
        if (!window.JSZip) { N.toast('Le module ZIP n\'a pas pu se charger. Réessaie dans un instant.'); return; }
        N.toast('Préparation du ZIP (' + items.length + ' photos)…');
        var z = new window.JSZip();
        Promise.all(items.map(function (it, i) {
          return fetch(it.src).then(function (r) { return r.blob(); }).then(function (b) { z.file(String(i + 1).padStart(3, '0') + '-' + it.ev + '.webp', b); });
        })).then(function () { return z.generateAsync({ type: 'blob' }); }).then(function (blob) {
          save(blob, name + '.zip'); N.toast('ZIP téléchargé : ' + items.length + ' photos.');
        }).catch(function () { N.toast('Le téléchargement a échoué. Vérifie ta connexion et réessaie.'); });
      }
      function save(blob, filename) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }

      // ── Visionneuse avec formats encadrés ──
      var vw = $('#gView'), cur = { items: [], i: 0, fmt: 'auto' }, logo = new Image(); logo.src = 'img/logo-nwc.png';
      function view(items, i) { cur.items = items; cur.i = i; cur.fmt = 'auto'; vw.hidden = false; N.lenis && N.lenis.stop(); document.body.style.overflow = 'hidden'; show(); $('#gvClose').focus(); }
      function close() { vw.hidden = true; N.lenis && N.lenis.start(); document.body.style.overflow = ''; var v = $('#gvStage video'); if (v) v.pause(); }
      function show() {
        var it = cur.items[cur.i], e = EV[it.ev], dl = canDl(it), framed = e.frames && dl;
        $('#gvCount').textContent = String(cur.i + 1).padStart(2, '0') + ' / ' + String(cur.items.length).padStart(2, '0');
        $('#gvMeta').innerHTML = '<b>' + esc(e.t) + '</b><span class="gview-chips"><a class="chip" href="galerie/?event=' + it.ev + '">' + esc(e.t) + '</a><a class="chip" href="communaute/' + it.dept + '/">' + esc(DEPN[it.dept]) + '</a></span>';
        $('#gvFmt').innerHTML = framed ? FORMATS.map(function (f) { return '<button type="button" class="chip" data-fmt="' + f[0] + '" aria-pressed="' + (cur.fmt === f[0] ? 'true' : 'false') + '">' + f[1] + '</button>'; }).join('') : '';
        $$('[data-fmt]').forEach(function (b) { b.addEventListener('click', function () { cur.fmt = b.dataset.fmt; show(); }); });
        $('#gvDl').innerHTML = it.type === 'video' ? '' : dl ? '<button class="btn btn-ivoire btn-sm" type="button" id="gvDlBtn">' + P.I.dl + ' Télécharger</button>' : '<span class="gclosed">Téléchargement clos</span>';
        var stage = $('#gvStage');
        if (it.type === 'video') { stage.innerHTML = '<video src="' + it.src + '" poster="' + it.poster + '" controls autoplay playsinline></video>'; return; }
        if (!framed) { stage.innerHTML = '<img src="' + it.src + '" alt="">'; bindDl(it, null); return; }
        stage.innerHTML = '<span class="gen">Génération du cadre…</span>';
        frame(it, cur.fmt, function (canvas) {
          if (!canvas) { stage.innerHTML = '<img src="' + it.src + '" alt="">'; bindDl(it, null); return; }
          stage.innerHTML = ''; var im = new Image(); im.alt = ''; im.src = canvas.toDataURL('image/jpeg', .9); stage.appendChild(im); bindDl(it, canvas);
        });
      }
      function bindDl(it, canvas) {
        var b = $('#gvDlBtn'); if (!b) return;
        b.addEventListener('click', function () {
          if (canvas) canvas.toBlob(function (bl) { save(bl, 'nwc-' + it.ev + '-' + cur.fmt + '.jpg'); }, 'image/jpeg', .92);
          else fetch(it.src).then(function (r) { return r.blob(); }).then(function (bl) { save(bl, 'nwc-' + it.ev + '-' + it.id + '.webp'); });
        });
      }
      // Cadre de marque : photo entière sur fond blanc (pas de flou) + bandeau de l'événement
      function frame(it, fmt, cb) {
        var img = new Image();
        img.onload = function () {
          var f = fmt === 'auto' ? (img.height > img.width ? 'story' : 'paysage') : fmt;
          var dims = { story: [1080, 1920], carre: [1080, 1080], paysage: [1620, 1080], tv: [1920, 1080] }[f];
          var W = dims[0], H = dims[1], band = Math.round(H * (f === 'story' ? .1 : .13)), pad = Math.round(Math.min(W, H) * .04);
          var c = document.createElement('canvas'); c.width = W; c.height = H; var x = c.getContext('2d');
          x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
          var aw = W - pad * 2, ah = H - band - pad * 2, r = Math.min(aw / img.width, ah / img.height);
          var w = img.width * r, h = img.height * r;
          x.drawImage(img, (W - w) / 2, pad + (ah - h) / 2, w, h);
          x.fillStyle = '#8B1A2F'; x.fillRect(0, H - band, W, band);
          var ls = band * .7; try { x.drawImage(logo, pad, H - band + (band - ls) / 2, ls, ls); } catch (e) { /* logo facultatif */ }
          x.fillStyle = '#F5EDE1'; x.textBaseline = 'middle';
          x.font = '800 ' + Math.round(band * .3) + 'px "Bricolage Grotesque", Arial, sans-serif';
          x.fillText(EV[it.ev].t.toUpperCase(), pad + ls + pad * .6, H - band / 2 - band * .12);
          x.font = '500 ' + Math.round(band * .17) + 'px "Geist Mono", monospace'; x.fillStyle = '#E2C17B';
          x.fillText('NEW WINE CHURCH · NEWINECHURCH.ORG', pad + ls + pad * .6, H - band / 2 + band * .22);
          cb(c);
        };
        img.onerror = function () { cb(null); };
        img.src = it.src;
      }
      function step(d) { cur.i = (cur.i + d + cur.items.length) % cur.items.length; cur.fmt = 'auto'; show(); }
      $('#gvPrev').addEventListener('click', function () { step(-1); });
      $('#gvNext').addEventListener('click', function () { step(1); });
      $('#gvClose').addEventListener('click', close);
      vw.addEventListener('click', function (e) { if (e.target === vw || e.target.id === 'gvStage') close(); });
      document.addEventListener('keydown', function (e) { if (vw.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') step(-1); if (e.key === 'ArrowRight') step(1); });
      var tx = null;
      vw.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
      vw.addEventListener('touchend', function (e) { if (tx == null) return; var dx = e.changedTouches[0].clientX - tx; if (Math.abs(dx) > 60) step(dx < 0 ? 1 : -1); tx = null; });

      // Filtres
      $$('.gev').forEach(function (b) { b.addEventListener('click', function () { st.ev = st.ev === b.dataset.ev ? '' : b.dataset.ev; st.dept = ''; st.page = 1; draw(); N.scrollTo($('#gGrid'), -260); }); });
      $$('#gTypes [data-t]').forEach(function (b) { b.addEventListener('click', function () { st.type = b.dataset.t; st.page = 1; draw(); }); });
      $('#gDept').addEventListener('change', function (e) { st.dept = e.target.value; st.ev = ''; st.page = 1; draw(); });
      $('#gPrev').addEventListener('click', function () { st.page--; draw(); N.scrollTo($('#gGrid'), -260); });
      $('#gNext').addEventListener('click', function () { st.page++; draw(); N.scrollTo($('#gGrid'), -260); });
      draw();
      // Lien profond ?lightbox=ID (utilisé par l'accueil et les fiches départements)
      var lb = +P.qs('lightbox');
      if (lb) { var k = list.map(function (x) { return x.id; }).indexOf(lb); if (k >= 0) { st.page = Math.floor(k / PER) + 1; draw(); view(list.slice((st.page - 1) * PER, st.page * PER), k % PER); } try { var p = new URLSearchParams(location.search); p.delete('lightbox'); history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) { /* rien */ } }
    }
  };
})();
