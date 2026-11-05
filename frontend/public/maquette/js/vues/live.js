/* ════════════════════════════════════════════════════════════════════
   Vue « En direct » (/live). Sur le site actuel : lecteur Agora quand un
   live est en cours (détecté via /live/current + WebSocket), sinon
   « Aucun direct » et la carte « Prochain direct » (/live/next).
   Ajouts proposés : rappel 15 min avant, rediffusions (champ replay_url
   déjà fourni par l'API), lien de secours YouTube.
   ════════════════════════════════════════════════════════════════════ */
(window.NWCV = window.NWCV || {}).live = {
  render: function (P) {
    var I = P.I, replays = P.M.slice(0, 3);
    P.host.innerHTML = '<section class="livehero" id="lvHero"><div class="wrap">' + P.crumbs([['Accueil', './'], ['En direct']]) +
      '<div class="lv-head"><div><p class="lv-status" id="lvStatus"><span class="live-dot"></span><span>Hors antenne</span></p><h1 class="display lv-title" id="lvTitle">Le culte,<br><em class="serif">où que tu sois.</em></h1></div>' +
      '<div class="seg2" aria-label="Aperçu des états (maquette)"><button type="button" data-lv="off" aria-pressed="true">Hors direct</button><button type="button" data-lv="on" aria-pressed="false">En direct</button></div></div>' +
      '<div class="lv-grid"><div class="lv-screen" id="lvScreen"></div>' +
      '<aside class="lv-side" id="lvSide"></aside></div></div></section>' +
      '<section class="light section"><div class="wrap">' +
      '<div class="rail-head"><div><p class="kicker">Rediffusions</p><h2 class="h3 sec-title">Tu as raté un dimanche ?</h2></div><a class="link-arrow" href="messages/?type=live_replay">Toutes les rediffusions →</a></div>' +
      '<div class="mgrid">' + replays.map(P.mcard).join('') + '</div>' +
      '<div class="lv-help reveal"><div class="info"><span class="label">Le direct ne se lance pas ?</span><p>Vérifie ta connexion puis recharge la page. En dernier recours, le culte est aussi diffusé sur YouTube.</p><a class="link-arrow" href="https://www.youtube.com/@NewWineChurchMD" target="_blank" rel="noopener">Ouvrir YouTube ↗</a></div>' +
      '<div class="info"><span class="label">Un sujet de prière ?</span><p>Pendant le direct, l\'équipe Sentinelle prie pour les sujets déposés.</p><a class="link-arrow" href="contact/#priere">Déposer un sujet de prière →</a></div>' +
      '<div class="info"><span class="label">Donner pendant le culte</span><p>Orange Money, MTN MoMo ou Wave, en moins d\'une minute.</p><a class="link-arrow" href="donner/">Faire un don →</a></div></div>' +
      '</div></section>';
  },
  setup: function (N, P) {
    var $ = N.$, $$ = N.$$, I = P.I, s = N.service(Date.now()), state = s.live ? 'on' : 'off', remind = false, tmr;
    function draw() {
      clearInterval(tmr);
      $$('[data-lv]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lv === state ? 'true' : 'false'); });
      var on = state === 'on';
      $('#lvHero').classList.toggle('is-live', on);
      $('#lvStatus').innerHTML = '<span class="live-dot' + (on ? ' is-live' : '') + '"></span><span>' + (on ? 'En direct' : 'Hors antenne') + '</span>';
      if (on) {
        $('#lvScreen').innerHTML = '<div class="lv-player"><img src="img/v-adore.webp" alt=""><span class="lv-badge">● EN DIRECT</span><span class="lv-viewers mono">' + I.eye + ' 312 spectateurs</span>' +
          '<button class="screen-play" type="button" id="lvPlay" aria-label="Activer le son">' + I.play + '</button><div class="screen-bar"><span>Culte du dimanche · Cœurs neufs</span><span>Flux Agora · HD</span></div></div>';
        $('#lvSide').innerHTML = '<div class="box"><p class="kicker">En ce moment</p><h3>Culte du dimanche</h3><p style="margin:0;color:var(--muted)">Louange puis message de la série « Cœurs neufs ». Fin vers 15h00.</p></div>' +
          '<div class="box"><p class="kicker">Pendant le culte</p><a class="btn btn-bordeaux btn-block" href="donner/">Donner</a><a class="btn btn-ghost btn-block" href="contact/#priere" style="--fg:var(--ink)">Demander la prière</a></div>';
        $('#lvPlay').addEventListener('click', function () { N.toast('Sur le site final, le flux Agora démarre ici avec le son.'); });
      } else {
        var d = N.service(Date.now()).start;
        $('#lvScreen').innerHTML = '<div class="lv-off"><span class="mono">Aucun direct pour le moment</span><h2 class="display">Prochain direct<br><em class="serif">' + N.frDate(d, { weekday: 'long', day: 'numeric', month: 'long' }).toLowerCase() + '</em></h2>' +
          '<div class="live-count" style="max-width:520px"><div><span class="mono" id="lvD">0</span><small>jours</small></div><div><span class="mono" id="lvH">00</span><small>heures</small></div><div><span class="mono" id="lvM">00</span><small>minutes</small></div><div><span class="mono" id="lvS">00</span><small>secondes</small></div></div>' +
          '<p>Chaque dimanche dès 13h00, heure d\'Abidjan.</p></div>';
        $('#lvSide').innerHTML = '<div class="box"><p class="kicker">Prochain direct</p><h3>Culte du dimanche</h3><p style="margin:0;color:var(--muted)">' + N.frDate(d, { weekday: 'long', day: 'numeric', month: 'long' }) + ' · 13h00 — 15h00</p>' +
          '<button class="btn btn-bordeaux btn-block" type="button" id="lvRemind" aria-pressed="' + remind + '">' + (remind ? 'Rappel activé ✓' : 'M\'envoyer un rappel 15 min avant') + '</button></div>' +
          '<div class="box"><p class="kicker">Sur place</p><p style="margin:0;color:var(--muted)">Cocody-Bonoumin, près d\'Abidjan Mall.</p><button class="btn btn-ghost btn-block" type="button" data-open-visit style="--fg:var(--ink)">Viens ce dimanche</button></div>';
        $('#lvRemind').addEventListener('click', function () { remind = !remind; draw(); N.toast(remind ? 'Rappel activé : on te prévient 15 minutes avant le direct.' : 'Rappel désactivé.'); });
        var tick = function () { var diff = Math.max(0, d - Date.now()); $('#lvD').textContent = Math.floor(diff / 86400e3); $('#lvH').textContent = N.pad(Math.floor(diff / 3600e3) % 24); $('#lvM').textContent = N.pad(Math.floor(diff / 60e3) % 60); $('#lvS').textContent = N.pad(Math.floor(diff / 1e3) % 60); };
        tick(); tmr = setInterval(tick, 1000);
      }
    }
    $$('[data-lv]').forEach(function (b) { b.addEventListener('click', function () { state = b.dataset.lv; draw(); }); });
    draw();
  }
};
