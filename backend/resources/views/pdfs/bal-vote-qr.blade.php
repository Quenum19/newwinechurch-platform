{{--
  QR de vote Roi & Reine — A5 portrait, design NOIR ULTRA épuré.
  QR mis en avant à 115mm (~75% de la largeur A5). Une seule ligne de texte
  au-dessus + une en dessous. Imprimable en plusieurs exemplaires.
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
    top: 16mm; left: 12mm; right: 12mm; bottom: 16mm;
    text-align: center;
  }

  /* Titre — Serif italique or éclatant, dominant */
  h1 {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 42pt;
    color: #EECF80;
    margin: 8mm 0 6mm;
    line-height: 1;
    letter-spacing: 0.5pt;
  }

  /* QR — DOMINANT (115mm ~ 75% largeur A5), encart ivoire net */
  .qr-wrap {
    display: inline-block;
    background: #F5E6C8;
    padding: 4mm;
    border-radius: 3mm;
    box-shadow: 0 0 0 1pt #C9A961;
  }
  .qr-wrap img {
    display: block;
    width: 115mm;
    height: 115mm;
  }

  /* CTA — court, sous le QR */
  .cta {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 14pt;
    color: #F5E6C8;
    font-weight: bold;
    margin-top: 6mm;
    line-height: 1.3;
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
    <h1>Roi &amp; Reine</h1>

    <div class="qr-wrap">
      <img src="{{ $voteQr }}" alt="QR Vote">
    </div>

    <div class="cta">Scanne pour voter</div>
  </div>
</div>

</body>
</html>
