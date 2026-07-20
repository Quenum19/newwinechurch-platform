{{--
  Fiche de suivi call center — impression papier pour les appelants.

  Contient :
    1. En-tête NWC pro
    2. Script d'appel (informations à recueillir)
    3. Tableau pré-rempli (nom + téléphone) avec zones vides à annoter :
       - Cases Présent / Absent / Indécis
       - Nombre d'accompagnants (avec info si enregistrés)
       - Observations

  Variables :
    $event        (Event)
    $tickets      (Collection<EventTicket>)
    $logoDataUri  (string|null)
    $generatedAt  (Carbon)
    $daysUntil    (int — jours restants jusqu'à l'event)
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Fiche call center — {{ $event->title }}</title>
<style>
  @page { margin: 15mm 12mm 15mm 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: DejaVu Sans, sans-serif;
    color: #1F1A14;
    font-size: 10px;
    line-height: 1.4;
    background: #FFFFFF;
  }

  /* ─── HEADER ─── */
  .header {
    padding-bottom: 12px;
    margin-bottom: 14px;
    border-bottom: 3px solid #8B1A2F;
  }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-table td { vertical-align: middle; }
  .header-logo-cell { width: 70px; padding-right: 12px; }
  .header-logo { width: 60px; height: 60px; object-fit: contain; }
  .header-logo-placeholder {
    width: 60px; height: 60px;
    background: #8B1A2F; color: #FFFFFF;
    text-align: center; line-height: 60px;
    font-size: 20px; font-weight: bold;
    border-radius: 6px;
  }
  .brand-name {
    font-size: 9px; font-weight: bold; letter-spacing: 3.5px;
    color: #8B1A2F; text-transform: uppercase;
  }
  .brand-tagline {
    font-size: 8px; color: #A89A82;
    letter-spacing: 1.3px; text-transform: uppercase;
    margin-top: 1px;
  }
  .doc-title {
    font-size: 22px; font-weight: bold; color: #1F1A14;
    text-transform: uppercase; letter-spacing: 0.5px;
    line-height: 1; margin-top: 3px;
  }
  .doc-generated {
    font-size: 8.5px; color: #8B7960;
    margin-top: 4px; font-style: italic;
  }

  /* ─── BANDEAU J-N ─── */
  .countdown-banner {
    background: #8B1A2F;
    color: #FFFFFF;
    padding: 10px 14px;
    border-radius: 5px;
    margin-bottom: 14px;
    text-align: center;
    font-weight: bold;
  }
  .countdown-banner .big {
    font-size: 18px;
    letter-spacing: 1px;
  }
  .countdown-banner .small {
    font-size: 10px;
    font-weight: normal;
    opacity: 0.95;
    margin-top: 3px;
    letter-spacing: 0.8px;
  }

  /* ─── SCRIPT D'APPEL ─── */
  .script {
    background: #FAF6EE;
    border-left: 4px solid #8B1A2F;
    padding: 12px 14px;
    margin-bottom: 14px;
    border-radius: 0 3px 3px 0;
    font-size: 9.5px;
    line-height: 1.55;
  }
  .script-title {
    font-size: 10px;
    font-weight: bold;
    color: #8B1A2F;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 8px;
  }
  .script-intro {
    font-style: italic;
    color: #4A3D2A;
    margin-bottom: 8px;
    background: #FFFFFF;
    padding: 6px 10px;
    border: 1px dashed #C9A961;
    border-radius: 3px;
  }
  .script-steps { padding-left: 18px; }
  .script-steps li { margin: 3px 0; }
  .script-steps strong { color: #8B1A2F; }

  /* ─── STATS RAPIDES ─── */
  .quick-stats {
    width: 100%;
    border-collapse: separate;
    border-spacing: 6px 0;
    margin-bottom: 12px;
  }
  .quick-stats td {
    background: #FFFFFF;
    border: 1px solid #E5DBC7;
    padding: 6px 8px;
    text-align: center;
    border-radius: 3px;
    width: 25%;
  }
  .qs-label {
    font-size: 7.5px; font-weight: bold;
    color: #8B1A2F; text-transform: uppercase;
    letter-spacing: 1.3px;
  }
  .qs-value {
    font-size: 15px; font-weight: bold; color: #1F1A14;
    margin-top: 2px;
  }

  /* ─── TABLEAU ─── */
  table.calls {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    page-break-inside: auto;
  }
  table.calls thead th {
    background: #6B1422;
    color: #FFFFFF;
    padding: 8px 4px;
    text-align: center;
    font-size: 8.5px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 1px solid #4A0E1A;
  }
  table.calls thead { display: table-header-group; }
  table.calls tbody td {
    padding: 6px 4px;
    border: 1px solid #D5CBB7;
    vertical-align: middle;
    font-size: 9.5px;
    background: #FFFFFF;
    height: 34px;
  }
  table.calls tbody tr { page-break-inside: avoid; }
  table.calls tbody tr:nth-child(even) td { background: #FAF6EE; }

  .col-num       { width: 26px; text-align: center; font-family: DejaVu Sans Mono, monospace; color: #6B5F4E; font-weight: bold; }
  .col-name      { width: 120px; text-align: left; padding-left: 8px !important; }
  .col-name .last  { font-weight: bold; text-transform: uppercase; }
  .col-name .first { color: #4A3D2A; }
  .col-phone     { width: 78px; text-align: center; font-family: DejaVu Sans Mono, monospace; font-weight: bold; color: #4A3D2A; }
  .col-presence  { width: 78px; text-align: center; }
  .col-guests    { width: 32px; text-align: center; }
  .col-enreg     { width: 50px; text-align: center; }
  .col-notes     { width: auto; }

  /* Triple case Oui/Non/Attente en ligne */
  .tri-choice {
    display: inline-block;
    font-size: 8.5px;
    color: #6B5F4E;
    line-height: 1;
  }
  .tri-choice .item {
    display: inline-block;
    margin: 0 2px;
  }
  .tri-choice .box, .duo-choice .box {
    display: inline-block;
    width: 11px; height: 11px;
    border: 1.5px solid #6B5F4E;
    border-radius: 2px;
    vertical-align: middle;
    margin-right: 2px;
  }
  .tri-choice .lbl, .duo-choice .lbl {
    font-weight: bold;
    color: #4A3D2A;
    vertical-align: middle;
  }
  .duo-choice {
    display: inline-block;
    font-size: 8.5px;
    color: #6B5F4E;
    line-height: 1;
  }
  .duo-choice .item {
    display: inline-block;
    margin: 0 2px;
  }
  .guests-input {
    display: inline-block;
    width: 22px;
    border-bottom: 1.5px solid #6B5F4E;
    height: 14px;
    vertical-align: middle;
  }

  /* ─── LÉGENDE ─── */
  .legend {
    margin-top: 10px;
    padding: 8px 12px;
    background: #FAF6EE;
    border: 1px solid #E5DBC7;
    border-radius: 3px;
    font-size: 8.5px;
    color: #6B5F4E;
  }
  .legend strong { color: #8B1A2F; }

  /* ─── FOOTER ─── */
  .footer {
    position: fixed;
    bottom: -10mm;
    left: 0; right: 0;
    height: 8mm;
    padding: 4px 6mm;
    border-top: 1px solid #E5DBC7;
    font-size: 8px;
    color: #8B7960;
  }
  .footer-table { width: 100%; }
  .footer-left { text-align: left; font-style: italic; }
  .footer-center { text-align: center; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; color: #8B1A2F; }
  .footer-right { text-align: right; }
  .page-num:after { content: "Page " counter(page) " / " counter(pages); }
</style>
</head>
<body>

{{-- ═══════════════════════ HEADER ═══════════════════════ --}}
<div class="header">
  <table class="header-table">
    <tr>
      <td class="header-logo-cell">
        @if($logoDataUri)
          <img src="{{ $logoDataUri }}" alt="NWC" class="header-logo">
        @else
          <div class="header-logo-placeholder">NWC</div>
        @endif
      </td>
      <td>
        <div class="brand-name">New Wine Church</div>
        <div class="brand-tagline">Service Accueil · Call Center</div>
        <div class="doc-title">Fiche de suivi appels</div>
        <div class="doc-generated">
          Générée le {{ $generatedAt->locale('fr')->isoFormat('LL [à] HH[h]mm') }}
        </div>
      </td>
    </tr>
  </table>
</div>

{{-- ═══════════════════════ BANDEAU J-N ═══════════════════════ --}}
<div class="countdown-banner">
  <div class="big">
    @if($daysUntil > 0)
      J − {{ $daysUntil }}   ·   {{ $event->title }}
    @elseif($daysUntil === 0)
      C'EST AUJOURD'HUI   ·   {{ $event->title }}
    @else
      Événement passé   ·   {{ $event->title }}
    @endif
  </div>
  <div class="small">
    @if($event->starts_at)
      {{ $event->starts_at->locale('fr')->isoFormat('dddd LL [·] HH[h]mm') }}
      @if($event->location) · {{ $event->location }} @endif
    @endif
  </div>
</div>

{{-- ═══════════════════════ SCRIPT D'APPEL ═══════════════════════ --}}
<div class="script">
  <div class="script-title">📞 Script d'appel — informations à recueillir</div>

  <div class="script-intro">
    « Bonjour, ici <em>[votre prénom]</em> du <strong>service Accueil de New Wine Church</strong>.
    Est-ce que je parle bien à Monsieur / Madame <strong>[nom de la ligne]</strong> ? »
  </div>

  <ol class="script-steps">
    <li>
      <strong>Confirmer l'identité</strong> — s'assurer que c'est bien la bonne personne au bout du fil.
    </li>
    <li>
      <strong>Rappeler l'événement</strong> — « Le Bal aura lieu
      @if($event->starts_at)
        <strong>{{ $event->starts_at->locale('fr')->isoFormat('dddd LL [à] HH[h]mm') }}</strong>
        @if($event->location) à <strong>{{ $event->location }}</strong> @endif.
      @endif
      C'est dans {{ $daysUntil }} jour(s). »
    </li>
    <li>
      <strong>Présence confirmée</strong> — cocher <strong>O</strong> (Oui), <strong>N</strong> (Non) ou <strong>A</strong> (en attente).
    </li>
    <li>
      <strong>Nombre d'accompagnants</strong> — « Combien de personnes vous accompagneront ? »
    </li>
    <li>
      <strong>Accompagnants enregistrés ?</strong> — « Ces personnes ont-elles déjà leur ticket via la billetterie ? »
      Cocher <strong>O</strong> ou <strong>N</strong>. Si Non, les inscrire manuellement en aval.
    </li>
    <li>
      <strong>Questions / Commentaires</strong> — noter les questions, besoins particuliers,
      retards probables, demandes d'infos supplémentaires…
    </li>
  </ol>
</div>

{{-- ═══════════════════════ STATS RAPIDES ═══════════════════════ --}}
<table class="quick-stats">
  <tr>
    <td>
      <div class="qs-label">Inscrits à contacter</div>
      <div class="qs-value">{{ $tickets->count() }}</div>
    </td>
    <td>
      <div class="qs-label">Présents (confirmés)</div>
      <div class="qs-value">___ / {{ $tickets->count() }}</div>
    </td>
    <td>
      <div class="qs-label">Absents</div>
      <div class="qs-value">___</div>
    </td>
    <td>
      <div class="qs-label">Indécis à relancer</div>
      <div class="qs-value">___</div>
    </td>
  </tr>
</table>

{{-- ═══════════════════════ TABLEAU DE SUIVI ═══════════════════════ --}}
@if($tickets->isEmpty())
  <div style="text-align:center; padding:40px; background:#FAF6EE; border:1.5px dashed #C9A961; border-radius:6px; color:#8B7960; font-style:italic;">
    Aucun ticket vendu pour cet événement.
  </div>
@else
<table class="calls">
  <thead>
    <tr>
      <th class="col-num">#</th>
      <th class="col-name" style="text-align:left; padding-left:8px;">Nom &amp; Prénom</th>
      <th class="col-phone">Téléphone</th>
      <th class="col-presence">Présence confirmée</th>
      <th class="col-guests">Nb acc.</th>
      <th class="col-enreg">Enreg.&nbsp;?</th>
      <th class="col-notes" style="text-align:left; padding-left:8px;">Questions / Commentaires</th>
    </tr>
  </thead>
  <tbody>
    @foreach($tickets as $i => $t)
    <tr>
      <td class="col-num">{{ str_pad($i + 1, 3, '0', STR_PAD_LEFT) }}</td>
      <td class="col-name">
        <span class="last">{{ $t->last_name ?? '—' }}</span>
        <span class="first"> {{ $t->first_name ?? '' }}</span>
      </td>
      <td class="col-phone">{{ $t->phone ?: '—' }}</td>
      <td class="col-presence">
        <span class="tri-choice">
          <span class="item"><span class="box"></span><span class="lbl">O</span></span>
          <span class="item"><span class="box"></span><span class="lbl">N</span></span>
          <span class="item"><span class="box"></span><span class="lbl">A</span></span>
        </span>
      </td>
      <td class="col-guests"><span class="guests-input"></span></td>
      <td class="col-enreg">
        <span class="duo-choice">
          <span class="item"><span class="box"></span><span class="lbl">O</span></span>
          <span class="item"><span class="box"></span><span class="lbl">N</span></span>
        </span>
      </td>
      <td class="col-notes"></td>
    </tr>
    @endforeach
  </tbody>
</table>

<div class="legend">
  <strong>Comment remplir cette fiche :</strong><br>
  <strong>Présence confirmée</strong> — cocher une case : <strong>O</strong> = Oui (confirme sa venue) ·
  <strong>N</strong> = Non (ne viendra pas → mettre en waitlist si liste d'attente) ·
  <strong>A</strong> = En attente (rappeler à J−2).<br>
  <strong>Nb acc.</strong> — nombre d'accompagnants annoncés (0 si vient seul).<br>
  <strong>Enreg.&nbsp;?</strong> — <strong>O</strong> = les accompagnants ont déjà leur propre ticket dans la billetterie ·
  <strong>N</strong> = ils n'ont pas encore de ticket (leur en créer un ou les inscrire manuellement).<br>
  <strong>Questions / Commentaires</strong> — questions posées, retard prévu, besoins spécifiques (accessibilité, régime, etc.), coordonnées à mettre à jour…
</div>
@endif

{{-- ═══════════════════════ FOOTER ═══════════════════════ --}}
<div class="footer">
  <table class="footer-table">
    <tr>
      <td class="footer-left">© New Wine Church · Service Accueil</td>
      <td class="footer-center">Fiche call center — {{ mb_strimwidth($event->title, 0, 42, '…') }}</td>
      <td class="footer-right"><span class="page-num"></span></td>
    </tr>
  </table>
</div>

</body>
</html>
