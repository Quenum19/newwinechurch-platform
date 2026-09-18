<?php
/**
 * Génère les 4 templates HTML des cadres Festi Grill '26 — design éditorial
 * repris de la maquette Claude Design "Festi Grill 26 - Story 9x16".
 *
 *   - Bande verticale gauche ambre + filet bordeaux
 *   - Texte vertical blanc : NEW WINE CHURCH ✦ FESTI GRILL'26 ✦ 12 SEPTEMBRE 2026
 *   - Logo NW en haut à droite
 *   - Pile titre bas-gauche : "Festi" (script) / bloc ambre "GRILL'26" / cartouche date
 *   - Tout le reste transparent : la photo remplit le cadre
 *
 * Chaque format applique un facteur d'échelle `s` sur les tailles de la story.
 * Usage : npm run build   (ou : php generate-frames-html.php && node rasterize.mjs)
 */

// Logo officiel du site (source unique) — chemin relatif aux HTML générés.
$logo = '../../../frontend/public/logos/logo_newwine.png';
if (! is_file(__DIR__ . '/' . $logo)) {
    fwrite(STDERR, "Logo introuvable : {$logo}\n");
    exit(1);
}

// [w, h, s, vertical text: centre Y, longueur max]
$formats = [
    'story'     => ['w' => 1080, 'h' => 1920, 's' => 1.00, 'cy' => 1030, 'len' => 1200],
    'square'    => ['w' => 1080, 'h' => 1080, 's' => 0.80, 'cy' => 470,  'len' => 800],
    'landscape' => ['w' => 1350, 'h' => 900,  's' => 0.70, 'cy' => 390,  'len' => 680],
    'tv'        => ['w' => 1920, 'h' => 1080, 's' => 0.85, 'cy' => 470,  'len' => 800],
];

foreach ($formats as $name => $f) {
    $s   = $f['s'];
    $px  = fn (float $v) => round($v * $s) . 'px';

    $stripW   = max(18, round(24 * $s));
    $lineW    = max(4, round(6 * $s));
    $textCx   = $stripW + $lineW + round(58 * $s);
    $textFs   = round(26 * $s);

    $html = <<<HTML
<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Festi Grill '26 — cadre {$name} {$f['w']}×{$f['h']}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@800;900&family=Kaushan+Script&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: transparent; overflow: hidden; }
  body { width: {$f['w']}px; height: {$f['h']}px; position: relative; font-family: 'Inter', sans-serif; }

  .strip {
    position: absolute; top: 0; bottom: 0; left: 0;
    width: {$stripW}px;
    background: #F2A623;
    border-right: {$lineW}px solid #6E1420;
  }

  .vtext {
    position: absolute;
    white-space: nowrap;
    color: #FFFFFF;
    font-weight: 800;
    font-size: {$textFs}px;
    letter-spacing: 0.38em;
    text-transform: uppercase;
    transform: rotate(-90deg);
    transform-origin: center center;
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.55);
  }
  .vtext .star { margin: 0 0.6em; letter-spacing: 0; }

  .logo {
    position: absolute;
    top: {$px(70)}; right: {$px(20)};
    width: {$px(250)}; height: auto;
    filter: drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45));
  }

  .title {
    position: absolute;
    left: {$px(130)}; bottom: {$px(115)};
    display: flex; flex-direction: column; align-items: flex-start;
  }
  .festi {
    font-family: 'Kaushan Script', cursive;
    font-size: {$px(100)};
    line-height: 1;
    color: #FFFFFF;
    margin-left: {$px(20)};
    margin-bottom: {$px(-14)};
    transform: rotate(-4deg);
    text-shadow: 0 3px 12px rgba(0, 0, 0, 0.55);
    position: relative; z-index: 3;
  }
  .grill {
    font-family: 'Anton', 'Impact', sans-serif;
    font-size: {$px(190)};
    line-height: 1.02;
    color: #1E1413;
    background: #F2A623;
    padding: {$px(6)} {$px(34)} 0;
    box-shadow: {$px(14)} {$px(14)} 0 #6E1420;
    transform: rotate(-2deg);
    position: relative; z-index: 2;
  }
  .date {
    font-weight: 900;
    font-size: {$px(34)};
    letter-spacing: 0.3em;
    color: #7A1B2A;
    background: #FFFFFF;
    padding: {$px(16)} {$px(26)} {$px(14)} {$px(28)};
    margin-top: {$px(8)};
    transform: rotate(-2deg);
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
    position: relative; z-index: 1;
  }
</style>
</head>
<body>
  <div class="strip"></div>

  <div class="vtext" id="vtext">New Wine Church<span class="star">✦</span>Festi Grill'26<span class="star">✦</span>12 Septembre 2026</div>

  <img class="logo" src="{$logo}" alt="New Wine Church">

  <div class="title">
    <div class="festi">Festi</div>
    <div class="grill">GRILL'26</div>
    <div class="date">12 SEPTEMBRE 2026</div>
  </div>

<script>
  // Ajuste la taille du texte vertical pour tenir dans la hauteur, puis le
  // centre sur (cx, cy) avant rotation.
  document.fonts.ready.then(() => {
    const el = document.getElementById('vtext');
    let fs = {$textFs};
    while (el.offsetWidth > {$f['len']} && fs > 10) { fs--; el.style.fontSize = fs + 'px'; }
    el.style.left = ({$textCx} - el.offsetWidth / 2) + 'px';
    el.style.top  = ({$f['cy']} - el.offsetHeight / 2) + 'px';
    document.body.dataset.ready = '1';
  });
</script>
</body>
</html>
HTML;

    file_put_contents(__DIR__ . "/festi-grill-{$name}.html", $html);
    echo "✓ festi-grill-{$name}.html ({$f['w']}×{$f['h']})" . PHP_EOL;
}
