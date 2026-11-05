/* ════════════════════════════════════════════════════════════════════
   « La chaîne des monts » — nouveau design des 7 Monts (sans 3D).
   Sept panneaux taillés en sommets (photos réelles des familles devant
   leurs bannières) forment une ligne de crête ; le mont choisi s'élargit.
   Sur mobile : accordéon. Composant partagé : accueil (data-monts="compact")
   et page /monts (data-monts="full"). Monté automatiquement au chargement.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var MONTS = [
    { id: 'ararat', nom: 'Ararat', sphere: 'Le Gouvernement', q: 'Tu rêves d\'être un haut dirigeant ?', ref: 'Genèse 8:4', v: 'L\'arche s\'arrêta sur les montagnes d\'Ararat.', h: 74,
      txt: 'Ceux qui se préparent à diriger : politique, administration, leadership public. Former des dirigeants intègres pour la Côte d\'Ivoire et l\'Afrique.' },
    { id: 'transfiguration', nom: 'Transfiguration', court: 'Art · Sport · Musique', sphere: 'L\'Art, le Sport, la Musique', q: 'Tu aimes l\'art, le sport, la musique ?', ref: 'Matthieu 17:2', v: 'Son visage resplendit comme le soleil.', h: 90,
      txt: 'Artistes, sportifs, musiciens. Faire briller la lumière de Christ sur scène, sur le terrain et dans les studios.' },
    { id: 'oliviers', nom: 'Oliviers', sphere: 'L\'Économie', q: 'Tu souhaites concevoir et appliquer la politique économique des nations ?', ref: 'Actes 1:12', v: 'Ils retournèrent à Jérusalem, de la montagne appelée des oliviers.', h: 66,
      txt: 'Entrepreneurs, financiers, bâtisseurs. Créer de la richesse avec justice et financer la mission.' },
    { id: 'carmel', nom: 'Carmel', sphere: 'Le Média', q: 'Tu es passionné·e par l\'image ?', ref: '1 Rois 18:39', v: 'Quand tout le peuple vit cela, ils dirent : C\'est l\'Éternel qui est Dieu !', h: 84,
      txt: 'Créateurs de contenu, journalistes, vidéastes. Raconter les histoires qui changent les regards.' },
    { id: 'sinai', nom: 'Sinaï', sphere: 'L\'Éducation', q: 'Tu as la passion de transmettre ?', ref: 'Exode 19:20', v: 'L\'Éternel descendit sur la montagne de Sinaï.', h: 100,
      txt: 'Enseignants, étudiants, chercheurs. Transmettre le savoir et former les esprits de demain.' },
    { id: 'hermon', nom: 'Hermon', sphere: 'La Famille', q: 'Tu aimes te sentir en famille ?', ref: 'Psaume 133:3', v: 'C\'est comme la rosée de l\'Hermon… c\'est là que l\'Éternel envoie la bénédiction.', h: 80,
      txt: 'Le cœur de la maison : couples, parents, célibataires. Bâtir des familles solides et accueillantes.' },
    { id: 'morijah', nom: 'Morijah', sphere: 'La Religion', q: 'Tu as à cœur la maison de Dieu ?', ref: '2 Chroniques 3:1', v: 'Salomon commença à bâtir la maison de l\'Éternel sur la montagne de Morija.', h: 70,
      txt: 'Intercesseurs, serviteurs, futurs ministres. Garder le feu de l\'adoration et de la prière au centre.' }
  ];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // Chemin absolu : une URL relative dans une variable CSS serait résolue depuis css/
  function mount(root) {
    var full = root.getAttribute('data-monts') === 'full', open = MONTS.map(function (m) { return m.id; }).indexOf(root.getAttribute('data-open') || 'hermon');
    root.classList.add('chaine'); if (full) root.classList.add('chaine-full');
    root.innerHTML = MONTS.map(function (m, i) {
      return '<article class="pic' + (i === open ? ' is-open' : '') + '" style="--h:' + m.h + '%;--img:url(/maquette/img/' + (full ? '' : 's/') + 'm-' + m.id + '.webp)" data-i="' + i + '">' +
        '<button class="pic-head" type="button" aria-expanded="' + (i === open) + '" aria-controls="pic-' + m.id + '"><span class="pic-name">' + esc(m.nom) + '</span><span class="pic-sphere">' + esc(m.court || m.sphere) + '</span><i aria-hidden="true"></i></button>' +
        '<div class="pic-body" id="pic-' + m.id + '"><p class="pic-k">Mont · ' + esc(m.sphere) + '</p><h3 class="display">' + esc(m.nom) + '</h3>' +
        '<p class="pic-q">« ' + esc(m.q) + ' »</p><p class="pic-txt">' + esc(m.txt) + '</p>' +
        '<div class="pic-foot"><span class="pic-ref">' + esc(m.ref) + '</span><div class="pic-btns">' +
        (full ? '<a class="btn btn-ghost btn-sm" href="monts/#' + m.id + '" data-to="' + m.id + '">En savoir plus</a>' : '<a class="btn btn-ghost btn-sm" href="monts/#' + m.id + '">Découvrir</a>') +
        '<a class="btn btn-ivoire btn-sm" href="rejoindre/?mont=' + m.id + '">Rejoindre</a></div></div></div></article>';
    }).join('');
    var pics = [].slice.call(root.querySelectorAll('.pic')), fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches, tmr;
    function select(i) {
      pics.forEach(function (p, k) { p.classList.toggle('is-open', k === i); p.querySelector('.pic-head').setAttribute('aria-expanded', k === i ? 'true' : 'false'); });
    }
    pics.forEach(function (p, i) {
      p.querySelector('.pic-head').addEventListener('click', function () { select(i); });
      if (fine) {
        p.addEventListener('mouseenter', function () { clearTimeout(tmr); tmr = setTimeout(function () { if (window.innerWidth > 900) select(i); }, 120); });
        p.addEventListener('mouseleave', function () { clearTimeout(tmr); });
      }
    });
  }
  window.NWCMonts = { data: MONTS, mount: mount };
  function init() { [].forEach.call(document.querySelectorAll('[data-monts]'), mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
