{{--
  QR de vote Roi & Reine — A5 portrait imprimable en plusieurs exemplaires
  pour multiplier les points d'affichage lors du bal (tables, murs, entrée).
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Vote Roi & Reine — {{ $event->title }}</title>
<style>
  @page { margin: 0; size: A5 portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 148mm; }
  body {
    font-family: "DejaVu Sans", sans-serif;
    color: #F5E6C8;
    background: #0A0A0A;
  }

  .page {
    width: 148mm;
    height: 210mm;
    position: relative;
    background: linear-gradient(180deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%);
    overflow: hidden;
  }

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

  .content {
    position: absolute;
    top: 14mm; left: 14mm; right: 14mm; bottom: 28mm;
    text-align: center;
  }

  .brand {
    font-size: 8pt;
    letter-spacing: 3pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
  }

  .logo {
    display: block;
    margin: 4mm auto 0;
    width: 26mm;
    height: 26mm;
    object-fit: contain;
  }
  .logo-placeholder {
    display: block;
    margin: 4mm auto 0;
    width: 26mm;
    height: 26mm;
    background: #8B1A2F;
    color: #F5E6C8;
    text-align: center;
    line-height: 26mm;
    font-size: 16pt;
    font-weight: bold;
    border-radius: 3mm;
  }

  h1 {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 26pt;
    color: #F5E6C8;
    margin-top: 4mm;
    line-height: 1;
    letter-spacing: 0.5pt;
  }

  .subtitle {
    font-size: 9pt;
    color: #C9A961;
    letter-spacing: 1.5pt;
    text-transform: uppercase;
    margin-top: 3mm;
  }

  .divider {
    color: #C9A961;
    letter-spacing: 5pt;
    font-size: 11pt;
    margin: 4mm 0;
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

  .qr-wrap {
    display: inline-block;
    background: #F5E6C8;
    padding: 4mm;
    border-radius: 3mm;
    margin-top: 3mm;
  }
  .qr-wrap img {
    display: block;
    width: 62mm;
    height: 62mm;
  }

  .ticket-hint {
    margin-top: 4mm;
    padding: 2mm 4mm;
    display: inline-block;
    border: 0.8pt dashed #C9A961;
    border-radius: 2mm;
    font-size: 9pt;
    color: #F5E6C8;
    line-height: 1.3;
  }
  .ticket-hint strong { color: #C9A961; }

  .foot {
    position: absolute;
    left: 0; right: 0; bottom: 10mm;
    text-align: center;
  }
  .foot-line {
    font-size: 8pt;
    color: #C9A961;
    letter-spacing: 2pt;
    text-transform: uppercase;
    font-weight: bold;
  }
  .foot-tag {
    margin-top: 2mm;
    font-size: 7pt;
    color: #8B7960;
    letter-spacing: 1.8pt;
    text-transform: uppercase;
  }
</style>
</head>
<body>

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
    <div class="subtitle">Vote officiel &mdash; Bal 2026</div>

    <div class="divider">&#9733; &#9733; &#9733;</div>

    <div class="cta">
      Scanne pour voter<br/>ton Roi &amp; ta Reine
    </div>

    <div class="qr-wrap">
      <img src="{{ $voteQr }}" alt="QR Vote">
    </div>

    <div class="ticket-hint">
      Saisis ton <strong>code ticket</strong> re&ccedil;u par email<br/>
      (ex&nbsp;: <strong>NWC-EBXB</strong>) &middot; 1 ticket = 1 vote unique.
    </div>
  </div>

  <div class="foot">
    <div class="foot-line">Un vote max par ticket</div>
    <div class="foot-tag">A Dark Night in Elegance</div>
  </div>
</div>

</body>
</html>
