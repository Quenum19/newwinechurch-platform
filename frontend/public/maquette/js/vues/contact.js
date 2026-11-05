/* ════════════════════════════════════════════════════════════════════
   Vue « Contact » (/contact). Formulaire repris à l'identique : nom
   (lettres, 120 max), e-mail, téléphone facultatif (8 à 30), sujet libre
   (200 max), message (20 à 3000), champ piège anti-robot. Carte et itinéraire.
   Ajout : mur de prière branché sur l'API existante /prayer-requests
   (demande 10 à 2000 caractères, catégorie, anonymat, bouton « Je prie »).
   ════════════════════════════════════════════════════════════════════ */
(window.NWCV = window.NWCV || {}).contact = {
  render: function (P) {
    var I = P.I;
    var CAT = [['health', 'Santé'], ['family', 'Famille'], ['work', 'Travail'], ['finance', 'Finances'], ['spiritual', 'Vie spirituelle'], ['other', 'Autre']];
    var WALL = [['Anonyme', 'family', 'Pour la réconciliation dans ma famille avant les fêtes.', 18, '2 h'], ['Esther', 'work', 'Je passe un entretien d\'embauche jeudi. Priez pour que je sois en paix.', 27, '5 h'],
      ['Anonyme', 'health', 'Pour la guérison de ma maman, hospitalisée à Treichville.', 41, '1 j'], ['Junior', 'spiritual', 'Pour rester constant dans la lecture de la Bible ce mois-ci.', 12, '2 j'],
      ['Anonyme', 'finance', 'Pour trouver de quoi payer ma scolarité du deuxième semestre.', 33, '3 j'], ['Prisca', 'other', 'Pour mon voyage de retour au pays et la sécurité sur la route.', 9, '4 j']];
    var catN = {}; CAT.forEach(function (c) { catN[c[0]] = c[1]; });
    P.host.innerHTML = P.phero('Contact', 'Parlons-<br><em class="serif">nous.</em>', 'Une question, une envie de servir, un besoin de prière : écris-nous, l\'équipe répond en général sous 48 heures.',
      null, '<div class="cinfo"><p><span class="label">Adresse</span>Cocody-Bonoumin, près d\'Abidjan Mall<br>Abidjan, Côte d\'Ivoire</p><p><span class="label">Culte</span>Dimanche · 13h00 — 15h00</p><p><span class="label">E-mail</span><span class="mono">contact@newinechurch.org</span></p><p><span class="label">Téléphone / WhatsApp</span><span class="mono">+225 07 79 16 98 78</span></p></div>') +
      '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap">' +
      '<div class="cgrid"><form class="cform reveal" id="cForm" novalidate><h2 class="h3 sec-title">Écris-nous</h2>' +
      '<div class="cform-row"><div class="field"><label for="cName">Ton nom</label><input id="cName" autocomplete="name" maxlength="120"><p class="field-err" hidden>Indique ton nom (lettres uniquement).</p></div>' +
      '<div class="field"><label for="cMail">Ton e-mail</label><input id="cMail" type="email" autocomplete="email"><p class="field-err" hidden>Entre une adresse e-mail valide pour qu\'on puisse te répondre.</p></div></div>' +
      '<div class="cform-row"><div class="field"><label for="cPhone">Téléphone <small>(facultatif)</small></label><input id="cPhone" type="tel" inputmode="tel" autocomplete="tel"><p class="field-err" hidden>Entre un numéro valide ou laisse vide.</p></div>' +
      '<div class="field"><label for="cSubj">Sujet <small>(facultatif)</small></label><input id="cSubj" maxlength="200" list="cSubjects" placeholder="Ex. Rejoindre un département"><datalist id="cSubjects"><option value="Première visite"><option value="Rejoindre un département"><option value="Trouver une cellule"><option value="Question sur un événement"><option value="Rencontrer le pasteur"></datalist></div></div>' +
      '<div class="field"><label for="cMsg">Ton message</label><textarea id="cMsg" rows="6" maxlength="3000"></textarea><p class="field-err" hidden>Ton message doit faire au moins 20 caractères.</p><span class="ccount mono" id="cCount">0 / 3000</span></div>' +
      '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '<button class="btn btn-bordeaux" type="submit">Envoyer le message</button></form>' +
      '<div class="cmap reveal"><iframe title="Plan d\'accès : Cocody-Bonoumin, près d\'Abidjan Mall" src="https://www.google.com/maps?q=Abidjan+Mall+Cocody&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
      '<a class="btn btn-ivoire btn-sm cmap-btn" href="https://www.google.com/maps/search/?api=1&amp;query=Abidjan+Mall+Bonoumin+Cocody" target="_blank" rel="noopener">Itinéraire ↗</a></div></div>' +
      // Mur de prière
      '<div id="priere" class="prayer"><div class="center-head"><p class="kicker">Mur de prière</p><h2 class="h2 display">On prie<br><em class="serif">avec toi.</em></h2><p class="lead" style="margin-inline:auto">Dépose ton sujet : l\'équipe Sentinelle et toute la communauté prient pour toi. Tu peux rester anonyme.</p></div>' +
      '<div class="pgrid2"><form class="cform reveal" id="pForm" novalidate><h3 class="h3">Ton sujet de prière</h3>' +
      '<div class="field"><label for="pName">Ton prénom</label><input id="pName" autocomplete="given-name"><p class="field-err" hidden>Indique ton prénom, ou coche « rester anonyme ».</p></div>' +
      '<div class="field"><label for="pMail">E-mail <small>(facultatif, pour avoir des nouvelles)</small></label><input id="pMail" type="email" autocomplete="email"></div>' +
      '<fieldset class="field"><legend>Catégorie</legend><div class="seg">' + CAT.map(function (c, i) { return '<label><input type="radio" name="pCat" value="' + c[0] + '"' + (i === 4 ? ' checked' : '') + '><span>' + c[1] + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<div class="field"><label for="pReq">Ta demande</label><textarea id="pReq" rows="4" maxlength="2000"></textarea><p class="field-err" hidden>Écris au moins 10 caractères.</p></div>' +
      '<label class="check"><input type="checkbox" id="pAnon"> Rester anonyme sur le mur</label>' +
      '<button class="btn btn-bordeaux" type="submit">Déposer ma demande</button></form>' +
      '<div><div class="chiprow" id="pFilter" style="margin-bottom:12px"><button class="chip" type="button" data-pc="" aria-pressed="true">Toutes</button>' + CAT.map(function (c) { return '<button class="chip" type="button" data-pc="' + c[0] + '" aria-pressed="false">' + c[1] + '</button>'; }).join('') + '</div>' +
      '<ul class="pwall" id="pWall">' + WALL.map(function (w, i) {
        return '<li data-cat="' + w[1] + '"><div class="pwall-head"><b>' + P.esc(w[0]) + '</b><span class="etag">' + catN[w[1]] + '</span><span class="mono">il y a ' + w[4] + '</span></div><p>' + P.esc(w[2]) + '</p><button class="abtn" type="button" data-pray="' + i + '" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/></svg> Je prie · <b>' + w[3] + '</b></button></li>';
      }).join('') + '</ul></div></div></div>' +
      '</div></section>';
  },
  setup: function (N, P) {
    var $ = N.$, $$ = N.$$;
    var msg = $('#cMsg');
    msg.addEventListener('input', function () { $('#cCount').textContent = msg.value.length + ' / 3000'; });
    $('#cForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = false;
      bad = P.fieldErr($('#cName'), !/^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,120}$/.test($('#cName').value.trim())) || bad;
      bad = P.fieldErr($('#cMail'), !P.reMail.test($('#cMail').value.trim())) || bad;
      var ph = $('#cPhone').value.trim();
      bad = P.fieldErr($('#cPhone'), ph !== '' && !(ph.length >= 8 && ph.length <= 30 && P.rePhone.test(ph))) || bad;
      bad = P.fieldErr(msg, msg.value.trim().length < 20) || bad;
      if (bad) { var f = $('#cForm [aria-invalid="true"]'); if (f) f.focus(); return; }
      $('#cForm').innerHTML = '<div class="done-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h2 class="h3 sec-title">Message envoyé</h2><p class="lead">Merci ! L\'équipe te répond en général sous 48 heures, par e-mail.</p>';
    });
    // Mur de prière
    $('#pAnon').addEventListener('change', function (e) { $('#pName').disabled = e.target.checked; if (e.target.checked) P.fieldErr($('#pName'), false); });
    $('#pForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var anon = $('#pAnon').checked, bad = false;
      if (!anon) bad = P.fieldErr($('#pName'), $('#pName').value.trim().length < 2) || bad;
      bad = P.fieldErr($('#pReq'), $('#pReq').value.trim().length < 10) || bad;
      if (bad) { var f = $('#pForm [aria-invalid="true"]'); if (f) f.focus(); return; }
      var c = $('input[name="pCat"]:checked'), li = document.createElement('li');
      li.dataset.cat = c.value; li.className = 'is-new';
      li.innerHTML = '<div class="pwall-head"><b>' + P.esc(anon ? 'Anonyme' : $('#pName').value.trim()) + '</b><span class="etag">' + c.parentNode.textContent + '</span><span class="mono">à l\'instant</span></div><p>' + P.esc($('#pReq').value.trim()) + '</p><button class="abtn" type="button" aria-pressed="false" data-pray="n"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z"/></svg> Je prie · <b>0</b></button>';
      $('#pWall').prepend(li); bindPray(li.querySelector('[data-pray]'));
      $('#pForm').reset(); $('#pName').disabled = false;
      N.toast('Ta demande est déposée. On prie avec toi.');
    });
    function bindPray(b) {
      b.addEventListener('click', function () {
        var on = b.getAttribute('aria-pressed') !== 'true', n = b.querySelector('b');
        b.setAttribute('aria-pressed', on ? 'true' : 'false'); n.textContent = +n.textContent + (on ? 1 : -1);
      });
    }
    $$('[data-pray]').forEach(bindPray);
    $$('#pFilter .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        $$('#pFilter .chip').forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        $$('#pWall li').forEach(function (li) { li.hidden = !!c.dataset.pc && li.dataset.cat !== c.dataset.pc; });
      });
    });
    if (location.hash === '#priere') setTimeout(function () { N.scrollTo($('#priere'), -90); }, 400);
  }
};
