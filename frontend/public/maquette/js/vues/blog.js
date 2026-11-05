/* ════════════════════════════════════════════════════════════════════
   Vues « Blog » (/blog) et « Article » (/blog/:slug) — New Wine Mag en ligne.
   Articles d'exemple écrits à partir de la vie réelle de l'église
   (événements, 7 Monts, départements). Auteur : la rédaction du New Wine Mag.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var V = window.NWCV = window.NWCV || {};
  var CATS = { evenements: 'Événements', vision: 'Vision', nouveaux: 'Nouveaux venus', coulisses: 'Coulisses', priere: 'Prière' };
  var POSTS = [
    { slug: 'festi-grill-26-la-rentree-en-saveurs', t: 'Festi Grill ’26 : la rentrée en saveurs', cat: 'evenements', date: '2026-09-15', min: 4, img: 't-fg-1',
      ex: 'Porc braisé, alloco, attiéké et guirlandes lumineuses : retour sur l\'après-midi qui a lancé la saison.',
      body: [['p', 'Le 12 septembre, la cour de l\'Église La Maison de la Destinée s\'est transformée en grand barbecue à ciel ouvert. Dès 15 heures, les premières grillades fumaient et la file d\'attente s\'allongeait devant le stand.'],
        ['h', 'Un menu qui a fait l\'unanimité'], ['p', 'Porc braisé, porc sauté revenir et poulet braisé, servis avec alloco, attiéké ou frites : l\'équipe Restauration avait vu grand. Les assiettes sont parties plus vite que prévu.'],
        ['q', 'On est venus pour manger, on est restés pour l\'ambiance.'],
        ['h', 'Plus qu\'un repas'], ['p', 'Entre deux assiettes, les nouveaux ont découvert les monts de l\'église, posé devant les bannières et rencontré les responsables. À la nuit tombée, le micro est passé de main en main.'],
        ['g', ['t-fg-2', 't-fg-3', 't-fg-5']], ['p', 'Les 77 photos de la soirée sont dans la médiathèque. Merci à tous les départements mobilisés.']] },
    { slug: 'les-7-monts-expliques-en-5-minutes', t: 'Les 7 Monts expliqués en 5 minutes', cat: 'vision', date: '2026-09-02', min: 5, img: 'm-hermon',
      ex: 'Gouvernement, art, économie, média, éducation, famille, religion : pourquoi chaque membre rejoint un mont.',
      body: [['p', 'À New Wine, chaque membre rejoint une famille appelée « mont ». Chaque mont est lié à une sphère de la société où nous voulons porter la lumière de Christ.'],
        ['h', 'Sept sphères, sept familles'], ['l', ['Ararat · le Gouvernement', 'Transfiguration · l\'Art, le Sport, la Musique', 'Oliviers · l\'Économie', 'Carmel · le Média', 'Sinaï · l\'Éducation', 'Hermon · la Famille', 'Morijah · la Religion']],
        ['q', 'Être sauvé, c\'est être envoyé.'],
        ['h', 'Comment choisir ?'], ['p', 'Pose-toi une question simple : où est-ce que j\'ai envie de faire la différence ? Le choix se fait à la fin de l\'Académie de Fondation, et tu peux en parler avec un responsable avant.']] },
    { slug: 'ton-premier-dimanche-a-new-wine', t: 'Ton premier dimanche à New Wine', cat: 'nouveaux', date: '2026-08-28', min: 3, img: 'v-arrive',
      ex: 'Où se garer, quoi porter, combien de temps ça dure : tout ce qu\'il faut savoir avant de venir.',
      body: [['p', 'Venir dans une nouvelle église peut intimider. Voici ce qui t\'attend, pour que tu viennes l\'esprit léger.'],
        ['h', 'Dès 12h00'], ['p', 'L\'accueil ouvre à 12h00 : l\'équipe Parking & Sécurité t\'oriente et l\'Accueil te trouve une place. À 12h25, la Montagne, un temps de prière, prépare le culte. Tu n\'as besoin de connaître personne.'],
        ['h', 'Pendant le culte'], ['p', 'De 13h00 à 15h00 : louange, prière et un message tiré de la Bible. Tu peux simplement écouter.'],
        ['h', 'Après'], ['p', 'À 15h00, place à la communion fraternelle : on reste ensemble pour se rencontrer. Si tu veux aller plus loin, l\'Académie de Fondation est faite pour toi.']] },
    { slug: 'dans-les-coulisses-du-media-photo', t: 'Dans les coulisses du Média Photo', cat: 'coulisses', date: '2026-08-20', min: 4, img: 'g-mag',
      ex: 'Ils sont derrière chacune des 487 photos de la médiathèque. Rencontre avec l\'équipe qui fixe nos souvenirs.',
      body: [['p', 'Pendant que la salle chante, ils sont déjà en mouvement : au bord de la scène, au fond de la salle, parfois perchés sur une chaise.'],
        ['h', 'Une photo, trois étapes'], ['l', ['Le shooting pendant le culte ou l\'événement', 'Le tri et la retouche, souvent le soir même', 'La mise en ligne dans la médiathèque, avec le cadre aux couleurs de l\'événement']],
        ['q', 'Notre plus belle récompense, c\'est quand quelqu\'un met notre photo en profil.'],
        ['p', 'Tu as l\'œil et l\'envie d\'apprendre ? Le département forme les débutants.']] },
    { slug: 'babi-giant-cypher-quand-le-rap-loue-dieu', t: 'Babi Giant Cypher : quand le rap loue Dieu', cat: 'evenements', date: '2026-07-10', min: 4, img: 't-cy-1',
      ex: 'Une scène ouverte, des MC d\'Abidjan et un même beat pour Christ. Retour sur le Vol. 1 avant le Vol. 2.',
      body: [['p', 'Le principe est simple : un beat, un micro, et chacun pose son couplet. Le premier Babi Giant Cypher for Christ a réuni des rappeurs de toute la ville.'],
        ['h', 'Le flow au service du message'], ['p', 'Témoignages, louange, appels à la jeunesse : les textes ont surpris par leur profondeur.'],
        ['g', ['t-cy-2', 't-cy-3', 't-cy-6']], ['p', 'Le Vol. 2 arrive le 28 novembre, billetterie ouverte.']] },
    { slug: 'prier-pour-sa-ville-l-appel-des-sentinelles', t: 'Prier pour sa ville : l\'appel des Sentinelles', cat: 'priere', date: '2026-06-30', min: 3, img: 'v-adore',
      ex: 'Ils prient pour l\'église, Abidjan et la nation. Comment rejoindre le département Sentinelle.',
      body: [['p', '« Sur tes murs, j\'ai placé des gardes » (Ésaïe 62:6). C\'est le verset qui a donné son nom au département Sentinelle.'],
        ['h', 'Ce qu\'ils font'], ['p', 'Ils prient avant chaque culte, portent les sujets de prière reçus et organisent les nuits de prière.'],
        ['p', 'Tu peux déposer un sujet de prière à tout moment depuis la page Contact.']] }
  ];
  V._posts = POSTS;

  function card(P, p, big) {
    return '<a class="bcard' + (big ? ' is-big' : '') + ' reveal" href="blog/' + p.slug + '/"><div class="bcard-img"><img src="img/' + p.img + '.webp" alt="" loading="lazy"><span class="etag">' + CATS[p.cat] + '</span></div>' +
      '<div class="bcard-body"><span class="kicker">' + P.fdate(p.date, { day: 'numeric', month: 'long', year: 'numeric' }) + ' · ' + p.min + ' min de lecture</span><h3>' + P.esc(p.t) + '</h3><p>' + P.esc(p.ex) + '</p></div></a>';
  }

  V.blog = {
    render: function (P) {
      var f = POSTS[0];
      P.host.innerHTML = P.phero('New Wine Mag', 'Le blog<br><em class="serif">de la famille.</em>', 'Récits d\'événements, coulisses des départements, vision et conseils pour les nouveaux. Écrit par la rédaction du New Wine Mag.',
        [[POSTS.length, 'articles'], [Object.keys(CATS).length, 'rubriques'], ['Chaque mois', 'un nouveau numéro']]) +
        '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap">' +
        card(P, f, true) +
        '<div class="fzone" style="margin-top:clamp(40px,5vw,64px)"><div class="fbar fbar-2" role="search"><label class="search">' + P.I.search + '<input id="bq" type="search" placeholder="Rechercher un article…" aria-label="Rechercher un article"></label>' +
        '<div class="chiprow" id="bcats"><button class="chip" type="button" data-cat="" aria-pressed="true">Toutes</button>' + Object.keys(CATS).map(function (k) { return '<button class="chip" type="button" data-cat="' + k + '" aria-pressed="false">' + CATS[k] + '</button>'; }).join('') + '</div></div>' +
        '<div class="results-line"><span id="bcount"></span></div><div class="bgrid" id="bgrid"></div></div>' +
        '<div class="band ilot reveal" style="background:var(--bordeaux);margin-top:clamp(56px,7vw,96px)"><span class="band-ico">' + P.I.dl + '</span><div><h3 class="h3">Le New Wine Mag papier</h3><p>Le magazine est aussi distribué le dimanche à l\'accueil. Tu veux écrire ? Rejoins le département New Wine Mag.</p></div><a class="btn btn-ivoire btn-sm" href="communaute/new-wine-mag/">Rejoindre la rédaction</a></div>' +
        '</div></section>';
    },
    setup: function (N, P) {
      var st = { q: '', cat: P.qs('rubrique') || '' };
      function run() {
        var q = st.q.trim().toLowerCase();
        var list = POSTS.slice(1).filter(function (p) { return (!st.cat || p.cat === st.cat) && (!q || (p.t + ' ' + p.ex).toLowerCase().indexOf(q) >= 0); });
        N.$$('#bcats .chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.cat === st.cat ? 'true' : 'false'); });
        N.$('#bcount').textContent = list.length + (list.length > 1 ? ' articles' : ' article');
        N.$('#bgrid').innerHTML = list.length ? list.map(function (p) { return card(P, p); }).join('') : '<div class="empty" style="grid-column:1/-1"><b>Aucun article trouvé</b><span>Essaie un autre mot-clé ou une autre rubrique.</span></div>';
        P.opt(N.$('#bgrid'));
      }
      var t; N.$('#bq').addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value; run(); }, 250); });
      N.$$('#bcats .chip').forEach(function (c) { c.addEventListener('click', function () { st.cat = c.dataset.cat; run(); }); });
      run();
    }
  };

  V.article = {
    render: function (P) {
      var p = POSTS.filter(function (x) { return x.slug === P.slug; })[0] || POSTS[0];
      var more = POSTS.filter(function (x) { return x !== p && x.cat === p.cat; }).concat(POSTS.filter(function (x) { return x !== p && x.cat !== p.cat; })).slice(0, 3);
      document.title = p.t + ' · New Wine Mag';
      var body = p.body.map(function (b) {
        if (b[0] === 'p') return '<p>' + P.esc(b[1]) + '</p>';
        if (b[0] === 'h') return '<h3>' + P.esc(b[1]) + '</h3>';
        if (b[0] === 'q') return '<blockquote>« ' + P.esc(b[1]) + ' »</blockquote>';
        if (b[0] === 'l') return '<ul>' + b[1].map(function (x) { return '<li>' + P.esc(x) + '</li>'; }).join('') + '</ul>';
        if (b[0] === 'g') return '<div class="agal">' + b[1].map(function (g, i) { return '<button type="button" data-ag="' + i + '" data-src="img/' + g + '.webp" aria-label="Agrandir la photo"><img src="img/' + g + '.webp" alt="" loading="lazy"></button>'; }).join('') + '</div>';
        return '';
      }).join('');
      P.host.innerHTML = '<article class="light"><header class="ahead"><div class="wrap ahead-in">' + P.crumbs([['Blog', 'blog/'], [CATS[p.cat], 'blog/?rubrique=' + p.cat], [p.t]]) +
        '<span class="etag" style="justify-self:start">' + CATS[p.cat] + '</span><h1 class="display atitle">' + P.esc(p.t) + '</h1><p class="lead">' + P.esc(p.ex) + '</p>' +
        '<p class="meta"><span>' + P.I.cal + P.fdate(p.date, { day: 'numeric', month: 'long', year: 'numeric' }) + '</span><span>' + P.I.clock + p.min + ' min de lecture</span><span>Par la rédaction du New Wine Mag</span></p></div></header>' +
        '<div class="wrap"><figure class="acover"><img src="img/' + p.img + '.webp" alt=""></figure>' +
        '<div class="abody"><div class="prose">' + body + '</div><aside class="ashare"><span class="label">Partager</span><button class="abtn" type="button" data-share>' + P.I.share + 'Partager</button><a class="abtn" href="https://wa.me/?text=' + encodeURIComponent(p.t + ' — https://newinechurch.org/maquette/blog/' + p.slug + '/') + '" target="_blank" rel="noopener">WhatsApp</a></aside></div>' +
        '<div style="margin-block:clamp(56px,7vw,96px)"><div class="rail-head"><div><p class="kicker">À lire aussi</p><h2 class="h3 sec-title">Dans le New Wine Mag</h2></div><a class="link-arrow" href="blog/">Tous les articles →</a></div><div class="bgrid">' + more.map(function (x) { return card(P, x); }).join('') + '</div></div></div></article>';
    },
    setup: function (N, P) {
      N.$$('[data-share]').forEach(function (b) { b.addEventListener('click', function () { P.share(document.title, location.href); }); });
      var imgs = N.$$('[data-ag]');
      imgs.forEach(function (b, i) { b.addEventListener('click', function () { N.lightbox(imgs.map(function (x) { return { src: x.dataset.src, cap: document.title }; }), i); }); });
    }
  };
})();
