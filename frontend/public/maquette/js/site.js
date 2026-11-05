/* ════════════════════════════════════════════════════════════════════
   NEW WINE CHURCH — interactions de la maquette
   Chaque module est isolé (try/catch) : si l'un échoue, le reste vit.
   Contenus réels : départements (API prod), numéros Mobile Money,
   horaires, événements de la médiathèque. Les titres de messages et
   le contenu du lecteur sont des exemples de maquette.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  if (reduced) root.classList.add('reduced');

  function mod(name, fn) { try { fn(); } catch (e) { console.warn('[NWC] module « ' + name + ' » :', e); } }
  var NWC = window.NWC = {};

  /* ───────── Notification ───────── */
  var toastTimer;
  NWC.toast = function (msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-on'); }, 4200);
  };

  /* ───────── Horaires : culte le dimanche 13h00–15h00, heure d'Abidjan (GMT, sans heure d'été) ───────── */
  function service(nowMs) {
    var d = new Date(nowMs), day = d.getUTCDay();
    var start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ((7 - day) % 7), 13, 0, 0);
    if (nowMs >= start + 2 * 3600e3) start += 7 * 86400e3;
    return { start: start, live: nowMs >= start && nowMs < start + 2 * 3600e3 };
  }
  function frDate(ms, opts) {
    var s = new Date(ms).toLocaleDateString('fr-FR', Object.assign({ timeZone: 'UTC' }, opts));
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  var pad = function (n) { return String(n).padStart(2, '0'); };

  /* ───────── Défilement fluide (Lenis) + GSAP ───────── */
  var lenis = null, hasGsap = !!(window.gsap && window.ScrollTrigger);
  mod('defilement', function () {
    if (!reduced && window.Lenis) {
      lenis = new window.Lenis({ lerp: .1, smoothWheel: true, wheelMultiplier: 1 });
      NWC.lenis = lenis;
    }
    if (hasGsap) {
      gsap.registerPlugin(ScrollTrigger);
      if (lenis) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
        gsap.ticker.lagSmoothing(0);
      }
    } else if (lenis) {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    }
  });
  function scrollToEl(target, offset) {
    if (typeof target === 'number') { if (lenis) lenis.scrollTo(target, { duration: 1.4 }); else window.scrollTo({ top: target, behavior: reduced ? 'auto' : 'smooth' }); return; }
    if (!target) return;
    var off = offset == null ? -64 : offset;
    if (lenis) lenis.scrollTo(target, { offset: off, duration: 1.4 });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + off, behavior: reduced ? 'auto' : 'smooth' });
  }
  function lockScroll(on) { if (lenis) { on ? lenis.stop() : lenis.start(); } document.body.style.overflow = on ? 'hidden' : ''; }

  /* ───────── Intro : logo + compteur, puis le rideau se lève ───────── */
  var readyFired = false;
  function fireReady() {
    if (readyFired) return; readyFired = true;
    window.dispatchEvent(new Event('nwc:ready'));
    heroIntro();
    if (location.hash && location.hash.length > 1) {
      var el = document.getElementById(location.hash.slice(1));
      if (el) setTimeout(function () { scrollToEl(el, el.id === 'moments' ? 0 : -64); }, 300);
    }
  }
  mod('intro', function () {
    var loader = $('#loader'), skip = false;
    try { skip = sessionStorage.getItem('nwc-intro') === '1'; } catch (e) { /* stockage indisponible */ }
    if (reduced || skip || !loader) { if (loader) loader.classList.add('is-gone'); fireReady(); return; }
    try { sessionStorage.setItem('nwc-intro', '1'); } catch (e) { /* rien */ }
    lockScroll(true);
    var fill = $('#loaderFill'), count = $('#loaderCount'), t0 = performance.now(), dur = 1350;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      fill.style.width = (e * 100).toFixed(1) + '%';
      count.textContent = pad(Math.round(e * 100));
      if (p < 1) { requestAnimationFrame(step); return; }
      loader.classList.add('is-done');
      lockScroll(false);
      fireReady();
      setTimeout(function () { loader.classList.add('is-gone'); }, 1150);
    })(t0);
    setTimeout(function () { if (!readyFired) { loader.classList.add('is-gone'); lockScroll(false); fireReady(); } }, 4000);
  });

  /* ───────── Hero ───────── */
  function heroIntro() {
    if (!hasGsap || reduced) return;
    var tl = gsap.timeline({ delay: .15 });
    tl.from('.hero-title .line-in', { yPercent: 115, rotate: 3, duration: 1.3, stagger: .09, ease: 'expo.out' })
      .from('.hero-eyebrow, .hero-bottom > *', { y: 26, opacity: 0, duration: 1, stagger: .08, ease: 'expo.out' }, '-=1.05')
      .from('.hero-strip', { yPercent: 100, duration: 1, ease: 'expo.out' }, '-=.9');
  }
  mod('hero', function () {
    // Photos qui défilent dans la pastille du titre
    var imgs = $$('#pillPhoto img'), k = 0;
    if (imgs.length > 1 && !reduced) setInterval(function () {
      imgs[k].classList.remove('is-on'); k = (k + 1) % imgs.length; imgs[k].classList.add('is-on');
    }, 1900);
    if (hasGsap && !reduced) {
      gsap.to('.hero-inner', { yPercent: -10, opacity: .15, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true } });
    }
  });

  /* ───────── Horloge : compte à rebours, statut du direct ───────── */
  mod('horloge', function () {
    var cd = $('#countdown'), next = $('#nextService'), chip = $('#liveChip'), chipTxt = $('#liveChipTxt');
    var live = $('#live'), status = $('#liveStatus'), lc = { d: $('#lcD'), h: $('#lcH'), m: $('#lcM'), s: $('#lcS') };
    var mbarDot = $('.mbar .live-dot'), liveDot = $('#live .live-dot');
    function tick() {
      var now = Date.now(), s = service(now);
      var diff = Math.max(0, s.start - now);
      var D = Math.floor(diff / 86400e3), H = Math.floor(diff / 3600e3) % 24, M = Math.floor(diff / 60e3) % 60, S = Math.floor(diff / 1e3) % 60;
      var longDate = frDate(s.start, { weekday: 'long', day: 'numeric', month: 'long' });
      if (s.live) {
        next.textContent = 'En direct maintenant';
        cd.textContent = 'Le culte a commencé à 13h00';
        chipTxt.textContent = 'En direct'; chip.classList.add('is-live');
        status.textContent = 'En direct maintenant'; live.classList.add('is-live');
      } else {
        next.textContent = longDate + ' · 13h00';
        cd.textContent = 'dans ' + (D ? D + ' j ' : '') + H + ' h ' + pad(M) + ' min';
        chipTxt.textContent = 'Dim. 13h'; chip.classList.remove('is-live');
        status.textContent = 'Hors antenne · prochain direct ' + longDate.toLowerCase() + ' à 13h00';
        live.classList.remove('is-live');
        lc.d.textContent = D; lc.h.textContent = pad(H); lc.m.textContent = pad(M); lc.s.textContent = pad(S);
      }
      [mbarDot, liveDot].forEach(function (d) { if (d) d.classList.toggle('is-live', s.live); });
    }
    tick(); setInterval(tick, 1000);

    var remind = $('#remindBtn');
    remind.addEventListener('click', function () {
      var on = remind.getAttribute('aria-pressed') !== 'true';
      remind.setAttribute('aria-pressed', on ? 'true' : 'false');
      remind.textContent = on ? 'Rappel activé ✓' : 'M\'envoyer un rappel 15 min avant';
      NWC.toast(on ? 'Rappel activé : on te prévient 15 minutes avant le direct.' : 'Rappel désactivé.');
    });
  });

  /* ───────── Navigation ───────── */
  mod('navigation', function () {
    var nav = $('#nav'), links = $$('#navLinks a'), blob = $('#navBlob'), menu = $('#menu'), burger = $('#burger');
    var lastY = window.scrollY, menuOpen = false;
    function onScroll() {
      var y = window.scrollY;
      nav.classList.toggle('is-scrolled', y > 40);
      if (!menuOpen) nav.classList.toggle('is-hidden', y > lastY && y > 320);
      lastY = y;
      var mbar = $('#mbar'); if (mbar) mbar.classList.toggle('is-on', y > window.innerHeight * .75);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Pastille bordeaux qui glisse sous le lien survolé / actif
    var current = null;
    function moveBlob(a) {
      if (!a) { blob.style.opacity = 0; return; }
      blob.style.left = a.offsetLeft + 'px'; blob.style.width = a.offsetWidth + 'px'; blob.style.opacity = 1;
    }
    links.forEach(function (a) { a.addEventListener('mouseenter', function () { moveBlob(a); }); });
    $('#navLinks').addEventListener('mouseleave', function () { moveBlob(current); });
    var ids = links.map(function (a) { return a.getAttribute('href').slice(1); });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          var i = ids.indexOf(en.target.id);
          links.forEach(function (a, k) { a.classList.toggle('is-active', k === i); });
          current = links[i] || null; moveBlob(current);
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      ids.forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
      // Remise à zéro en haut de page
      new IntersectionObserver(function (en) { if (en[0].isIntersecting) { current = null; links.forEach(function (a) { a.classList.remove('is-active'); }); moveBlob(null); } }, { rootMargin: '-45% 0px -50% 0px' }).observe($('#hero'));
    }

    // Menu plein écran
    function setMenu(open) {
      menuOpen = open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
      if (open) { menu.hidden = false; requestAnimationFrame(function () { menu.classList.add('is-open'); }); nav.classList.remove('is-hidden'); lockScroll(true); }
      else { menu.classList.remove('is-open'); lockScroll(false); setTimeout(function () { if (!menuOpen) menu.hidden = true; }, 800); }
    }
    NWC.closeMenu = function () { if (menuOpen) setMenu(false); };
    burger.addEventListener('click', function () { setMenu(!menuOpen); });
    var prev = $('#menuPreview');
    $$('.menu-links a').forEach(function (a) {
      a.addEventListener('mouseenter', function () { if (prev && a.dataset.img) prev.src = a.dataset.img; });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menuOpen) setMenu(false); });

    // Liens d'ancre : défilement fluide, sans modifier l'adresse
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      e.preventDefault();
      NWC.closeMenu();
      if (!id || id === 'top') { scrollToEl(0); return; }
      var el = document.getElementById(id);
      if (el) setTimeout(function () { scrollToEl(el, id === 'moments' ? 0 : -64); }, menuOpen ? 350 : 0);
    });
  });

  /* ───────── Bandeaux croisés : vitesse liée au défilement ───────── */
  mod('bandeaux', function () {
    var tracks = $$('.ticker-track');
    if (!tracks.length) return;
    var state = tracks.map(function (tr) {
      var base = tr.innerHTML, orig = tr.children.length, cw = tr.scrollWidth;
      var n = 1;
      while (tr.scrollWidth < cw + window.innerWidth * 1.3 && n < 8) { tr.insertAdjacentHTML('beforeend', base); n++; }
      // Les copies servent seulement à la boucle visuelle : on les cache aux lecteurs d'écran
      Array.prototype.slice.call(tr.children).forEach(function (x, i) { if (i >= orig) x.setAttribute('aria-hidden', 'true'); });
      return { el: tr, x: 0, cw: cw, speed: parseFloat(tr.dataset.speed) || .5 };
    });
    if (reduced) return;
    var visible = true, lastY = window.scrollY, vel = 0, last = performance.now();
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe($('.ticker'));
    (function loop(now) {
      var dt = Math.min(50, now - last) / 16.67; last = now;
      var y = window.scrollY; vel += ((y - lastY) - vel) * .2; lastY = y;
      if (visible) {
        var boost = 1 + Math.min(6, Math.abs(vel) * .12);
        state.forEach(function (s) {
          s.x -= s.speed * boost * dt * 1.4 * (vel < -.5 ? -1 : 1);
          if (s.x <= -s.cw) s.x += s.cw;
          if (s.x > 0) s.x -= s.cw;
          s.el.style.transform = 'translate3d(' + s.x.toFixed(2) + 'px,0,0)';
        });
      }
      requestAnimationFrame(loop);
    })(last);
  });

  /* ───────── Ta première visite : image collante qui change ───────── */
  mod('visite', function () {
    var steps = $$('.vstep'), frames = $$('#visitFrame img'), tag = $('#visitTag');
    var labels = ['12h45 · Arrivée', '13h00 · Louange', '13h45 · La Parole', '15h00 · Après le culte'];
    function setStep(i) {
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      frames.forEach(function (f) { f.classList.toggle('is-on', +f.dataset.step === i); });
      if (tag) tag.textContent = labels[i];
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) setStep(+e.target.dataset.step); });
      }, { rootMargin: '-42% 0px -42% 0px' });
      steps.forEach(function (s) { io.observe(s); });
    }
  });

  /* ───────── Manifeste : les mots s'allument au défilement ───────── */
  mod('manifeste', function () {
    var box = $('#manifestoText'); if (!box) return;
    (function split(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) split(c);
      });
    })(box);
    var words = $$('.w', box), lit = -1;
    if (reduced) { words.forEach(function (w) { w.classList.add('is-lit'); }); return; }
    function update() {
      var r = box.getBoundingClientRect(), vh = window.innerHeight;
      var p = clamp((vh * .82 - r.top) / (r.height + vh * .3), 0, 1);
      var n = Math.round(p * words.length * 1.08);
      if (n === lit) return; lit = n;
      words.forEach(function (w, i) { w.classList.toggle('is-lit', i < n); });
    }
    window.addEventListener('scroll', update, { passive: true }); update();
  });

  /* ───────── 1 · Servir : 35 départements (liste réelle de l'API) ───────── */
  var FAMS = [
    { id: 'arts', nom: 'Scène, Arts & Sport', img: 'img/fam-arts.webp',
      fait: 'Répétitions en semaine, service le dimanche et sur les grands événements (Cypher, galas).',
      qui: 'Chanteurs, danseurs, rappeurs, techniciens, sportifs. Les débutants motivés sont formés.' },
    { id: 'media', nom: 'Média & Création', img: 'img/fam-media.webp',
      fait: 'Capter, créer et diffuser : cultes en direct, réseaux sociaux, podcast, magazine.',
      qui: 'Créatifs, geeks, rédacteurs, vidéastes. Ton téléphone et ta curiosité suffisent pour commencer.' },
    { id: 'accueil', nom: 'Accueil & Soin', img: 'img/fam-accueil.webp',
      fait: 'Accueillir, accompagner, prendre des nouvelles, servir à table et prendre soin des lieux.',
      qui: 'Les sourires, les bons écouteurs, ceux qui aiment que chacun se sente chez soi.' },
    { id: 'mission', nom: 'Mission & Formation', img: 'img/fam-mission.webp',
      fait: 'Annoncer l\'Évangile, prier pour la ville, enseigner les bases de la foi, traduire.',
      qui: 'Ceux qui ont un feu pour les âmes, la prière ou l\'enseignement.' },
    { id: 'orga', nom: 'Organisation', img: 'img/fam-orga.webp',
      fait: 'Planifier, installer, transporter, sécuriser et gérer : faire tourner la maison.',
      qui: 'Les organisés, les fiables, ceux qu\'on appelle quand il faut que ça marche.' }
  ];
  var DEPTS = [
    ['Chant', 'arts', 'La louange live chaque dimanche : voix, harmonies, répétitions en semaine.', 'img/t-cy-5.webp'],
    ['Dancing Star', 'arts', 'Chorégraphies et danse pour l\'adoration et les grands événements.', 'img/t-fg-1.webp'],
    ['Rap et Musique Urbaine', 'arts', 'MC, beatmakers, auteurs : l\'Évangile en rimes et en flow.', 'img/t-cy-1.webp'],
    ['Ingénieur du Son', 'arts', 'Console, micros, retours : un son propre, du culte au Cypher.', 'img/g-vibecast.webp'],
    ['Annonce et Régie', 'arts', 'Les annonces, le conducteur et le timing du culte.', null],
    ['Sport', 'arts', 'Matchs, footing, tournois : la fraternité aussi sur le terrain.', null],
    ['Média Photo', 'media', 'Shooting des cultes et des événements, retouche, médiathèque.', 'img/t-dn-1.webp'],
    ['Média Vidéo', 'media', 'Captation, montage et diffusion des cultes en direct.', null],
    ['Média Audio', 'media', 'Enregistrement des messages et archives sonores.', null],
    ['Cinématographie', 'media', 'Courts-métrages, clips et films qui racontent l\'église.', 'img/t-fg-4.webp'],
    ['New Wine Mag', 'media', 'Le magazine de l\'église : écrire, interviewer, mettre en page.', 'img/g-mag.webp'],
    ['New Wine Vibecast', 'media', 'Le podcast de NWC : micros ouverts sur la foi et la vie.', 'img/g-vibecast.webp'],
    ['Réseaux Sociaux', 'media', 'Instagram, TikTok, Facebook : faire vivre NWC en ligne.', null],
    ['PowerPoint', 'media', 'Paroles, versets et visuels projetés pendant le culte.', null],
    ['Informatique / Webmaster', 'media', 'Le site, la plateforme et les outils numériques de l\'église.', null],
    ['Production Gadgets à Vendre', 'media', 'T-shirts, goodies et merch NWC, de l\'idée à la vente.', null],
    ['Accueil, Réception et Aide à l\'intérieur', 'accueil', 'Le premier sourire à l\'entrée et l\'aide pour trouver sa place.', 'img/v-arrive.webp'],
    ['Protocole', 'accueil', 'Accompagner les invités et le pasteur, veiller au bon ordre.', 'img/t-dn-2.webp'],
    ['Visite des Membres', 'accueil', 'Rendre visite à ceux qu\'on n\'a pas vus depuis longtemps.', null],
    ['Social', 'accueil', 'Soutien concret aux membres et actions solidaires dans la ville.', null],
    ['Insertion Interne', 'accueil', 'Accompagner les nouveaux jusqu\'à ce qu\'ils se sentent chez eux.', 'img/v-reste.webp'],
    ['Call Center', 'accueil', 'Appeler, rappeler, prendre des nouvelles de chacun.', null],
    ['Attaché Pastoral', 'accueil', 'Assister le pasteur dans son agenda et son ministère.', null],
    ['Hygiène', 'accueil', 'Une maison propre et accueillante avant et après chaque culte.', null],
    ['Restauration', 'accueil', 'Cuisiner et servir pour les cultes, retraites et événements.', 'img/t-sv-1.webp'],
    ['Évangélisation', 'mission', 'Annoncer l\'Évangile dans les rues, campus et quartiers d\'Abidjan.', 'img/fam-orga.webp'],
    ['Sentinelle', 'mission', 'Les intercesseurs : prier pour l\'église, la ville et la nation.', 'img/v-adore.webp'],
    ['Académie de Fondation et Formation', 'mission', 'Les bases de la foi et la formation des futurs leaders.', 'img/v-parole.webp'],
    ['Traduction de Texte', 'mission', 'Traduire messages et contenus pour la diaspora (FR ⇄ EN).', null],
    ['Planning et Gestion des Cultes', 'orga', 'Préparer chaque culte, de la liste des intervenants au timing.', null],
    ['Logistique', 'orga', 'Installer, ranger, transporter le matériel : rien ne bouge sans eux.', 'img/t-dn-4.webp'],
    ['Transport', 'orga', 'Organiser les déplacements des membres vers l\'église et les événements.', null],
    ['Parking et Sécurité', 'orga', 'Guider les véhicules et veiller à la sécurité de tous.', null],
    ['Finance', 'orga', 'Gérer les dons et le budget avec rigueur et transparence.', null],
    ['DRH (Direction Ressources Humaines)', 'orga', 'Accueillir les serviteurs et les orienter vers le bon département.', null]
  ].map(function (d) { var f = FAMS.filter(function (x) { return x.id === d[1]; })[0]; return { n: d[0], f: d[1], d: d[2], img: d[3] || f.img, fam: f }; });

  var currentFam = 'arts';
  mod('servir', function () {
    var tabs = $('#famTabs'), list = $('#deptList'), float = $('#deptFloat'), floatImg = $('#deptFloatImg');
    FAMS.forEach(function (f) {
      var n = DEPTS.filter(function (d) { return d.f === f.id; }).length;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'fam-tab'; b.setAttribute('role', 'tab'); b.dataset.fam = f.id;
      b.setAttribute('aria-controls', 'deptList');
      b.innerHTML = '<span>' + f.nom + '</span><span class="mono">' + pad(n) + '</span>';
      b.addEventListener('click', function () { showFam(f.id, true); });
      tabs.appendChild(b);
    });
    var arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
    function showFam(id, animate) {
      currentFam = id;
      $$('.fam-tab', tabs).forEach(function (t) { t.setAttribute('aria-selected', t.dataset.fam === id ? 'true' : 'false'); });
      list.innerHTML = '';
      DEPTS.filter(function (d) { return d.f === id; }).forEach(function (d) {
        var li = document.createElement('li'); li.className = 'dept-row';
        var b = document.createElement('button'); b.type = 'button'; b.className = 'dept-btn';
        b.innerHTML = '<span class="dept-name"></span><span class="dept-desc"></span><span class="dept-go">' + arrow + '</span>';
        b.querySelector('.dept-name').textContent = d.n;
        b.querySelector('.dept-desc').textContent = d.d;
        b.addEventListener('mouseenter', function () { floatImg.src = d.img; float.classList.add('is-on'); });
        b.addEventListener('mouseleave', function () { float.classList.remove('is-on'); });
        b.addEventListener('click', function () { openDept(d); });
        li.appendChild(b); list.appendChild(li);
      });
      if (animate && hasGsap && !reduced) gsap.from('#deptList .dept-row', { y: 24, opacity: 0, duration: .6, stagger: .045, ease: 'expo.out' });
    }
    NWC.showFam = showFam;
    showFam('arts', false);

    // Image flottante qui suit la souris
    if (fine) {
      var fx = 0, fy = 0, tx = 0, ty = 0;
      window.addEventListener('pointermove', function (e) { tx = e.clientX + 150; ty = e.clientY; }, { passive: true });
      (function loop() {
        fx += (tx - fx) * .14; fy += (ty - fy) * .14;
        float.style.left = fx.toFixed(1) + 'px'; float.style.top = fy.toFixed(1) + 'px';
        requestAnimationFrame(loop);
      })();
    }
  });

  /* ───────── Tiroirs (visite, département) ───────── */
  var openDrawerEl = null, lastFocus = null;
  function openDrawer(el) {
    if (openDrawerEl) closeDrawer(openDrawerEl, true);
    lastFocus = document.activeElement;
    openDrawerEl = el; el.hidden = false; lockScroll(true);
    requestAnimationFrame(function () { el.classList.add('is-open'); });
    setTimeout(function () { var f = el.querySelector('input, button.btn, button'); if (f) f.focus({ preventScroll: true }); }, 120);
  }
  function closeDrawer(el, instant) {
    if (!el) return;
    el.classList.remove('is-open');
    if (openDrawerEl === el) openDrawerEl = null;
    lockScroll(false);
    setTimeout(function () { if (!el.classList.contains('is-open')) el.hidden = true; }, instant ? 0 : 700);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  mod('tiroirs', function () {
    $$('.drawer').forEach(function (d) {
      d.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeDrawer(d); });
      d.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { closeDrawer(d); return; }
        if (e.key !== 'Tab') return;
        var f = $$('a[href], button:not([disabled]), input, textarea, select', d).filter(function (x) { return x.offsetParent !== null; });
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      });
    });
  });

  var deptCurrent = null;
  function openDept(d) {
    deptCurrent = d;
    $('#deptImg').src = d.img; $('#deptImg').alt = '';
    $('#deptFam').textContent = d.fam.nom;
    $('#deptTitle').textContent = d.n;
    $('#deptDesc').textContent = d.d;
    $('#deptDo').textContent = d.fam.fait;
    $('#deptWho').textContent = d.fam.qui;
    openDrawer($('#deptDrawer'));
  }
  mod('departement', function () {
    $('#deptJoin').addEventListener('click', function () {
      closeDrawer($('#deptDrawer'));
      NWC.toast('Demande envoyée au gouverneur du département « ' + (deptCurrent ? deptCurrent.n : '') + ' ».');
    });
  });

  /* ───────── Quiz « Trouve ta place » ───────── */
  mod('quiz', function () {
    var QUIZ = [
      { q: 'Le dimanche, on te trouve plutôt…', o: [['Sur scène ou près du son', 'arts'], ['Derrière un écran ou une caméra', 'media'], ['À l\'entrée, à accueillir les gens', 'accueil'], ['En coulisses, à tout organiser', 'orga']] },
      { q: 'Ton super-pouvoir ?', o: [['Créer du contenu', 'media'], ['Écouter et prendre soin', 'accueil'], ['Parler de Jésus à des inconnus', 'mission'], ['Mettre de l\'ordre dans le chaos', 'orga'], ['Chanter, danser, performer', 'arts']] },
      { q: 'Cette année, ce qui te ferait vibrer…', o: [['Monter sur la scène du Cypher', 'arts'], ['Lancer un épisode du Vibecast', 'media'], ['Voir un nouveau devenir un ami', 'accueil'], ['Prier pour la nation avec les Sentinelles', 'mission'], ['Faire tourner un culte sans accroc', 'orga']] }
    ];
    var body = $('#quizBody'), bar = $('#quizBar'), step = 0, score = {}, first = null;
    function render() {
      bar.style.width = (step / QUIZ.length * 100) + '%';
      body.innerHTML = '';
      if (step < QUIZ.length) {
        var q = QUIZ[step];
        var h = document.createElement('p'); h.className = 'quiz-q'; h.textContent = (step + 1) + '/3 · ' + q.q; body.appendChild(h);
        var wrap = document.createElement('div'); wrap.className = 'quiz-opts';
        q.o.forEach(function (o) {
          var b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-opt'; b.textContent = o[0];
          b.addEventListener('click', function () { score[o[1]] = (score[o[1]] || 0) + 1; if (!first) first = o[1]; step++; render(); });
          wrap.appendChild(b);
        });
        body.appendChild(wrap);
        if (step > 0) { var f = body.querySelector('.quiz-opt'); if (f) f.focus({ preventScroll: true }); }
        return;
      }
      var best = first, max = 0;
      Object.keys(score).forEach(function (k) { if (score[k] > max) { max = score[k]; best = k; } });
      var fam = FAMS.filter(function (f) { return f.id === best; })[0];
      var picks = DEPTS.filter(function (d) { return d.f === best; }).slice(0, 3);
      var res = document.createElement('div'); res.className = 'quiz-result';
      res.innerHTML = '<p class="kicker">Ta famille</p><p class="serif"></p><p class="lead">Commence par l\'un de ces départements. Tu pourras toujours changer.</p><div class="quiz-picks"></div>';
      res.querySelector('.serif').textContent = fam.nom;
      var pk = res.querySelector('.quiz-picks');
      picks.forEach(function (d) { var b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-pick'; b.textContent = d.n; b.addEventListener('click', function () { openDept(d); }); pk.appendChild(b); });
      var row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;gap:16px;align-items:center';
      var all = document.createElement('button'); all.type = 'button'; all.className = 'btn btn-ivoire btn-sm'; all.textContent = 'Voir toute la famille';
      all.addEventListener('click', function () { NWC.showFam(best, true); scrollToEl($('#famTabs'), -110); });
      var again = document.createElement('button'); again.type = 'button'; again.className = 'quiz-again'; again.textContent = 'Recommencer';
      again.addEventListener('click', function () { step = 0; score = {}; first = null; render(); });
      row.appendChild(all); row.appendChild(again); res.appendChild(row);
      body.appendChild(res);
    }
    render();
  });

  /* ───────── 2 · Grandir : lecteur du dernier message (simulation) ───────── */
  mod('lecteur', function () {
    var player = $('#player'), cv = $('#wave'); if (!cv) return;
    var ctx = cv.getContext('2d'), DUR = 48 * 60 + 12, cur = 0, playing = false, speed = 1, hover = -1;
    var N = 140, bars = [], seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < N; i++) {
      var env = .35 + .65 * Math.sin(Math.PI * i / N);
      bars.push(clamp((.25 + rnd() * .75) * env + (i % 9 === 0 ? .2 : 0), .08, 1));
    }
    for (var s = 1; s < N - 1; s++) bars[s] = (bars[s - 1] + bars[s] * 2 + bars[s + 1]) / 4;
    var cs = getComputedStyle(root);
    var cOn = cs.getPropertyValue('--rubis').trim() || '#E3294E';
    // Couleurs des barres lues dans le CSS : elles s'adaptent au fond (clair ou sombre)
    var pcs = getComputedStyle(player);
    var cOff = pcs.getPropertyValue('--wave-off').trim() || 'rgba(245,237,225,.2)';
    var cHov = pcs.getPropertyValue('--wave-hover').trim() || 'rgba(245,237,225,.5)';
    function draw() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      var bw = w / N, prog = cur / DUR;
      for (var i = 0; i < N; i++) {
        var bh = Math.max(3, bars[i] * h * .92), x = i * bw + bw * .18, y = (h - bh) / 2, ww = Math.max(1.5, bw * .64);
        var done = (i + .5) / N <= prog, hov = hover >= 0 && (i + .5) / N <= hover;
        ctx.fillStyle = done ? cOn : hov ? cHov : cOff;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, ww, bh, ww / 2); else ctx.rect(x, y, ww, bh);
        ctx.fill();
      }
    }
    function fmt(t) { t = Math.floor(t); return pad(Math.floor(t / 60)) + ':' + pad(t % 60); }
    var chapters = $$('#chapters button');
    function ui() {
      $('#tCur').textContent = fmt(cur);
      var c = 0; chapters.forEach(function (b, k) { if (cur >= +b.dataset.t) c = k; });
      chapters.forEach(function (b, k) { b.classList.toggle('is-current', k === c); });
      draw();
    }
    var last = 0;
    function loop(now) {
      if (!playing) return;
      cur = Math.min(DUR, cur + (now - last) / 1000 * speed); last = now;
      if (cur >= DUR) { playing = false; player.classList.remove('is-playing'); }
      ui(); if (playing) requestAnimationFrame(loop);
    }
    function setPlay(on) {
      playing = on; player.classList.toggle('is-playing', on);
      $('#pPlay').setAttribute('aria-label', on ? 'Pause' : 'Lecture');
      if (on) { last = performance.now(); requestAnimationFrame(loop); }
    }
    $('#pPlay').addEventListener('click', function () { setPlay(!playing); });
    $('#pBack').addEventListener('click', function () { cur = Math.max(0, cur - 15); ui(); });
    $('#pFwd').addEventListener('click', function () { cur = Math.min(DUR, cur + 15); ui(); });
    $('#pSpeed').addEventListener('click', function (e) { speed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; e.currentTarget.textContent = String(speed).replace('.', ',') + '×'; });
    cv.addEventListener('click', function (e) { var r = cv.getBoundingClientRect(); cur = clamp((e.clientX - r.left) / r.width, 0, 1) * DUR; ui(); if (!playing) setPlay(true); });
    cv.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); hover = clamp((e.clientX - r.left) / r.width, 0, 1); draw(); });
    cv.addEventListener('pointerleave', function () { hover = -1; draw(); });
    chapters.forEach(function (b) { b.addEventListener('click', function () { cur = +b.dataset.t; ui(); if (!playing) setPlay(true); }); });
    cv.dataset.cursor = 'Écouter';
    if ('ResizeObserver' in window) new ResizeObserver(draw).observe(cv); else window.addEventListener('resize', draw);
    ui();
  });

  /* ───────── Moments forts : tunnel 3D dans la médiathèque ───────── */
  var LB = [];
  mod('moments', function () {
    var MOMENTS = [
      { vol: 'Vol. 1', t: 'Babi Giant Cypher for Christ', d: 'Rap, freestyle et louange urbaine : la scène ouverte où les MC d\'Abidjan posent leurs bars pour Christ.', c: '44 photos · 4 vidéos', cap: 'Babi Giant Cypher', imgs: [['t-cy-1', 0], ['t-cy-2', 1], ['t-cy-3', 1], ['t-cy-4', 1], ['t-cy-5', 1], ['t-cy-6', 0]] },
      { vol: 'Vol. 1', t: 'Saveurs Sunday', d: 'Concours de cuisine entre équipes : tabliers, toques, jury et diplômes. Le dimanche qui a du goût.', c: '33 photos', cap: 'Saveurs Sunday', imgs: [['t-sv-1', 1], ['t-sv-2', 1], ['t-sv-3', 1], ['t-sv-4', 1], ['t-sv-5', 1], ['t-sv-6', 1]] },
      { vol: 'Gala', t: 'A Dark Night in Elegance', d: 'Tapis rouge, tenues de soirée et une nuit entière pour célébrer la famille NWC avec classe.', c: '333 photos', cap: 'Dark Night in Elegance', imgs: [['t-dn-1', 0], ['t-dn-2', 1], ['t-dn-3', 1], ['t-dn-4', 1], ['t-dn-5', 0], ['t-dn-6', 1]] },
      { vol: '12.09.2026', t: 'Festi Grill ’26', d: 'Porc braisé, poulet, alloco et attiéké sous les guirlandes : la grande grillade de la rentrée.', c: '77 photos', cap: 'Festi Grill ’26', imgs: [['t-fg-1', 0], ['t-fg-2', 0], ['t-fg-3', 0], ['t-fg-4', 0], ['t-fg-5', 0], ['t-fg-6', 0]] }
    ];
    var section = $('#moments'), world = $('#tunnelWorld'), tunnel = $('#tunnel');
    var cards = [], PER = 6, GAP = 560;
    MOMENTS.forEach(function (m, ci) {
      m.imgs.forEach(function (im, k) {
        var j = ci * PER + k;
        var fig = document.createElement('figure');
        fig.className = 't-card'; fig.dataset.cursor = 'Voir';
        fig.tabIndex = 0; fig.setAttribute('role', 'button'); fig.setAttribute('aria-label', 'Agrandir la photo : ' + m.cap);
        fig.innerHTML = '<img alt="" loading="lazy" decoding="async"><figcaption></figcaption>';
        var img = fig.querySelector('img'); img.src = 'img/' + im[0] + '.webp'; img.alt = m.cap + ', photo ' + (k + 1);
        fig.querySelector('figcaption').textContent = m.cap;
        fig.style.setProperty('--w', im[1] ? 'clamp(220px, 27vw, 430px)' : 'clamp(170px, 19vw, 300px)');
        var idx = LB.length; LB.push({ src: img.src, cap: m.cap + ' · ' + m.c });
        fig.addEventListener('click', function () { openLB(idx); });
        fig.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(idx); } });
        world.appendChild(fig);
        cards.push({ el: fig, j: j, a: j * 2.39996 + .6 });
      });
    });
    var M = cards.length, ZMIN = -300, ZMAX = (M - 1) * GAP + 700;
    function placeCards() {
      var vw = window.innerWidth, vh = window.innerHeight, small = vw < 700;
      var RX = small ? vw * .34 : Math.min(vw * .36, 640), RY = small ? vh * .3 : Math.min(vh * .3, 320);
      cards.forEach(function (c) {
        c.x = Math.cos(c.a) * RX * (1 + (c.j % 3) * .08);
        c.y = Math.sin(c.a) * RY;
        c.z = -c.j * GAP;
        c.el.style.transform = 'translate3d(' + c.x.toFixed(1) + 'px,' + c.y.toFixed(1) + 'px,' + c.z + 'px) translate(-50%,-50%)';
      });
    }
    placeCards();
    window.addEventListener('resize', placeCards);

    // Chapitres (navigation latérale)
    var nav = $('#chapterNav'), navBtns = [];
    MOMENTS.forEach(function (m, ci) {
      var li = document.createElement('li'), b = document.createElement('button');
      b.type = 'button'; b.textContent = m.cap;
      b.addEventListener('click', function () {
        var wz = ci * PER * GAP + 260, p = (wz - ZMIN) / (ZMAX - ZMIN);
        var top = section.getBoundingClientRect().top + window.scrollY;
        scrollToEl(top + p * (section.offsetHeight - window.innerHeight));
      });
      li.appendChild(b); nav.appendChild(li); navBtns.push(b);
    });
    var chEl = $('#chapter'), curCh = -1;
    function setChapter(ci) {
      if (ci === curCh) return;
      var first = curCh === -1; curCh = ci;
      navBtns.forEach(function (b, k) { b.classList.toggle('is-active', k === ci); });
      var m = MOMENTS[ci];
      var apply = function () {
        $('#chVol').textContent = m.vol; $('#chTitle').textContent = m.t; $('#chDesc').textContent = m.d; $('#chCount').textContent = m.c;
        chEl.classList.remove('is-swapping');
      };
      if (first) apply(); else { chEl.classList.add('is-swapping'); setTimeout(apply, 260); }
    }
    setChapter(0);
    $('#mediathequeBtn').addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); NWC.toast('Dans le site final, ce bouton ouvre la médiathèque : 487 photos et vidéos, filtrables par événement.'); });

    if (reduced) return;
    var bar = $('#momentsBar'), inView = false, wz = ZMIN, mx = 0, my = 0, tmx = 0, tmy = 0;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; if (inView) requestAnimationFrame(loop); }, { rootMargin: '100px 0px' }).observe(section);
    else { inView = true; }
    if (fine) section.addEventListener('pointermove', function (e) { tmx = e.clientX / window.innerWidth - .5; tmy = e.clientY / window.innerHeight - .5; }, { passive: true });
    var running = false;
    function loop() {
      if (running) return; running = true;
      (function frame() {
        if (!inView) { running = false; return; }
        var r = section.getBoundingClientRect(), total = section.offsetHeight - window.innerHeight;
        var p = clamp(-r.top / Math.max(1, total), 0, 1);
        var target = ZMIN + p * (ZMAX - ZMIN);
        wz += (target - wz) * .12;
        mx += (tmx - mx) * .06; my += (tmy - my) * .06;
        world.style.transform = 'translate3d(0,0,' + wz.toFixed(1) + 'px)';
        tunnel.style.perspectiveOrigin = (50 + mx * 10).toFixed(2) + '% ' + (50 + my * 8).toFixed(2) + '%';
        cards.forEach(function (c) {
          var z = c.z + wz, o;
          if (z < -4200 || z > 760) { if (c.v !== 0) { c.el.style.visibility = 'hidden'; c.v = 0; } return; }
          if (c.v !== 1) { c.el.style.visibility = 'visible'; c.v = 1; }
          o = z < -2400 ? clamp((z + 4200) / 1800, 0, 1) : z > 260 ? clamp(1 - (z - 260) / 500, 0, 1) : 1;
          c.el.style.opacity = o.toFixed(3);
        });
        var focus = clamp(Math.round((wz - 260) / GAP), 0, M - 1);
        setChapter(Math.floor(focus / PER));
        bar.style.width = (p * 100).toFixed(2) + '%';
        requestAnimationFrame(frame);
      })();
    }
  });

  /* ───────── Visionneuse ───────── */
  var lbIdx = 0;
  function openLB(i) {
    var lb = $('#lightbox'); lbIdx = i; showLB();
    lastFocus = document.activeElement; lb.hidden = false; lockScroll(true);
    $('.lb-close', lb).focus({ preventScroll: true });
  }
  function showLB() { var it = LB[lbIdx]; if (!it) return; $('#lbImg').src = it.src; $('#lbImg').alt = it.cap; $('#lbCap').textContent = it.cap + ' · ' + (lbIdx + 1) + '/' + LB.length; }
  function closeLB() { var lb = $('#lightbox'); lb.hidden = true; lockScroll(false); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true }); }
  mod('visionneuse', function () {
    var lb = $('#lightbox');
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target.closest('[data-close]')) closeLB(); });
    $('#lbPrev').addEventListener('click', function () { lbIdx = (lbIdx - 1 + LB.length) % LB.length; showLB(); });
    $('#lbNext').addEventListener('click', function () { lbIdx = (lbIdx + 1) % LB.length; showLB(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLB();
      if (e.key === 'ArrowLeft') $('#lbPrev').click();
      if (e.key === 'ArrowRight') $('#lbNext').click();
    });
  });

  /* ───────── Donner : accordéon, copie, référence ───────── */
  function copyText(btn) {
    var val = btn.dataset.copy, label = btn.textContent;
    var ok = function () { btn.textContent = 'Copié ✓'; btn.classList.add('is-done'); setTimeout(function () { btn.textContent = label; btn.classList.remove('is-done'); }, 1800); };
    var fallback = function () {
      var src = btn.parentNode.querySelector('[data-copy-src], .mono');
      if (src) { var r = document.createRange(); r.selectNodeContents(src); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      NWC.toast('Numéro sélectionné : copie-le avec Ctrl+C ou un appui long.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(val).then(ok).catch(fallback); else fallback();
  }
  mod('donner', function () {
    var ops = $$('.op');
    ops.forEach(function (op) {
      $('.op-head', op).addEventListener('click', function () {
        var open = !op.classList.contains('is-open');
        ops.forEach(function (o) { o.classList.remove('is-open'); $('.op-head', o).setAttribute('aria-expanded', 'false'); });
        if (open) { op.classList.add('is-open'); $('.op-head', op).setAttribute('aria-expanded', 'true'); }
      });
    });
    $$('[data-copy]').forEach(function (b) { b.addEventListener('click', function () { copyText(b); }); });
    var form = $('#refForm'), input = $('#refInput'), err = $('#refErr');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value.trim().length < 6) { err.hidden = false; input.setAttribute('aria-invalid', 'true'); input.focus(); return; }
      err.hidden = true; input.removeAttribute('aria-invalid'); input.value = '';
      NWC.toast('Merci ! Ton don est déclaré. Ton reçu arrive par SMS dans quelques minutes.');
    });
  });

  /* ───────── Planifier sa visite ───────── */
  mod('formulaire-visite', function () {
    var drawer = $('#visitDrawer'), form = $('#visitForm'), sundays = $('#vSundays');
    function buildSundays() {
      sundays.innerHTML = '';
      var s = service(Date.now()).start;
      for (var i = 0; i < 4; i++) {
        var ms = s + i * 7 * 86400e3;
        var lab = document.createElement('label');
        lab.innerHTML = '<input type="radio" name="dimanche"><span></span>';
        var inp = lab.querySelector('input'); inp.value = String(ms); inp.id = 'vSun' + i; if (i === 0) inp.checked = true;
        lab.querySelector('span').textContent = frDate(ms, { weekday: 'short', day: 'numeric', month: 'short' });
        sundays.appendChild(lab);
      }
    }
    function openVisit() {
      buildSundays();
      $('#visitStepForm').hidden = false; $('#visitStepDone').hidden = true;
      NWC.closeMenu && NWC.closeMenu();
      openDrawer(drawer);
    }
    NWC.openVisit = openVisit;
    document.addEventListener('click', function (e) { if (e.target.closest('[data-open-visit]')) { e.preventDefault(); openVisit(); } });

    var name = $('#vName'), phone = $('#vPhone');
    function setErr(input, errEl, on) { errEl.hidden = !on; if (on) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid'); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var n = name.value.trim(), digits = phone.value.replace(/\D/g, '');
      if (digits.length === 13 && digits.indexOf('225') === 0) digits = digits.slice(3);
      var badName = n.length < 2, badPhone = digits.length !== 10;
      setErr(name, $('#vNameErr'), badName); setErr(phone, $('#vPhoneErr'), badPhone);
      if (badName) { name.focus(); return; } if (badPhone) { phone.focus(); return; }
      var chosen = form.querySelector('input[name="dimanche"]:checked');
      var when = frDate(+chosen.value, { weekday: 'long', day: 'numeric', month: 'long' });
      var nice = digits.replace(/(\d{2})(?=\d)/g, '$1 ');
      $('#doneTitle').textContent = 'C\'est noté, ' + n.charAt(0).toUpperCase() + n.slice(1) + ' !';
      $('#doneText').textContent = 'On t\'attend ' + when.toLowerCase() + ' à 13h00. Quelqu\'un de l\'équipe Accueil t\'écrira la veille sur WhatsApp au ' + nice + '.';
      $('#visitStepForm').hidden = true; $('#visitStepDone').hidden = false;
      form.reset();
      $('.drawer-close', drawer).focus({ preventScroll: true });
    });
  });

  /* ───────── Lettre du dimanche ───────── */
  mod('newsletter', function () {
    var f = $('#newsForm'), i = $('#newsEmail');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(i.value.trim())) { i.setAttribute('aria-invalid', 'true'); NWC.toast('Vérifie ton adresse e-mail : il manque sans doute un « @ » ou un domaine.'); i.focus(); return; }
      i.removeAttribute('aria-invalid'); i.value = '';
      NWC.toast('Inscription enregistrée : confirme-la depuis ta boîte mail.');
    });
    var y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  });

  /* ───────── Curseur contextuel + boutons magnétiques ───────── */
  mod('curseur', function () {
    if (!fine || reduced) return;
    var c = $('#cursor'), lab = $('#cursorLabel'), x = -100, y = -100, cx = -100, cy = -100;
    $('#montsStage').dataset.cursor = 'Explorer';
    window.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY; c.classList.add('is-visible');
      var t = e.target.closest && e.target.closest('[data-cursor]');
      var label = t && !e.target.closest('.mont-label') ? t.dataset.cursor : '';
      if (lab.textContent !== label) lab.textContent = label;
      c.classList.toggle('has-label', !!label);
    }, { passive: true });
    document.addEventListener('pointerleave', function () { c.classList.remove('is-visible'); });
    (function loop() {
      cx += (x - cx) * .2; cy += (y - cy) * .2;
      c.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
      requestAnimationFrame(loop);
    })();
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + clamp(dx * .22, -14, 14).toFixed(1) + 'px,' + clamp(dy * .3, -10, 10).toFixed(1) + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  });

  /* ───────── Apparitions au défilement (jamais masquées au repos) ───────── */
  mod('apparitions', function () {
    if (!hasGsap || reduced) return;
    $$('.pillar-head, .bento > *, .give-head, .op, .quiz, .live-left, .live-right, .vstep-cta, .foot-top').forEach(function (el) {
      gsap.from(el, { y: 70, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
    $$('.pillar-n').forEach(function (el) {
      gsap.fromTo(el, { yPercent: 30 }, { yPercent: -10, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.fromTo('.join-bg', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.join', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.foot-word', { xPercent: 4 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.from('.series-name', { yPercent: 30, ease: 'none', scrollTrigger: { trigger: '.b-player', start: 'top bottom', end: 'center center', scrub: true } });
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  });
})();
