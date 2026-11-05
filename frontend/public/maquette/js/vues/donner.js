/* ════════════════════════════════════════════════════════════════════
   Vue « Donner » (/donner) — dons déclaratifs, comme aujourd'hui :
   1) choix de l'opérateur (méthodes actives de l'API), 2) numéro + nom +
   code USSD à copier et instructions, 3) déclaration : montant rapide
   (1 000 → 50 000) ou libre (100 à 10 000 000 FCFA), type (offrande, dîme,
   mission, construction, autre), référence (80 max, unique), nom et
   téléphone pour les visiteurs, mot au pasteur (500 max) → statut en attente.
   ════════════════════════════════════════════════════════════════════ */
(window.NWCV = window.NWCV || {}).donner = {
  render: function (P) {
    var I = P.I;
    var TYPES = [['offering', 'Offrande'], ['tithe', 'Dîme'], ['mission', 'Mission'], ['building', 'Construction'], ['other', 'Autre']];
    P.host.innerHTML = P.phero('Donner', 'Sème dans<br><em class="serif">la vision.</em>', 'Tes dons financent les cultes, l\'évangélisation et les actions sociales de l\'église. Avec ton Mobile Money, c\'est fait en moins d\'une minute.',
      [['3', 'opérateurs acceptés'], ['1 min', 'pour donner'], ['100 %', 'tracé par la Finance']]) +
      '<section class="light" style="padding-bottom:clamp(64px,8vw,120px)"><div class="wrap give2">' +
      '<div class="give2-steps">' +
      // Étape 1 : opérateur
      '<div class="gstep reveal"><span class="gstep-n">1</span><div><h2 class="h3">Choisis ton opérateur</h2><div class="paygrid" style="margin-top:14px">' + P.OPS.map(function (o, i) {
        return '<label class="payopt" style="--op:' + o.c + '"><input type="radio" name="dOp" value="' + o.id + '"' + (i ? '' : ' checked') + '><span><i' + (o.dark ? ' style="color:var(--encre)"' : '') + '>' + o.short + '</i>' + o.n + '</span></label>';
      }).join('') + '</div></div></div>' +
      // Étape 2 : destinataire
      '<div class="gstep reveal"><span class="gstep-n">2</span><div style="min-width:0"><h2 class="h3">Envoie ton don</h2><div class="drecip" id="dRecip"></div></div></div>' +
      // Étape 3 : déclaration
      '<div class="gstep reveal"><span class="gstep-n">3</span><div style="min-width:0"><h2 class="h3">Déclare-le pour ton reçu</h2>' +
      '<form id="dForm" novalidate class="dform">' +
      '<fieldset class="field"><legend>Montant</legend><div class="seg" id="dAmounts">' + [1000, 2000, 5000, 10000, 25000, 50000].map(function (a, i) { return '<label><input type="radio" name="dAmt" value="' + a + '"' + (i === 2 ? ' checked' : '') + '><span>' + a.toLocaleString('fr-FR') + '</span></label>'; }).join('') + '<label><input type="radio" name="dAmt" value="libre"><span>Autre montant</span></label></div>' +
      '<div class="dfree" id="dFree" hidden><input id="dAmtFree" type="number" inputmode="numeric" min="100" max="10000000" step="100" placeholder="Ex. 15 000" aria-label="Montant libre en FCFA"><span>FCFA</span></div><p class="field-err" id="dAmtErr" hidden>Entre un montant entre 100 et 10 000 000 FCFA.</p></fieldset>' +
      '<fieldset class="field"><legend>Type de don</legend><div class="seg">' + TYPES.map(function (t, i) { return '<label><input type="radio" name="dType" value="' + t[0] + '"' + (i ? '' : ' checked') + '><span>' + t[1] + '</span></label>'; }).join('') + '</div></fieldset>' +
      '<div class="field"><label for="dRef">Référence de la transaction</label><input id="dRef" class="mono" maxlength="80" placeholder="Ex. CI241105.1432.A12345" autocomplete="off"><p class="field-err" hidden>Colle la référence reçue par SMS (80 caractères maximum).</p></div>' +
      '<div class="dguest"><div class="field"><label for="dName">Ton nom</label><input id="dName" autocomplete="name"><p class="field-err" hidden>Indique ton nom pour le reçu.</p></div>' +
      '<div class="field"><label for="dPhone">Ton téléphone</label><input id="dPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="07 00 00 00 00"><p class="field-err" hidden>Entre un numéro valide.</p></div></div>' +
            '<div class="field"><label for="dNote">Un mot pour le pasteur <small>(facultatif, 500 caractères)</small></label><textarea id="dNote" rows="3" maxlength="500"></textarea></div>' +
      '<button class="btn btn-bordeaux" type="submit">Déclarer mon don</button></form>' +
      '<div class="dok" id="dOk" hidden></div></div></div>' +
      '</div>' +
      // Colonne : verset + transparence
      '<aside class="give2-side"><blockquote class="give-verse" style="border:0;padding:0;margin:0"><p class="serif">« Que chacun donne comme il l\'a résolu en son cœur, sans tristesse ni contrainte ; car Dieu aime celui qui donne avec joie. »</p><cite class="mono">2 Corinthiens 9:7</cite></blockquote>' +
      '<div class="box"><p class="kicker">À quoi servent tes dons</p><ul class="uses"><li><b>Les cultes</b><span>Son, lumière, accueil chaque dimanche.</span></li><li><b>L\'évangélisation</b><span>Campus, quartiers, événements comme le Cypher.</span></li><li><b>Le social</b><span>Soutien concret aux membres en difficulté.</span></li></ul></div>' +
      '<div class="box"><p class="kicker">Transparence</p><p style="margin:0;color:var(--muted)">Chaque déclaration est vérifiée par le département Finance avec la référence de transaction.</p></div></aside>' +
      '</div></section>';
  },
  setup: function (N, P) {
    var $ = N.$, $$ = N.$$;
    function recip() {
      var id = ($('input[name="dOp"]:checked') || {}).value, o = P.OPS.filter(function (x) { return x.id === id; })[0] || P.OPS[0];
      var ussd = (o.steps[0].match(/[#*]\d+#/) || [''])[0];
      $('#dRecip').innerHTML = '<div class="drecip-card" style="--op:' + o.c + '"><span class="drecip-op"><i' + (o.dark ? ' style="color:var(--encre)"' : '') + '>' + o.short + '</i>' + o.n + '</span>' +
        '<div class="drecip-row"><span class="label">Numéro</span><b class="mono" data-copy-src>' + o.num + '</b><button class="copy" type="button" data-copy="' + o.raw + '">Copier</button></div>' +
        '<div class="drecip-row"><span class="label">Bénéficiaire</span><b>NEW WINE CHURCH</b><button class="copy" type="button" data-copy="NEW WINE CHURCH">Copier</button></div>' +
        (ussd ? '<div class="drecip-row"><span class="label">Code</span><b class="mono">' + ussd + '</b><button class="copy" type="button" data-copy="' + ussd + '">Copier</button></div>' : '') +
        '<ol class="op-steps" style="color:var(--muted);margin:6px 0 0">' + o.steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '<li>Note la référence reçue par SMS</li></ol></div>';
      $$('#dRecip [data-copy]').forEach(function (b) { b.addEventListener('click', function () { N.copy(b); }); });
    }
    $$('input[name="dOp"]').forEach(function (r) { r.addEventListener('change', recip); });
    recip();
    $$('input[name="dAmt"]').forEach(function (r) { r.addEventListener('change', function () { $('#dFree').hidden = r.value !== 'libre' || !r.checked; if (r.value === 'libre' && r.checked) $('#dAmtFree').focus(); }); });
    $('#dForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var a = ($('input[name="dAmt"]:checked') || {}).value, amount = a === 'libre' ? +$('#dAmtFree').value : +a;
      var badAmt = !(amount >= 100 && amount <= 10000000); $('#dAmtErr').hidden = !badAmt;
      var bad = badAmt;
      bad = P.fieldErr($('#dRef'), !$('#dRef').value.trim()) || bad;
      bad = P.fieldErr($('#dName'), $('#dName').value.trim().length < 2) || bad;
      bad = P.fieldErr($('#dPhone'), !P.rePhone.test($('#dPhone').value.trim())) || bad;
      if (bad) { var f = $('#dForm [aria-invalid="true"]') || $('#dAmtFree'); if (f) f.focus(); return; }
      var type = $('input[name="dType"]:checked').parentNode.textContent;
      $('#dForm').hidden = true;
      var ok = $('#dOk'); ok.hidden = false;
      ok.innerHTML = '<span class="status s-wait">En attente de vérification</span><h3 class="display" style="font-size:clamp(2rem,4vw,3rem);margin:8px 0">Merci, ' + P.esc($('#dName').value.trim().split(' ')[0]) + ' !</h3>' +
        '<p class="lead">Ton don de <b>' + amount.toLocaleString('fr-FR') + ' FCFA</b> (' + P.esc(type) + ') est bien déclaré. La Finance le vérifie avec ta référence <b class="mono">' + P.esc($('#dRef').value.trim()) + '</b>.</p>' +
        '<div class="row-btns"><button class="btn btn-ghost btn-sm" type="button" id="dAgain">Faire un autre don</button></div>';
      $('#dAgain').addEventListener('click', function () { $('#dForm').reset(); $('#dFree').hidden = true; $('#dForm').hidden = false; ok.hidden = true; });
      N.scrollTo(ok, -120);
    });
  }
};
