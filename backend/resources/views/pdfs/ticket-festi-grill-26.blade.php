{{--
    Ticket PDF — DESIGN SPÉCIFIQUE FESTI GRILL '26
    Handoff : docs/design_handoff_festi_grill_ticket/README.md

    Adaptations DomPDF (vs le HTML de référence hi-fi) :
    - flex/grid → <table> layout (DomPDF v3 ne rend pas flex/grid)
    - radial-gradient → couleurs plates approchantes
    - linear-gradient : dompdf v3 partiellement OK → conservé sur en-tête
    - Google Fonts (Anton, Permanent Marker, JetBrains Mono, Archivo) →
      remplacées par DejaVu Serif/Sans (natives dompdf). Rendu moins
      "street" mais lisible et fidèle à la structure.
    - object-fit → non supporté, on force width/height sur l'IMG
    - text-shadow, transform(rotate) → non/partial → laissés sans

    Le layout reste au pixel près pour la STRUCTURE et les couleurs.
    Pour un rendu 100% fidèle au HTML de référence, il faudrait passer
    par Chrome Headless (browsershot) — pas installé sur Hostinger.
--}}
<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Ticket — {{ $event->title }}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; }
  body {
    font-family: 'DejaVu Sans', sans-serif;
    background: #140906;
    margin: 0;
    padding: 20px 24px;
    color: #f6ece3;
  }

  /* Wrapper page — max 700px de large pour tenir sur A4 (200mm utile) */
  .card {
    width: 700px;
    margin: 0 auto;
    background: #16100c;
    border: 1px solid #4a2a10;
    position: relative;
  }

  /* ==== 1. Bandeau d'en-tête ==== */
  .header {
    background: #f2591f; /* fallback couleur unique */
    color: #1a0d05;
    padding: 14px 24px;
    /* Tentative gradient : dompdf v3+ le rend correctement */
    background: linear-gradient(90deg, #f2591f 0%, #f9b22a 100%);
  }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-table td { vertical-align: middle; }
  .logo-pill {
    width: 30px; height: 30px; border-radius: 50%;
    background: #2a0a1d;
    color: #f9b22a;
    text-align: center;
    font-weight: bold;
    font-size: 15px;
    line-height: 30px;
    display: inline-block;
  }
  .brand-block { padding-left: 10px; }
  .brand-name {
    font-weight: bold; font-size: 13px; letter-spacing: 2px;
    color: #1a0d05;
  }
  .brand-sub {
    font-size: 9px; letter-spacing: 3px; font-weight: 600;
    color: #1a0d05; opacity: 0.72;
  }
  .admit-pill {
    background: #1a0d05;
    color: #f9b22a;
    font-size: 10px; font-weight: bold; letter-spacing: 1.5px;
    padding: 6px 12px;
    border-radius: 999px;
    display: inline-block;
  }

  /* ==== 2. Titre ==== */
  .title-block { padding: 26px 24px 20px; text-align: center; background: #1a0d05; }
  .title-festi {
    font-family: 'DejaVu Serif', serif;
    font-style: italic;
    font-size: 32px;
    color: #fff;
    line-height: 1;
    margin-bottom: -4px;
  }
  .title-grill {
    font-family: 'DejaVu Sans', sans-serif;
    font-weight: bold;
    font-size: 82px;
    color: #f9b22a;
    line-height: 0.9;
    letter-spacing: -1px;
    margin-top: 4px;
  }
  .subtitle-pill {
    display: inline-block;
    margin-top: 12px;
    font-weight: bold; font-size: 11px; letter-spacing: 1.5px;
    color: #efe3d8;
    background: #251612;
    border: 1px solid #7a4c1e;
    padding: 6px 14px;
    border-radius: 999px;
  }

  /* ==== 3. Bandeau photo ==== */
  .hero-block {
    padding: 0 24px 16px;
    background: #1a0d05;
  }
  .hero-frame {
    position: relative;
    background: #0d0604;
    border-radius: 12px;
    overflow: hidden;
    height: 180px;
  }
  .hero-frame img {
    width: 100%;
    height: 180px;
    display: block;
  }
  .hero-badges {
    position: absolute;
    left: 14px;
    bottom: 12px;
  }
  .badge-date {
    background: #f9b22a; color: #1a0d05;
    font-size: 10px; font-weight: bold; letter-spacing: 1.2px;
    padding: 5px 10px; border-radius: 4px;
    display: inline-block;
    margin-right: 6px;
  }
  .badge-time {
    background: #1a0d05; color: #f9b22a;
    border: 1px solid #7a4c1e;
    font-size: 10px; font-weight: bold; letter-spacing: 1.2px;
    padding: 5px 10px; border-radius: 4px;
    display: inline-block;
  }

  /* ==== 4. Menu / Accompagnement ==== */
  .menu-block { padding: 18px 24px 4px; }
  .menu-table { width: 100%; border-collapse: separate; border-spacing: 10px 0; }
  .menu-cell {
    width: 50%;
    background: #1e1310;
    border: 1px solid #362117;
    border-radius: 12px;
    padding: 12px 14px;
    vertical-align: top;
  }
  .menu-label {
    font-size: 9px; font-weight: bold; letter-spacing: 2px;
    color: #f2591f;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .chip {
    display: inline-block;
    font-size: 11px; font-weight: bold;
    color: #f6ece3;
    background: #3a2416;
    padding: 5px 9px;
    border-radius: 6px;
    margin-right: 4px;
    margin-bottom: 4px;
  }

  /* ==== 5. Lieu + Type de place ==== */
  .info-block { padding: 8px 24px 20px; }
  .info-table { width: 100%; border-collapse: separate; border-spacing: 10px 0; }
  .info-cell {
    width: 50%;
    background: #1e1310;
    border: 1px solid #362117;
    border-radius: 12px;
    padding: 12px 14px;
    vertical-align: top;
  }
  .info-cell.gratuit {
    background: #3a1a10;
    border: 1px solid #a56a20;
  }
  .info-label {
    font-size: 9px; font-weight: bold; letter-spacing: 2px;
    color: #8d7f74;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .info-cell.gratuit .info-label { color: #f9b22a; }
  .lieu-name { font-size: 14px; font-weight: bold; color: #fff; line-height: 1.2; }
  .lieu-addr { font-size: 11px; color: #b6a79b; margin-top: 3px; }
  .gratuit-title { font-family: 'DejaVu Sans', sans-serif; font-weight: bold; font-size: 20px; color: #fff; line-height: 1; }
  .gratuit-sub { font-size: 11px; color: #e4cdb8; margin-top: 3px; font-weight: 600; }

  /* ==== 6. Perforation ==== */
  .perforation {
    height: 2px;
    background: repeating-linear-gradient(90deg, rgba(249,178,42,.45) 0 10px, transparent 10px 20px);
    position: relative;
    margin: 0;
  }
  .perf-hole-left, .perf-hole-right {
    position: absolute;
    top: -15px;
    width: 30px;
    height: 30px;
    background: #140906;
    border-radius: 50%;
  }
  .perf-hole-left  { left: -15px; }
  .perf-hole-right { right: -15px; }

  /* ==== 7. Souche (QR + infos) ==== */
  .stub-block { padding: 22px 24px 18px; }
  .stub-table { width: 100%; border-collapse: collapse; }
  .stub-qr-cell {
    width: 180px;
    vertical-align: top;
    padding-right: 20px;
  }
  .qr-frame {
    background: #fff;
    padding: 8px;
    border-radius: 10px;
    display: inline-block;
  }
  .qr-frame img { display: block; width: 140px; height: 140px; }
  .qr-label {
    font-size: 9px; font-weight: bold; letter-spacing: 2px;
    color: #f9b22a;
    text-align: center;
    margin-top: 8px;
  }
  .stub-info-cell { vertical-align: top; padding-top: 0; }
  .holder-label {
    font-size: 9px; font-weight: bold; letter-spacing: 2px;
    color: #8d7f74;
    text-transform: uppercase;
  }
  .holder-name {
    font-family: 'DejaVu Sans', sans-serif;
    font-weight: bold;
    font-size: 22px;
    color: #fff;
    line-height: 1.1;
    margin-top: 3px;
    margin-bottom: 12px;
  }
  .stub-meta-table { width: 100%; border-collapse: separate; border-spacing: 8px 0; }
  .stub-meta-cell {
    width: 50%;
    background: #1e1310;
    border-radius: 10px;
    padding: 8px 10px;
  }
  .stub-meta-label {
    font-size: 8px; font-weight: bold; letter-spacing: 2px;
    color: #8d7f74;
    text-transform: uppercase;
  }
  .stub-meta-value {
    font-family: 'DejaVu Sans Mono', monospace;
    font-size: 11px;
    color: #f6ece3;
    margin-top: 2px;
  }
  .stub-note {
    font-size: 10px; color: #b6a79b; margin-top: 10px;
  }

  /* ==== 8. Pied de carte ==== */
  .card-footer {
    border-top: 1px solid #362117;
    padding: 12px 24px 14px;
  }
  .card-footer-table { width: 100%; border-collapse: collapse; }
  .card-footer td { vertical-align: middle; font-size: 10px; }
  .footer-support { color: #b6a79b; }
  .footer-support strong { color: #f6ece3; }
  .footer-url {
    font-family: 'DejaVu Sans Mono', monospace;
    color: #f9b22a;
    letter-spacing: 1.5px;
    text-align: right;
  }

  /* ==== 9. Sous la carte ==== */
  .info-boxes { width: 700px; margin: 12px auto 8px; }
  .info-boxes-table { width: 100%; border-collapse: separate; border-spacing: 10px 0; }
  .info-box-cell {
    width: 50%;
    background: #1a1210;
    border: 1px solid #2f1f18;
    border-radius: 12px;
    padding: 12px 14px;
    vertical-align: top;
  }
  .info-box-title {
    font-size: 9px; font-weight: bold; letter-spacing: 2px;
    color: #f2591f;
    margin-bottom: 4px;
    text-transform: uppercase;
  }
  .info-box-text { font-size: 11px; color: #c9bbb0; line-height: 1.4; }

  .legal {
    width: 700px;
    margin: 8px auto 0;
    text-align: center;
    font-size: 9px;
    line-height: 1.5;
    color: #6f635a;
  }
</style>
</head>
<body>

<div class="card">

  {{-- ==== 1. HEADER ==== --}}
  <div class="header">
    <table class="header-table">
      <tr>
        <td style="width:60%;">
          <span class="logo-pill">N</span>
          <span class="brand-block">
            <span class="brand-name">NEW WINE CHURCH</span><br>
            <span class="brand-sub">E-TICKET OFFICIEL</span>
          </span>
        </td>
        <td style="width:40%;text-align:right;">
          <span class="admit-pill">ADMIT ONE</span>
        </td>
      </tr>
    </table>
  </div>

  {{-- ==== 2. TITRE ==== --}}
  <div class="title-block">
    <div class="title-festi">Festi</div>
    <div class="title-grill">GRILL'26</div>
    <div class="subtitle-pill">MEILLEURES VIANDES · ALLOCO &amp; ATTIÉKÉ</div>
  </div>

  {{-- ==== 3. HERO IMAGE + BADGES ==== --}}
  <div class="hero-block">
    <div class="hero-frame">
      @if($heroPath ?? null)
        <img src="{{ $heroPath }}" alt="Grillades">
      @else
        <table style="width:100%;height:180px;"><tr><td style="text-align:center;color:#f9b22a;font-size:12px;">Photo grillades</td></tr></table>
      @endif
      <div class="hero-badges">
        <span class="badge-date">
          @if($event->starts_at)
            {{ strtoupper($event->starts_at->locale('fr')->isoFormat('ddd D MMM YYYY')) }}
          @else
            SAM. 12 SEPT. 2026
          @endif
        </span>
        <span class="badge-time">
          @if($event->starts_at)
            {{ $event->starts_at->format('H\Hi') }}
          @else
            15H00
          @endif
        </span>
      </div>
    </div>
  </div>

  {{-- ==== 4. MENU / ACCOMPAGNEMENT ==== --}}
  <div class="menu-block">
    <table class="menu-table">
      <tr>
        <td class="menu-cell">
          <div class="menu-label">Au menu</div>
          <span class="chip">Porc braisé</span>
          <span class="chip">Porc sauté</span>
          <span class="chip">Poulet braisé</span>
        </td>
        <td class="menu-cell">
          <div class="menu-label">Accompagnement</div>
          <span class="chip">Alloco</span>
          <span class="chip">Attiéké</span>
          <span class="chip">Frites</span>
        </td>
      </tr>
    </table>
  </div>

  {{-- ==== 5. LIEU + TYPE DE PLACE ==== --}}
  <div class="info-block">
    <table class="info-table">
      <tr>
        <td class="info-cell">
          <div class="info-label">Lieu</div>
          <div class="lieu-name">{{ $event->location ?? 'Maison de la Destinée · Bonoumin' }}</div>
          <div class="lieu-addr">{{ $event->address ?? 'Riviera Bonoumin, Rue 65, Abidjan' }}</div>
        </td>
        <td class="info-cell gratuit">
          <div class="info-label">Type de place</div>
          <div class="gratuit-title">
            @if(($ticket->price_fcfa ?? 0) > 0)
              {{ number_format($ticket->price_fcfa, 0, ',', ' ') }} F CFA
            @else
              ENTRÉE GRATUITE
            @endif
          </div>
          <div class="gratuit-sub">
            {{ $ticket->ticketType->name ?? 'Place Festi Grill' }} — 1 personne
          </div>
        </td>
      </tr>
    </table>
  </div>

  {{-- ==== 6. PERFORATION ==== --}}
  <div class="perforation">
    <div class="perf-hole-left"></div>
    <div class="perf-hole-right"></div>
  </div>

  {{-- ==== 7. SOUCHE (QR + infos) ==== --}}
  <div class="stub-block">
    <table class="stub-table">
      <tr>
        <td class="stub-qr-cell">
          <div class="qr-frame">
            @if($qrPngPath ?? null)
              <img src="{{ $qrPngPath }}" alt="QR">
            @elseif($qrSvgPath ?? null)
              {!! file_get_contents($qrSvgPath) !!}
            @endif
          </div>
          <div class="qr-label">SCAN À L'ENTRÉE</div>
        </td>
        <td class="stub-info-cell">
          <div class="holder-label">Au nom de</div>
          <div class="holder-name">{{ $ticket->full_name ?? ($ticket->first_name.' '.$ticket->last_name) }}</div>
          <table class="stub-meta-table">
            <tr>
              <td class="stub-meta-cell">
                <div class="stub-meta-label">N° Ticket</div>
                <div class="stub-meta-value">{{ $ticket->ticket_number }}</div>
              </td>
              <td class="stub-meta-cell">
                <div class="stub-meta-label">Commande</div>
                <div class="stub-meta-value">{{ $ticket->order_code }}</div>
              </td>
            </tr>
          </table>
          <div class="stub-note">
            Ticket individuel, à usage unique. Non cessible.
          </div>
        </td>
      </tr>
    </table>
  </div>

  {{-- ==== 8. PIED DE CARTE ==== --}}
  <div class="card-footer">
    <table class="card-footer-table">
      <tr>
        <td class="footer-support" style="width:60%;">
          Assistance organisateur · <strong>{{ $event->support_phone ?: '+225 07 57 07 67 74' }}</strong>
        </td>
        <td class="footer-url" style="width:40%;">
          WWW.NEWWINECHURCH.ORG
        </td>
      </tr>
    </table>
  </div>

</div>

{{-- ==== 9. SOUS LA CARTE : info boxes + legal ==== --}}
<div class="info-boxes">
  <table class="info-boxes-table">
    <tr>
      <td class="info-box-cell">
        <div class="info-box-title">Comment ça marche</div>
        <div class="info-box-text">
          Présente ce ticket (écran ou papier) à l'entrée. Le QR code est scanné
          une seule fois — protège-le.
        </div>
      </td>
      <td class="info-box-cell">
        <div class="info-box-title">Ton ticket en ligne</div>
        <div class="info-box-text">
          Un lien personnel t'a été envoyé par email pour revoir, télécharger
          ou annuler ta réservation.
        </div>
      </td>
    </tr>
  </table>
</div>

<div class="legal">
  Toute falsification, revente ou transfert de ce ticket est formellement interdit.
  L'utilisation de ce ticket vaut acceptation des conditions générales.
  © {{ date('Y') }} NEW WINE CHURCH, tous droits réservés.
</div>

</body>
</html>
