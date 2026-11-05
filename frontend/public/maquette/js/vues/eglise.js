/* ════════════════════════════════════════════════════════════════════
   Vue « L'église » (/eglise) — page nouvelle : qui sommes-nous.
   Faits vérifiés : nom (Marc 2:22), slogan, devise, pasteur, maison mère,
   Servir · Grandir · Impacter, 7 Monts (bannières officielles).
   La confession de foi est un texte de travail à faire valider par le pasteur.
   ════════════════════════════════════════════════════════════════════ */
(window.NWCV = window.NWCV || {}).eglise = {
  render: function (P) {
    var I = P.I, esc = P.esc;
    var FOI = [
      ['La Bible', 'Nous croyons que la Bible est la Parole de Dieu, inspirée et digne de confiance. Elle est notre référence pour la foi et pour la vie.'],
      ['Un seul Dieu', 'Nous croyons en un seul Dieu, éternel, qui se révèle comme Père, Fils et Saint-Esprit.'],
      ['Jésus-Christ', 'Nous croyons que Jésus est le Fils de Dieu, mort pour nos péchés et ressuscité. Il est le seul chemin vers le Père.'],
      ['Le salut', 'Nous croyons que le salut est un don de Dieu, reçu par la foi en Jésus, et non le fruit de nos efforts.'],
      ['Le Saint-Esprit', 'Nous croyons que le Saint-Esprit habite en chaque croyant, le transforme et lui donne des dons pour servir.'],
      ['L\'Église', 'Nous croyons que l\'Église est la famille de Dieu, appelée à adorer, à grandir ensemble et à servir le monde.'],
      ['La mission', 'Nous croyons que chaque croyant est envoyé : sauvé pour sauver, dans toutes les sphères de la société.']
    ];
    var PILIERS = [
      ['1', 'Servir', '35 départements où chacun met ses talents au service de Dieu et des autres.', 'communaute/', 'Trouver ma place'],
      ['2', 'Grandir', 'Un message chaque dimanche, l\'Académie de Fondation et les cellules de maison.', 'messages/', 'Écouter les messages'],
      ['3', 'Impacter', 'Sept monts, sept sphères de la société où nous sommes envoyés.', 'monts/', 'Découvrir les 7 Monts']
    ];
    P.host.innerHTML =
      '<section class="ehero">' +
      '<img class="ehero-bg" src="img/fam-orga.webp" alt="Les jeunes de New Wine Church réunis devant l\'église">' +
      '<div class="wrap ehero-inner">' + P.crumbs([['Accueil', './'], ['L\'église']]) +
      '<h1 class="ehero-title display">Une église de jeunes,<br><em class="serif">une famille.</em></h1>' +
      '<p class="lead" style="color:rgba(245,237,225,.85);max-width:52ch">New Wine Church est une église de jeunes adultes à Cocody-Bonoumin, à Abidjan. Une armée de jeunes pour Christ, sauvés pour sauver.</p>' +
      '<ul class="ehero-facts"><li>' + I.cal + 'Culte chaque dimanche · 13h00</li><li>' + I.pin + 'Cocody-Bonoumin, près d\'Abidjan Mall</li></ul></div></section>' +

      // Notre nom
      '<section class="light section"><div class="wrap split">' +
      '<div><p class="kicker">Notre nom</p><h2 class="h2 display">Pourquoi<br><em class="serif">« New Wine » ?</em></h2></div>' +
      '<div class="prose reveal"><p class="big-quote serif">« Il faut un enseignement nouveau pour des cœurs neufs. »</p>' +
      '<p>Notre nom vient de <b>Marc 2:22</b>. Jésus y explique que ce qu\'il apporte est neuf et demande des cœurs prêts à le recevoir.</p>' +
      '<p>New Wine, ce sont de nouveaux jeunes à qui l\'on transmet un enseignement nouveau : solide, ancré dans la Parole et pensé pour la vie d\'aujourd\'hui, du campus au bureau.</p></div></div></section>' +

      // Mission : devise + 3 piliers
      '<section class="sable section"><div class="wrap">' +
      '<div class="center-head"><p class="kicker">Notre mission</p><h2 class="h2 display">Une armée de jeunes<br><em class="serif">pour Christ.</em></h2><p class="lead" style="margin-inline:auto">Notre devise tient en trois mots : <b>Sauvé pour sauver.</b> Concrètement, chaque membre est invité à servir, à grandir et à impacter.</p></div>' +
      '<div class="pillars">' + PILIERS.map(function (p) {
        return '<a class="pillar reveal" href="' + p[3] + '"><span class="pillar-n">' + p[0] + '</span><h3 class="display">' + p[1] + '</h3><p>' + esc(p[2]) + '</p><span class="link-arrow">' + p[4] + ' →</span></a>';
      }).join('') + '</div></div></section>' +

      // Pasteur + maison mère
      '<section class="light section"><div class="wrap duo">' +
      '<article class="pcard2 ilot reveal"><span class="mono-tag">Notre pasteur</span><span class="monogram display" aria-hidden="true">GAP</span><h3 class="display">Pasteur Georges<br>Amoako-Prempeh</h3><p>Il conduit New Wine Church et porte la vision d\'une génération de jeunes enseignés, formés et envoyés.</p><a class="btn btn-ivoire btn-sm" href="messages/">Écouter ses messages</a></article>' +
      '<article class="pcard2 reveal"><span class="mono-tag">Notre famille d\'églises</span><img src="img/logo-md-64.png" alt="Logo de l\'Église La Maison de la Destinée" width="80" height="85"><h3 class="display">Église La Maison<br>de la Destinée</h3><p>New Wine Church est l\'église de jeunes adultes de La Maison de la Destinée. Les grands événements se tiennent dans ses locaux, à Cocody-Bonoumin.</p><a class="link-arrow" href="contact/">Nous écrire →</a></article>' +
      '</div></section>' +

      // Confession de foi
      '<section class="sable section"><div class="wrap split">' +
      '<div><p class="kicker">Ce que nous croyons</p><h2 class="h2 display">Notre<br><em class="serif">foi.</em></h2><p class="lead">L\'essentiel de ce qui nous rassemble, en sept points.</p></div>' +
      '<div class="faq" id="foi">' + FOI.map(function (f, i) {
        return '<div class="faq-item"><button class="faq-q" type="button" aria-expanded="' + (i ? 'false' : 'true') + '" aria-controls="foi' + i + '"><span class="mono">' + String(i + 1).padStart(2, '0') + '</span>' + esc(f[0]) + '<i aria-hidden="true"></i></button><div class="faq-a" id="foi' + i + '"' + (i ? ' hidden' : '') + '><p>' + esc(f[1]) + '</p></div></div>';
      }).join('') + '</div></div></section>' +

      // 7 Monts
      '<section class="light section"><div class="wrap">' +
      '<div class="center-head"><p class="kicker">Impacter</p><h2 class="h2 display">Les 7 Monts</h2><p class="lead" style="margin-inline:auto">Chaque membre rejoint une famille, un mont, liée à une sphère de la société.</p></div>' +
      '<div data-monts="compact" data-open="sinai"></div><div class="more-row"><a class="btn btn-ivoire" href="monts/"><span class="btn-txt" data-txt="Découvrir les 7 Monts">Découvrir les 7 Monts</span><span class="btn-ico" aria-hidden="true">' + I.arrow + '</span></a></div></div></section>' +

      // Rendez-vous
      '<section class="section rdv ilot"><div class="wrap">' +
      '<div class="center-head"><p class="kicker">Nos rendez-vous</p><h2 class="h2 display">On se voit<br><em class="serif">dimanche ?</em></h2></div>' +
      '<div class="rdv-grid">' +
      '<div class="rdv-card"><span class="mono">Chaque dimanche</span><b>Culte · 13h00 — 15h00</b><span data-next-service>—</span></div>' +
      '<div class="rdv-card"><span class="mono">En semaine</span><b>Cellules de maison</b><span>Dans ta commune, en petit groupe.</span></div>' +
      '<div class="rdv-card"><span class="mono">En ligne</span><b>Direct sur YouTube</b><span>@NewWineChurchMD</span></div></div>' +
      '<div class="more-row" style="gap:12px;flex-wrap:wrap"><button class="btn btn-ivoire" type="button" data-open-visit><span class="btn-txt" data-txt="Viens ce dimanche">Viens ce dimanche</span><span class="btn-ico" aria-hidden="true">' + I.arrow + '</span></button>' +
      '<a class="btn btn-ghost" href="contact/">Nous contacter</a></div></div></section>';
  },
  setup: function (N, P) { P.faq(N); }
};
