/* ════════════════════════════════════════════════════════════════════
   Mise en page commune de la maquette : bandeau « En direct », en-tête,
   menu plein écran, pied de page, barre mobile, tiroir de visite « Viens ce dimanche »,
   visionneuse. Injectée de façon synchrone (avant pages.js et site.js)
   pour que toutes les pages partagent exactement la même navigation.
   Reprend tous les liens du site actuel (Navbar + Footer).
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var ARROW = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var SOC = [
    ['Instagram', 'https://www.instagram.com/new_wine_church1', '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>'],
    ['TikTok', 'https://www.tiktok.com/@newwinechurch2', '<path d="M14 3v11.5a3.5 3.5 0 1 1-3-3.46M14 3c.5 2.5 2.5 4.5 5 5"/>'],
    ['YouTube', 'https://www.youtube.com/@NewWineChurchMD', '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9 5 3-5 3z"/>'],
    ['Facebook', 'https://www.facebook.com/profile.php?id=61574286441065', '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>'],
    ['WhatsApp', 'https://wa.me/2250779169878', '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2 2.5 4 4.5 4.5l1.2-1.2 2 1-.6 1.6c-3.6.4-7.8-3.8-7.4-7.4l1.6-.6 1 2z"/>']
  ];

  var TOP =
    '<div class="grain" aria-hidden="true"></div>' +
    '<div class="cursor" id="cursor" aria-hidden="true"><span class="cursor-label" id="cursorLabel"></span></div>' +
    '<div class="toast" id="toast" role="status" aria-live="polite"></div>' +
    '<a class="livebar" id="liveBar" href="live/" hidden><span class="live-dot is-live"></span><b>En direct</b><span>Le culte a commencé · Regarder maintenant</span>' + ARROW + '</a>' +
    '<header class="nav" id="nav">' +
    '<a class="nav-brand" href="./#top" aria-label="New Wine Church, accueil"><img src="img/logo-nwc-96.png" alt="" width="46" height="46"><span class="nav-brand-txt">New Wine<small>Church · Abidjan</small></span></a>' +
    '<nav class="nav-links" id="navLinks" aria-label="Navigation principale"><span class="nav-blob" id="navBlob" aria-hidden="true"></span>' +
    '<a href="eglise/" data-nav="eglise">L\'église</a><a href="messages/" data-nav="messages">Messages</a><a href="evenements/" data-nav="agenda">Agenda</a>' +
    '<a href="communaute/" data-nav="servir">Servir</a><a href="galerie/" data-nav="mediatheque">Médiathèque</a><a href="blog/" data-nav="blog">Blog</a><a href="donner/" data-nav="donner">Donner</a></nav>' +
    '<div class="nav-right">' +
    '<a class="live-chip" href="live/" id="liveChip"><span class="live-dot"></span><span id="liveChipTxt">Dim. 13h</span></a>' +
    '<button class="nav-icon nav-lang" type="button" id="navLang" aria-label="Changer de langue">FR</button>' +
        '<button class="btn btn-ivoire btn-sm nav-cta" type="button" data-open-visit>Viens ce dimanche</button>' +
    '<button class="nav-burger" id="burger" type="button" aria-expanded="false" aria-controls="menu" aria-label="Ouvrir le menu"><span></span><span></span></button></div></header>' +
    // Menu plein écran
    '<div class="menu" id="menu" hidden><div class="menu-inner"><div>' +
    '<nav class="menu-links" aria-label="Menu">' +
    [['./#top', 'cta-famille', 'Accueil'], ['eglise/', 'fam-orga', 'L\'église'], ['messages/', 'g-message', 'Messages'], ['evenements/', 't-cy-4', 'Agenda'], ['communaute/', 'fam-arts', 'Servir'], ['galerie/', 't-fg-1', 'Médiathèque'], ['blog/', 'g-mag', 'Blog'], ['donner/', 't-sv-1', 'Donner']].map(function (l) {
      return '<a href="' + l[0] + '" data-img="img/' + l[1] + '.webp"><span>' + l[2] + '</span></a>';
    }).join('') + '</nav>' +
    '<nav class="menu-sub" aria-label="Autres pages">' + [['live/', 'En direct'], ['billetterie/', 'Billetterie'], ['monts/', 'Les 7 Monts'], ['contact/', 'Contact & prière'], ['rejoindre/', 'Devenir membre']].map(function (l) { return '<a href="' + l[0] + '">' + l[1] + '</a>'; }).join('') + '</nav></div>' +
    '<div class="menu-preview" aria-hidden="true"><img id="menuPreview" src="img/cta-famille.webp" alt=""></div>' +
    '<div class="menu-foot"><p><span class="label">Culte</span>Dimanche · 13h00 — 15h00</p><p><span class="label">Adresse</span>Cocody-Bonoumin, près d\'Abidjan Mall</p>' +
    '<button class="btn btn-ivoire" type="button" data-open-visit><span class="btn-txt" data-txt="Viens ce dimanche">Viens ce dimanche</span><span class="btn-ico" aria-hidden="true">' + ARROW + '</span></button></div></div></div>';

  var BOTTOM =
    '<footer class="foot"><div class="wrap"><div class="foot-top">' +
    '<div class="foot-brand"><img src="img/logo-nwc-96.png" srcset="img/logo-nwc-96.png 1x, img/logo-nwc-240.png 2.5x" alt="Logo New Wine Church" width="96" height="96"><p>Une armée de jeunes pour Christ.<br>Sauvé pour sauver.</p>' +
    '<div class="foot-icons">' + SOC.map(function (s) { return '<a href="' + s[1] + '" target="_blank" rel="noopener" aria-label="' + s[0] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + s[2] + '</svg></a>'; }).join('') + '</div></div>' +
    '<nav class="foot-col" aria-label="L\'église"><span class="label">L\'église</span><a href="eglise/">Qui sommes-nous</a><a href="monts/">Les 7 Monts</a><a href="communaute/">Communauté</a><a href="galerie/">Médiathèque</a><a href="blog/">Blog</a></nav>' +
    '<nav class="foot-col" aria-label="Participer"><span class="label">Participer</span><a href="./#visite">Venir dimanche</a><a href="messages/">Messages</a><a href="evenements/">Agenda</a><a href="billetterie/">Billetterie</a><a href="live/">En direct</a><a href="donner/">Donner</a></nav>' +
    '<div class="foot-col"><span class="label">Nous trouver</span><p>Cocody-Bonoumin, près d\'Abidjan Mall<br>Abidjan, Côte d\'Ivoire</p><p>Dimanche · 13h00 — 15h00</p><p class="mono">contact@newinechurch.org<br>+225 07 79 16 98 78</p><a href="contact/">Nous écrire</a><a href="nwc/follow/">Suivez-nous</a></div>' +
    '<form class="foot-news" id="newsForm" novalidate><label class="label" for="newsEmail">La lettre du dimanche</label><p>Le programme de la semaine et le résumé du message. Tu confirmes ton inscription par e-mail.</p>' +
    '<div class="ref-row"><input id="newsEmail" type="email" autocomplete="email" placeholder="ton@email.com"><button class="btn btn-ivoire btn-sm" type="submit">S\'inscrire</button></div></form></div>' +
    '<p class="foot-word display" aria-hidden="true">Sauvé pour <em class="serif">sauver</em></p>' +
    '<div class="foot-bottom"><span>© <span id="year">2026</span> New Wine Church · Abidjan</span><span class="foot-md"><img src="img/logo-md-64.png" alt="" width="28" height="30">Maison mère : La Maison de la Destinée</span>' +
    '<span class="foot-legal"><a href="cgu/">Conditions</a><a href="confidentialite/">Confidentialité</a><a href="rejoindre/">Devenir membre</a></span></div></div></footer>' +
    // Barre mobile
    '<nav class="mbar" id="mbar" aria-label="Actions rapides"><button type="button" data-open-visit><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3M17 3v3M4 9h16M5 6h14v14H5z"/></svg>Venir</button>' +
    '<a href="live/"><span class="live-dot"></span>Live</a><a href="donner/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.5-8-11a5 5 0 0 1 8-3.9A5 5 0 0 1 20 10c0 5.5-8 11-8 11z"/></svg>Donner</a></nav>' +
    // Tiroir de visite « Viens ce dimanche » (palette ivoire des modales NWC)
    '<div class="drawer" id="visitDrawer" role="dialog" aria-modal="true" aria-labelledby="visitTitle" hidden><div class="drawer-scrim" data-close></div><div class="drawer-panel">' +
    '<button class="drawer-close" type="button" data-close aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
    '<div class="drawer-body" id="visitStepForm"><p class="kicker kicker-dark">Ta première visite</p><h2 class="drawer-title" id="visitTitle">On te garde une place.</h2>' +
    '<p class="drawer-lead">Dis-nous quand tu viens : quelqu\'un de l\'équipe Accueil t\'écrira la veille sur WhatsApp et te retrouvera à l\'entrée.</p>' +
    '<form id="visitForm" novalidate><div class="field"><label for="vName">Ton prénom</label><input id="vName" name="prenom" type="text" autocomplete="given-name" placeholder="Ex. Grâce"><p class="field-err" id="vNameErr" hidden>Indique ton prénom pour qu\'on sache qui accueillir.</p></div>' +
    '<div class="field"><label for="vPhone">Ton numéro WhatsApp</label><input id="vPhone" name="whatsapp" type="tel" autocomplete="tel" inputmode="tel" placeholder="07 00 00 00 00"><p class="field-err" id="vPhoneErr" hidden>Entre un numéro à 10 chiffres (ex. 07 79 16 98 78).</p></div>' +
    '<fieldset class="field"><legend>Quel dimanche ?</legend><div class="seg" id="vSundays"></div></fieldset>' +
    '<fieldset class="field"><legend>Tu viens…</legend><div class="seg"><label><input type="radio" name="avec" value="seul" checked><span>Seul·e</span></label><label><input type="radio" name="avec" value="amis"><span>Avec des amis</span></label><label><input type="radio" name="avec" value="famille"><span>En famille</span></label></div></fieldset>' +
    '<div class="field"><label for="vNote">Un mot pour nous ? <small>(facultatif)</small></label><textarea id="vNote" name="note" rows="3" placeholder="Une question, un sujet de prière…"></textarea></div>' +
    '<button class="btn btn-bordeaux btn-block" type="submit">Je réserve ma place</button><p class="drawer-hint">Tes infos servent uniquement à t\'accueillir. Pas de spam, promis.</p></form></div>' +
    '<div class="drawer-body drawer-done" id="visitStepDone" hidden><div class="done-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>' +
    '<h2 class="drawer-title" id="doneTitle">C\'est noté !</h2><p class="drawer-lead" id="doneText"></p>' +
    '<ul class="done-list"><li><span class="label">Heure</span>Accueil dès 12h00 · culte à 13h00</li><li><span class="label">Lieu</span>Cocody-Bonoumin, près d\'Abidjan Mall</li><li><span class="label">Tenue</span>Viens comme tu es</li></ul>' +
    '<a class="btn btn-bordeaux btn-block" href="https://www.google.com/maps/search/?api=1&amp;query=Abidjan+Mall+Bonoumin+Cocody" target="_blank" rel="noopener">Ouvrir l\'itinéraire</a><button class="btn-text" type="button" data-close>Fermer</button></div></div></div>' +
    // Visionneuse
    '<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Photo" hidden>' +
    '<button class="lb-close" type="button" data-close aria-label="Fermer"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' +
    '<button class="lb-nav lb-prev" type="button" id="lbPrev" aria-label="Photo précédente"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg></button>' +
    '<figure><img id="lbImg" src="img/t-fg-1.webp" alt=""><figcaption id="lbCap" class="mono"></figcaption></figure>' +
    '<button class="lb-nav lb-next" type="button" id="lbNext" aria-label="Photo suivante"><svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg></button></div>';

  function put(id, html) {
    var el = document.getElementById(id);
    if (!el) return;
    el.insertAdjacentHTML('afterend', html);
    el.parentNode.removeChild(el);
  }
  put('layoutTop', TOP);
  put('layoutBottom', BOTTOM);

  // Lien de la page courante mis en évidence
  var page = document.body.getAttribute('data-page') || 'accueil';
  var links = document.querySelectorAll('[data-nav]');
  for (var i = 0; i < links.length; i++) {
    var on = links[i].getAttribute('data-nav') === page;
    links[i].classList.toggle('is-current', on);
    if (on) links[i].setAttribute('aria-current', 'page');
  }
  // Langue : le site final est bilingue (FR / EN via i18next)
  var lang = document.getElementById('navLang');
  if (lang) lang.addEventListener('click', function () {
    var en = lang.textContent === 'FR';
    lang.textContent = en ? 'EN' : 'FR';
    if (window.NWC && window.NWC.toast) window.NWC.toast(en ? 'English version: available on the final site (French by default).' : 'Version française (langue par défaut).');
  });
})();
