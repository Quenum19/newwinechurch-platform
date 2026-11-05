/* ════════════════════════════════════════════════════════════════════
   Vues diverses :
   - « Suivez-nous » (/nwc/follow) : page d'arrivée du QR code imprimé,
     sans menu ; réseaux + inscription rapide (département ou mont).
   - 404 (page introuvable).
   - « Conditions d'utilisation » (/cgu) et « Confidentialité » (/confidentialite) :
     liens présents sur le site actuel mais sans page. Textes de travail
     à faire valider avant mise en ligne.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var V = window.NWCV = window.NWCV || {};

  V.follow = {
    mainClass: 'follow-main',
    render: function (P) {
      var SOC = [['Instagram', '@new_wine_church1', 'https://www.instagram.com/new_wine_church1', '#E1306C'], ['TikTok', '@newwinechurch2', 'https://www.tiktok.com/@newwinechurch2', '#111111'], ['YouTube', '@NewWineChurchMD', 'https://www.youtube.com/@NewWineChurchMD', '#FF0000'], ['Facebook', 'New Wine Church', 'https://www.facebook.com/profile.php?id=61574286441065', '#1877F2'], ['WhatsApp', '+225 07 79 16 98 78', 'https://wa.me/2250779169878', '#25D366']];
      P.host.innerHTML = '<div class="follow"><div class="follow-card"><img src="img/logo-nwc.png" alt="New Wine Church" width="120" height="120">' +
        '<p class="kicker" style="color:var(--or)">Une armée de jeunes pour Christ</p><h1 class="display follow-title">Suivez-<br><em class="serif">nous.</em></h1>' +
        '<a class="btn btn-ivoire btn-block" href="./"><span class="btn-txt" data-txt="Découvrir notre site">Découvrir notre site</span><span class="btn-ico" aria-hidden="true">' + P.I.arrow + '</span></a>' +
        '<button class="follow-toggle" type="button" id="fToggle" aria-expanded="true" aria-controls="fSoc">Réseaux sociaux <span class="mono">' + SOC.length + '</span><i aria-hidden="true"></i></button>' +
        '<ul class="follow-soc" id="fSoc">' + SOC.map(function (s) { return '<li><a href="' + s[2] + '" target="_blank" rel="noopener" style="--sc:' + s[3] + '"><span class="follow-dot"></span><b>' + s[0] + '</b><span>' + s[1] + '</span><span aria-hidden="true">↗</span></a></li>'; }).join('') + '</ul>' +
        '<button class="btn btn-rubis btn-block" type="button" id="fJoin">Rejoindre la New Wine Church</button>' +
        '<p class="follow-foot">Culte chaque dimanche · 13h00 · Cocody-Bonoumin</p></div></div>' +
        P.drawerShell('fDrawer', '<p class="kicker kicker-dark">Inscription rapide</p><h2 class="drawer-title" id="fDrawerT">Je rejoins<br>la famille</h2>',
          '<form id="fForm" novalidate style="display:grid;gap:12px"><div class="cform-row"><div class="field"><label for="fFirst">Prénom</label><input id="fFirst" autocomplete="given-name"><p class="field-err" hidden>Ton prénom.</p></div><div class="field"><label for="fLast">Nom</label><input id="fLast" autocomplete="family-name"><p class="field-err" hidden>Ton nom.</p></div></div>' +
          '<div class="field"><label for="fPhone">Téléphone</label><input id="fPhone" type="tel" inputmode="tel" autocomplete="tel"><p class="field-err" hidden>Un numéro valide.</p></div>' +
          '<div class="field"><label for="fWa">WhatsApp <small>(si différent)</small></label><input id="fWa" type="tel" inputmode="tel"></div>' +
          '<div class="field"><label for="fCity">Lieu d\'habitation</label><input id="fCity" list="fCities" placeholder="Ex. Cocody, Riviera 3"><datalist id="fCities">' + P.COMMUNES.map(function (c) { return '<option value="' + c + '">'; }).join('') + '</datalist><p class="field-err" hidden>Ta commune ou ton quartier.</p></div>' +
          '<fieldset class="field"><legend>Je suis attiré par…</legend><div class="seg"><label><input type="radio" name="fKind" value="mont" checked><span>Un mont</span></label><label><input type="radio" name="fKind" value="dept"><span>Un département</span></label></div>' +
          '<select class="select" id="fMont" style="width:100%;height:3rem;border-radius:14px;margin-top:8px">' + P.MONTS.map(function (m) { return '<option value="' + m[0] + '">Mont ' + m[1] + ' · ' + m[2] + '</option>'; }).join('') + '</select>' +
          '<select class="select" id="fDept" style="width:100%;height:3rem;border-radius:14px;margin-top:8px" hidden>' + (window.NWCV._depts || []).map(function (d) { return '<option value="' + d.slug + '">' + P.esc(d.n) + '</option>'; }).join('') + '</select></fieldset>' +
          '<button class="btn btn-bordeaux btn-block" type="submit">Envoyer</button></form><div id="fDone" hidden></div>');
    },
    setup: function (N, P) {
      var $ = N.$;
      $('#fToggle').addEventListener('click', function () { var b = $('#fToggle'), o = b.getAttribute('aria-expanded') !== 'true'; b.setAttribute('aria-expanded', o ? 'true' : 'false'); $('#fSoc').hidden = !o; });
      $('#fJoin').addEventListener('click', function () { N.openDrawer($('#fDrawer')); });
      N.$$('input[name="fKind"]').forEach(function (r) { r.addEventListener('change', function () { $('#fMont').hidden = r.value !== 'mont'; $('#fDept').hidden = r.value !== 'dept'; }); });
      $('#fForm').addEventListener('submit', function (e) {
        e.preventDefault(); var bad = false;
        bad = P.fieldErr($('#fFirst'), !P.reName.test($('#fFirst').value.trim())) || bad;
        bad = P.fieldErr($('#fLast'), !P.reName.test($('#fLast').value.trim())) || bad;
        bad = P.fieldErr($('#fPhone'), !P.rePhone.test($('#fPhone').value.trim())) || bad;
        bad = P.fieldErr($('#fCity'), $('#fCity').value.trim().length < 2) || bad;
        if (bad) return;
        $('#fForm').hidden = true; var d = $('#fDone'); d.hidden = false;
        d.innerHTML = '<div class="done-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><p class="drawer-lead">Bienvenue ' + P.esc($('#fFirst').value.trim()) + ' ! Un responsable te contacte sur WhatsApp dans les prochains jours.</p><a class="btn btn-bordeaux btn-block" href="./">Découvrir le site</a>';
      });
    }
  };

  V.introuvable = {
    mainClass: 'light nf-main',
    render: function (P) {
      P.host.innerHTML = '<div class="nf"><a class="auth-logo" href="./"><img src="img/logo-nwc.png" alt="" width="52" height="52"><span>New Wine<small>Church · Abidjan</small></span></a>' +
        '<p class="display nf-code" aria-hidden="true">404</p><h1 class="display nf-title">Cette page<br><em class="serif">s\'est égarée.</em></h1><p class="lead">L\'adresse a peut-être changé, ou la page n\'existe plus. Voici où aller :</p>' +
        '<div class="nf-links"><a class="btn btn-ivoire" href="./">Accueil</a><a class="btn btn-ghost" href="messages/">Messages</a><a class="btn btn-ghost" href="evenements/">Agenda</a><a class="btn btn-ghost" href="contact/">Contact</a></div>' +
        '<p class="nf-verse serif">« Le Fils de l\'homme est venu chercher et sauver ce qui était perdu. » <span class="mono">Luc 19:10</span></p></div>';
    }
  };

  function legal(P, kicker, title, intro, sections, other) {
    P.host.innerHTML = P.phero(kicker, title, intro, null, '<p class="note" style="margin:0">Texte de travail à faire valider par la direction de l\'église avant publication. Dernière mise à jour : novembre 2026.</p>') +
      '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap split"><nav class="toc" aria-label="Sommaire"><span class="label">Sommaire</span>' + sections.map(function (s, i) { return '<a href="' + location.pathname.replace(/^\/maquette\//, '') + '#s' + i + '" data-toc="s' + i + '">' + P.esc(s[0]) + '</a>'; }).join('') + '<a class="link-arrow" href="' + other[0] + '" style="margin-top:12px">' + other[1] + ' →</a></nav>' +
      '<div class="prose">' + sections.map(function (s, i) { return '<h3 id="s' + i + '">' + P.esc(s[0]) + '</h3>' + s[1].map(function (p) { return '<p>' + p + '</p>'; }).join(''); }).join('') + '</div></div></section>';
  }
  function tocSetup(N) { N.$$('[data-toc]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); N.scrollTo(document.getElementById(a.dataset.toc), -100); }); }); }

  V.confidentialite = {
    render: function (P) {
      legal(P, 'Confidentialité', 'Tes données,<br><em class="serif">protégées.</em>', 'Ce que nous collectons, pourquoi, et comment exercer tes droits.', [
        ['Qui est responsable ?', ['New Wine Church, église de jeunes adultes de l\'Église La Maison de la Destinée, Cocody-Bonoumin, Abidjan. Contact : <span class="mono">contact@newinechurch.org</span>.']],
        ['Les données que nous collectons', ['Uniquement ce que tu nous donnes : nom, prénom, e-mail, téléphone et WhatsApp dans les formulaires (visite, contact, prière, inscription, billetterie, adhésion) ; la référence de transaction pour un don ou un billet ; un selfie quand un événement l\'exige à l\'entrée ; ton e-mail pour la lettre du dimanche.', 'Les téléchargements de la médiathèque sont journalisés de façon anonymisée (adresse IP chiffrée) pour éviter les abus.']],
        ['Pourquoi nous les utilisons', ['T\'accueillir, te répondre, t\'envoyer tes billets et reçus, vérifier les paiements Mobile Money, organiser la vie des départements et des cellules, et t\'informer si tu l\'as demandé. Jamais de revente, jamais de publicité tierce.']],
        ['Combien de temps', ['Le temps nécessaire à chaque usage : par exemple, les selfies de contrôle sont supprimés après l\'événement, et tu peux te désinscrire de la lettre à tout moment depuis le lien présent dans chaque e-mail.']],
        ['Photos des événements', ['Nos événements sont photographiés par le département Média Photo. Si tu ne souhaites pas apparaître dans la médiathèque, écris-nous : la photo sera retirée.']],
        ['Tes droits', ['Conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel, tu peux accéder à tes données, les faire corriger ou supprimer, et t\'opposer à leur utilisation, en écrivant à <span class="mono">contact@newinechurch.org</span>.']]
      ], ['cgu/', 'Conditions d\'utilisation']);
    },
    setup: tocSetup
  };

  V.cgu = {
    render: function (P) {
      legal(P, 'Conditions d\'utilisation', 'Les règles<br><em class="serif">du site.</em>', 'Les conditions qui s\'appliquent quand tu utilises le site et la plateforme de New Wine Church.', [
        ['Objet', ['Le site présente l\'église, ses messages, ses événements et ses départements, et permet de s\'inscrire, de réserver des billets, de déclarer un don et de contacter l\'équipe.']],
        ['Compte membre', ['Le compte est créé après validation de ta demande d\'adhésion par l\'équipe RH. Tes identifiants sont personnels : garde ton mot de passe secret.']],
        ['Billetterie', ['Une commande payante est réservée 24 heures. Elle est confirmée après vérification de la référence Mobile Money. Les billets sont nominatifs et limités par adresse e-mail. Certains événements demandent un selfie vérifié à l\'entrée.', 'En cas d\'annulation d\'un événement par l\'église, les billets payés sont remboursés.']],
        ['Dons', ['Les dons sont déclaratifs : tu effectues le transfert Mobile Money, puis tu déclares la référence. Le département Finance vérifie chaque déclaration.']],
        ['Médiathèque', ['Les photos et vidéos sont mises à disposition pour un usage personnel, pendant la période de téléchargement indiquée pour chaque événement. Toute utilisation commerciale est interdite sans accord.']],
        ['Contenus', ['Les messages, textes et visuels du site appartiennent à New Wine Church ou à leurs auteurs. Tu peux les partager en citant la source.']],
        ['Contact', ['Pour toute question : <span class="mono">contact@newinechurch.org</span> ou +225 07 79 16 98 78.']]
      ], ['confidentialite/', 'Politique de confidentialité']);
    },
    setup: tocSetup
  };
})();
