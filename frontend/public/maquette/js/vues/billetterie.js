/* ════════════════════════════════════════════════════════════════════
   Vues « Billetterie » (/billetterie) et « Ma commande » (/ma-commande/:code)
   Reprend le fonctionnement actuel : cycles & séries + événements uniques,
   badge « Plus que N » sous 20 %, commande réservée 24 h, paiement Mobile
   Money déclaratif (référence 4 à 80 caractères + capture facultative),
   statuts en attente / payée / refusée / expirée, liens vers les billets.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var V = window.NWCV = window.NWCV || {};

  /* ───────── /billetterie ───────── */
  V.billetterie = {
    render: function (P) {
      var I = P.I, esc = P.esc;
      var ev = P.EVENTS.filter(function (e) { return e.mode === 'billet'; });
      var SERIES_EV = [
        { t: 'Cultes du dimanche', img: 'v-adore', rec: 'Chaque dimanche · 13h00', next: 'dimanche', count: 'Tous les dimanches', lieu: P.LIEU, href: './#visite', cta: 'Entrée libre' },
        { t: 'Académie de Fondation', img: 'v-parole', rec: '6 dimanches · 15h15', next: 'Dim. 10 janvier 2027', count: '6 dates', lieu: P.LIEU, href: 'evenements/academie-session-janvier/', cta: 'S\'inscrire' }
      ];
      var FAQ = [
        ['J\'ai perdu mon billet, comment le retrouver ?', 'Ton billet est dans l\'e-mail de confirmation (en PDF) et sur WhatsApp si tu l\'as accepté. Tu peux aussi retrouver ta commande avec son code ci-dessous.'],
        ['Combien de billets puis-je prendre ?', 'En général 3 par adresse e-mail. Chaque type de billet peut avoir sa propre limite, indiquée au moment du choix.'],
        ['J\'ai payé mais je n\'ai rien reçu.', 'L\'équipe Finance vérifie chaque référence Mobile Money, en général en moins d\'une heure. Ta page « Ma commande » se met à jour toute seule.'],
        ['Puis-je être remboursé ?', 'Oui en cas d\'annulation de l\'événement. Pour une autre situation, écris-nous au +225 07 79 16 98 78.'],
        ['Pourquoi un selfie pour certains événements ?', 'Pour les galas, le selfie permet de vérifier à l\'entrée que le billet est bien utilisé par la bonne personne.']
      ];
      P.host.innerHTML = P.phero('Billetterie', 'Ton billet,<br><em class="serif">en 2 minutes.</em>', 'Choisis tes places, paie avec Orange Money, MTN MoMo ou Wave, et reçois ton QR code par e-mail et WhatsApp.',
        [[ev.length, 'événements en vente'], ['3', 'opérateurs Mobile Money'], ['24 h', 'pour payer après réservation']]) +
        '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap">' +
        // Événements uniques
        '<div class="rail-head"><div><p class="kicker">Événements</p><h2 class="h3 sec-title">En vente maintenant</h2></div><a class="link-arrow" href="evenements/">Tout l\'agenda →</a></div>' +
        '<div class="tgrid">' + ev.map(function (e) {
          var cap = 0, sold = 0; e.types.forEach(function (t) { cap += t.cap; sold += t.sold; });
          var left = cap - sold, low = left / cap < .2, x = P.d(e.start);
          return '<a class="tcard reveal" href="' + P.evLink(e) + '"><div class="tcard-img">' + P.thumb(e) +
            '<span class="edate tcard-date"><span>' + x.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '') + '</span><b>' + x.getUTCDate() + '</b></span>' +
            (low ? '<span class="etag tcard-low">Plus que ' + left + ' places</span>' : '') + '</div>' +
            '<div class="tcard-body"><span class="kicker">' + P.EVTYPES[e.type] + (e.vol ? ' · ' + esc(e.vol) : '') + '</span><h3>' + esc(e.t) + '</h3>' +
            '<p class="meta"><span>' + I.clock + P.fdate(e.start, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + P.ftime(e.start) + '</span></p>' +
            '<div class="cap"><span>' + sold + ' vendus · ' + cap + ' places</span><div class="cap-bar"><span style="width:' + Math.round(sold / cap * 100) + '%"></span></div></div>' +
            '<div class="tcard-foot"><b>' + (P.minPrice(e) === 0 ? 'Gratuit' : 'Dès ' + P.money(P.minPrice(e))) + '</b><span class="btn btn-ivoire btn-sm">Obtenir mon ticket</span></div></div></a>';
        }).join('') + '</div>' +
        // Cycles & séries
        '<div class="rail-head" style="margin-top:clamp(56px,7vw,96px)"><div><p class="kicker">Cycles &amp; séries</p><h2 class="h3 sec-title">Les rendez-vous qui reviennent</h2></div></div>' +
        '<div class="sgrid">' + SERIES_EV.map(function (s) {
          return '<a class="scycle reveal" href="' + s.href + '"><img src="img/' + s.img + '.webp" alt="" loading="lazy"><div><span class="mono">' + esc(s.rec) + '</span><h3 class="display">' + esc(s.t) + '</h3><p class="meta"><span>' + I.cal + 'Prochaine date : ' + esc(s.next) + '</span><span>' + I.pin + 'Cocody-Bonoumin</span></p><span class="etag">' + esc(s.count) + '</span></div><span class="btn btn-ivoire btn-sm">' + s.cta + '</span></a>';
        }).join('') + '</div>' +
        // Comment ça marche
        '<div class="howto reveal"><p class="kicker">Comment ça marche</p><ol>' +
        [['Choisis tes billets', 'Standard, VIP, pack groupe… jusqu\'à 3 par e-mail.'], ['Réserve', 'Ta commande est bloquée 24 h à ton nom.'], ['Paie en Mobile Money', 'Orange Money, MTN MoMo ou Wave, puis colle ta référence.'], ['Reçois ton QR code', 'Par e-mail et WhatsApp dès la validation.']].map(function (s, i) {
          return '<li><span class="howto-n">' + (i + 1) + '</span><b>' + s[0] + '</b><span>' + s[1] + '</span></li>';
        }).join('') + '</ol></div>' +
        // FAQ + retrouver ma commande
        '<div class="split" style="margin-top:clamp(56px,7vw,96px)"><div><p class="kicker">Questions fréquentes</p><h2 class="h3 sec-title">Avant d\'acheter</h2>' +
        '<form class="findorder" id="findOrder" novalidate><label for="foCode">Retrouver ma commande</label><div class="ref-row"><input id="foCode" class="mono" placeholder="NWC-XXXXXX" autocomplete="off"><button class="btn btn-bordeaux btn-sm" type="submit">Voir</button></div><p class="ref-err" hidden id="foErr">Le code commence par NWC- et figure dans ton e-mail de confirmation.</p></form></div>' +
        '<div class="faq">' + FAQ.map(function (f, i) {
          return '<div class="faq-item"><button class="faq-q" type="button" aria-expanded="false" aria-controls="bf' + i + '"><span class="mono">' + String(i + 1).padStart(2, '0') + '</span>' + esc(f[0]) + '<i aria-hidden="true"></i></button><div class="faq-a" id="bf' + i + '" hidden><p>' + esc(f[1]) + '</p></div></div>';
        }).join('') + '</div></div>' +
        '</div></section>';
    },
    setup: function (N, P) {
      P.faq(N);
      var f = N.$('#findOrder'), c = N.$('#foCode');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = /^NWC-[A-Z0-9]{4,10}$/i.test(c.value.trim());
        N.$('#foErr').hidden = ok;
        if (ok) location.href = 'ma-commande/?c=' + encodeURIComponent(c.value.trim().toUpperCase());
        else c.focus();
      });
    }
  };

  /* ───────── /ma-commande ───────── */
  V.commande = {
    render: function (P) {
      var I = P.I, esc = P.esc, qs = P.qs;
      var e = P.EVENTS.filter(function (x) { return x.slug === qs('e'); })[0] || P.EVENTS[0];
      var q = (qs('q') || '1.1.0').split('.').map(Number);
      var lines = [], total = 0;
      e.types.forEach(function (t, i) { var n = q[i] || 0; if (n) { lines.push([n, t]); total += n * t.p; } });
      if (!lines.length) { lines.push([1, e.types[0]]); total = e.types[0].p; }
      var name = qs('n') || 'Grâce', mail = qs('m') || 'grace@exemple.com';
      V.commande._ctx = { e: e, total: total };
      document.title = 'Ma commande · ' + e.t + ' · New Wine Church';
      P.host.innerHTML = '<section class="light" style="padding-block:calc(var(--nav-h) + env(safe-area-inset-top,0px) + 32px) clamp(64px,8vw,120px)"><div class="wrap">' +
        P.crumbs([['Billetterie', 'billetterie/'], [e.t, P.evLink(e)], ['Ma commande']]) +
        '<div class="order-head"><div><p class="kicker">Ma commande</p><h1 class="display order-title">Commande <span class="mono">NWC-8F3K2Q</span></h1></div>' +
        '<div class="seg2" aria-label="Aperçu des statuts (maquette)">' + [['pending', 'À payer'], ['review', 'En vérification'], ['paid', 'Payée'], ['refused', 'Refusée'], ['expired', 'Expirée']].map(function (s, i) {
          return '<button type="button" data-os="' + s[0] + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + s[1] + '</button>';
        }).join('') + '</div></div>' +
        '<div class="obanner" id="oBanner" role="status"></div>' +
        '<div class="egrid"><div style="min-width:0" id="oMain"></div>' +
        '<aside><div class="tbox"><div class="tbox-head"><span>' + P.fdate(e.start, { weekday: 'long', day: 'numeric', month: 'long' }) + ' · ' + P.ftime(e.start) + '</span><b>' + esc(e.t) + (e.vol ? ' · ' + esc(e.vol) : '') + '</b><span>' + P.LIEU + '</span></div>' +
        '<div class="tbox-body"><ul class="recap" style="border-color:var(--line)">' + lines.map(function (l) {
          return '<li style="border-color:var(--line)"><span style="color:var(--muted)">' + l[0] + ' × ' + esc(l[1].n) + '</span><b>' + P.money(l[0] * l[1].p) + '</b></li>';
        }).join('') + '<li style="border-color:var(--line)"><span style="color:var(--muted)">Total</span><b>' + P.money(total) + '</b></li></ul>' +
        '<div class="info"><span class="label">Acheteur</span><p><b>' + esc(name) + '</b><br>' + esc(mail) + '</p></div>' +
        '<p class="tbox-foot">Une question ? +225 07 79 16 98 78 (WhatsApp)</p></div></div></aside></div></div></section>';
    },
    setup: function (N, P) {
      var $ = N.$, $$ = N.$$, I = P.I, ctx = V.commande._ctx, st = 'pending', ref = '', tmr;
      var end = Date.now() + 24 * 3600e3;
      function opBox(id) {
        var o = P.OPS.filter(function (x) { return x.id === id; })[0] || P.OPS[0];
        return '<div class="op-num"><span class="mono" data-copy-src>' + o.num + '</span><button class="copy" type="button" data-copy="' + o.raw + '">Copier</button></div><p style="margin:0">Bénéficiaire : <b>NEW WINE CHURCH</b> · Montant : <b>' + P.money(ctx.total) + '</b></p><ol>' + o.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '<li>Colle ci-dessous la référence reçue par SMS</li></ol>';
      }
      function draw() {
        clearInterval(tmr);
        $$('[data-os]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.os === st ? 'true' : 'false'); });
        var B = $('#oBanner'), M = $('#oMain');
        if (st === 'pending' || st === 'review') {
          B.className = 'obanner ' + (st === 'pending' ? 'is-wait' : 'is-review');
          B.innerHTML = st === 'pending'
            ? '<b>Commande réservée</b><span>Il te reste <b class="mono" id="oTimer">24 h 00 min</b> pour payer. Passé ce délai, les places sont remises en vente.</span>'
            : '<b>Paiement en vérification</b><span>L\'équipe Finance vérifie ta référence <b class="mono">' + P.esc(ref || 'CI241128.1432.A12345') + '</b>. Cette page s\'actualise toute seule toutes les 8 secondes.</span>';
          M.innerHTML = '<div class="esec"><p class="kicker">Paiement Mobile Money</p><h2>Comment payer</h2>' +
            '<ol class="howto-mini"><li>Choisis ton opérateur</li><li>Envoie ' + P.money(ctx.total) + ' au numéro indiqué</li><li>Colle la référence reçue par SMS</li><li>Reçois tes billets dès la validation</li></ol>' +
            '<fieldset class="field" style="margin-top:18px"><legend>Ton opérateur</legend><div class="paygrid">' + P.OPS.map(function (o, i) { return '<label class="payopt" style="--op:' + o.c + '"><input type="radio" name="oOp" value="' + o.id + '"' + (i ? '' : ' checked') + '><span><i' + (o.dark ? ' style="color:var(--encre)"' : '') + '>' + o.short + '</i>' + o.n + '</span></label>'; }).join('') + '</div></fieldset>' +
            '<div class="paybox" id="oOpBox" style="margin-top:12px">' + opBox('om') + '</div>' +
            '<form id="oForm" novalidate style="display:grid;gap:12px;margin-top:16px"><div class="field"><label for="oRef">Référence de la transaction</label><input id="oRef" class="mono" value="' + P.esc(ref) + '" placeholder="Ex. CI241128.1432.A12345" autocomplete="off"><p class="field-err" hidden>Colle la référence reçue par SMS (4 à 80 caractères).</p></div>' +
            '<div class="field"><label for="oProof">Capture du reçu <small>(facultatif, 5 Mo max)</small></label><input id="oProof" type="file" accept="image/*"></div>' +
            '<button class="btn btn-bordeaux" type="submit">' + (ref ? 'Mettre à jour ma référence' : 'Envoyer ma référence') + '</button></form>' +
            '<p class="note">Si l\'événement est configuré pour le paiement en ligne, un bouton « Payer en ligne » (carte et Mobile Money via CinetPay) remplace ce formulaire.</p></div>';
          if (st === 'pending') tmr = setInterval(function () { var s = Math.max(0, end - Date.now()), t = $('#oTimer'); if (t) t.textContent = Math.floor(s / 3600e3) + ' h ' + N.pad(Math.floor(s / 60e3) % 60) + ' min ' + N.pad(Math.floor(s / 1e3) % 60) + ' s'; }, 1000);
          $$('input[name="oOp"]').forEach(function (r) { r.addEventListener('change', function () { $('#oOpBox').innerHTML = opBox(r.value); bindCopy(); }); });
          bindCopy();
          $('#oForm').addEventListener('submit', function (ev) {
            ev.preventDefault();
            var r = $('#oRef'), v = r.value.trim();
            if (P.fieldErr(r, v.length < 4 || v.length > 80)) { r.focus(); return; }
            ref = v; st = 'review'; draw(); N.toast('Référence envoyée. Tu seras prévenu dès la validation.');
            N.scrollTo($('#oBanner'), -100);
          });
        } else if (st === 'paid') {
          B.className = 'obanner is-ok'; B.innerHTML = '<b>Paiement validé</b><span>Tes billets sont aussi partis par e-mail et WhatsApp.</span>';
          M.innerHTML = '<div class="esec"><p class="kicker">Tes billets</p><h2>Prêts pour l\'entrée</h2><ul class="tlinks">' +
            ['CYP2-0113', 'CYP2-0114'].map(function (n, i) { return '<li><a href="mon-ticket/"><span class="mono">N° ' + n + '</span><b>' + (i ? 'VIP' : 'Standard') + '</b><span class="link-arrow">Voir le billet →</span></a></li>'; }).join('') + '</ul></div>';
        } else {
          var refused = st === 'refused';
          B.className = 'obanner is-ko';
          B.innerHTML = refused ? '<b>Paiement refusé</b><span>Motif : la référence ne correspond à aucun transfert reçu. Vérifie-la ou reprends ta commande.</span>' : '<b>Commande expirée</b><span>Le délai de 24 heures est dépassé et les places ont été remises en vente.</span>';
          M.innerHTML = '<div class="esec"><h2>Et maintenant ?</h2><p class="lead">' + (refused ? 'Tu peux corriger ta référence ou reprendre une commande.' : 'Les places sont peut-être encore disponibles.') + '</p><div class="row-btns"><a class="btn btn-bordeaux" href="' + P.evLink(ctx.e) + '">Reprendre une inscription</a><a class="btn btn-ghost" href="contact/">Contacter l\'équipe</a></div></div>';
        }
      }
      function bindCopy() { var c = $('#oOpBox [data-copy]'); if (c) c.addEventListener('click', function () { N.copy(c); }); }
      $$('[data-os]').forEach(function (b) { b.addEventListener('click', function () { st = b.dataset.os; draw(); }); });
      draw();
    }
  };

})();
