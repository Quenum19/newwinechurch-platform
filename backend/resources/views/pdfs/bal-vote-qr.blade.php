{{--
  QR de vote Roi & Reine — A5 portrait, design NOIR épuré.
  Le QR est mis en avant (100mm), les infos autour sont minimales.
  Imprimable en plusieurs exemplaires pour les tables/murs.
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Vote Roi &amp; Reine — {{ $event->title }}</title>
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
    background: linear-gradient(180deg, #0A0A0A 0%, #1a0f14 55%, #0A0A0A 100%);
    overflow: hidden;
  }

  /* Double filet or */
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

  /* Losanges or aux 4 coins */
  .corner {
    position: absolute;
    width: 3.5mm;
    height: 3.5mm;
    background: #C9A961;
    transform: rotate(45deg);
  }
  .corner.tl { top: 12mm; left: 12mm; }
  .corner.tr { top: 12mm; right: 12mm; }
  .corner.bl { bottom: 12mm; left: 12mm; }
  .corner.br { bottom: 12mm; right: 12mm; }

  .content {
    position: absolute;
    top: 14mm; left: 14mm; right: 14mm; bottom: 14mm;
    text-align: center;
  }

  /* Brand — petit, lettres espacées or */
  .brand {
    font-size: 8pt;
    letter-spacing: 3pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 3mm;
  }

  /* Titre — Serif italique or éclatant */
  h1 {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 32pt;
    color: #EECF80;
    margin-top: 3mm;
    line-height: 1;
    letter-spacing: 0.5pt;
  }

  /* Ornement filets ✦ or */
  .divider {
    color: #C9A961;
    letter-spacing: 6pt;
    font-size: 10pt;
    margin: 4mm 0 2mm;
  }

  /* QR — dominant, encart ivoire net sur fond noir */
  .qr-wrap {
    display: inline-block;
    background: #F5E6C8;
    padding: 5mm;
    border-radius: 3mm;
    margin-top: 3mm;
    box-shadow: 0 0 0 1pt #C9A961;
  }
  .qr-wrap img {
    display: block;
    width: 100mm;
    height: 100mm;
  }

  /* CTA — court, sous le QR */
  .cta {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 13pt;
    color: #F5E6C8;
    font-weight: bold;
    margin-top: 5mm;
    line-height: 1.3;
  }

  .code-hint {
    margin-top: 3mm;
    font-size: 8.5pt;
    color: #C9A961;
    letter-spacing: 1.5pt;
    text-transform: uppercase;
    font-weight: bold;
  }

  /* Footer minimal */
  .foot {
    position: absolute;
    left: 0; right: 0; bottom: 10mm;
    text-align: center;
  }
  .foot-tag {
    font-size: 7pt;
    color: #8B7960;
    letter-spacing: 2pt;
    text-transform: uppercase;
  }
</style>
</head>
<body>

<div class="page">
  <div class="frame"></div>
  <div class="frame-inner"></div>
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>

  <div class="content">
    <div class="brand">New Wine Church &middot; Abidjan</div>

    <h1>Roi &amp; Reine</h1>

    <div class="divider">&#10022; &#10022; &#10022;</div>

    <div class="qr-wrap">
      <img src="{{ $voteQr }}" alt="QR Vote">
    </div>

    <div class="cta">Scanne pour voter</div>
    <div class="code-hint">1 ticket &middot; 1 vote</div>
  </div>

  <div class="foot">
    <div class="foot-tag">A Dark Night in Elegance</div>
  </div>
</div>

</body>
</html>
