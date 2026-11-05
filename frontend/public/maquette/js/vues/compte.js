/* ════════════════════════════════════════════════════════════════════
   Vues du compte (mise en page dédiée, sans menu, comme AuthLayout) :
   espace connexion (adresse secrète), /rejoindre (demande d'adhésion → validée par la RH),
   mot de passe oublié et réinitialisation (sous la même adresse secrète).
   Champs et règles repris de la plateforme actuelle.
   ════════════════════════════════════════════════════════════════════ */
(function () {
  // Espace connexion : adresse non devinable, jamais liée depuis les pages publiques ni écrite dans ce fichier
  // (chargé aussi par la page publique Rejoindre) : on la déduit de l'adresse de la page de connexion elle-même.
  var AUTH = ((location.pathname.match(/\/maquette\/([^/]+)\//) || [])[1] || '') + '/';
  var V = window.NWCV = window.NWCV || {};
  var VERSETS = [
    ['img/v-arrive.webp', 'Car je connais les projets que j\'ai formés sur vous… projets de paix et non de malheur, afin de vous donner un avenir et de l\'espérance.', 'Jérémie 29:11'],
    ['img/t-fg-5.webp', 'Ceux qui se confient en l\'Éternel renouvellent leur force. Ils prennent le vol comme les aigles.', 'Ésaïe 40:31'],
    ['img/v-adore.webp', 'Fortifie-toi et prends courage ! Ne t\'effraie point, car l\'Éternel, ton Dieu, est avec toi dans tout ce que tu entreprendras.', 'Josué 1:9'],
    ['img/fam-orga.webp', 'L\'Éternel est mon berger : je ne manquerai de rien.', 'Psaume 23:1']
  ];
  function shell(P, inner) {
    var v = VERSETS[Math.floor(Math.random() * VERSETS.length)];
    return '<div class="auth"><aside class="auth-art"><img src="' + v[0] + '" alt=""><div class="auth-art-in"><a class="auth-logo" href="./"><img src="img/logo-nwc-96.png" alt="" width="52" height="52"><span>New Wine<small>Church · Abidjan</small></span></a>' +
      '<blockquote><p class="serif">« ' + P.esc(v[1]) + ' »</p><cite class="mono">' + v[2] + '</cite></blockquote></div></aside>' +
      '<div class="auth-main"><a class="auth-back" href="./">← Retour à l\'accueil</a><div class="auth-card">' + inner + '</div><p class="auth-foot">© ' + new Date().getFullYear() + ' New Wine Church · <a href="confidentialite/">Confidentialité</a></p></div></div>';
  }
  function pwdField(id, label) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><div class="pwd"><input id="' + id + '" type="password" autocomplete="' + (id === 'lPwd' ? 'current-password' : 'new-password') + '"><button type="button" class="pwd-eye" data-eye="' + id + '" aria-label="Afficher le mot de passe">Voir</button></div><p class="field-err" hidden></p></div>';
  }
  function eyes(N) { N.$$('[data-eye]').forEach(function (b) { b.addEventListener('click', function () { var i = document.getElementById(b.dataset.eye), s = i.type === 'password'; i.type = s ? 'text' : 'password'; b.textContent = s ? 'Masquer' : 'Voir'; }); }); }
  function err(input, msg) { var p = input.closest('.field').querySelector('.field-err'); p.hidden = !msg; if (msg) { p.textContent = msg; input.setAttribute('aria-invalid', 'true'); } else input.removeAttribute('aria-invalid'); return !!msg; }

  V.connexion = {
    mainClass: 'light',
    render: function (P) {
      P.host.innerHTML = shell(P, '<p class="kicker">Espace membre</p><h1 class="display auth-title">Bon retour<br><em class="serif">parmi nous.</em></h1>' +
        '<form id="lForm" novalidate class="auth-form"><div class="field"><label for="lMail">E-mail</label><input id="lMail" type="email" autocomplete="email"><p class="field-err" hidden></p></div>' + pwdField('lPwd', 'Mot de passe') +
        '<div class="auth-row"><label class="check"><input type="checkbox" id="lRem" checked> Se souvenir de moi</label><a class="linkbtn" href="' + AUTH + 'mot-de-passe-oublie/">Mot de passe oublié ?</a></div>' +
        '<button class="btn btn-bordeaux btn-block" type="submit">Se connecter</button></form>' +
        '<p class="auth-alt">Pas encore membre ? <a class="linkbtn" href="rejoindre/">Rejoindre New Wine Church</a></p>' +
        '<p class="note">Maquette : pour te connecter dès maintenant, utilise la <a class="linkbtn" href="/connexion">connexion actuelle</a>.</p>');
    },
    setup: function (N, P) {
      eyes(N);
      N.$('#lForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var m = N.$('#lMail'), p = N.$('#lPwd'), bad = err(m, P.reMail.test(m.value.trim()) ? '' : 'Entre l\'adresse e-mail de ton compte.');
        bad = err(p, p.value.length >= 6 ? '' : 'Le mot de passe fait au moins 6 caractères.') || bad;
        if (bad) return;
        N.toast('Connexion réussie : sur le site final, tu arrives dans ton espace (membre, leader ou admin selon ton rôle).');
      });
    }
  };

  V.rejoindre = {
    render: function (P) {
      var dept = P.qs('dept'), cell = P.qs('cell'), mont = P.qs('mont');
      var Mo = P.MONTS.filter(function (m) { return m[0] === mont; })[0];
      var D = (window.NWCV._depts || []).filter(function (d) { return d.slug === dept; })[0];
      var pre = Mo ? '<div class="auth-pre"><span>Mont souhaité : <b>' + P.esc(Mo[1]) + '</b> · ' + P.esc(Mo[2]) + '</span><button type="button" data-unpre aria-label="Retirer">×</button></div>' : D ? '<div class="auth-pre"><span>Département souhaité : <b>' + P.esc(D.n) + '</b></span><button type="button" data-unpre aria-label="Retirer">×</button></div>'
        : cell ? '<div class="auth-pre"><span>Cellule souhaitée : <b>' + P.esc(cell.replace(/-/g, ' ')) + '</b></span><button type="button" data-unpre aria-label="Retirer">×</button></div>' : '';
      P.host.innerHTML = shell(P, '<p class="kicker">Rejoindre</p><h1 class="display auth-title">Deviens membre<br><em class="serif">de la famille.</em></h1>' +
        '<ul class="auth-perks"><li>Ton espace : tes dons, tes événements, ta cellule</li><li>Les infos de ton département et de ton mont</li><li>Un accompagnement par l\'équipe Insertion</li></ul>' + pre +
        '<form id="rgForm" novalidate class="auth-form"><div class="cform-row"><div class="field"><label for="rgFirst">Prénom</label><input id="rgFirst" autocomplete="given-name" maxlength="80"><p class="field-err" hidden></p></div><div class="field"><label for="rgLast">Nom</label><input id="rgLast" autocomplete="family-name" maxlength="80"><p class="field-err" hidden></p></div></div>' +
        '<div class="field"><label for="rgMail">E-mail</label><input id="rgMail" type="email" autocomplete="email"><p class="field-err" hidden></p></div>' +
        '<div class="cform-row"><div class="field"><label for="rgPhone">Téléphone <small>(facultatif)</small></label><input id="rgPhone" type="tel" autocomplete="tel"><p class="field-err" hidden></p></div><div class="field"><label for="rgBirth">Date de naissance</label><input id="rgBirth" type="date"><p class="field-err" hidden></p></div></div>' +
        '<div class="cform-row"><fieldset class="field"><legend>Genre <small>(facultatif)</small></legend><div class="seg"><label><input type="radio" name="rgG" value="M"><span>Homme</span></label><label><input type="radio" name="rgG" value="F"><span>Femme</span></label></div></fieldset><div class="field"><label for="rgCity">Ville / commune <small>(facultatif)</small></label><input id="rgCity" list="rgCities"><datalist id="rgCities">' + P.COMMUNES.map(function (c) { return '<option value="' + c + '">'; }).join('') + '</datalist></div></div>' +
        '<div class="field"><label for="rgSponsor">Qui t\'a invité ? <small>(facultatif)</small></label><input id="rgSponsor" maxlength="120"></div>' +
        '<div class="field"><label for="rgWhy">Pourquoi veux-tu rejoindre New Wine ? <small>(facultatif)</small></label><textarea id="rgWhy" rows="3" maxlength="1500"></textarea></div>' +
        '<label class="check"><input type="checkbox" id="rgCgu"><span>J\'accepte les <a class="linkbtn" href="cgu/" target="_blank">conditions d\'utilisation</a> et la <a class="linkbtn" href="confidentialite/" target="_blank">politique de confidentialité</a>.</span></label><p class="field-err" id="rgCguErr" hidden>Coche cette case pour envoyer ta demande.</p>' +
        '<input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
        '<button class="btn btn-bordeaux btn-block" type="submit">Envoyer ma demande</button></form>' +
        '');
    },
    setup: function (N, P) {
      var x = N.$('[data-unpre]'); if (x) x.addEventListener('click', function () { x.parentNode.remove(); });
      N.$('#rgForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var $ = N.$, bad = false, b = $('#rgBirth').value, bd = b ? Date.parse(b) : NaN;
        bad = err($('#rgFirst'), P.reName.test($('#rgFirst').value.trim()) ? '' : 'Ton prénom (lettres uniquement).') || bad;
        bad = err($('#rgLast'), P.reName.test($('#rgLast').value.trim()) ? '' : 'Ton nom (lettres uniquement).') || bad;
        bad = err($('#rgMail'), P.reMail.test($('#rgMail').value.trim()) ? '' : 'Une adresse e-mail valide : tes identifiants y seront envoyés.') || bad;
        var ph = $('#rgPhone').value.trim();
        bad = err($('#rgPhone'), !ph || P.rePhone.test(ph) ? '' : 'Numéro invalide.') || bad;
        bad = err($('#rgBirth'), b && bd < Date.now() && bd > Date.parse('1900-01-01') ? '' : 'Indique ta date de naissance.') || bad;
        var cg = !$('#rgCgu').checked; $('#rgCguErr').hidden = !cg; bad = cg || bad;
        if (bad) { var f = $('#rgForm [aria-invalid="true"]'); if (f) f.focus(); return; }
        N.$('.auth-card').innerHTML = '<div class="done-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1 class="display auth-title">Demande<br><em class="serif">envoyée !</em></h1>' +
          '<p class="lead">Merci ' + P.esc($('#rgFirst').value.trim()) + '. L\'équipe RH étudie ta demande. Dès qu\'elle est validée, tu reçois tes identifiants par e-mail à <b>' + P.esc($('#rgMail').value.trim()) + '</b>.</p>' +
          '<div class="row-btns"><a class="btn btn-bordeaux" href="./">Retour à l\'accueil</a><a class="btn btn-ghost" href="evenements/academie-session-janvier/" style="--fg:var(--ink)">Découvrir l\'Académie</a></div>';
      });
    }
  };

  V.motdepasse = {
    render: function (P) {
      P.host.innerHTML = shell(P, '<p class="kicker">Mot de passe oublié</p><h1 class="display auth-title">Pas de<br><em class="serif">panique.</em></h1><p class="lead">Entre l\'e-mail de ton compte : on t\'envoie un lien pour choisir un nouveau mot de passe.</p>' +
        '<form id="fpForm" novalidate class="auth-form"><div class="field"><label for="fpMail">E-mail</label><input id="fpMail" type="email" autocomplete="email"><p class="field-err" hidden></p></div><button class="btn btn-bordeaux btn-block" type="submit">Envoyer le lien</button></form>' +
        '<p class="auth-alt"><a class="linkbtn" href="' + AUTH + '">← Retour à la connexion</a></p>');
    },
    setup: function (N, P) {
      N.$('#fpForm').addEventListener('submit', function (e) {
        e.preventDefault(); var m = N.$('#fpMail');
        if (err(m, P.reMail.test(m.value.trim()) ? '' : 'Entre une adresse e-mail valide.')) return;
        N.$('#fpForm').innerHTML = '<div class="note" style="margin:0">Si un compte existe pour <b>' + P.esc(m.value.trim()) + '</b>, tu vas recevoir un lien de réinitialisation. Pense à vérifier tes spams.</div><a class="btn btn-ghost btn-block" href="reinitialiser-mot-de-passe/?token=demo&amp;email=' + encodeURIComponent(m.value.trim()) + '" style="--fg:var(--ink)">Voir la page du lien (démo)</a>';
      });
    }
  };

  V.reinitialiser = {
    render: function (P) {
      var tok = P.qs('token'), mail = P.qs('email');
      P.host.innerHTML = shell(P, '<p class="kicker">Nouveau mot de passe</p><h1 class="display auth-title">Choisis-le<br><em class="serif">bien.</em></h1>' +
        (tok ? '' : '<div class="note" style="margin:0 0 14px;background:#FFF1D6;color:#6B4600">Ce lien est incomplet ou a expiré. Demande un nouveau lien depuis « Mot de passe oublié ».</div>') +
        '<form id="rpForm" novalidate class="auth-form"><div class="field"><label for="rpMail">E-mail</label><input id="rpMail" type="email" value="' + P.esc(mail || '') + '" readonly></div>' + pwdField('rpPwd', 'Nouveau mot de passe') +
        '<ul class="pwrules" id="rpRules"><li data-r="len">8 caractères minimum</li><li data-r="up">Une majuscule</li><li data-r="low">Une minuscule</li><li data-r="num">Un chiffre</li><li data-r="sym">Un symbole</li></ul>' + pwdField('rpPwd2', 'Confirme le mot de passe') +
        '<button class="btn btn-bordeaux btn-block" type="submit"' + (tok ? '' : ' disabled') + '>Enregistrer</button></form><p class="auth-alt"><a class="linkbtn" href="' + AUTH + 'mot-de-passe-oublie/">Demander un nouveau lien</a></p>');
    },
    setup: function (N) {
      eyes(N);
      var p = N.$('#rpPwd'), R = { len: /.{8,}/, up: /[A-Z]/, low: /[a-z]/, num: /\d/, sym: /[^A-Za-z0-9]/ };
      p.addEventListener('input', function () { N.$$('#rpRules li').forEach(function (li) { li.classList.toggle('is-ok', R[li.dataset.r].test(p.value)); }); });
      N.$('#rpForm').addEventListener('submit', function (e) {
        e.preventDefault();
        var ok = Object.keys(R).every(function (k) { return R[k].test(p.value); }), p2 = N.$('#rpPwd2');
        var bad = err(p, ok ? '' : 'Le mot de passe ne respecte pas encore toutes les règles.');
        bad = err(p2, p2.value === p.value ? '' : 'Les deux mots de passe ne sont pas identiques.') || bad;
        if (bad) return;
        N.$('.auth-card').innerHTML = '<div class="done-badge" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1 class="display auth-title">C\'est<br><em class="serif">fait.</em></h1><p class="lead">Ton mot de passe est modifié. Tu peux te connecter.</p><a class="btn btn-bordeaux btn-block" href="' + AUTH + '">Se connecter</a>';
      });
    }
  };
})();
