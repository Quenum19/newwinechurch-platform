{{--
  QR de vote Roi & Reine — A5 portrait imprimable en plusieurs exemplaires.
  Charte ivoire chaud identique aux supports de table (fond crème, texte
  bordeaux + or, titre italique "Roi & Reine" en évidence).
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
    color: #4A3F32;
    background: #FAF6EE;
  }

  .page {
    width: 148mm;
    height: 210mm;
    position: relative;
    background: #FAF6EE;
    overflow: hidden;
  }

  /* Double filet or (identique aux supports) */
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

  /* Sur-titre : NEW WINE CHURCH · ABIDJAN */
  .brand {
    font-size: 9pt;
    letter-spacing: 4pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 4mm;
  }

  /* Titre principal en écriture italique or */
  h1 {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 44pt;
    color: #C9A961;
    margin-top: 4mm;
    line-height: 1;
    letter-spacing: 0.5pt;
  }

  .subtitle {
    font-size: 10pt;
    color: #8B7960;
    letter-spacing: 2pt;
    text-transform: uppercase;
    font-weight: bold;
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
    font-size: 14pt;
    color: #4A3F32;
    font-weight: bold;
    margin: 3mm 0 4mm;
    line-height: 1.4;
  }

  /* QR code — encart blanc sur ivoire, cadre or discret */
  .qr-wrap {
    display: inline-block;
    background: #FFFFFF;
    padding: 4mm;
    border-radius: 3mm;
    border: 0.5pt solid #C9A961;
    margin-top: 4mm;
  }
  .qr-wrap img {
    display: block;
    width: 62mm;
    height: 62mm;
  }

  /* Ticket-hint ivoire encadré or discret */
  .ticket-hint {
    margin-top: 5mm;
    padding: 3mm 5mm;
    display: inline-block;
    border: 0.6pt dashed #C9A961;
    border-radius: 2mm;
    font-size: 9.5pt;
    color: #4A3F32;
    line-height: 1.5;
    background: rgba(201, 169, 97, 0.08);
  }
  .ticket-hint strong {
    color: #8B1A2F;
  }

  /* Footer — bordeaux */
  .foot {
    position: absolute;
    left: 0; right: 0; bottom: 10mm;
    text-align: center;
  }
  .foot-line {
    display: inline-block;
    padding: 2.5mm 6mm;
    border: 0.8pt solid #8B1A2F;
    border-radius: 2mm;
    font-size: 9pt;
    color: #8B1A2F;
    letter-spacing: 2pt;
    text-transform: uppercase;
    font-weight: bold;
  }
  .foot-tag {
    margin-top: 3mm;
    font-size: 7pt;
    color: #A89A82;
    letter-spacing: 1.8pt;
    text-transform: uppercase;
  }

  /* Ornements filets/étoile assortis */
  .divider-fine {
    display: block;
    text-align: center;
    color: #C9A961;
    margin: 3mm 0;
    font-size: 10pt;
    letter-spacing: 4pt;
  }
</style>
</head>
<body>

<div class="page">
  <div class="frame"></div>
  <div class="frame-inner"></div>

  <div class="content">
    <div class="brand">New Wine Church &middot; Abidjan</div>

    <h1>Roi &amp; Reine</h1>

    <div class="subtitle">Bal 2026 &mdash; A Dark Night in Elegance</div>

    <div class="divider">&#9733; &#9733; &#9733;</div>

    <div class="cta">
      Scanne pour voter<br/>ton Roi &amp; ta Reine
    </div>

    <div class="qr-wrap">
      <img src="{{ $voteQr }}" alt="QR Vote">
    </div>

    <div class="ticket-hint">
      &Agrave; l'ouverture du vote, saisis ton <strong>code ticket</strong>
      re&ccedil;u par email<br/>(ex&nbsp;: <strong>NWC-EBXB</strong>).<br/>
      1 ticket = 1 vote unique.
    </div>
  </div>

  <div class="foot">
    <div class="divider-fine">&#9670;</div>
    <div class="foot-line">Un vote max par ticket</div>
    <div class="foot-tag">Recto &middot; Vote</div>
  </div>
</div>

</body>
</html>
