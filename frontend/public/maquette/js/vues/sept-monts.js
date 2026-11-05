/* ════════════════════════════════════════════════════════════════════
   Vue « Les 7 Monts » (/monts) — nouvelle version sans 3D.
   La chaîne des monts (js/monts-chaine.js) + comment rejoindre + une
   section par mont (photo réelle de la famille, question de la bannière,
   verset, activités) + FAQ. L'ancienne version 3D reste sur /monts/3d.
   Activités par mont : exemples de maquette à valider avec les responsables.
   ════════════════════════════════════════════════════════════════════ */
(window.NWCV = window.NWCV || {}).monts = {
  render: function (P) {
    var esc = P.esc, I = P.I, MO = (window.NWCMonts && window.NWCMonts.data) || [];
    var ACT = {
      ararat: ['Formation au leadership et à la prise de parole', 'Rencontres avec des acteurs publics', 'Projets d\'engagement citoyen'],
      transfiguration: ['Répétitions artistiques et entraînements', 'Scènes ouvertes, Cypher et concerts', 'Tournois et sorties sportives'],
      oliviers: ['Ateliers d\'entrepreneuriat', 'Éducation financière', 'Réseau de professionnels chrétiens'],
      carmel: ['Production de contenus et reportages', 'Formation photo, vidéo et réseaux', 'Couverture des événements de l\'église'],
      sinai: ['Soutien scolaire et universitaire', 'Mentorat d\'étudiants', 'Clubs de lecture et d\'étude'],
      hermon: ['Rencontres couples et familles', 'Accompagnement des célibataires', 'Activités en famille'],
      morijah: ['Intercession et veilles de prière', 'Préparation au ministère', 'Service de la louange']
    };
    P.host.innerHTML =
      '<section class="mt-hero"><div class="wrap">' + P.crumbs([['Accueil', './'], ['Les 7 Monts']]) +
      '<div class="mt-head"><div><p class="kicker">Impacter</p><h1 class="display mt-title">Les 7 Monts</h1></div>' +
      '<p class="lead">Chaque membre de New Wine rejoint une famille, un « mont », liée à une sphère de la société. Parce qu\'être sauvé, c\'est être envoyé : au gouvernement comme sur les réseaux.</p></div>' +
      '<div data-monts="full" data-open="sinai"></div>' +
      '<p class="mt-alt"><a class="link-arrow" href="monts/3d/">Voir l\'ancienne version en 3D →</a></p></div></section>' +

      '<section class="light section"><div class="wrap">' +
      '<div class="center-head"><p class="kicker">Comment ça marche</p><h2 class="h2 display">Trouver<br><em class="serif">ton mont.</em></h2></div>' +
      '<ol class="mt-steps">' +
      '<li class="reveal"><span class="howto-n">1</span><b>L\'Académie de Fondation</b><span>Six dimanches pour poser les bases de la foi et découvrir les monts.</span><a class="link-arrow" href="evenements/academie-session-janvier/">Prochaine session →</a></li>' +
      '<li class="reveal"><span class="howto-n">2</span><b>Le choix du mont</b><span>À la fin de l\'Académie, tu choisis la sphère où tu veux faire la différence.</span></li>' +
      '<li class="reveal"><span class="howto-n">3</span><b>Ta famille</b><span>Rencontres, projets et missions avec les membres de ton mont, toute l\'année.</span></li></ol></div></section>' +

      '<section class="sable section"><div class="wrap mt-list">' + MO.map(function (m, i) {
        return '<article class="mt-item reveal' + (i % 2 ? ' is-alt' : '') + '" id="' + m.id + '">' +
          '<div class="mt-photo"><img src="img/m-' + m.id + '.webp" alt="Les membres du Mont ' + esc(m.nom) + ' devant leur bannière" loading="lazy"><span class="etag">' + esc(m.sphere) + '</span></div>' +
          '<div class="mt-body"><p class="kicker">Mont · ' + esc(m.sphere) + '</p><h2 class="display">' + esc(m.nom) + '</h2><p class="mt-q serif">« ' + esc(m.q) + ' »</p><p class="mt-txt">' + esc(m.txt) + '</p>' +
          '<ul class="mt-act">' + (ACT[m.id] || []).map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul>' +
          '<blockquote class="mt-verse"><p class="serif">« ' + esc(m.v) + ' »</p><cite class="mono">' + esc(m.ref) + '</cite></blockquote>' +
          '<a class="btn btn-bordeaux" href="rejoindre/?mont=' + m.id + '">Rejoindre le Mont ' + esc(m.nom) + '</a></div></article>';
      }).join('') + '</div></section>' +

      '<section class="light section"><div class="wrap split"><div><p class="kicker">Questions fréquentes</p><h2 class="h2 display">Bon à<br><em class="serif">savoir.</em></h2></div><div class="faq">' +
      [['Un mont, c\'est un département ?', 'Non. Les départements servent la vie de l\'église (Servir). Les monts sont tournés vers la société, là où tu étudies, travailles et vis (Impacter). Tu peux faire partie des deux.'],
        ['Quand est-ce que je choisis ?', 'En général à la fin de l\'Académie de Fondation. Tu peux aussi en parler avec un responsable après le culte.'],
        ['Puis-je changer de mont ?', 'Oui. Ta vie évolue, ton appel aussi : parles-en au responsable de ton mont.'],
        ['Les monts organisent-ils des événements ?', 'Oui : chaque famille a ses rencontres, et tous les monts se retrouvent lors des grands événements de l\'église.']].map(function (f, i) {
        return '<div class="faq-item"><button class="faq-q" type="button" aria-expanded="' + (i ? 'false' : 'true') + '" aria-controls="mf' + i + '"><span class="mono">' + String(i + 1).padStart(2, '0') + '</span>' + esc(f[0]) + '<i aria-hidden="true"></i></button><div class="faq-a" id="mf' + i + '"' + (i ? ' hidden' : '') + '><p>' + esc(f[1]) + '</p></div></div>';
      }).join('') + '</div></div></section>';
  },
  setup: function (N, P) {
    P.faq(N);
    // « En savoir plus » dans la chaîne : défilement vers la section du mont
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-to]'); if (!a) return;
      var el = document.getElementById(a.getAttribute('data-to'));
      if (el) { e.preventDefault(); N.scrollTo(el, -90); }
    });
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { N.scrollTo(t, -90); }, 400); }
  }
};
