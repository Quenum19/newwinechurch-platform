{{--
  Support de table imprimable — A5 portrait, 2 pages :
    - Page 1 : Roi & Reine (thème NOIR épuré — brand + titre italique dominant
      + "SCANNE POUR VOTER" + QR GÉANT + ticket-hint 1 ligne + footer BAL 2026
      dans cadre bordé or)
    - Page 2 : Suis-nous  (thème IVOIRE inchangé)
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
     PAGE 1 — VOTE ROI & REINE (thème NOIR épuré, QR géant)
     ══════════════════════════════════════════════════════════════ */
  .page-vote {
    width: 148mm; height: 210mm;
    position: relative;
    background: #0A0A0A;
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
    top: 14mm; left: 12mm; right: 12mm; bottom: 30mm;
    text-align: center;
  }

  /* Brand — NEW WINE CHURCH · ABIDJAN */
  .page-vote .brand {
    font-size: 9pt;
    letter-spacing: 4pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 2mm;
  }

  /* Titre "Roi & Reine" — Serif italique or dominant */
  .page-vote h1 {
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 44pt;
    color: #EECF80;
    margin: 4mm 0 3mm;
    line-height: 1;
    letter-spacing: 0.5pt;
  }

  /* Sous-titre "SCANNE POUR VOTER" — petit, letterSpacing large */
  .page-vote .scan {
    font-size: 8pt;
    letter-spacing: 3.5pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
    margin-bottom: 6mm;
  }

  /* QR — encart ivoire GÉANT + bordure or 2pt */
  .page-vote .qr-wrap {
    display: inline-block;
    background: #F5E6C8;
    padding: 5mm;
    border-radius: 3mm;
    border: 2pt solid #C9A961;
  }
  .page-vote .qr-wrap img {
    display: block;
    width: 100mm;
    height: 100mm;
  }

  /* Ticket-hint — UNE ligne discrète sous le QR */
  .page-vote .hint {
    margin-top: 6mm;
    font-family: "DejaVu Serif", serif;
    font-style: italic;
    font-size: 11pt;
    color: #D9CBB0;
    letter-spacing: 0.3pt;
  }
  .page-vote .hint strong {
    color: #E6C877;
    font-style: normal;
    font-weight: bold;
    letter-spacing: 0.8pt;
  }

  /* Ornement filet + losange + filet AU-DESSUS du footer */
  .page-vote .ornament {
    position: absolute;
    left: 20mm; right: 20mm; bottom: 22mm;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4mm;
  }
  .page-vote .ornament .line {
    flex: 1;
    height: 0.8pt;
    background: rgba(201, 169, 97, 0.5);
  }
  .page-vote .ornament .diamond {
    width: 2.5mm;
    height: 2.5mm;
    background: #C9A961;
    transform: rotate(45deg);
  }

  /* Footer "BAL 2026 — A DARK NIGHT IN ELEGANCE" — cadre bordé or */
  .page-vote .foot {
    position: absolute;
    left: 0; right: 0; bottom: 12mm;
    text-align: center;
  }
  .page-vote .foot-line {
    display: inline-block;
    padding: 2mm 6mm;
    border: 1pt solid #C9A961;
    border-radius: 2mm;
    font-size: 9pt;
    color: #E6C877;
    letter-spacing: 2pt;
    text-transform: uppercase;
    font-weight: bold;
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

{{-- ═══════════════════ PAGE 1 — Roi & Reine (NOIR épuré) ═══════════════════ --}}
<div class="page-vote">
  <div class="frame"></div>
  <div class="frame-inner"></div>

  <div class="content">
    <div class="brand">New Wine Church &middot; Abidjan</div>

    <h1>Roi &amp; Reine</h1>

    <div class="scan">Scanne pour voter</div>

    <div class="qr-wrap">
      <img src="{{ $voteQr }}" alt="QR Vote">
    </div>

    <div class="hint">
      Saisis ton <strong>code ticket</strong> re&ccedil;u par email &middot; 1 vote unique
    </div>
  </div>

  <div class="ornament">
    <span class="line"></span>
    <span class="diamond"></span>
    <span class="line"></span>
  </div>

  <div class="foot">
    <div class="foot-line">BAL 2026 &mdash; A Dark Night in Elegance</div>
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
