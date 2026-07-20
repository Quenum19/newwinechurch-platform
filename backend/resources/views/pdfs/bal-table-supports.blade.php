{{--
  Support de table imprimable — recto (QR vote) + verso (QR follow us).
  Format A5 portrait, design NWC noir/or, layout fixé (footer collé).
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Supports de table — {{ $event->title }}</title>
<style>
  @page {
    margin: 0;
    size: A5 portrait;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 148mm; }
  body {
    font-family: "DejaVu Sans", sans-serif;
    color: #F5E6C8;
    background: #0A0A0A;
  }

  /* Chaque page = A5 fixé sur 148x210 mm, pas de scroll ni débord */
  .page {
    width: 148mm;
    height: 210mm;
    position: relative;
    background: linear-gradient(180deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%);
    overflow: hidden;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  /* Cadre décoratif */
  .frame {
    position: absolute;
    top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
    border: 1.5pt solid #C9A961;
  }
  .frame-inner {
    position: absolute;
    top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
    border: 0.5pt solid rgba(201, 169, 97, 0.4);
  }

  /* Container central pour tous les éléments */
  .content {
    position: absolute;
    top: 14mm; left: 14mm; right: 14mm;
    text-align: center;
  }

  /* Ligne brand top */
  .brand {
    font-size: 8pt;
    letter-spacing: 3pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
  }

  /* Logo */
  .logo {
    display: block;
    margin: 6mm auto 0;
    width: 32mm;
    height: 32mm;
    object-fit: contain;
  }
  .logo-placeholder {
    display: block;
    margin: 6mm auto 0;
    width: 32mm;
    height: 32mm;
    background: #8B1A2F;
    color: #F5E6C8;
    text-align: center;
    line-height: 32mm;
    font-size: 20pt;
    font-weight: bold;
    border-radius: 4mm;
  }

  /* Titre principal */
  h1 {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 28pt;
    color: #F5E6C8;
    margin-top: 6mm;
    line-height: 1;
    letter-spacing: 0.5pt;
  }

  .subtitle {
    font-size: 9pt;
    color: #C9A961;
    letter-spacing: 1.5pt;
    text-transform: uppercase;
    margin-top: 4mm;
  }

  .divider {
    color: #C9A961;
    letter-spacing: 5pt;
    font-size: 12pt;
    margin: 5mm 0;
  }

  .cta {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 12pt;
    color: #F5E6C8;
    font-weight: bold;
    margin: 3mm 0 4mm;
    line-height: 1.4;
  }

  /* QR code — centré, encart ivoire chaud */
  .qr-wrap {
    display: inline-block;
    background: #F5E6C8;
    padding: 4mm;
    border-radius: 3mm;
    margin-top: 3mm;
  }
  .qr-wrap img {
    display: block;
    width: 58mm;
    height: 58mm;
  }

  /* Ligne "tip" sous le QR */
  .tip {
    margin-top: 4mm;
    font-size: 10pt;
    color: #C9A961;
    letter-spacing: 1pt;
    text-transform: uppercase;
    font-weight: bold;
  }

  /* FOOTER : absolument positionné en bas de la .page (jamais de saut de page) */
  .foot {
    position: absolute;
    left: 0; right: 0; bottom: 12mm;
    text-align: center;
  }
  .foot-line {
    font-size: 9pt;
    color: #C9A961;
    letter-spacing: 2pt;
    text-transform: uppercase;
    font-weight: bold;
  }
  .foot-tag {
    margin-top: 3mm;
    font-size: 7pt;
    color: #8B7960;
    letter-spacing: 2pt;
    text-transform: uppercase;
  }

  /* Petite touche : code ticket rappel (recto vote uniquement) */
  .ticket-hint {
    margin-top: 3mm;
    padding: 2mm 4mm;
    display: inline-block;
    border: 0.8pt dashed #C9A961;
    border-radius: 2mm;
    font-size: 9pt;
    color: #F5E6C8;
    line-height: 1.3;
  }
  .ticket-hint strong {
    color: #C9A961;
  }
</style>
</head>
<body>

{{-- ═══════════════════ RECTO — Vote Roi & Reine ═══════════════════ --}}
<div class="page">
  <div class="frame"></div>
  <div class="frame-inner"></div>

  <div class="content">
    <div class="brand">New Wine Church &middot; Abidjan</div>

    @if($logoDataUri)
      <img src="{{ $logoDataUri }}" alt="NWC" class="logo">
    @else
      <div class="logo-placeholder">NWC</div>
    @endif

    <h1>Roi &amp; Reine</h1>
    <div class="subtitle">BAL 2026 &mdash; A Dark Night in Elegance</div>

    <div class="divider">&#9733; &#9733; &#9733;</div>

    <div class="cta">
      Scanne pour voter<br/>ton Roi &amp; ta Reine
    </div>

    <div class="qr-wrap">
      <img src="{{ $voteQr }}" alt="QR Vote">
    </div>

    <div class="ticket-hint">
      &Agrave; l'ouverture du vote, saisis ton <strong>code ticket</strong>
      re&ccedil;u par email (ex&nbsp;: <strong>NWC-EBXB</strong>).<br/>
      1 ticket = 1 vote unique.
    </div>
  </div>

  <div class="foot">
    <div class="foot-line">Un vote max par ticket</div>
    <div class="foot-tag">Recto &middot; Vote</div>
  </div>
</div>

{{-- ═══════════════════ VERSO — Follow us ═══════════════════ --}}
<div class="page">
  <div class="frame"></div>
  <div class="frame-inner"></div>

  <div class="content">
    <div class="brand">New Wine Church &middot; Abidjan</div>

    @if($logoDataUri)
      <img src="{{ $logoDataUri }}" alt="NWC" class="logo">
    @else
      <div class="logo-placeholder">NWC</div>
    @endif

    <h1>Suis-nous</h1>
    <div class="subtitle">Restons en contact</div>

    <div class="divider">&#9733; &#9733; &#9733;</div>

    <div class="cta">
      Retrouve-nous sur<br/>nos r&eacute;seaux sociaux
    </div>

    <div class="qr-wrap">
      <img src="{{ $followQr }}" alt="QR Follow us">
    </div>

    <div class="tip">Instagram &middot; Facebook &middot; TikTok &middot; YouTube</div>
  </div>

  <div class="foot">
    <div class="foot-line">Rejoins la famille NWC</div>
    <div class="foot-tag">Verso &middot; R&eacute;seaux</div>
  </div>
</div>

</body>
</html>
