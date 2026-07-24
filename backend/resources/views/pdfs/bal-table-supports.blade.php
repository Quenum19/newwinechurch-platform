{{--
  Support de table imprimable — A5 portrait, 2 pages :
    - Page 1 : Roi & Reine (thème NOIR — mêmes infos que l'original ivoire,
      juste la palette adaptée + QR légèrement agrandi 50→65mm)
    - Page 2 : Suis-nous  (thème IVOIRE inchangé — brand, logo, ★★★, CTA,
      QR 50mm, tip, footer bordeaux)
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Supports de table — {{ $event->title }}</title>
<style>
  @page { margin: 0; size: A5 portrait; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 148mm; }
  body { font-family: "DejaVu Sans", sans-serif; }

  /* ══════════════════════════════════════════════════════════════
     PAGE 1 — VOTE ROI & REINE (thème NOIR, structure originale)
     ══════════════════════════════════════════════════════════════ */
  .page-vote {
    width: 148mm; height: 210mm;
    position: relative;
    background: linear-gradient(180deg, #0A0A0A 0%, #1a0f14 55%, #0A0A0A 100%);
    color: #F5E6C8;
    overflow: hidden;
    page-break-after: always;
  }
  .page-vote .frame {
    position: absolute;
    top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
    border: 1.5pt solid #C9A961;
  }
  .page-vote .frame-inner {
    position: absolute;
    top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
    border: 0.5pt solid rgba(201, 169, 97, 0.4);
  }
  .page-vote .content {
    position: absolute;
    top: 12mm; left: 14mm; right: 14mm; bottom: 28mm;
    text-align: center;
  }
  .page-vote .brand {
    font-size: 7pt;
    letter-spacing: 2.5pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
  }
  .page-vote .logo {
    display: block;
    margin: 3mm auto 0;
    width: 24mm; height: 24mm;
    object-fit: contain;
  }
  .page-vote .logo-placeholder {
    display: block;
    margin: 3mm auto 0;
    width: 24mm; height: 24mm;
    background: #C9A961;
    color: #0A0A0A;
    text-align: center; line-height: 24mm;
    font-size: 16pt; font-weight: bold;
    border-radius: 3mm;
  }
  .page-vote h1 {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 32pt;
    color: #EECF80;
    margin-top: 3mm;
    line-height: 1;
    letter-spacing: 0.5pt;
  }
  .page-vote .subtitle {
    font-size: 8.5pt;
    color: #C9A961;
    letter-spacing: 1.2pt;
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 2.5mm;
  }
  .page-vote .divider {
    color: #E6C877;
    letter-spacing: 4pt;
    font-size: 10pt;
    margin: 3mm 0;
  }
  .page-vote .cta {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 11pt;
    color: #F5E6C8;
    font-weight: bold;
    margin: 2mm 0;
    line-height: 1.3;
  }
  .page-vote .qr-wrap {
    display: inline-block;
    background: #F5E6C8;
    padding: 3mm;
    border-radius: 2.5mm;
    border: 0.7pt solid #C9A961;
    margin-top: 3mm;
  }
  .page-vote .qr-wrap img {
    display: block;
    width: 65mm;
    height: 65mm;
  }
  .page-vote .ticket-hint {
    margin-top: 3mm;
    padding: 2mm 4mm;
    display: inline-block;
    border: 0.6pt dashed #C9A961;
    border-radius: 1.5mm;
    font-size: 8pt;
    color: #F5E6C8;
    line-height: 1.4;
    background: rgba(201, 169, 97, 0.06);
  }
  .page-vote .ticket-hint strong { color: #E6C877; }
  .page-vote .foot {
    position: absolute;
    left: 0; right: 0; bottom: 10mm;
    text-align: center;
  }
  .page-vote .foot-line {
    display: inline-block;
    padding: 2mm 5mm;
    border: 0.7pt solid #C9A961;
    border-radius: 2mm;
    font-size: 8pt;
    color: #E6C877;
    letter-spacing: 1.8pt;
    text-transform: uppercase;
    font-weight: bold;
  }
  .page-vote .foot-tag {
    margin-top: 2.5mm;
    font-size: 6.5pt;
    color: #8B7960;
    letter-spacing: 1.8pt;
    text-transform: uppercase;
  }

  /* ══════════════════════════════════════════════════════════════
     PAGE 2 — SUIS-NOUS (thème IVOIRE inchangé)
     ══════════════════════════════════════════════════════════════ */
  .page-follow {
    width: 148mm; height: 210mm;
    position: relative;
    background: #FAF6EE;
    color: #4A3F32;
    overflow: hidden;
  }
  .page-follow .frame {
    position: absolute;
    top: 6mm; left: 6mm; right: 6mm; bottom: 6mm;
    border: 1.5pt solid #C9A961;
  }
  .page-follow .frame-inner {
    position: absolute;
    top: 8mm; left: 8mm; right: 8mm; bottom: 8mm;
    border: 0.5pt solid rgba(201, 169, 97, 0.4);
  }
  .page-follow .content {
    position: absolute;
    top: 12mm; left: 14mm; right: 14mm; bottom: 28mm;
    text-align: center;
  }
  .page-follow .brand {
    font-size: 7pt;
    letter-spacing: 2.5pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
  }
  .page-follow .logo {
    display: block;
    margin: 3mm auto 0;
    width: 24mm; height: 24mm;
    object-fit: contain;
  }
  .page-follow .logo-placeholder {
    display: block;
    margin: 3mm auto 0;
    width: 24mm; height: 24mm;
    background: #8B1A2F;
    color: #F5E6C8;
    text-align: center; line-height: 24mm;
    font-size: 16pt; font-weight: bold;
    border-radius: 3mm;
  }
  .page-follow h1 {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 32pt;
    color: #C9A961;
    margin-top: 3mm;
    line-height: 1;
    letter-spacing: 0.5pt;
  }
  .page-follow .subtitle {
    font-size: 8.5pt;
    color: #8B7960;
    letter-spacing: 1.2pt;
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 2.5mm;
  }
  .page-follow .divider {
    color: #C9A961;
    letter-spacing: 4pt;
    font-size: 10pt;
    margin: 3mm 0;
  }
  .page-follow .cta {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 11pt;
    color: #4A3F32;
    font-weight: bold;
    margin: 2mm 0;
    line-height: 1.3;
  }
  .page-follow .qr-wrap {
    display: inline-block;
    background: #FFFFFF;
    padding: 3mm;
    border-radius: 2.5mm;
    border: 0.5pt solid #C9A961;
    margin-top: 3mm;
  }
  .page-follow .qr-wrap img {
    display: block;
    width: 50mm;
    height: 50mm;
  }
  .page-follow .tip {
    margin-top: 3mm;
    font-size: 8pt;
    color: #8B7960;
    letter-spacing: 1pt;
    text-transform: uppercase;
    font-weight: bold;
  }
  .page-follow .foot {
    position: absolute;
    left: 0; right: 0; bottom: 10mm;
    text-align: center;
  }
  .page-follow .foot-line {
    display: inline-block;
    padding: 2mm 5mm;
    border: 0.7pt solid #8B1A2F;
    border-radius: 2mm;
    font-size: 8pt;
    color: #8B1A2F;
    letter-spacing: 1.8pt;
    text-transform: uppercase;
    font-weight: bold;
  }
  .page-follow .foot-tag {
    margin-top: 2.5mm;
    font-size: 6.5pt;
    color: #A89A82;
    letter-spacing: 1.8pt;
    text-transform: uppercase;
  }
</style>
</head>
<body>

{{-- ═══════════════════ PAGE 1 — Roi & Reine (thème NOIR) ═══════════════════ --}}
<div class="page-vote">
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

{{-- ═══════════════════ PAGE 2 — Suis-nous (thème IVOIRE inchangé) ═══════════════════ --}}
<div class="page-follow">
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
