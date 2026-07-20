{{--
  Support de table imprimable — recto (QR vote) + verso (QR follow us).
  Format A5 portrait, design NWC noir/or.
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Supports de table — {{ $event->title }}</title>
<style>
  @page { margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: DejaVu Sans, sans-serif;
    color: #F5E6C8;
    background: #0A0A0A;
  }

  .page {
    width: 148mm;
    height: 210mm;
    padding: 12mm 10mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    text-align: center;
    background: linear-gradient(180deg, #0A0A0A 0%, #1a0f14 50%, #0A0A0A 100%);
    position: relative;
    overflow: hidden;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }

  .frame {
    position: absolute;
    inset: 6mm;
    border: 2px solid #C9A961;
    pointer-events: none;
  }
  .frame-inner {
    position: absolute;
    inset: 8mm;
    border: 1px solid rgba(201, 169, 97, 0.4);
    pointer-events: none;
  }

  .brand {
    font-size: 8pt;
    letter-spacing: 4pt;
    color: #C9A961;
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 6mm;
    z-index: 2;
  }

  .logo {
    width: 30mm;
    height: 30mm;
    object-fit: contain;
    filter: brightness(0) invert(1);
    margin-top: 4mm;
    z-index: 2;
  }
  .logo-placeholder {
    width: 30mm;
    height: 30mm;
    background: #8B1A2F;
    color: #F5E6C8;
    text-align: center;
    line-height: 30mm;
    font-size: 20pt;
    font-weight: bold;
    border-radius: 4mm;
    margin-top: 4mm;
    z-index: 2;
  }

  h1 {
    font-family: "DejaVu Serif", serif;
    font-size: 26pt;
    color: #F5E6C8;
    margin-top: 6mm;
    line-height: 1;
    letter-spacing: 1pt;
    font-style: italic;
    z-index: 2;
  }
  h1 .emoji { font-size: 24pt; }

  .subtitle {
    font-size: 10pt;
    color: #C9A961;
    letter-spacing: 2pt;
    text-transform: uppercase;
    margin-top: 3mm;
    z-index: 2;
  }

  .qr-wrap {
    background: #F5E6C8;
    padding: 5mm;
    border-radius: 3mm;
    box-shadow: 0 0 30pt rgba(201, 169, 97, 0.4);
    z-index: 2;
    margin: 6mm 0;
  }
  .qr-wrap img { display: block; width: 62mm; height: 62mm; }

  .cta {
    font-size: 12pt;
    color: #F5E6C8;
    font-weight: bold;
    margin-bottom: 3mm;
    z-index: 2;
    font-style: italic;
    line-height: 1.3;
  }
  .cta-small {
    font-size: 8pt;
    color: #C9A961;
    letter-spacing: 1pt;
    text-transform: uppercase;
    z-index: 2;
    margin-bottom: 4mm;
  }

  .divider {
    color: #C9A961;
    letter-spacing: 6pt;
    font-size: 10pt;
    margin: 3mm 0;
    z-index: 2;
  }

  .footer-tag {
    font-size: 7pt;
    color: #8B7960;
    letter-spacing: 2pt;
    text-transform: uppercase;
    z-index: 2;
    margin-bottom: 2mm;
  }
</style>
</head>
<body>

{{-- ══════════════════ RECTO — Vote Roi & Reine ══════════════════ --}}
<div class="page">
  <div class="frame"></div>
  <div class="frame-inner"></div>

  <div class="brand">New Wine Church · Abidjan</div>

  @if($logoDataUri)
    <img src="{{ $logoDataUri }}" alt="NWC" class="logo">
  @else
    <div class="logo-placeholder">NWC</div>
  @endif

  <h1><span class="emoji">👑</span> Roi &amp; Reine</h1>
  <div class="subtitle">Bal 2026 — A Dark Night in Elegance</div>

  <div class="divider">★ ★ ★</div>

  <div class="cta">
    Scanne pour voter<br/>ton Roi &amp; ta Reine
  </div>

  <div class="qr-wrap">
    <img src="{{ $voteQr }}" alt="QR Vote">
  </div>

  <div class="cta-small">Un vote max par téléphone</div>

  <div class="footer-tag">Recto</div>
</div>

{{-- ══════════════════ VERSO — Follow us ══════════════════ --}}
<div class="page">
  <div class="frame"></div>
  <div class="frame-inner"></div>

  <div class="brand">New Wine Church · Abidjan</div>

  @if($logoDataUri)
    <img src="{{ $logoDataUri }}" alt="NWC" class="logo">
  @else
    <div class="logo-placeholder">NWC</div>
  @endif

  <h1><span class="emoji">✨</span> Suis-nous</h1>
  <div class="subtitle">Restons en contact</div>

  <div class="divider">★ ★ ★</div>

  <div class="cta">
    Retrouve-nous sur<br/>nos réseaux sociaux
  </div>

  <div class="qr-wrap">
    <img src="{{ $followQr }}" alt="QR Follow us">
  </div>

  <div class="cta-small">Instagram · Facebook · TikTok · YouTube</div>

  <div class="footer-tag">Verso</div>
</div>

</body>
</html>
