/* ════════════════════════════════════════════════════════════════════
   Vues « Communauté » (/communaute) et « Département » (/communaute/:slug)
   Données réelles de l'API : nom, slug, icône, couleur, gouverneur.
   Familles, descriptions, cellules et rattachement des activités : contenu
   de maquette à valider avec chaque département.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  var V = window.NWCV = window.NWCV || {};

  // Icônes (tracés simplifiés façon Lucide, mêmes noms que le champ « icon » de l'API)
  var IC = {
    'shield': '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    'megaphone': '<path d="M3 11v2a2 2 0 0 0 2 2h2l5 4V5L7 9H5a2 2 0 0 0-2 2zM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>',
    'hand-shake': '<path d="m11 17 2 2a2 2 0 0 0 3-3M14 14l2.5 2.5a2 2 0 0 0 3-3L15 9l-3 1-2-2 3-3h3l4 4M3 13l4 4M3 6l5-1 3 3"/>',
    'camera': '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    'video': '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    'book-open': '<path d="M2 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z"/>',
    'utensils': '<path d="M5 3v8a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 2-2 6 0 8v10"/>',
    'package': '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12 4 7.5"/>',
    'share': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    'activity': '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    'banknote': '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    'sparkles': '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    'mic': '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    'speaker': '<rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="14" r="4"/><path d="M12 6h.01"/>',
    'users': '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 4 6"/>',
    'car': '<path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/><path d="M5 12h14"/>',
    'phone': '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    'wifi': '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/>',
    'user-plus': '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
    'crown': '<path d="m3 7 4 4 5-6 5 6 4-4-2 11H5zM5 21h14"/>',
    'calendar': '<path d="M7 3v3M17 3v3M4 9h16M5 6h14v14H5z"/>',
    'languages': '<path d="M4 5h8M8 3v2c0 4-2 7-5 9M6 9c1 2 3 4 6 5M13 21l4-9 4 9M14.5 18h5"/>',
    'monitor': '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    'heart-handshake': '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/><path d="m9 11 2 2 4-4"/>',
    'heart': '<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/>',
    'shopping-bag': '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
    'music': '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    'headphones': '<path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
    'book': '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/>',
    'film': '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4M3 12h18"/>',
    'radio': '<circle cx="12" cy="12" r="2"/><path d="M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    'user-cog': '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 11-5.7"/><circle cx="18" cy="17" r="2.5"/><path d="M18 13v1.5M18 19.5V21M14 17h1.5M20.5 17H22"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (IC[n] || IC.sparkles) + '</svg>'; }

  var FAMS = {
    arts: { n: 'Scène, Arts & Sport', img: 'fam-arts', fait: 'Répétitions en semaine, service le dimanche et sur les grands événements (Cypher, galas).', qui: 'Chanteurs, danseurs, rappeurs, techniciens, sportifs. Les débutants motivés sont formés.' },
    media: { n: 'Média & Création', img: 'fam-media', fait: 'Capter, créer et diffuser : cultes en direct, réseaux sociaux, podcast, magazine.', qui: 'Créatifs, geeks, rédacteurs, vidéastes. Ton téléphone et ta curiosité suffisent pour commencer.' },
    accueil: { n: 'Accueil & Soin', img: 'fam-accueil', fait: 'Accueillir, accompagner, prendre des nouvelles, servir à table et prendre soin des lieux.', qui: 'Les sourires, les bons écouteurs, ceux qui aiment que chacun se sente chez soi.' },
    mission: { n: 'Mission & Formation', img: 'fam-mission', fait: 'Annoncer l\'Évangile, prier pour la ville, enseigner les bases de la foi, traduire.', qui: 'Ceux qui ont un feu pour les âmes, la prière ou l\'enseignement.' },
    orga: { n: 'Organisation', img: 'fam-orga', fait: 'Planifier, installer, transporter, sécuriser et gérer : faire tourner la maison.', qui: 'Les organisés, les fiables, ceux qu\'on appelle quand il faut que ça marche.' }
  };
  // [slug, nom, icône, couleur, gouverneur, famille, description, image]
  var D = [
    ['chant', 'Chant', 'mic', '#C9A84C', 'Constance Ble', 'arts', 'La louange live chaque dimanche : voix, harmonies, répétitions en semaine.', 't-cy-5'],
    ['dancing-star', 'Dancing Star', 'sparkles', '#C9A84C', 'Grâce Divine Sio', 'arts', 'Chorégraphies et danse pour l\'adoration et les grands événements.', 't-fg-1'],
    ['rap-et-musique-urbaine', 'Rap et Musique Urbaine', 'music', '#9D2A47', 'Clinton', 'arts', 'MC, beatmakers, auteurs : l\'Évangile en rimes et en flow.', 't-cy-1'],
    ['ingenieur-du-son', 'Ingénieur du Son', 'speaker', '#C9A84C', 'Kevin', 'arts', 'Console, micros, retours : un son propre, du culte au Cypher.', 'g-vibecast'],
    ['annonce-et-regie', 'Annonce et Régie', 'megaphone', '#B22240', 'Florent Amani Yao', 'arts', 'Les annonces, le conducteur et le timing du culte.', 'fam-arts'],
    ['sport', 'Sport', 'activity', '#B22240', 'Edson Ahouana', 'arts', 'Matchs, footing, tournois : la fraternité aussi sur le terrain.', 'fam-arts'],
    ['media-photo', 'Média Photo', 'camera', '#7E662E', 'Naomie Tape', 'media', 'Shooting des cultes et des événements, retouche, médiathèque.', 't-dn-1'],
    ['media-video', 'Média Vidéo', 'video', '#9D2A47', 'Louis Serge', 'media', 'Captation, montage et diffusion des cultes en direct.', 'fam-media'],
    ['media-audio', 'Média Audio', 'headphones', '#7E662E', 'Favour Tano', 'media', 'Enregistrement des messages et archives sonores.', 'g-vibecast'],
    ['cinematographie', 'Cinématographie', 'film', '#530F1B', 'Maeva Guenam', 'media', 'Courts-métrages, clips et films qui racontent l\'église.', 't-fg-4'],
    ['new-wine-mag', 'New Wine Mag', 'book', '#C9A84C', 'Dorcas Moroko', 'media', 'Le magazine de l\'église : écrire, interviewer, mettre en page.', 'g-mag'],
    ['new-wine-vibecast', 'New Wine Vibecast', 'radio', '#B22240', '', 'media', 'Le podcast de NWC : micros ouverts sur la foi et la vie.', 'g-vibecast'],
    ['reseaux-sociaux', 'Réseaux Sociaux', 'share', '#C9A84C', 'Rebecca Ahoulou', 'media', 'Instagram, TikTok, Facebook : faire vivre NWC en ligne.', 'fam-media'],
    ['powerpoint', 'PowerPoint', 'monitor', '#B22240', 'Romuald Sio Quenum', 'media', 'Paroles, versets et visuels projetés pendant le culte.', 'fam-media'],
    ['informatique-webmaster', 'Informatique / Webmaster', 'wifi', '#B22240', 'Romuald Sio Quenum', 'media', 'Le site, la plateforme et les outils numériques de l\'église.', 'fam-media'],
    ['production-gadgets-a-vendre', 'Production Gadgets à Vendre', 'shopping-bag', '#9D2A47', 'Marie', 'media', 'T-shirts, goodies et merch NWC, de l\'idée à la vente.', 'fam-media'],
    ['accueil-reception-et-aide-a-linterieur', 'Accueil, Réception et Aide à l\'intérieur', 'hand-shake', '#B22240', 'Danielle Konan', 'accueil', 'Le premier sourire à l\'entrée et l\'aide pour trouver sa place.', 'v-arrive'],
    ['protocole', 'Protocole', 'crown', '#8B1A2F', 'Jean Marc', 'accueil', 'Accompagner les invités et le pasteur, veiller au bon ordre.', 't-dn-2'],
    ['visite-des-membres', 'Visite des Membres', 'heart-handshake', '#C9A84C', 'Dame Codjia', 'accueil', 'Rendre visite à ceux qu\'on n\'a pas vus depuis longtemps.', 'fam-accueil'],
    ['social', 'Social', 'heart', '#8B1A2F', 'Dame Codjia', 'accueil', 'Soutien concret aux membres et actions solidaires dans la ville.', 'fam-accueil'],
    ['insertion-interne', 'Insertion Interne', 'user-plus', '#8B1A2F', 'Favour Tano', 'accueil', 'Accompagner les nouveaux jusqu\'à ce qu\'ils se sentent chez eux.', 'v-reste'],
    ['call-center', 'Call Center', 'phone', '#B22240', 'Audrey Kouadio', 'accueil', 'Appeler, rappeler, prendre des nouvelles de chacun.', 'fam-accueil'],
    ['attache-pastoral', 'Attaché Pastoral', 'user-cog', '#8B1A2F', 'Olivier Matte', 'accueil', 'Assister le pasteur dans son agenda et son ministère.', 'fam-accueil'],
    ['hygiene', 'Hygiène', 'sparkles', '#C9A84C', 'Christian Kohon', 'accueil', 'Une maison propre et accueillante avant et après chaque culte.', 'fam-accueil'],
    ['restauration', 'Restauration', 'utensils', '#8B1A2F', 'Flora Ipotey', 'accueil', 'Cuisiner et servir pour les cultes, retraites et événements.', 't-sv-1'],
    ['evangelisation', 'Évangélisation', 'megaphone', '#C9A84C', 'Capistran Attounbre', 'mission', 'Annoncer l\'Évangile dans les rues, campus et quartiers d\'Abidjan.', 'fam-orga'],
    ['sentinelle', 'Sentinelle', 'shield', '#530F1B', 'Magloire Guemi', 'mission', 'Les intercesseurs : prier pour l\'église, la ville et la nation.', 'v-adore'],
    ['academie-de-fondation-et-formation', 'Académie de Fondation et Formation', 'book-open', '#C9A84C', 'Anna Victoire Lorng', 'mission', 'Les bases de la foi et la formation des futurs leaders.', 'v-parole'],
    ['traduction-de-texte', 'Traduction de Texte', 'languages', '#7E662E', 'Murielle Bahi', 'mission', 'Traduire messages et contenus pour la diaspora (FR ⇄ EN).', 'fam-mission'],
    ['planning-et-gestion-des-cultes', 'Planning et Gestion des Cultes', 'calendar', '#C9A84C', 'Anna Victoire Lorng', 'orga', 'Préparer chaque culte, de la liste des intervenants au timing.', 'fam-orga'],
    ['logistique', 'Logistique', 'package', '#530F1B', 'Cedric Gbah', 'orga', 'Installer, ranger, transporter le matériel : rien ne bouge sans eux.', 't-dn-4'],
    ['transport', 'Transport', 'car', '#7E662E', 'Jones Auriol', 'orga', 'Organiser les déplacements des membres vers l\'église et les événements.', 'fam-orga'],
    ['parking-et-securite', 'Parking et Sécurité', 'shield', '#8B1A2F', 'Dorcas Yao', 'orga', 'Guider les véhicules et veiller à la sécurité de tous.', 'fam-orga'],
    ['finance', 'Finance', 'banknote', '#7E662E', 'Regina', 'orga', 'Gérer les dons et le budget avec rigueur et transparence.', 'fam-orga'],
    ['drh-direction-ressources-humaines', 'DRH (Direction Ressources Humaines)', 'users', '#C9A84C', 'Flora Michelle Sio', 'orga', 'Accueillir les serviteurs et les orienter vers le bon département.', 'fam-orga']
  ].map(function (r) { return { slug: r[0], n: r[1], ic: r[2], c: r[3], gov: r[4], f: r[5], d: r[6], img: r[7] }; });
  V._depts = D;

  // Activités en photos, événements et cellules rattachés (exemples de maquette)
  var ACT = { 'rap-et-musique-urbaine': 'cy', 'restauration': 'sv', 'protocole': 'dn', 'evangelisation': 'fg', 'media-photo': 'dn', 'dancing-star': 'fg', 'chant': 'cy' };
  var EVD = { 'rap-et-musique-urbaine': ['babi-giant-cypher-vol-2'], 'restauration': ['saveurs-sunday-vol-2'], 'sentinelle': ['nuit-de-priere-nouvel-an'], 'academie-de-fondation-et-formation': ['academie-session-janvier'], 'chant': ['culte-de-noel'], 'planning-et-gestion-des-cultes': ['culte-de-noel'], 'protocole': ['dark-night-in-elegance-2027'] };
  var PASTD = { 'rap-et-musique-urbaine': [3], 'restauration': [2], 'evangelisation': [0], 'protocole': [1], 'media-photo': [0, 1, 2, 3] };
  var CELLS = { 'evangelisation': [['Cellule Riviera', 'Riviera 3', 'Mardi · 19h00'], ['Cellule Angré', 'Angré 8e tranche', 'Jeudi · 19h30'], ['Cellule Yopougon', 'Yopougon Maroc', 'Mercredi · 19h00']], 'accueil-reception-et-aide-a-linterieur': [['Cellule Bonoumin', 'Cocody-Bonoumin', 'Vendredi · 19h00']], 'sentinelle': [['Cellule de prière du matin', 'En ligne', 'Lundi au vendredi · 5h30']] };

  function norm(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function card(d) {
    return '<a class="dcard reveal" href="communaute/' + d.slug + '/" style="--dc:' + d.c + '"><span class="dcard-ic">' + icon(d.ic) + '</span><span class="dcard-txt"><b>' + d.n + '</b><span>' + (d.gov ? 'Gouverneur : ' + d.gov : 'Gouverneur à pourvoir') + '</span></span><span class="dcard-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a>';
  }

  V.communaute = {
    render: function (P) {
      var govs = D.filter(function (d) { return d.gov; }).length;
      P.host.innerHTML = P.phero('Communauté · Servir', '35 départements.<br><em class="serif">Une place pour toi.</em>',
        '« Comme nous avons plusieurs membres dans un seul corps, et que tous les membres n\'ont pas la même fonction… » Romains 12:4. Trouve l\'équipe où tes talents servent Dieu et les autres.',
        [[D.length, 'départements'], [govs, 'gouverneurs actifs'], ['5', 'familles']]) +
        '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap">' +
        '<div class="fzone"><div class="fbar fbar-2" role="search"><label class="search">' + P.I.search + '<input id="cq" type="search" placeholder="Chercher : son, accueil, photo…" aria-label="Chercher un département"></label>' +
        '<div class="chiprow" id="cfam"><button class="chip" type="button" data-f="" aria-pressed="true">Toutes les familles</button>' + Object.keys(FAMS).map(function (k) { return '<button class="chip" type="button" data-f="' + k + '" aria-pressed="false">' + FAMS[k].n + '</button>'; }).join('') + '</div></div>' +
        '<div class="results-line"><span id="ccount"></span></div><div id="clist"></div></div>' +
        '<aside class="quiz ilot" id="quiz" aria-labelledby="quizTitle"><div class="quiz-head"><p class="kicker">Pas sûr ?</p><h3 class="h3" id="quizTitle">Trouve ta place en 3 questions</h3><div class="quiz-bar" aria-hidden="true"><span id="quizBar"></span></div><p class="quiz-alt">Tu préfères en parler&nbsp;? <a href="contact/">Écris au pasteur →</a></p></div><div class="quiz-body" id="quizBody"></div></aside>' +
        '' +
        '</div></section>';
    },
    setup: function (N) {
      var st = { q: '', f: (location.search.match(/famille=([a-z]+)/) || [])[1] || '' };
      function run() {
        var q = norm(st.q.trim());
        var list = D.filter(function (d) { return (!st.f || d.f === st.f) && (!q || norm(d.n + ' ' + d.d).indexOf(q) >= 0); });
        N.$$('#cfam .chip').forEach(function (c) { c.setAttribute('aria-pressed', c.dataset.f === st.f ? 'true' : 'false'); });
        N.$('#ccount').textContent = list.length + (list.length > 1 ? ' départements' : ' département');
        if (!list.length) { N.$('#clist').innerHTML = '<div class="empty"><b>Aucun département trouvé</b><span>Essaie un autre mot : « musique », « accueil », « vidéo »…</span></div>'; return; }
        N.$('#clist').innerHTML = Object.keys(FAMS).map(function (k) {
          var items = list.filter(function (d) { return d.f === k; });
          if (!items.length) return '';
          return '<div class="dfam"><div class="dfam-head"><h2 class="display">' + FAMS[k].n + '</h2><span class="mono">' + items.length + '</span></div><div class="dgrid">' + items.map(card).join('') + '</div></div>';
        }).join('');
      }
      var t; N.$('#cq').addEventListener('input', function (e) { clearTimeout(t); t = setTimeout(function () { st.q = e.target.value; run(); }, 200); });
      N.$$('#cfam .chip').forEach(function (c) { c.addEventListener('click', function () { st.f = c.dataset.f; run(); }); });
      run();
    }
  };

  V.departement = {
    render: function (P) {
      var esc = P.esc, I = P.I;
      var d = D.filter(function (x) { return x.slug === P.slug; })[0] || D[0], fam = FAMS[d.f];
      document.title = d.n + ' · Communauté · New Wine Church';
      var gal = ACT[d.slug] ? [1, 2, 3, 4, 5].map(function (i) { return ACT[d.slug] + '-' + String(i).padStart(2, '0'); }) : [];
      var up = (EVD[d.slug] || []).map(function (s) { return P.EVENTS.filter(function (e) { return e.slug === s; })[0]; }).filter(Boolean);
      var past = (PASTD[d.slug] || []).map(function (i) { return P.PAST[i]; });
      var cells = CELLS[d.slug] || [];
      var others = D.filter(function (x) { return x !== d && x.f === d.f; }).slice(0, 4);
      // Le QR ouvre le formulaire d'inscription, avec ce département déjà choisi (comme sur le site actuel)
      var joinUrl = location.origin + '/maquette/rejoindre/?dept=' + encodeURIComponent(d.slug);
      V.departement._ctx = { d: d, gal: gal, joinUrl: joinUrl };
      P.host.innerHTML =
        '<section class="dhero" style="--dc:' + d.c + '"><img class="dhero-bg" src="img/' + d.img + '.webp" alt=""><div class="wrap dhero-in">' + P.crumbs([['Communauté', 'communaute/'], [fam.n, 'communaute/'], [d.n]]) +
        '<span class="dmedal">' + icon(d.ic) + '</span><span class="etag" style="background:rgba(245,237,225,.16);color:var(--ivoire);justify-self:start">' + esc(fam.n) + '</span>' +
        '<h1 class="display dtitle">' + esc(d.n) + '</h1><p class="lead" style="color:rgba(245,237,225,.85)">' + esc(d.d) + '</p>' +
        '<ul class="ehero-facts"><li><span class="dot-ok"></span>Département actif</li><li>' + I.users + (d.gov ? 'Gouverneur : ' + esc(d.gov) : 'Gouverneur à pourvoir') + '</li></ul>' +
        '<div class="row-btns"><a class="btn btn-ivoire" href="rejoindre/?dept=' + d.slug + '"><span class="btn-txt" data-txt="Je veux rejoindre">Je veux rejoindre</span><span class="btn-ico" aria-hidden="true">' + I.arrow + '</span></a><button class="btn btn-ghost" type="button" data-share style="--fg:var(--ivoire);border-color:rgba(245,237,225,.3)">' + I.share + ' Partager</button></div></div></section>' +
        '<section class="light" style="padding-block:clamp(56px,7vw,100px)"><div class="wrap egrid"><div style="min-width:0">' +
        '<div class="esec reveal"><p class="kicker">Le département</p><h2>Ce que tu y fais</h2><div class="infos">' +
        '<div class="info"><span class="label">Au quotidien</span><p><b>' + esc(fam.fait) + '</b></p></div><div class="info"><span class="label">Pour qui</span><p><b>' + esc(fam.qui) + '</b></p></div>' +
        '<div class="info"><span class="label">Rythme</span><p><b>Le dimanche, plus une rencontre d\'équipe par mois.</b></p></div><div class="info"><span class="label">Formation</span><p><b>Les nouveaux sont accompagnés par un membre de l\'équipe.</b></p></div></div></div>' +
        (gal.length ? '<div class="esec reveal"><p class="kicker">Nos dernières activités</p><h2>En images</h2><div class="dgal">' + gal.map(function (g, i) { return '<button type="button" data-dg="' + i + '" aria-label="Agrandir la photo"><img src="img/g/' + g + '.webp" alt="" loading="lazy"></button>'; }).join('') + '</div><a class="link-arrow" href="galerie/?departement=' + d.slug + '" style="margin-top:14px">Voir toutes les activités →</a></div>' : '') +
        (cells.length ? '<div class="esec reveal"><p class="kicker">Cellules rattachées</p><h2>Près de chez toi</h2><ul class="cells">' + cells.map(function (c) { return '<li><div><b>' + esc(c[0]) + '</b><span>' + I.pin + esc(c[1]) + '</span><span>' + I.clock + esc(c[2]) + '</span></div><a class="btn btn-ivoire btn-sm" href="rejoindre/?cell=' + P.esc(c[0].toLowerCase().replace(/\s+/g, '-')) + '">Rejoindre</a></li>'; }).join('') + '</ul></div>' : '') +
        (up.length ? '<div class="esec reveal"><p class="kicker">Prochains événements</p><h2>À venir</h2><ul class="elist">' + up.map(P.erow).join('') + '</ul></div>' : '') +
        (past.length ? '<div class="esec reveal"><p class="kicker">Événements organisés</p><h2>Ils l\'ont fait</h2><div class="pgrid">' + past.map(function (p) { return '<a class="pcard" href="galerie/?event=' + p.ev + '"><img src="img/' + p.img + '.webp" alt="" loading="lazy"><span class="mono">' + esc(p.when) + '</span><h3>' + esc(p.t) + '</h3><span class="link-arrow" style="color:var(--ivoire)">' + esc(p.media) + ' →</span></a>'; }).join('') + '</div></div>' : '') +
        '</div><aside><div class="tbox"><div class="tbox-head"><span>Responsable</span><b>' + (d.gov ? esc(d.gov) : 'À pourvoir') + '</b><span>Gouverneur du département</span></div><div class="tbox-body">' +
        '<a class="btn btn-bordeaux btn-block" href="rejoindre/?dept=' + d.slug + '">Je veux rejoindre</a>' +
        '<a class="btn btn-ghost btn-block" href="mailto:contact@newinechurch.org?subject=' + encodeURIComponent('Je veux rejoindre — ' + d.n) + '">Contacter par e-mail</a>' +
        '<div class="dqr"><div class="qr" id="dqr" role="img" aria-label="QR code pour rejoindre ce département"></div><span>Scanne pour rejoindre ce département</span></div></div></div></aside></div>' +
        '<div class="wrap" style="margin-top:clamp(48px,6vw,80px)"><div class="rail-head"><div><p class="kicker">Dans la même famille</p><h2 class="h3 sec-title">D\'autres équipes</h2></div><a class="link-arrow" href="communaute/">Les 35 départements →</a></div><div class="dgrid">' + others.map(card).join('') + '</div></div></section>';
    },
    setup: function (N, P) {
      var c = V.departement._ctx;
      N.$$('[data-share]').forEach(function (b) { b.addEventListener('click', function () { P.share(c.d.n + ' · New Wine Church', location.href); }); });
      var items = c.gal.map(function (g) { return { src: 'img/g/' + g + '.webp', cap: c.d.n }; });
      N.$$('[data-dg]').forEach(function (b) { b.addEventListener('click', function () { N.lightbox(items, +b.dataset.dg); }); });
      try { var q = window.qrcode(0, 'M'); q.addData(c.joinUrl); q.make(); N.$('#dqr').innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) { /* QR facultatif */ }
    }
  };
})();
