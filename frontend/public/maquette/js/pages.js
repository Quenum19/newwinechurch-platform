/* ════════════════════════════════════════════════════════════════════
   NEW WINE CHURCH — Maquette : pages intérieures
   Rendu des vues Messages, Message, Agenda, Événement et Mon billet
   à partir de données d'exemple qui reprennent les champs réels de l'API
   (Sermon, SermonSeries, Event, EventTicketType, EventTicket).
   1) Le HTML est rendu tout de suite (avant site.js) pour que les tiroirs
      et le lecteur soient branchés par site.js.
   2) Les interactions propres à chaque vue sont branchées au
      DOMContentLoaded, quand les outils partagés (window.NWC) existent.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var body = document.body, view = body.getAttribute('data-view'), slug = body.getAttribute('data-slug');
  var host = document.getElementById('view'), main = document.getElementById('top');
  if (!host) return;

  /* ───────── Outils ───────── */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function d(iso) { return new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ':00Z')); }
  function fdate(iso, o) { var s = d(iso).toLocaleDateString('fr-FR', Object.assign({ timeZone: 'UTC' }, o)); return s.charAt(0).toUpperCase() + s.slice(1); }
  function ftime(iso) { var x = d(iso); return x.getUTCHours() + 'h' + String(x.getUTCMinutes()).padStart(2, '0'); }
  function dur(sec) { var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60, p = function (n) { return String(n).padStart(2, '0'); }; return (h ? h + ':' + p(m) : m) + ':' + p(s); }
  function money(n) { return n === 0 ? 'Gratuit' : n.toLocaleString('fr-FR') + ' FCFA'; }
  function num(n) { return n.toLocaleString('fr-FR'); }
  function qs(k) { try { return new URLSearchParams(location.search).get(k); } catch (e) { return null; } }

  var I = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><path d="M7 3v3M17 3v3M4 9h16M5 6h14v14H5z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    ticket: '<svg viewBox="0 0 24 24"><path d="M3 6h18v3a3 3 0 0 0 0 6v3H3v-3a3 3 0 0 0 0-6z"/><path d="M14 6v12"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    yt: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9 5 3-5 3z" fill="currentColor"/></svg>',
    sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>',
    head: '<svg viewBox="0 0 24 24"><path d="M3 14v-2a9 9 0 0 1 18 0v2"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/></svg>',
    users: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 4 6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ═════════════ DONNÉES D'EXEMPLE (mêmes champs que l'API) ═════════════ */
  var PASTEUR = 'Pasteur Georges Amoako-Prempeh', EQUIPE = 'Équipe pastorale';
  var SERIES = [
    { slug: 'coeurs-neufs', t: 'Cœurs neufs', ref: 'Marc 2:18-22', v: '', period: 'Oct. 2026 → en cours', desc: 'Ce que veut dire recevoir un enseignement nouveau quand on est jeune : laisser Dieu renouveler notre façon de penser, d\'aimer et de servir.' },
    { slug: 'sauve-pour-sauver', t: 'Sauvé pour sauver', ref: 'Luc 19:10', v: 'v-rubis', period: 'Sept. → Oct. 2026', desc: 'Être sauvé, c\'est être envoyé : au campus, au travail, dans la ville.' },
    { slug: 'les-7-monts', t: 'Les 7 Monts', ref: 'Matthieu 5:14', v: 'v-or v-ring', period: 'Août → Sept. 2026', desc: 'Une série sur les sept sphères de la société que Dieu nous appelle à influencer.' },
    { slug: 'fondations', t: 'Fondations', ref: '1 Corinthiens 3:11', v: 'v-sable v-lines', period: 'Août 2026', desc: 'Les bases de la foi chrétienne, enseignées simplement.' },
    { slug: 'identite', t: 'Identité', ref: '2 Corinthiens 5:17', v: 'v-ivoire', period: 'Août 2026', desc: 'Qui tu es en Christ, avant ce que tu fais.' },
    { slug: 'generation-qui-prie', t: 'Génération qui prie', ref: 'Actes 2:42', v: 'v-profond', period: 'Août 2026', desc: 'Remettre la prière au centre de nos vies et de l\'église.' }
  ];
  var THEMES = [
    { s: 'foi', n: 'Foi', c: '#8B1A2F' }, { s: 'croissance', n: 'Croissance', c: '#2F7A4B' }, { s: 'identite', n: 'Identité', c: '#6B3FA0' },
    { s: 'mission', n: 'Mission', c: '#C2410C' }, { s: 'famille', n: 'Famille', c: '#B45309' }, { s: 'leadership', n: 'Leadership', c: '#1D4ED8' },
    { s: 'priere', n: 'Prière', c: '#0F766E' }, { s: 'media', n: 'Média', c: '#BE185D' }
  ];
  var TYPES = { video: 'Vidéo', audio: 'Audio', live_replay: 'Rediffusion' };
  var M = [
    ['un-enseignement-nouveau', 'Un enseignement nouveau', 'coeurs-neufs', 'Marc 2:21-22', '2026-11-01', 'video', 2892, 1284, ['foi', 'croissance'], PASTEUR, 'Jésus n\'est pas venu rapiécer une vieille religion. Il apporte un enseignement nouveau, qui demande des cœurs prêts à être renouvelés.'],
    ['ce-qui-doit-changer-en-moi', 'Ce qui doit changer en moi', 'coeurs-neufs', 'Romains 12:1-2', '2026-10-25', 'video', 3090, 1102, ['identite', 'croissance'], PASTEUR, 'Le renouvellement commence dans l\'intelligence : ce que je pense finit par diriger ce que je vis.'],
    ['apprendre-a-apprendre', 'Apprendre à apprendre', 'coeurs-neufs', 'Proverbes 1:5', '2026-10-18', 'audio', 2645, 640, ['croissance'], PASTEUR, 'Le sage écoute et augmente son savoir. Comment rester enseignable quand on croit déjà tout savoir.'],
    ['le-maitre-qui-fait-du-neuf', 'Le Maître qui fait du neuf', 'coeurs-neufs', 'Apocalypse 21:5', '2026-10-11', 'video', 2800, 1530, ['foi'], PASTEUR, 'Ouverture de la série : Dieu ne recycle pas nos vies, il les fait nouvelles.'],
    ['sauve-et-maintenant', 'Sauvé, et maintenant ?', 'sauve-pour-sauver', 'Éphésiens 2:8-10', '2026-10-04', 'video', 2950, 980, ['foi', 'mission'], PASTEUR, 'Sauvés par grâce, créés pour de bonnes œuvres préparées d\'avance.'],
    ['un-temoin-au-campus', 'Un témoin au campus', 'sauve-pour-sauver', 'Actes 1:8', '2026-09-27', 'live_replay', 6738, 2210, ['mission'], PASTEUR, 'Rediffusion intégrale du culte : être témoin là où tu étudies, sans gêne et sans forcer.'],
    ['la-ville-a-besoin-de-toi', 'La ville a besoin de toi', 'sauve-pour-sauver', 'Jérémie 29:7', '2026-09-20', 'video', 3002, 870, ['mission', 'leadership'], PASTEUR, 'Recherchez la paix de la ville : notre foi a une adresse, Abidjan.'],
    ['mont-hermon-batir-des-familles', 'Mont Hermon : bâtir des familles', 'les-7-monts', 'Psaume 133:1-3', '2026-09-13', 'video', 2855, 1340, ['famille'], PASTEUR, 'Qu\'il est agréable pour des frères de demeurer ensemble : la famille comme lieu de bénédiction.'],
    ['mont-carmel-l-image-et-la-verite', 'Mont Carmel : l\'image et la vérité', 'les-7-monts', '1 Rois 18:36-39', '2026-09-06', 'audio', 2720, 520, ['media'], PASTEUR, 'Sur le Carmel, tout le peuple a vu. Une génération de créateurs au service de la vérité.'],
    ['mont-ararat-diriger-avec-integrite', 'Mont Ararat : diriger avec intégrité', 'les-7-monts', 'Proverbes 29:2', '2026-08-30', 'video', 3191, 760, ['leadership'], PASTEUR, 'Quand les justes se multiplient, le peuple est dans la joie : former des dirigeants intègres.'],
    ['qui-est-jesus', 'Qui est Jésus ?', 'fondations', 'Jean 14:6', '2026-08-23', 'audio', 2398, 410, ['foi'], EQUIPE, 'Le chemin, la vérité et la vie : la première leçon de l\'Académie de Fondation.'],
    ['fils-et-filles-pas-orphelins', 'Fils et filles, pas orphelins', 'identite', 'Romains 8:15', '2026-08-16', 'video', 2822, 1190, ['identite', 'famille'], PASTEUR, 'Vous avez reçu un esprit d\'adoption : vivre comme des enfants aimés.'],
    ['les-sentinelles', 'Les Sentinelles', 'generation-qui-prie', 'Ésaïe 62:6', '2026-08-09', 'audio', 2504, 380, ['priere'], EQUIPE, 'Sur tes murs j\'ai placé des gardes : l\'appel des intercesseurs de NWC.']
  ].map(function (r) { return { slug: r[0], t: r[1], serie: r[2], ref: r[3], date: r[4], type: r[5], sec: r[6], views: r[7], themes: r[8], who: r[9], desc: r[10] }; });
  M.forEach(function (m) { m.s = SERIES.filter(function (s) { return s.slug === m.serie; })[0]; });
  SERIES.forEach(function (s) { s.items = M.filter(function (m) { return m.serie === s.slug; }); });

  var LIEU = 'Église La Maison de la Destinée', ADR = 'Cocody-Bonoumin, près d\'Abidjan Mall';
  var EVENTS = [
    { slug: 'babi-giant-cypher-vol-2', t: 'Babi Giant Cypher for Christ', vol: 'Vol. 2', type: 'concert', start: '2026-11-28T16:00', end: '2026-11-28T21:00', img: 't-cy-4', mode: 'billet', maxEmail: 3, closes: '2026-11-27T23:59',
      desc: 'Le retour du Cypher. Une scène ouverte où les MC, beatmakers et chanteurs d\'Abidjan posent leurs couplets pour Christ, entre battles bienveillantes, louange urbaine et un message court et direct. Viens avec ta team.',
      types: [{ n: 'Standard', p: 2000, cap: 300, sold: 112, max: 3, c: '#8B1A2F', d: 'Accès à la soirée.' }, { n: 'VIP', p: 5000, cap: 60, sold: 41, max: 2, c: '#C99A45', d: 'Places réservées devant la scène et une boisson offerte.' }, { n: 'Pack groupe · 5 places', p: 8000, cap: 20, sold: 17, max: 1, c: '#2F7A4B', d: 'Cinq entrées Standard pour venir à plusieurs.' }],
      prog: [['16h00', 'Ouverture des portes', 'Accueil et DJ set pour lancer l\'ambiance.'], ['16h45', 'Open mic', 'Les jeunes MC inscrits passent au micro.'], ['18h00', 'Le Cypher', 'Les MC enchaînent leurs couplets sur le même beat.'], ['19h30', 'Louange urbaine', 'Avec le département Rap et Musique Urbaine.'], ['20h30', 'Message et prière', 'Un mot court et direct pour finir ensemble.']],
      infos: [['Tenue', 'Streetwear bienvenu, viens comme tu es.'], ['Accès', 'Parking sur place, guidé par l\'équipe Parking & Sécurité.'], ['Public', 'Ouvert à tous, pensé pour les 15-35 ans.'], ['Une question ?', '+225 07 79 16 98 78 (WhatsApp)']],
      gallery: ['t-cy-1', 't-cy-2', 't-cy-3', 't-cy-5', 't-cy-6'], galleryT: 'Revivre le Vol. 1', galleryEv: 'babi-giant-cypher-for-christ-vol-1', media: 48 },
    { slug: 'culte-de-noel', t: 'Culte de Noël', type: 'culte', start: '2026-12-20T13:00', end: '2026-12-20T15:30', art: 'v-or v-ring', mode: 'libre',
      desc: 'Un culte de Noël pensé pour inviter : louange, chorale, un message clair sur la venue de Jésus et un moment convivial après le culte. Amène un ami qui ne vient jamais à l\'église.',
      prog: [['13h00', 'Louange de Noël', 'Chant, Dancing Star et invités.'], ['13h50', 'Message', 'Pourquoi Jésus est venu.'], ['15h00', 'Moment ensemble', 'Photos et rafraîchissements.']],
      infos: [['Entrée', 'Libre, sans billet.'], ['Enfants', 'Bienvenus avec leurs parents.'], ['Accès', 'Parking sur place.'], ['En ligne', 'Diffusé en direct sur YouTube.']] },
    { slug: 'nuit-de-priere-nouvel-an', t: 'Nuit de prière du Nouvel An', type: 'priere', start: '2026-12-31T21:00', end: '2027-01-01T01:00', art: 'v-profond', mode: 'libre',
      desc: 'Entrer dans 2027 à genoux. Une nuit de louange, d\'intercession et de prophétie, portée par le département Sentinelle.',
      prog: [['21h00', 'Louange', 'On ouvre la nuit dans l\'adoration.'], ['22h30', 'Intercession', 'Pour l\'église, la ville et la nation.'], ['23h45', 'Passage à 2027', 'Prière et bénédiction.']],
      infos: [['Entrée', 'Libre, sans billet.'], ['Transport', 'Retour organisé par le département Transport (inscription sur place).'], ['À prévoir', 'Une Bible, de quoi noter.'], ['Organisé par', 'Département Sentinelle']] },
    { slug: 'academie-session-janvier', t: 'Académie de Fondation', vol: 'Session de janvier', type: 'formation', start: '2027-01-10T15:15', end: '2027-01-10T17:00', img: 'v-parole', mode: 'inscription', cap: 40, taken: 14, opens: '2026-11-01',
      desc: 'Six dimanches pour poser les bases de la foi : qui est Jésus, la Bible, la prière, l\'Église, le Saint-Esprit et ton appel. À la fin, chacun choisit le mont qu\'il veut rejoindre.',
      prog: [['15h15', 'Accueil', 'Juste après le culte.'], ['15h30', 'Enseignement', 'Une leçon par dimanche.'], ['16h30', 'Échanges', 'Questions en petits groupes.']],
      infos: [['Durée', '6 dimanches, à partir du 10 janvier.'], ['Pour qui', 'Les nouveaux et ceux qui veulent consolider.'], ['Coût', 'Gratuit, support de cours offert.'], ['Ensuite', 'Choix du mont et d\'un département.']] },
    { slug: 'saveurs-sunday-vol-2', t: 'Saveurs Sunday', vol: 'Vol. 2', type: 'autre', start: '2027-01-24T15:00', end: '2027-01-24T19:00', img: 't-sv-2', mode: 'billet', maxEmail: 3,
      desc: 'Le concours de cuisine revient : des équipes s\'affrontent, un jury goûte, le public vote. Entrée gratuite, mais réservée pour gérer les places.',
      types: [{ n: 'Entrée visiteur', p: 0, cap: 250, sold: 96, max: 3, c: '#2F7A4B', d: 'Dégustation et vote du public.' }],
      prog: [['15h00', 'Lancement', 'Présentation des équipes.'], ['16h30', 'Dégustation', 'Le jury et le public goûtent.'], ['18h00', 'Résultats', 'Remise des diplômes.']],
      infos: [['Entrée', 'Gratuite sur réservation.'], ['Équipes', 'Inscriptions auprès du département Restauration.'], ['Accès', 'Parking sur place.'], ['Une question ?', '+225 07 79 16 98 78']],
      gallery: ['t-sv-1', 't-sv-3', 't-sv-4', 't-sv-5', 't-sv-6'], galleryT: 'Revivre le Vol. 1', galleryEv: 'saveurs-sunday-vol-1', media: 33 },
    { slug: 'dark-night-in-elegance-2027', t: 'A Dark Night in Elegance', vol: '2027', type: 'autre', start: '2027-02-13T19:00', end: '2027-02-13T23:30', img: 't-dn-2', mode: 'billet', maxEmail: 2, selfie: true, waitlist: true,
      desc: 'Le gala de la famille NWC : tapis rouge, tenue de soirée, dîner et une nuit pour célébrer l\'amitié et l\'élégance. Le selfie est demandé à la réservation pour le contrôle à l\'entrée.',
      types: [{ n: 'Solo', p: 10000, cap: 150, sold: 118, max: 2, c: '#8B1A2F', d: 'Une entrée, dîner compris.' }, { n: 'Duo', p: 18000, cap: 50, sold: 50, max: 1, c: '#C99A45', d: 'Deux entrées, dîner compris.' }],
      prog: [['19h00', 'Tapis rouge', 'Photos et accueil.'], ['20h00', 'Dîner', 'Service à table.'], ['21h30', 'Soirée', 'Animations et remise des prix.']],
      infos: [['Tenue', 'Tenue de soirée exigée.'], ['Selfie', 'Demandé à la réservation, vérifié à l\'entrée.'], ['Accès', 'Parking sur place.'], ['Une question ?', '+225 07 79 16 98 78']],
      gallery: ['t-dn-1', 't-dn-3', 't-dn-4', 't-dn-5', 't-dn-6'], galleryT: 'Revivre l\'édition précédente', galleryEv: 'a-dark-night-in-elegance', media: 333 }
  ];
  var EVTYPES = { culte: 'Culte', priere: 'Prière', evangelisation: 'Évangélisation', concert: 'Concert', formation: 'Formation', autre: 'Événement' };
  var PAST = [
    { t: 'Festi Grill ’26', when: 'Sam. 12 sept. 2026', img: 't-fg-1', media: '77 photos', ev: 'festi-grill-26' },
    { t: 'A Dark Night in Elegance', when: 'Gala', img: 't-dn-1', media: '333 photos', ev: 'a-dark-night-in-elegance' },
    { t: 'Saveurs Sunday · Vol. 1', when: 'Concours de cuisine', img: 't-sv-3', media: '33 photos', ev: 'saveurs-sunday-vol-1' },
    { t: 'Babi Giant Cypher · Vol. 1', when: 'Scène ouverte', img: 't-cy-1', media: '44 photos · 4 vidéos', ev: 'babi-giant-cypher-for-christ-vol-1' }
  ];
  var MONTS = [['ararat', 'Ararat', 'Le Gouvernement'], ['transfiguration', 'Transfiguration', 'L\'Art, le Sport, la Musique'], ['oliviers', 'Oliviers', 'L\'Économie'], ['carmel', 'Carmel', 'Le Média'], ['sinai', 'Sinaï', 'L\'Éducation'], ['hermon', 'Hermon', 'La Famille'], ['morijah', 'Morijah', 'La Religion']];
  var COMMUNES = ['Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody', 'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Songon', 'Treichville', 'Yopougon'];
  var OPS = [
    { id: 'om', n: 'Orange Money', short: 'OM', c: '#FF7900', num: '+225 07 10 31 21 08', raw: '+2250710312108', steps: ['Compose <b class="mono">#144#</b>', 'Choisis « Transfert d\'argent »', 'Entre le numéro et le montant', 'Confirme avec ton code secret'] },
    { id: 'mtn', n: 'MTN MoMo', short: 'MoMo', c: '#FFD52E', dark: true, num: '+225 05 01 31 60 73', raw: '+2250501316073', steps: ['Compose <b class="mono">*133#</b>', 'Choisis « Transfert »', 'Entre le numéro et le montant', 'Valide avec ton code MoMo'] },
    { id: 'wave', n: 'Wave', short: 'W', c: '#1DC8FF', dark: true, num: '+225 05 01 31 60 73', raw: '+2250501316073', steps: ['Ouvre l\'application Wave', 'Tape « Envoyer de l\'argent »', 'Entre le numéro et le montant', 'Valide la transaction'] }
  ];

  /* ═════════════ COMPOSANTS ═════════════ */
  function art(s, k, big) {
    return '<div class="art ' + (s.v || '') + '"><span class="art-k">' + esc(k || 'Série') + '</span><span class="art-n">' + esc(s.t).replace(' ', '<br>') + '</span><span class="art-r">' + esc(s.ref) + '</span></div>';
  }
  function themeChip(slug) { var t = THEMES.filter(function (x) { return x.s === slug; })[0]; return t ? '<a class="chip" href="messages/?theme=' + t.s + '"><i style="width:8px;height:8px;border-radius:50%;background:' + t.c + '"></i>' + t.n + '</a>' : ''; }
  function mcard(m) {
    return '<a class="mcard reveal" href="messages/' + m.slug + '/">' +
      '<div class="art ' + (m.s.v || '') + '" style="position:relative"><span class="art-k">Série</span><span class="art-n">' + esc(m.s.t).replace(' ', '<br>') + '</span><span class="art-r">' + esc(m.ref) + '</span>' +
      '<span class="mcard-dur">' + TYPES[m.type] + ' · ' + dur(m.sec) + '</span><span class="mcard-play" aria-hidden="true">' + I.play + '</span></div>' +
      '<div style="display:grid;gap:6px"><span class="kicker">' + esc(m.s.t) + ' · ' + fdate(m.date, { day: 'numeric', month: 'short', year: 'numeric' }) + '</span><h3>' + esc(m.t) + '</h3>' +
      '<p class="meta"><span>' + I.mic + esc(m.who) + '</span><span>' + I.eye + num(m.views) + ' vues</span></p></div></a>';
  }
  function crumbs(items) { return '<ol class="crumbs">' + items.map(function (it) { return '<li>' + (it[1] ? '<a href="' + it[1] + '">' + esc(it[0]) + '</a>' : esc(it[0])) + '</li>'; }).join('') + '</ol>'; }
  function phero(kicker, title, lead, stats, extra) {
    return '<section class="phero light"><span class="phero-star" aria-hidden="true"></span><div class="wrap phero-grid">' +
      '<div><p class="kicker">' + kicker + '</p><h1 class="phero-title display">' + title + '</h1></div>' +
      '<div class="phero-side"><p class="lead">' + lead + '</p>' + (stats ? '<ul class="phero-stats">' + stats.map(function (s) { return '<li><b>' + s[0] + '</b><span>' + s[1] + '</span></li>'; }).join('') + '</ul>' : '') + (extra || '') + '</div></div></section>';
  }

  /* ═════════════ VUE : MESSAGES ═════════════ */
  function renderMessages() {
    var feat = M[0];
    var years = ['2026', '2025', '2024', '2023', '2022', '2021'];
    host.innerHTML = phero('Messages', 'La Parole,<br><em class="serif">chaque semaine.</em>', 'Tous les messages du dimanche en vidéo, en audio et en rediffusion du direct. Cherche par série, par thème ou par mot-clé.',
      [[M.length, 'messages'], [SERIES.length, 'séries'], ['Dim.', 'un nouveau chaque semaine']]) +
      '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap">' +
      // À la une
      '<article class="feature reveal">' + art(feat.s, 'Dernier message · ' + feat.s.t) +
      '<div class="feature-body"><p class="kicker">Dernier message · ' + fdate(feat.date, { weekday: 'short', day: 'numeric', month: 'long' }) + '</p><h2 class="feature-title">' + esc(feat.t) + '</h2>' +
      '<p class="meta"><span>' + I.mic + esc(feat.who) + '</span><span>' + I.clock + dur(feat.sec) + '</span><span>' + esc(feat.ref) + '</span></p><p class="lead">' + esc(feat.desc) + '</p>' +
      '<div class="row-btns"><a class="btn btn-ivoire" href="messages/' + feat.slug + '/"><span class="btn-txt" data-txt="Regarder le message">Regarder le message</span><span class="btn-ico" aria-hidden="true">' + I.play + '</span></a>' +
      '<a class="btn btn-ghost" href="messages/' + feat.slug + '/#ecouter">' + I.head + ' Écouter</a></div></div></article>' +
      // Séries
      '<div class="rail-head" style="margin-top:clamp(56px,7vw,96px)"><div><p class="kicker">Séries</p><h2 class="h3" style="font-size:clamp(2rem,3.6vw,3.2rem);text-transform:uppercase;font-stretch:75%;font-variation-settings:\'wdth\' 75">Suivre une série du début à la fin</h2></div>' +
      '<div class="rail-nav"><button class="rbtn" type="button" data-rail="-1" aria-label="Séries précédentes">' + I.left + '</button><button class="rbtn" type="button" data-rail="1" aria-label="Séries suivantes">' + I.right + '</button></div></div>' +
      '<div class="rail" id="rail">' + SERIES.map(function (s) {
        return '<a class="scard" href="messages/?serie=' + s.slug + '" data-serie="' + s.slug + '">' + art(s) + '<span class="scard-meta"><b>' + esc(s.t) + '</b><span>' + s.items.length + ' messages</span></span><span class="scard-meta"><span>' + esc(s.period) + '</span></span></a>';
      }).join('') + '</div>' +
      // Filtres
      '<div id="liste" style="margin-top:clamp(56px,7vw,96px)"><p class="kicker">Tous les messages</p></div>' +
      '<div class="fzone"><div class="fbar fbar-msg" role="search">' +
      '<label class="search"><span class="sr-only" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Rechercher un message</span>' + I.search + '<input id="fq" type="search" placeholder="Titre, verset, orateur…" autocomplete="off"></label>' +
      '<div class="chiprow" id="fthemes" aria-label="Thèmes">' + THEMES.map(function (t) { return '<button class="chip" type="button" aria-pressed="false" data-theme="' + t.s + '"><i style="width:8px;height:8px;border-radius:50%;background:' + t.c + '"></i>' + t.n + '</button>'; }).join('') + '</div>' +
      '<div class="fbar-end"><select class="select" id="ftype" aria-label="Type"><option value="">Format</option><option value="video">Vidéo</option><option value="audio">Audio</option><option value="live_replay">Rediffusion du direct</option></select>' +
      '<select class="select" id="fserie" aria-label="Série"><option value="">Série</option>' + SERIES.map(function (s) { return '<option value="' + s.slug + '">' + esc(s.t) + '</option>'; }).join('') + '</select>' +
      '<select class="select" id="fyear" aria-label="Année"><option value="">Année</option>' + years.map(function (y) { return '<option>' + y + '</option>'; }).join('') + '</select></div></div>' +
      '<div class="results-line"><span id="fcount"></span><button class="linkbtn" type="button" id="fclear" hidden>Effacer les filtres</button></div>' +
      '<div class="mgrid" id="mgrid"></div><div class="more-row"><button class="btn btn-ghost" type="button" id="fmore" hidden>Voir plus de messages</button></div></div>' +
      // Vibecast
      '<div class="band ilot reveal" style="background:var(--bordeaux);margin-top:clamp(56px,7vw,96px)"><span class="band-ico">' + I.head + '</span><div><h3 class="h3">Tu préfères l\'audio ?</h3><p>Tous les messages existent en audio, et le New Wine Vibecast prolonge la discussion chaque semaine.</p></div>' +
      '<a class="btn btn-ivoire btn-sm" href="./#grandir">Découvrir le Vibecast</a></div>' +
      '</div></section>';
  }
  function setupMessages(N) {
    var st = { q: qs('q') || '', type: qs('type') || '', serie: qs('serie') || '', year: qs('annee') || '', themes: (qs('theme') || '').split(',').filter(Boolean), shown: 9 };
    var $ = N.$, $$ = N.$$;
    var fq = $('#fq'), ft = $('#ftype'), fs = $('#fserie'), fy = $('#fyear');
    fq.value = st.q; ft.value = st.type; fs.value = st.serie; fy.value = st.year;
    function sync() {
      // Les filtres restent dans l'adresse (partageable), comme sur le site actuel
      var p = new URLSearchParams();
      if (st.q) p.set('q', st.q); if (st.type) p.set('type', st.type); if (st.serie) p.set('serie', st.serie);
      if (st.year) p.set('annee', st.year); if (st.themes.length) p.set('theme', st.themes.join(','));
      try { history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : '')); } catch (e) { /* rien */ }
    }
    function run(keepShown) {
      if (!keepShown) st.shown = 9;
      var q = st.q.trim().toLowerCase();
      var list = M.filter(function (m) {
        if (st.type && m.type !== st.type) return false;
        if (st.serie && m.serie !== st.serie) return false;
        if (st.year && m.date.slice(0, 4) !== st.year) return false;
        if (st.themes.length && !m.themes.some(function (t) { return st.themes.indexOf(t) >= 0; })) return false;
        if (q && (m.t + ' ' + m.desc + ' ' + m.ref + ' ' + m.who + ' ' + m.s.t).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      var active = (st.q ? 1 : 0) + (st.type ? 1 : 0) + (st.serie ? 1 : 0) + (st.year ? 1 : 0) + st.themes.length;
      $('#fcount').textContent = list.length + (list.length > 1 ? ' messages' : ' message') + (active ? ' · ' + active + (active > 1 ? ' filtres actifs' : ' filtre actif') : '');
      $('#fclear').hidden = !active;
      $$('#fthemes .chip').forEach(function (c) { c.setAttribute('aria-pressed', st.themes.indexOf(c.dataset.theme) >= 0 ? 'true' : 'false'); });
      var grid = $('#mgrid');
      if (!list.length) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1"><b>Aucun message ne correspond</b><span>Essaie un autre mot-clé ou retire un filtre.</span><button class="btn btn-ivoire btn-sm" type="button" id="fclear2">Effacer les filtres</button></div>';
        $('#fclear2').addEventListener('click', clear);
      } else grid.innerHTML = list.slice(0, st.shown).map(mcard).join('');
      $('#fmore').hidden = list.length <= st.shown;
      sync();
    }
    function clear() { st.q = st.type = st.serie = st.year = ''; st.themes = []; fq.value = ''; ft.value = fs.value = fy.value = ''; run(); }
    var tmr; fq.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(function () { st.q = fq.value; run(); }, 300); });
    ft.addEventListener('change', function () { st.type = ft.value; run(); });
    fs.addEventListener('change', function () { st.serie = fs.value; run(); });
    fy.addEventListener('change', function () { st.year = fy.value; run(); });
    $$('#fthemes .chip').forEach(function (c) { c.addEventListener('click', function () { var t = c.dataset.theme, i = st.themes.indexOf(t); if (i >= 0) st.themes.splice(i, 1); else st.themes.push(t); run(); }); });
    $('#fclear').addEventListener('click', clear);
    $('#fmore').addEventListener('click', function () { st.shown += 6; run(true); });
    $$('[data-serie]').forEach(function (b) { b.addEventListener('click', function (ev) { ev.preventDefault(); st.serie = b.dataset.serie; fs.value = st.serie; run(); N.scrollTo($('#liste'), -90); }); });
    $$('[data-rail]').forEach(function (b) { b.addEventListener('click', function () { var r = $('#rail'); r.scrollBy({ left: +b.dataset.rail * r.clientWidth * .8, behavior: 'smooth' }); }); });
    run();
  }

  /* ═════════════ VUE : MESSAGE ═════════════ */
  function renderMessage() {
    var m = M.filter(function (x) { return x.slug === slug; })[0] || M[0];
    var rich = m.slug === 'un-enseignement-nouveau';
    var ep = m.s.items.slice().reverse();
    var related = M.filter(function (x) { return x !== m && x.themes.some(function (t) { return m.themes.indexOf(t) >= 0; }); }).slice(0, 3);
    if (related.length < 3) related = related.concat(M.filter(function (x) { return x !== m && related.indexOf(x) < 0; }).slice(0, 3 - related.length));
    document.title = m.t + ' · Messages · New Wine Church';
    var summary = rich
      ? '<p>Jésus n\'est pas venu rapiécer une vieille religion. Il apporte un enseignement nouveau, et cet enseignement demande des cœurs prêts à être renouvelés.</p><p>Dans ce message, le pasteur montre pourquoi une nouvelle génération ne peut pas se contenter d\'habitudes héritées : on apprend, on se laisse transformer, puis on transmet ce qu\'on a reçu.</p><blockquote>« On ne reçoit pas un enseignement nouveau avec un cœur fermé. »</blockquote><p>C\'est le sens même de notre nom : de nouveaux jeunes, à qui l\'on transmet un enseignement nouveau.</p>'
      : '<p>' + esc(m.desc) + '</p><p>Message prêché le ' + fdate(m.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toLowerCase() + ' dans le cadre de la série « ' + esc(m.s.t) + ' ».</p>';
    var notes = rich
      ? '<ol><li><b>Jésus enseigne avec autorité.</b> Ce qu\'il apporte est neuf, et les foules le remarquent (Marc 1:27).</li><li><b>Un cœur neuf avant des pratiques neuves.</b> Dieu commence par l\'intérieur (Ézéchiel 36:26).</li><li><b>Apprendre demande de l\'humilité.</b> Accepter d\'être enseigné, corrigé, formé.</li><li><b>Ce que tu reçois, tu le transmets.</b> Sauvé pour sauver.</li></ol>'
      : '<ol><li><b>Le texte :</b> ' + esc(m.ref) + '.</li><li><b>L\'idée centrale :</b> ' + esc(m.desc) + '</li><li><b>Pour cette semaine :</b> relis le passage chaque matin et note ce qui te parle.</li></ol>';
    var verses = rich
      ? [['Ézéchiel 36:26', 'Je vous donnerai un cœur nouveau, et je mettrai en vous un esprit nouveau.'], ['Romains 12:2', 'Ne vous conformez pas au siècle présent, mais soyez transformés par le renouvellement de l\'intelligence.'], ['2 Corinthiens 5:17', 'Si quelqu\'un est en Christ, il est une nouvelle créature. Les choses anciennes sont passées ; voici, toutes choses sont devenues nouvelles.']]
      : [[m.ref, 'Le passage lu et expliqué pendant le message.']];
    var questions = rich
      ? ['Quelle habitude ou façon de penser Dieu est-il en train de renouveler chez toi ?', 'Qu\'est-ce qui t\'empêche parfois d\'être enseigné·e ?', 'À qui peux-tu transmettre cette semaine ce que tu as appris ?']
      : ['Qu\'est-ce qui t\'a le plus marqué dans ce message ?', 'Comment le vivre concrètement cette semaine ?', 'Pour qui peux-tu prier à la suite de ce message ?'];

    host.innerHTML = '<section class="light" style="padding-block:calc(var(--nav-h) + env(safe-area-inset-top,0px) + 32px) clamp(64px,8vw,120px)"><div class="wrap">' +
      crumbs([['Messages', 'messages/'], [m.s.t, 'messages/?serie=' + m.serie], [m.t]]) +
      '<div class="watch"><div style="min-width:0">' +
      '<div class="screen" id="screen">' + art(m.s, m.s.t + ' · ' + TYPES[m.type]) +
      '<button class="screen-play" type="button" id="screenPlay" aria-label="Lire la vidéo">' + I.play + '</button>' +
      '<div class="screen-bar"><span>' + TYPES[m.type] + ' · ' + dur(m.sec) + '</span><span>youtube-nocookie</span></div></div>' +
      '<h1 class="mtitle">' + esc(m.t) + '</h1>' +
      '<p class="meta"><span>' + I.cal + fdate(m.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</span><span>' + I.clock + dur(m.sec) + '</span><span>' + I.eye + num(m.views) + ' vues</span><span><b style="color:var(--bordeaux)">' + esc(m.ref) + '</b></span></p>' +
      '<div class="actions"><button class="abtn" type="button" id="aShare">' + I.share + 'Partager</button><button class="abtn" type="button" id="aDl">' + I.dl + 'Télécharger l\'audio</button>' +
      '<a class="abtn" href="https://www.youtube.com/@NewWineChurchMD" target="_blank" rel="noopener">' + I.yt + 'Ouvrir sur YouTube</a></div>' +
      '<div class="tabs" role="tablist" aria-label="Contenu du message">' +
      [['resume', 'Résumé'], ['notes', 'Notes'], ['versets', 'Versets', verses.length], ['cellule', 'Pour ta cellule', questions.length]].map(function (t, i) {
        return '<button class="tab" type="button" role="tab" id="tab-' + t[0] + '" aria-controls="panel-' + t[0] + '" aria-selected="' + (i ? 'false' : 'true') + '">' + t[1] + (t[2] ? '<span class="mono">' + t[2] + '</span>' : '') + '</button>';
      }).join('') + '</div>' +
      '<div class="tabpanel prose" role="tabpanel" id="panel-resume" aria-labelledby="tab-resume">' + summary + '</div>' +
      '<div class="tabpanel prose" role="tabpanel" id="panel-notes" aria-labelledby="tab-notes" hidden>' + notes + '</div>' +
      '<div class="tabpanel" role="tabpanel" id="panel-versets" aria-labelledby="tab-versets" hidden><ul class="verses">' + verses.map(function (v) { return '<li><b>' + esc(v[0]) + ' · Louis Segond</b><p>« ' + esc(v[1]) + ' »</p></li>'; }).join('') + '</ul></div>' +
      '<div class="tabpanel" role="tabpanel" id="panel-cellule" aria-labelledby="tab-cellule" hidden><p class="lead" style="margin-bottom:16px">Des questions prêtes pour ta cellule de maison cette semaine.</p><ol class="qlist">' + questions.map(function (q) { return '<li><span>' + esc(q) + '</span></li>'; }).join('') + '</ol></div>' +
      // Lecteur audio (même composant que l'accueil)
      '<article class="audio-card" id="player" style="display:grid;grid-template-columns:1fr;box-shadow:none" aria-label="Version audio"><div id="ecouter"></div>' +
      '<p class="kicker">Version audio · ' + dur(m.sec) + '</p>' +
      '<canvas class="wave" id="wave" height="90" data-dur="' + m.sec + '" aria-label="Barre de lecture, cliquer pour avancer"></canvas>' +
      '<div class="player-time mono"><span id="tCur">00:00</span><span id="tDur">' + dur(m.sec) + '</span></div>' +
      '<div class="player-ctrls"><button class="pbtn" type="button" id="pBack" aria-label="Reculer de 15 secondes">' + I.left + '<small>15</small></button>' +
      '<button class="pbtn pbtn-main" type="button" id="pPlay" aria-label="Lecture"><svg class="i-play" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg><svg class="i-pause" viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg></button>' +
      '<button class="pbtn" type="button" id="pFwd" aria-label="Avancer de 15 secondes"><small>15</small>' + I.right + '</button><button class="pbtn pbtn-speed mono" type="button" id="pSpeed" aria-label="Vitesse de lecture">1×</button></div>' +
      '<ol class="chapters" id="chapters"><li><button type="button" data-t="0"><span class="mono">00:00</span>Accueil et prière</button></li>' +
      '<li><button type="button" data-t="' + Math.round(m.sec * .13) + '"><span class="mono">' + dur(Math.round(m.sec * .13)) + '</span>Lecture : ' + esc(m.ref) + '</button></li>' +
      '<li><button type="button" data-t="' + Math.round(m.sec * .4) + '"><span class="mono">' + dur(Math.round(m.sec * .4)) + '</span>Le cœur du message</button></li>' +
      '<li><button type="button" data-t="' + Math.round(m.sec * .9) + '"><span class="mono">' + dur(Math.round(m.sec * .9)) + '</span>Appel et prière</button></li></ol></article>' +
      '</div>' +
      // Colonne latérale
      '<aside class="aside">' +
      '<div class="box"><p class="kicker">Orateur</p><div style="display:flex;gap:12px;align-items:center"><span style="width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:var(--bordeaux);color:var(--ivoire)">' + I.mic + '</span><div><h3>' + esc(m.who) + '</h3><span class="meta" style="font-size:.85rem">New Wine Church</span></div></div></div>' +
      '<div class="box"><p class="kicker">Série · ' + m.s.items.length + ' messages</p><h3>' + esc(m.s.t) + '</h3><p style="margin:0;color:var(--muted);font-size:.94rem">' + esc(m.s.desc) + '</p><ul class="eplist">' +
      ep.map(function (x, i) { return '<li><a href="messages/' + x.slug + '/"' + (x === m ? ' aria-current="true"' : '') + '><span class="n">' + String(i + 1).padStart(2, '0') + '</span><span class="t">' + esc(x.t) + '</span><span class="d">' + dur(x.sec) + '</span></a></li>'; }).join('') +
      '</ul></div>' +
      '<div class="box"><p class="kicker">Thèmes</p><div style="display:flex;flex-wrap:wrap;gap:6px">' + m.themes.map(themeChip).join('') + '</div></div>' +
      '</aside></div>' +
      // Messages liés
      '<div style="margin-top:clamp(56px,7vw,96px)"><div class="rail-head"><div><p class="kicker">À écouter ensuite</p><h2 class="h3" style="font-size:clamp(1.8rem,3vw,2.6rem);text-transform:uppercase;font-stretch:75%;font-variation-settings:\'wdth\' 75">Sur le même thème</h2></div><a class="link-arrow" href="messages/">Tous les messages →</a></div>' +
      '<div class="mgrid">' + related.map(mcard).join('') + '</div></div>' +
      '</div></section>';
  }
  function setupMessage(N) {
    var $ = N.$, $$ = N.$$;
    var tabs = $$('.tab');
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); $('#' + x.getAttribute('aria-controls')).hidden = !on; });
      });
    });
    $('#screenPlay').addEventListener('click', function () {
      var s = $('#screen'), n = s.querySelector('.screen-note');
      if (!n) { n = document.createElement('p'); n.className = 'screen-note'; s.appendChild(n); }
      n.textContent = 'Sur le site final, la vidéo YouTube du culte se lance ici (lecteur youtube-nocookie, sans quitter la page).';
    });
    $('#aShare').addEventListener('click', function () { share(document.title, location.href); });
    $('#aDl').addEventListener('click', function () { N.toast('Sur le site final, ce bouton télécharge le fichier audio du message.'); });
    if (location.hash === '#ecouter') setTimeout(function () { N.scrollTo($('#player'), -100); }, 400);
  }

  /* ═════════════ VUE : AGENDA ═════════════ */
  var NOW = Date.now();
  function evStart(e) { return d(e.start).getTime(); }
  function minPrice(e) { if (!e.types) return null; var ps = e.types.map(function (t) { return t.p; }); return Math.min.apply(null, ps); }
  function remaining(t) { return Math.max(0, t.cap - t.sold); }
  function evTags(e) {
    var tags = '<span class="etag">' + EVTYPES[e.type] + '</span>';
    if (e.mode === 'billet') tags += minPrice(e) === 0 ? '<span class="etag t-libre">Gratuit · sur réservation</span>' : '<span class="etag t-billet">Billetterie · dès ' + money(minPrice(e)) + '</span>';
    if (e.mode === 'inscription') tags += '<span class="etag t-inscr">Inscription · ' + (e.cap - e.taken) + ' places</span>';
    if (e.mode === 'libre') tags += '<span class="etag t-libre">Entrée libre</span>';
    var days = Math.ceil((evStart(e) - NOW) / 86400e3);
    if (days >= 0 && days <= 30) tags += '<span class="etag" style="background:var(--rubis);color:var(--ivoire)">' + (days === 0 ? 'Aujourd\'hui' : days === 1 ? 'Demain' : 'Dans ' + days + ' j') + '</span>';
    return '<div class="etags">' + tags + '</div>';
  }
  function capBar(e) {
    if (e.mode === 'billet') { var cap = 0, sold = 0; e.types.forEach(function (t) { cap += t.cap; sold += t.sold; }); return '<div class="cap"><span>' + num(cap - sold) + ' places restantes sur ' + num(cap) + '</span><div class="cap-bar"><span style="width:' + Math.round(sold / cap * 100) + '%"></span></div></div>'; }
    if (e.mode === 'inscription') return '<div class="cap"><span>' + (e.cap - e.taken) + ' places restantes sur ' + e.cap + '</span><div class="cap-bar"><span style="width:' + Math.round(e.taken / e.cap * 100) + '%"></span></div></div>';
    return '';
  }
  function thumb(e) { return e.img ? '<img src="img/' + e.img + '.webp" alt="" loading="lazy">' : '<div class="art ' + e.art + '"><span class="art-k">' + EVTYPES[e.type] + '</span><span class="art-n">' + esc(e.t) + '</span><span class="art-r"></span></div>'; }
  function evLink(e) { return 'evenements/' + e.slug + '/'; }
  function erow(e) {
    var x = d(e.start);
    var price = e.mode === 'billet' ? money(minPrice(e)) : e.mode === 'inscription' ? 'Gratuit' : 'Entrée libre';
    return '<li><a class="erow reveal" href="' + evLink(e) + '"><div class="edate"><span>' + x.toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' }).replace('.', '') + '</span><b>' + x.getUTCDate() + '</b><i>' + x.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' }) + '</i></div>' +
      '<div class="ethumb">' + thumb(e) + '</div>' +
      '<div class="einfo">' + evTags(e) + '<h3>' + esc(e.t) + (e.vol ? ' <span style="color:var(--bordeaux)">· ' + esc(e.vol) + '</span>' : '') + '</h3><p class="meta"><span>' + I.clock + ftime(e.start) + ' — ' + ftime(e.end) + '</span><span>' + I.pin + 'Cocody-Bonoumin</span></p>' + capBar(e) + '</div>' +
      '<div class="ego"><span class="price">' + price + '</span><span class="btn btn-ivoire btn-sm">' + (e.mode === 'billet' ? 'Obtenir mon ticket' : e.mode === 'inscription' ? 'Je m\'inscris' : 'Voir') + '</span></div></a></li>';
  }
  function renderAgenda() {
    var up = EVENTS.filter(function (e) { return evStart(e) >= NOW; });
    var billets = up.filter(function (e) { return e.mode === 'billet'; });
    host.innerHTML = phero('Agenda', 'Ce qui se passe<br><em class="serif">à NWC.</em>', 'Cultes, concerts, formations, galas : tout le programme de l\'église, avec la billetterie et les inscriptions au même endroit.',
      [[up.length, 'à venir'], [billets.length, 'billetteries ouvertes'], ['487', 'photos des derniers événements']]) +
      '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap">' +
      '<div class="weekly"><div class="wcard ilot reveal"><span class="mono">Chaque dimanche</span><b>Culte · 13h00 — 15h00</b><span data-next-service>—</span></div>' +
      '<div class="wcard reveal"><span class="mono">En semaine</span><b>Cellules de maison</b><span>Dans ta commune, en petit groupe.</span></div>' +
      '<div class="wcard reveal"><span class="mono">En ligne</span><b>Direct sur YouTube</b><span>Le culte en direct chaque dimanche.</span></div></div>' +
      '<div class="atabs"><div class="seg2" role="tablist" aria-label="Période">' +
      [['avenir', 'À venir', up.length], ['billetterie', 'Billetterie', billets.length], ['passes', 'Passés', PAST.length]].map(function (t, i) {
        return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (i ? 'false' : 'true') + '">' + t[1] + ' <span class="mono">' + t[2] + '</span></button>';
      }).join('') + '</div>' +
      '<div class="seg2" aria-label="Affichage"><button type="button" data-v="liste" aria-pressed="true">Liste</button><button type="button" data-v="cal" aria-pressed="false">Calendrier</button></div></div>' +
      '<div class="chiprow" id="etypes" style="margin-bottom:18px"><button class="chip" type="button" data-type="" aria-pressed="true">Tous les types</button>' +
      ['culte', 'priere', 'concert', 'formation', 'autre'].map(function (t) { return '<button class="chip" type="button" data-type="' + t + '" aria-pressed="false">' + EVTYPES[t] + '</button>'; }).join('') + '</div>' +
      '<div id="agendaBody"></div>' +
      '</div></section>';
  }
  function setupAgenda(N) {
    var $ = N.$, $$ = N.$$;
    var st = { tab: qs('onglet') === 'billetterie' ? 'billetterie' : qs('onglet') === 'passes' ? 'passes' : 'avenir', v: 'liste', type: '', month: new Date(Date.UTC(2026, 10, 1)) };
    var nowD = new Date(NOW); st.month = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth(), 1));
    function draw() {
      $$('[data-tab]').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === st.tab ? 'true' : 'false'); });
      $$('[data-v]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.v === st.v ? 'true' : 'false'); });
      $$('#etypes .chip').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.type === st.type ? 'true' : 'false'); });
      $('#etypes').hidden = st.tab === 'passes';
      var box = $('#agendaBody');
      if (st.tab === 'passes') {
        box.innerHTML = '<div class="pgrid">' + PAST.map(function (p) { return '<a class="pcard reveal" href="galerie/?event=' + p.ev + '"><img src="img/' + p.img + '.webp" alt="" loading="lazy"><span class="mono">' + esc(p.when) + '</span><h3>' + esc(p.t) + '</h3><span class="link-arrow" style="color:var(--ivoire)">Revivre en photos · ' + esc(p.media) + ' →</span></a>'; }).join('') + '</div>';
        return;
      }
      var list = EVENTS.filter(function (e) { return evStart(e) >= NOW && (!st.type || e.type === st.type) && (st.tab !== 'billetterie' || e.mode === 'billet'); });
      if (st.v === 'cal') { box.innerHTML = calendar(list); bindCal(); return; }
      if (!list.length) { box.innerHTML = '<div class="empty"><b>Rien de prévu pour ce filtre</b><span>Essaie un autre type d\'événement.</span></div>'; return; }
      var f = list[0], rest = list.slice(1);
      box.innerHTML = '<a class="efeature reveal" href="' + evLink(f) + '"><div class="efeature-img">' + thumb(f) + '</div><div class="efeature-body ilot">' +
        evTags(f) + '<h2 class="efeature-title">' + esc(f.t) + (f.vol ? '<br><em class="serif">' + esc(f.vol) + '</em>' : '') + '</h2>' +
        '<p class="meta"><span>' + I.cal + fdate(f.start, { weekday: 'long', day: 'numeric', month: 'long' }) + '</span><span>' + I.clock + ftime(f.start) + '</span><span>' + I.pin + 'Cocody-Bonoumin</span></p>' +
        '<p style="margin:0;color:var(--muted)">' + esc(f.desc) + '</p>' + capBar(f) +
        '<span class="btn btn-ivoire" style="justify-self:start"><span class="btn-txt" data-txt="Voir l\'événement">Voir l\'événement</span><span class="btn-ico" aria-hidden="true">' + I.arrow + '</span></span></div></a>' +
        (rest.length ? '<ul class="elist">' + rest.map(erow).join('') + '</ul>' : '');
      opt(box);
    }
    function calendar(list) {
      var y = st.month.getUTCFullYear(), mo = st.month.getUTCMonth();
      var first = new Date(Date.UTC(y, mo, 1)), startDow = (first.getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      var label = first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      var today = new Date(NOW), tkey = today.toISOString().slice(0, 10);
      var cells = '';
      for (var i = 0; i < startDow; i++) cells += '<div class="cal-day is-out"></div>';
      for (var dd = 1; dd <= days; dd++) {
        var key = y + '-' + String(mo + 1).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
        var dow = new Date(Date.UTC(y, mo, dd)).getUTCDay();
        var evs = list.filter(function (e) { return e.start.slice(0, 10) === key; });
        var html = '';
        if (dow === 0) html += '<a class="cal-ev is-weekly" href="./#visite">Culte 13h</a>';
        evs.forEach(function (e) { html += '<a class="cal-ev' + (e.mode === 'billet' ? ' is-billet' : '') + '" href="' + evLink(e) + '" title="' + esc(e.t) + '">' + esc(e.t) + '</a>'; });
        cells += '<div class="cal-day' + (key === tkey ? ' is-today' : '') + (dow === 0 ? ' is-sun' : '') + '"><span>' + dd + '</span>' + html + '</div>';
      }
      return '<div class="cal reveal"><div class="cal-head"><button class="rbtn" type="button" data-m="-1" aria-label="Mois précédent">' + I.left + '</button><h3>' + label + '</h3><button class="rbtn" type="button" data-m="1" aria-label="Mois suivant">' + I.right + '</button></div>' +
        '<div class="cal-grid">' + ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map(function (x) { return '<div class="cal-dow">' + x + '</div>'; }).join('') + cells + '</div></div>';
    }
    function bindCal() { $$('[data-m]').forEach(function (b) { b.addEventListener('click', function () { st.month = new Date(Date.UTC(st.month.getUTCFullYear(), st.month.getUTCMonth() + +b.dataset.m, 1)); draw(); }); }); }
    $$('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { st.tab = b.dataset.tab; draw(); }); });
    $$('[data-v]').forEach(function (b) { b.addEventListener('click', function () { st.v = b.dataset.v; draw(); }); });
    $$('#etypes .chip').forEach(function (b) { b.addEventListener('click', function () { st.type = b.dataset.type; draw(); }); });
    draw();
  }

  /* ═════════════ VUE : ÉVÉNEMENT ═════════════ */
  var EV = null;
  function renderEvent() {
    EV = EVENTS.filter(function (e) { return e.slug === slug; })[0] || EVENTS[0];
    var e = EV;
    document.title = e.t + ' · Agenda · New Wine Church';
    var bg = e.img ? '<img class="ehero-bg" src="img/' + e.img + '.webp" alt="">' : '<div class="ehero-bg art ' + e.art + '" style="position:absolute"></div>';
    var cta = e.mode === 'billet' ? '<button class="btn btn-ivoire magnetic" type="button" data-open-buy><span class="btn-txt" data-txt="Obtenir mon ticket">Obtenir mon ticket</span><span class="btn-ico" aria-hidden="true">' + I.ticket + '</span></button>'
      : e.mode === 'inscription' ? '<button class="btn btn-ivoire magnetic" type="button" data-open-reg><span class="btn-txt" data-txt="Je m\'inscris">Je m\'inscris</span><span class="btn-ico" aria-hidden="true">' + I.arrow + '</span></button>'
        : '<button class="btn btn-ivoire" type="button" data-ics><span class="btn-txt" data-txt="Ajouter à mon agenda">Ajouter à mon agenda</span><span class="btn-ico" aria-hidden="true">' + I.cal + '</span></button>';
    var side;
    if (e.mode === 'billet') {
      var allOut = e.types.every(function (t) { return remaining(t) === 0; });
      side = '<div class="tbox"><div class="tbox-head"><span>' + (minPrice(e) === 0 ? 'Entrée gratuite sur réservation' : 'Billetterie ouverte') + '</span><b>' + (minPrice(e) === 0 ? 'Gratuit' : 'Dès ' + money(minPrice(e))) + '</b><span>' + e.maxEmail + ' billets maximum par adresse e-mail' + (e.selfie ? ' · selfie demandé' : '') + '</span></div><div class="tbox-body">' +
        e.types.map(function (t) {
          var r = remaining(t), low = r > 0 && r < 10;
          return '<div class="ttype' + (r ? '' : ' is-soldout') + '"><b><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + t.c + ';margin-right:8px"></i>' + esc(t.n) + '</b><span class="price">' + (r ? money(t.p) : 'Épuisé') + '</span><p>' + esc(t.d) + '</p>' +
            '<div class="cap"><span>' + (r ? (low ? 'Plus que ' + r + ' !' : num(r) + ' places restantes') : 'Plus de places') + '</span><div class="cap-bar"><span style="width:' + Math.round(t.sold / t.cap * 100) + '%"></span></div></div></div>';
        }).join('') +
        (allOut ? '<button class="btn btn-ivoire btn-block" type="button" data-waitlist>Rejoindre la liste d\'attente</button>' : '<button class="btn btn-bordeaux btn-block" type="button" data-open-buy>Obtenir mon ticket</button>') +
        '<p class="tbox-foot">Paiement Orange Money, MTN MoMo ou Wave · billet par e-mail et WhatsApp</p></div></div>';
    } else if (e.mode === 'inscription') {
      side = '<div class="tbox"><div class="tbox-head"><span>Inscription obligatoire</span><b>Gratuit</b><span>' + (e.cap - e.taken) + ' places restantes sur ' + e.cap + '</span></div><div class="tbox-body">' + capBar(e) +
        '<ol class="prog" style="margin:4px 0"><li style="grid-template-columns:32px 1fr;padding:10px 0"><time style="font-size:1.3rem">1</time><span>Tu remplis le formulaire</span></li><li style="grid-template-columns:32px 1fr;padding:10px 0"><time style="font-size:1.3rem">2</time><span>Tu choisis ton mont</span></li><li style="grid-template-columns:32px 1fr;padding:10px 0"><time style="font-size:1.3rem">3</time><span>Tu reçois ton ticket gratuit</span></li></ol>' +
        '<button class="btn btn-bordeaux btn-block" type="button" data-open-reg>Je m\'inscris</button></div></div>';
    } else {
      side = '<div class="tbox"><div class="tbox-head"><span>Pas besoin de billet</span><b>Entrée libre</b><span>Viens comme tu es, avec qui tu veux.</span></div><div class="tbox-body">' +
        '<button class="btn btn-bordeaux btn-block" type="button" data-ics>Ajouter à mon agenda</button><button class="btn btn-ghost btn-block" type="button" data-share>Inviter un ami</button></div></div>';
    }
    host.innerHTML = '<section class="ehero">' + bg + '<div class="wrap ehero-inner">' + crumbs([['Agenda', 'evenements/'], [e.t]]) +
      '<div class="etags"><span class="etag" style="background:var(--rubis);color:var(--ivoire)">' + EVTYPES[e.type] + '</span>' + (e.vol ? '<span class="etag" style="background:rgba(245,237,225,.16);color:var(--ivoire)">' + esc(e.vol) + '</span>' : '') + '</div>' +
      '<h1 class="ehero-title display">' + esc(e.t) + '</h1>' +
      '<ul class="ehero-facts"><li>' + I.cal + fdate(e.start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '</li><li>' + I.clock + ftime(e.start) + ' — ' + ftime(e.end) + '</li><li>' + I.pin + LIEU + '</li></ul>' +
      '<div class="ehero-row"><div class="ecount" id="ecount" aria-label="Compte à rebours"><div><b id="ecD">0</b><small>jours</small></div><div><b id="ecH">00</b><small>heures</small></div><div><b id="ecM">00</b><small>min</small></div><div><b id="ecS">00</b><small>sec</small></div></div>' +
      '<div class="row-btns">' + cta + '<button class="btn btn-ghost" type="button" data-share style="--fg:var(--ivoire);border-color:rgba(245,237,225,.3)">' + I.share + ' Partager</button></div></div></div></section>' +
      '<section class="light" style="padding-block:clamp(56px,7vw,100px)"><div class="wrap egrid"><div style="min-width:0">' +
      '<div class="esec reveal"><p class="kicker">À propos</p><h2>L\'événement</h2><div class="prose"><p>' + esc(e.desc) + '</p></div></div>' +
      '<div class="esec reveal"><p class="kicker">Programme</p><h2>Le déroulé</h2><ol class="prog">' + e.prog.map(function (p) { return '<li><time>' + p[0] + '</time><div><b>' + esc(p[1]) + '</b><span>' + esc(p[2]) + '</span></div></li>'; }).join('') + '</ol></div>' +
      '<div class="esec reveal"><p class="kicker">Infos pratiques</p><h2>Avant de venir</h2><div class="infos">' + e.infos.map(function (x) { return '<div class="info"><span class="label">' + esc(x[0]) + '</span><p><b>' + esc(x[1]) + '</b></p></div>'; }).join('') +
      '<div class="info" style="grid-column:1/-1"><span class="label">Lieu</span><p><b>' + LIEU + '</b><br>' + ADR + '</p><a class="link-arrow" href="https://www.google.com/maps/search/?api=1&amp;query=Abidjan+Mall+Bonoumin+Cocody" target="_blank" rel="noopener">Ouvrir l\'itinéraire ↗</a></div></div></div>' +
      '</div><aside>' + side + '</aside></div></section>' +
      (e.gallery ? '<section class="sable erevive"><div class="wrap"><div class="rail-head"><div><p class="kicker">Médiathèque · ' + e.media + ' médias</p><h2 class="h2 display">' + esc(e.galleryT) + '</h2></div><a class="link-arrow" href="galerie/?event=' + e.galleryEv + '">Ouvrir dans la médiathèque →</a></div>' +
        '<div class="emosaic">' + e.gallery.map(function (g, i) {
          // Dernière tuile : renvoi vers la médiathèque complète
          if (i === e.gallery.length - 1) return '<a class="emosaic-more" href="galerie/?event=' + e.galleryEv + '"><img src="img/' + g + '.webp" alt="" loading="lazy"><span><b>+' + (e.media - e.gallery.length + 1) + '</b>médias à revoir</span></a>';
          return '<button type="button" data-g="' + i + '" aria-label="Agrandir la photo ' + (i + 1) + '"><img src="img/' + g + '.webp" alt="" loading="lazy"></button>';
        }).join('') + '</div></div></section>' : '') +
      (e.mode !== 'libre' ? '<div class="buybar" id="buybar"><div><small>' + (e.mode === 'billet' ? (minPrice(e) === 0 ? 'Entrée gratuite' : 'À partir de') : 'Inscription gratuite') + '</small><b>' + (e.mode === 'billet' ? money(minPrice(e)) : (e.cap - e.taken) + ' places') + '</b></div><button class="btn btn-bordeaux btn-sm" type="button" ' + (e.mode === 'billet' ? 'data-open-buy>Obtenir mon ticket' : 'data-open-reg>Je m\'inscris') + '</button></div>' : '');
    if (e.mode !== 'libre') body.classList.add('has-buybar');
    // Tiroirs propres à la page (branchés par site.js : fermeture, Échap, focus)
    document.body.insertAdjacentHTML('beforeend', e.mode === 'billet' ? buyDrawer(e) : e.mode === 'inscription' ? regDrawer(e) : '');
  }

  function drawerShell(id, title, inner) {
    return '<div class="drawer" id="' + id + '" role="dialog" aria-modal="true" aria-labelledby="' + id + 'T" hidden><div class="drawer-scrim" data-close></div><div class="drawer-panel">' +
      '<button class="drawer-close" type="button" data-close aria-label="Fermer">' + I.close + '</button><div class="drawer-body">' + title + inner + '</div></div></div>';
  }
  function buyDrawer(e) {
    var steps = ['Billets', 'Tes infos', e.types.every(function (t) { return t.p === 0; }) ? 'Confirmation' : 'Paiement'];
    return drawerShell('buyDrawer', '<p class="kicker kicker-dark">' + esc(e.t) + (e.vol ? ' · ' + esc(e.vol) : '') + '</p><h2 class="drawer-title" id="buyDrawerT">Obtenir mon ticket</h2>' +
      '<ol class="steps" id="bSteps">' + steps.map(function (s, i) { return '<li' + (i ? '' : ' class="is-on"') + '>' + s + '</li>'; }).join('') + '</ol>',
      // Étape 1 — billets
      '<div data-step="1" style="display:grid;gap:10px">' + e.types.map(function (t, i) {
        var r = remaining(t);
        return '<div class="qty"><b><i style="display:inline-block;width:10px;height:10px;border-radius:3px;background:' + t.c + ';margin-right:8px"></i>' + esc(t.n) + ' · ' + (r ? money(t.p) : 'Épuisé') + '</b><small>' + esc(t.d) + (r && r < 10 ? ' · Plus que ' + r : '') + '</small>' +
          '<div class="stepper"><button type="button" data-q="' + i + '" data-d="-1" aria-label="Retirer un billet ' + esc(t.n) + '">−</button><output id="q' + i + '">0</output><button type="button" data-q="' + i + '" data-d="1" aria-label="Ajouter un billet ' + esc(t.n) + '"' + (r ? '' : ' disabled') + '>+</button></div></div>';
      }).join('') +
      '<p class="drawer-hint" style="text-align:left">' + e.maxEmail + ' billets maximum par adresse e-mail.</p>' +
      '<div class="total"><span>Total</span><b id="bTotal">0 FCFA</b></div><p class="field-err" id="bQtyErr" hidden>Choisis au moins un billet.</p>' +
      '<button class="btn btn-bordeaux btn-block" type="button" id="bNext1">Continuer</button></div>' +
      // Étape 2 — infos
      '<form data-step="2" hidden novalidate style="display:grid;gap:12px" id="bForm">' +
      '<div class="field"><label for="bFirst">Prénom</label><input id="bFirst" autocomplete="given-name"><p class="field-err" hidden>Lettres uniquement, 80 caractères maximum.</p></div>' +
      '<div class="field"><label for="bLast">Nom</label><input id="bLast" autocomplete="family-name"><p class="field-err" hidden>Lettres uniquement, 80 caractères maximum.</p></div>' +
      '<div class="field"><label for="bEmail">E-mail</label><input id="bEmail" type="email" autocomplete="email" placeholder="ton@email.com"><p class="field-err" hidden>Entre une adresse e-mail valide : ton billet y sera envoyé.</p></div>' +
      '<div class="field"><label for="bPhone">Téléphone (WhatsApp)</label><input id="bPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="07 00 00 00 00"><p class="field-err" hidden>Entre un numéro valide (8 chiffres minimum).</p></div>' +
      '<div class="field" id="bGuests" hidden><label>Noms des invités <small>(facultatif)</small></label><div id="bGuestList" style="display:grid;gap:8px"></div></div>' +
      (e.selfie ? '<div class="field"><label for="bSelfie">Ton selfie <small>(obligatoire pour ce gala, 5 Mo max)</small></label><input id="bSelfie" type="file" accept="image/jpeg,image/png,image/webp"><p class="field-err" hidden>Ajoute un selfie (jpg, png ou webp, 5 Mo maximum).</p></div>' : '') +
      '<label style="display:flex;gap:10px;align-items:flex-start;font-size:.94rem"><input type="checkbox" id="bWa" checked style="margin-top:4px">Recevoir aussi mon billet sur WhatsApp</label>' +
      '<button class="btn btn-bordeaux btn-block" type="submit" id="bNext2">Continuer</button><button class="btn-text" type="button" data-back="1">Modifier mes billets</button></form>' +
      // Étape 3 (gratuit) — confirmation. Pour un billet payant, la commande est
      // réservée 24 h et le paiement se fait sur la page « Ma commande ».
      '<div data-step="4" hidden style="display:grid;gap:14px" id="bDone"></div>');
  }
  function regDrawer(e) {
    return drawerShell('regDrawer', '<p class="kicker kicker-dark">' + esc(e.t) + (e.vol ? ' · ' + esc(e.vol) : '') + '</p><h2 class="drawer-title" id="regDrawerT">Je m\'inscris</h2>' +
      '<ol class="steps" id="rSteps"><li class="is-on">Inscription</li><li>Ton mont</li><li>Ton ticket</li></ol>',
      '<form data-rstep="1" novalidate style="display:grid;gap:12px" id="rForm">' +
      '<div class="field"><label for="rFirst">Prénom</label><input id="rFirst" autocomplete="given-name"><p class="field-err" hidden>Lettres uniquement, 80 caractères maximum.</p></div>' +
      '<div class="field"><label for="rLast">Nom</label><input id="rLast" autocomplete="family-name"><p class="field-err" hidden>Lettres uniquement, 80 caractères maximum.</p></div>' +
      '<div class="field"><label for="rEmail">E-mail</label><input id="rEmail" type="email" autocomplete="email"></div>' +
      '<div class="field"><label for="rPhone">Téléphone (WhatsApp)</label><input id="rPhone" type="tel" inputmode="tel" autocomplete="tel"><p class="field-err" hidden>Il faut au moins un e-mail ou un téléphone valide pour t\'envoyer ton ticket.</p></div>' +
      '<div class="field"><label for="rCommune">Ta commune</label><select id="rCommune" class="select" style="width:100%;height:3rem;border-radius:14px;border-color:var(--modal-line)"><option value="">Choisir…</option>' + COMMUNES.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div>' +
      '<div class="field"><label for="rQuartier">Ton quartier <small>(facultatif)</small></label><input id="rQuartier" maxlength="120" placeholder="Ex. Riviera 3"></div>' +
      '<button class="btn btn-bordeaux btn-block" type="submit">Continuer</button></form>' +
      '<div data-rstep="2" hidden style="display:grid;gap:12px"><p class="drawer-lead">Choisis le mont qui te ressemble. Tu rejoindras sa famille à la fin de l\'Académie.</p>' +
      '<div style="display:grid;gap:8px" role="radiogroup" aria-label="Les 7 monts">' + MONTS.map(function (m, i) {
        return '<label class="payopt" style="--op:var(--bordeaux)"><input type="radio" name="rMont" value="' + m[0] + '"' + (i === 5 ? ' checked' : '') + '><span style="grid-template-columns:auto 1fr;justify-items:start;text-align:left"><i style="background:var(--bordeaux)">' + m[1].slice(0, 2).toUpperCase() + '</i><span style="display:grid;gap:2px">Mont ' + m[1] + '<small style="color:var(--modal-muted);font-weight:500">' + m[2] + '</small></span></span></label>';
      }).join('') + '</div><button class="btn btn-bordeaux btn-block" type="button" id="rConfirm">Confirmer et recevoir mon ticket</button><button class="btn-text" type="button" data-rback="1">Modifier mes informations</button></div>' +
      '<div data-rstep="3" hidden style="display:grid;gap:14px" id="rDone"></div>');
  }

  // Validation calquée sur les règles serveur actuelles
  var reName = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{1,80}$/, reMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, rePhone = /^\+?[0-9\s().-]{8,30}$/;
  function fieldErr(input, bad) { var p = input.parentNode.querySelector('.field-err'); if (p) p.hidden = !bad; if (bad) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); return bad; }

  function setupEvent(N) {
    var $ = N.$, $$ = N.$$, e = EV;
    // Compte à rebours
    var t0 = evStart(e);
    function tick() {
      var diff = Math.max(0, t0 - Date.now()), D = Math.floor(diff / 86400e3), H = Math.floor(diff / 3600e3) % 24, Mi = Math.floor(diff / 60e3) % 60, S = Math.floor(diff / 1e3) % 60;
      $('#ecD').textContent = D; $('#ecH').textContent = N.pad(H); $('#ecM').textContent = N.pad(Mi); $('#ecS').textContent = N.pad(S);
    }
    tick(); setInterval(tick, 1000);
    $$('[data-share]').forEach(function (b) { b.addEventListener('click', function () { share(e.t + ' · New Wine Church', location.href); }); });
    $$('[data-ics]').forEach(function (b) { b.addEventListener('click', function () { ics(e); }); });
    $$('[data-g]').forEach(function (b) { b.addEventListener('click', function () { N.lightbox(e.gallery.map(function (g) { return { src: 'img/' + g + '.webp', cap: e.galleryT }; }), +b.dataset.g); }); });
    $$('[data-waitlist]').forEach(function (b) { b.addEventListener('click', function () { N.toast('Tu es sur la liste d\'attente, position n° 7. On te prévient dès qu\'une place se libère.'); }); });
    if (e.mode === 'billet') setupBuy(N, e);
    if (e.mode === 'inscription') setupReg(N, e);
  }

  function setupBuy(N, e) {
    var $ = N.$, $$ = N.$$, dr = $('#buyDrawer'), q = e.types.map(function () { return 0; });
    var free = e.types.every(function (t) { return t.p === 0; });
    function total() { return q.reduce(function (s, n, i) { return s + n * e.types[i].p; }, 0); }
    function count() { return q.reduce(function (s, n) { return s + n; }, 0); }
    function capFor(i) { var t = e.types[i]; return Math.min(t.max, remaining(t), e.maxEmail - (count() - q[i])); }
    function refreshQty() {
      q.forEach(function (n, i) {
        $('#q' + i).textContent = n;
        dr.querySelector('[data-q="' + i + '"][data-d="-1"]').disabled = n <= 0;
        dr.querySelector('[data-q="' + i + '"][data-d="1"]').disabled = n >= capFor(i);
      });
      $('#bTotal').textContent = total() ? money(total()) : (count() ? 'Gratuit' : '0 FCFA');
    }
    function go(n) {
      $$('[data-step]', dr).forEach(function (s) { s.hidden = +s.dataset.step !== n; });
      var idx = free && n === 4 ? 2 : n - 1;
      $$('#bSteps li', dr).forEach(function (li, i) { li.className = i < idx ? 'is-done' : i === idx ? 'is-on' : ''; });
      dr.querySelector('.drawer-panel').scrollTop = 0;
    }
    $$('[data-open-buy]').forEach(function (b) { b.addEventListener('click', function () { go(1); refreshQty(); N.openDrawer(dr); }); });
    $$('[data-q]', dr).forEach(function (b) { b.addEventListener('click', function () { var i = +b.dataset.q; q[i] = Math.max(0, Math.min(capFor(i), q[i] + +b.dataset.d)); refreshQty(); $('#bQtyErr').hidden = true; }); });
    $('#bNext1').addEventListener('click', function () {
      if (!count()) { $('#bQtyErr').hidden = false; return; }
      var g = $('#bGuestList'), n = count() - 1;
      $('#bGuests').hidden = n < 1;
      g.innerHTML = Array.apply(null, Array(Math.min(9, n))).map(function (_, i) { return '<input aria-label="Nom de l\'invité ' + (i + 1) + '" placeholder="Invité ' + (i + 1) + '">'; }).join('');
      $('#bNext2').textContent = free ? 'Recevoir mes billets' : 'Réserver et payer';
      go(2);
    });
    $$('[data-back]', dr).forEach(function (b) { b.addEventListener('click', function () { go(+b.dataset.back); }); });
    $('#bForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var bad = false;
      bad = fieldErr($('#bFirst'), !reName.test($('#bFirst').value.trim())) || bad;
      bad = fieldErr($('#bLast'), !reName.test($('#bLast').value.trim())) || bad;
      bad = fieldErr($('#bEmail'), !reMail.test($('#bEmail').value.trim())) || bad;
      bad = fieldErr($('#bPhone'), !rePhone.test($('#bPhone').value.trim())) || bad;
      var sf = $('#bSelfie');
      if (sf) bad = fieldErr(sf, !sf.files.length || sf.files[0].size > 5 * 1048576) || bad;
      if (bad) { var f = dr.querySelector('[aria-invalid="true"]'); if (f) f.focus(); return; }
      if (free) { done(); return; }
      // Billet payant : commande réservée 24 h → page « Ma commande » (paiement Mobile Money)
      var p = new URLSearchParams({ e: e.slug, q: q.join('.'), m: $('#bEmail').value.trim(), n: $('#bFirst').value.trim() });
      location.href = 'ma-commande/?' + p.toString();
    });
    function done() {
      var email = $('#bEmail').value.trim(), lines = q.map(function (n, i) { return n ? '<li><span>' + n + ' × ' + esc(e.types[i].n) + '</span><b>' + money(n * e.types[i].p) + '</b></li>' : ''; }).join('');
      $('#bDone').innerHTML = '<div class="done-badge" aria-hidden="true">' + I.check + '</div><h3 class="drawer-title" style="font-size:2.2rem">C\'est fait !</h3><p class="drawer-lead">Tes billets ont été envoyés à <b>' + esc(email) + '</b>' + ($('#bWa').checked ? ' et sur WhatsApp' : '') + '. Montre le QR code à l\'entrée.</p>' +
        '<ul class="recap"><li><span>Commande</span><b class="mono">NWC-8F3K2Q</b></li>' + lines + '<li><span>Total</span><b>Gratuit</b></li></ul>' +
        '<a class="btn btn-bordeaux btn-block" href="mon-ticket/">Voir mon ticket</a>';
      go(4);
    }
  }

  function setupReg(N, e) {
    var $ = N.$, $$ = N.$$, dr = $('#regDrawer');
    function go(n) {
      $$('[data-rstep]', dr).forEach(function (s) { s.hidden = +s.dataset.rstep !== n; });
      $$('#rSteps li', dr).forEach(function (li, i) { li.className = i < n - 1 ? 'is-done' : i === n - 1 ? 'is-on' : ''; });
      dr.querySelector('.drawer-panel').scrollTop = 0;
    }
    $$('[data-open-reg]').forEach(function (b) { b.addEventListener('click', function () { go(1); N.openDrawer(dr); }); });
    $$('[data-rback]', dr).forEach(function (b) { b.addEventListener('click', function () { go(+b.dataset.rback); }); });
    $('#rForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var bad = false, mail = $('#rEmail').value.trim(), ph = $('#rPhone').value.trim();
      bad = fieldErr($('#rFirst'), !reName.test($('#rFirst').value.trim())) || bad;
      bad = fieldErr($('#rLast'), !reName.test($('#rLast').value.trim())) || bad;
      bad = fieldErr($('#rPhone'), !(reMail.test(mail) || rePhone.test(ph))) || bad;
      if (bad) { var f = dr.querySelector('[aria-invalid="true"]'); if (f) f.focus(); return; }
      go(2);
    });
    $('#rConfirm').addEventListener('click', function () {
      var v = (dr.querySelector('input[name="rMont"]:checked') || {}).value, m = MONTS.filter(function (x) { return x[0] === v; })[0] || MONTS[5];
      $('#rDone').innerHTML = '<div class="done-badge" aria-hidden="true">' + I.check + '</div><h3 class="drawer-title" style="font-size:2.2rem">Ton ticket t\'attend</h3>' +
        '<p class="drawer-lead">Bienvenue à l\'Académie, ' + esc($('#rFirst').value.trim()) + ' ! Tu as choisi le <b>Mont ' + m[1] + '</b> (' + m[2] + '). Ton ticket gratuit est parti par e-mail : pense à vérifier tes spams.</p>' +
        '<ul class="recap"><li><span>Code de secours</span><b class="mono">AF7-K2M</b></li><li><span>Première séance</span><b>' + fdate(e.start, { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + ftime(e.start) + '</b></li></ul>' +
        '<a class="btn btn-bordeaux btn-block" href="mon-ticket/">Voir mon ticket</a>';
      go(3);
    });
  }

  /* ═════════════ VUE : MON BILLET ═════════════ */
  function renderTicket() {
    var e = EVENTS[0], t = e.types[0];
    host.innerHTML = '<section class="ticket-page sable"><div class="wrap">' + crumbs([['Agenda', 'evenements/'], [e.t, evLink(e)], ['Mon billet']]) +
      '<div class="ticket-wrap"><article class="ticket" id="ticket"><div class="ticket-top"><img src="img/' + e.img + '.webp" alt=""><span class="etag" style="background:var(--or);color:var(--encre);justify-self:start">' + esc(t.n) + ' · ' + money(t.p) + '</span><h1>' + esc(e.t) + ' · ' + esc(e.vol) + '</h1></div>' +
      '<div style="padding:14px 20px 0;display:flex;justify-content:space-between;align-items:center;gap:10px;color:var(--encre)"><span class="status s-ok" id="tStatus">Valide · payé</span><span class="mono" style="font-size:.8rem;color:var(--modal-muted)">N° CYP2-0113</span></div>' +
      '<div class="perf" aria-hidden="true"></div>' +
      '<div class="ticket-qr"><div class="qr" id="qr" role="img" aria-label="QR code du billet"></div><span class="qr-code">K7Q-4MZ</span><span style="font-size:.86rem;color:var(--modal-muted)">Code de secours si le QR ne passe pas</span></div>' +
      '<div class="ticket-grid"><div><span class="label">Date</span><b>' + fdate(e.start, { weekday: 'short', day: 'numeric', month: 'short' }) + '</b></div><div><span class="label">Heure</span><b>' + ftime(e.start) + '</b></div>' +
      '<div><span class="label">Titulaire</span><b>Grâce K. (exemple)</b></div><div><span class="label">Commande</span><b class="mono">NWC-8F3K2Q</b></div>' +
      '<div><span class="label">E-mail</span><b>g•••@gmail.com</b></div><div><span class="label">WhatsApp</span><b>Envoyé ✓</b></div>' +
      '<div style="grid-column:1/-1;border-right:0"><span class="label">Lieu</span><b>' + LIEU + ', ' + ADR + '</b></div></div>' +
      '<div class="ticket-acts"><button class="btn btn-bordeaux btn-sm" type="button" data-ics>Ajouter à l\'agenda</button><a class="btn btn-ghost btn-sm" style="--fg:var(--encre);border-color:var(--modal-line)" href="https://www.google.com/maps/search/?api=1&amp;query=Abidjan+Mall+Bonoumin+Cocody" target="_blank" rel="noopener">Itinéraire ↗</a>' +
      '<button class="btn btn-ghost btn-sm" style="--fg:var(--encre);border-color:var(--modal-line)" type="button" data-share>Partager</button><button class="btn btn-ghost btn-sm" style="--fg:#a3223a;border-color:var(--modal-line)" type="button" id="tCancel">Annuler le ticket</button></div>' +
      '<div id="tConfirm" hidden style="margin:0 16px 16px;padding:14px;border-radius:16px;background:#FBEAEA;color:#7a1a1a;display:grid;gap:10px"><b>Annuler ce ticket ?</b><span style="font-size:.92rem">Ta place sera remise en vente. Cette action est définitive.</span><div style="display:flex;gap:8px"><button class="btn btn-bordeaux btn-sm" type="button" id="tYes">Oui, annuler</button><button class="btn-text" style="margin:0" type="button" id="tNo">Garder mon ticket</button></div></div>' +
      '</article>' +
      '<div class="ticket-side"><p class="kicker">Mon billet</p><h2 class="h2 display" style="font-size:clamp(2.6rem,5vw,4.6rem)">Prêt pour<br><em class="serif">l\'entrée.</em></h2>' +
      '<div class="seg2" aria-label="Aperçu des états (maquette)"><button type="button" data-st="ok" aria-pressed="true">Valide</button><button type="button" data-st="used" aria-pressed="false">Utilisé</button><button type="button" data-st="cancel" aria-pressed="false">Annulé</button></div>' +
      '<div class="tip"><i>' + I.sun + '</i><div><b>Monte la luminosité</b><p>Le scan est plus rapide avec un écran lumineux.</p></div></div>' +
      '<div class="tip"><i>' + I.phone + '</i><div><b>Une capture d\'écran suffit</b><p>Même sans connexion à l\'entrée, le QR code fonctionne.</p></div></div>' +
      '<div class="tip"><i>' + I.clock + '</i><div><b>Arrive 30 min avant</b><p>Ouverture des portes à ' + ftime(e.start) + '.</p></div></div>' +
      '<p style="margin:0;color:var(--muted);font-size:.92rem">Le billet en PDF est aussi joint à l\'e-mail de confirmation.</p></div></div></div></section>';
  }
  function setupTicket(N) {
    var $ = N.$, $$ = N.$$;
    var qr = $('#qr');
    try {
      var code = window.qrcode(0, 'M'); code.addData('NWC|CYP2-0113|K7Q4MZ'); code.make();
      qr.innerHTML = code.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
    } catch (err) { qr.innerHTML = '<span class="mono" style="font-size:1.4rem;color:var(--encre)">K7Q-4MZ</span>'; }
    var states = { ok: ['s-ok', 'Valide · payé'], used: ['s-used', 'Utilisé le ' + fdate(EVENTS[0].start, { day: 'numeric', month: 'short' }) + ' à 16h12'], cancel: ['s-wait', 'Annulé'] };
    function setState(k) {
      var s = $('#tStatus'); s.className = 'status ' + states[k][0]; s.textContent = states[k][1];
      $('#qr').style.opacity = k === 'ok' ? 1 : .25;
      $$('[data-st]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.st === k ? 'true' : 'false'); });
      $('#tCancel').hidden = k !== 'ok';
    }
    $$('[data-st]').forEach(function (b) { b.addEventListener('click', function () { setState(b.dataset.st); }); });
    $('#tCancel').addEventListener('click', function () { $('#tConfirm').hidden = false; });
    $('#tNo').addEventListener('click', function () { $('#tConfirm').hidden = true; });
    $('#tYes').addEventListener('click', function () { $('#tConfirm').hidden = true; setState('cancel'); N.toast('Ticket annulé. Ta place a été remise en vente.'); });
    $$('[data-share]').forEach(function (b) { b.addEventListener('click', function () { share('Mon billet · ' + EVENTS[0].t, location.href); }); });
    $$('[data-ics]').forEach(function (b) { b.addEventListener('click', function () { ics(EVENTS[0]); }); });
  }

  /* ───────── Partage et agenda (.ics) ───────── */
  function share(title, url) {
    if (navigator.share) { navigator.share({ title: title, url: url }).catch(function () { /* annulé */ }); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(function () { window.NWC.toast('Lien copié : colle-le dans WhatsApp.'); }, function () { window.NWC.toast(url); });
    else window.NWC.toast(url);
  }
  function ics(e) {
    var f = function (iso) { return iso.replace(/[-:]/g, '') + '00Z'; };
    var txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//New Wine Church//Maquette//FR', 'BEGIN:VEVENT', 'UID:' + e.slug + '@newinechurch.org',
      'DTSTAMP:' + f(new Date().toISOString().slice(0, 16)), 'DTSTART:' + f(e.start), 'DTEND:' + f(e.end), 'SUMMARY:' + e.t + (e.vol ? ' · ' + e.vol : ''),
      'LOCATION:' + LIEU + ', ' + ADR.replace(/,/g, '\\,'), 'DESCRIPTION:' + e.desc.replace(/,/g, '\\,'), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
    a.download = e.slug + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    window.NWC.toast('Fichier agenda téléchargé : ouvre-le pour ajouter l\'événement.');
  }

  /* ═════════════ Images : version légère quand l'image est affichée petit ═════════════ */
  // Chaque photo existe en version 720 px (img/s/) et chaque photo de médiathèque en 480 px
  // (img/g/s/). On choisit la version légère avant que le navigateur ne lance le chargement.
  function opt(root) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    Array.prototype.forEach.call((root || host).querySelectorAll('img'), function (im) {
      // Paliers : t/ (320 px, vignettes) → s/ (720 px, ou 480 px pour la galerie) → original
      var src = im.getAttribute('src') || '', m = src.match(/^img\/(g\/)?(?:s\/)?([a-z0-9-]+)\.webp$/);
      if (!m || im.hasAttribute('data-hd')) return;
      var b = im.getBoundingClientRect(), w = b.width || (im.parentNode ? im.parentNode.getBoundingClientRect().width : 0);
      if (!w) return;
      // object-fit: cover dans un cadre haut : la largeur utile dépend aussi de la hauteur (photos ~3:2)
      var need = Math.max(w, (b.height || 0) * 1.5) * dpr, tier = need <= 320 ? 't/' : need <= (m[1] ? 480 : 720) ? 's/' : null;
      if (tier) im.setAttribute('src', 'img/' + (m[1] || '') + tier + m[2] + '.webp');
    });
  }

  /* ═════════════ Outils et données partagés avec les vues externes (js/vues/*.js) ═════════════ */
  var P = window.NWCP = {
    esc: esc, d: d, fdate: fdate, ftime: ftime, dur: dur, money: money, num: num, qs: qs, I: I,
    art: art, crumbs: crumbs, phero: phero, mcard: mcard, themeChip: themeChip, share: share, ics: ics,
    drawerShell: drawerShell, fieldErr: fieldErr, reName: reName, reMail: reMail, rePhone: rePhone,
    M: M, SERIES: SERIES, THEMES: THEMES, EVENTS: EVENTS, PAST: PAST, MONTS: MONTS, COMMUNES: COMMUNES, OPS: OPS,
    LIEU: LIEU, ADR: ADR, EVTYPES: EVTYPES, evLink: evLink, erow: erow, evTags: evTags, capBar: capBar, thumb: thumb,
    minPrice: minPrice, remaining: remaining, evStart: evStart, host: host, slug: slug, view: view, opt: opt,
    // Accordéons (FAQ, confession de foi…) : bouton .faq-q relié à son panneau par aria-controls
    faq: function (N) {
      N.$$('.faq-q').forEach(function (b) {
        b.addEventListener('click', function () {
          var open = b.getAttribute('aria-expanded') !== 'true';
          b.setAttribute('aria-expanded', open ? 'true' : 'false');
          document.getElementById(b.getAttribute('aria-controls')).hidden = !open;
        });
      });
    }
  };

  /* ═════════════ Lancement ═════════════ */
  // Les vues des autres pages s'enregistrent dans window.NWCV (fichiers chargés avant celui-ci)
  var EXT = (window.NWCV || {})[view];
  main.className = (EXT && EXT.mainClass) || 'light';
  var R = { messages: renderMessages, message: renderMessage, agenda: renderAgenda, event: renderEvent, ticket: renderTicket };
  var S = { messages: setupMessages, message: setupMessage, agenda: setupAgenda, event: setupEvent, ticket: setupTicket };
  try { if (EXT) EXT.render(P); else (R[view] || renderMessages)(); opt(host); } catch (err) { console.warn('[NWC] rendu « ' + view + ' » :', err); }
  document.addEventListener('DOMContentLoaded', function () {
    var N = window.NWC;
    if (!N || !N.$) return;
    try { if (EXT) { if (EXT.setup) EXT.setup(N, P); } else (S[view] || function () {})(N); } catch (err) { console.warn('[NWC] interactions « ' + view + ' » :', err); }
  });
})();
