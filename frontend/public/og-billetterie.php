<?php
/**
 * OG tags dynamiques pour la billetterie NWC.
 *
 * Cible : les robots sociaux (WhatsApp, Facebook, Twitter, Slack…) qui
 * demandent la page pour générer l'aperçu du lien. Pour eux, on renvoie
 * un HTML minimal avec les balises Open Graph correctes (affiche + titre
 * + description de l'événement) au lieu du logo/description génériques
 * du site.
 *
 * Redirection UX : les vrais visiteurs sont renvoyés automatiquement vers
 * la SPA React (via meta refresh + JavaScript location.replace).
 *
 * Le routage vers ce fichier est fait par .htaccess sur match de
 * User-Agent bot social.
 *
 * URL fallback : ce fichier peut aussi être appelé directement avec
 * ?slug=xxx pour tester.
 */

$slug = $_GET['slug'] ?? null;

// URL de l'API publique — on lit les infos de l'event.
$apiBase = 'https://api.newinechurch.org/api';

/**
 * Récupère les infos d'UN event via son slug.
 * Retourne null si event introuvable ou API HS.
 */
function fetchEvent(string $apiBase, string $slug): ?array
{
    $url = $apiBase . '/tickets/events/' . urlencode($slug);
    $ctx = stream_context_create([
        'http' => ['timeout' => 5, 'header' => "Accept: application/json\r\n"],
    ]);
    $raw = @file_get_contents($url, false, $ctx);
    if (! $raw) return null;
    $data = json_decode($raw, true);
    if (! is_array($data)) return null;
    // Réponse de PublicTicketsController::show : { event, meta, ticket_types }
    return $data['event'] ?? $data['data'] ?? $data;
}

/**
 * Récupère la liste des events billetterie ouverts et retourne le premier
 * (utile pour la page /billetterie sans slug).
 */
function fetchFirstUpcomingEvent(string $apiBase): ?array
{
    $ctx = stream_context_create([
        'http' => ['timeout' => 5, 'header' => "Accept: application/json\r\n"],
    ]);
    $raw = @file_get_contents($apiBase . '/tickets/events?per_page=1', false, $ctx);
    if (! $raw) return null;
    $data = json_decode($raw, true);
    return $data['data'][0] ?? null;
}

$event = null;
if ($slug) {
    $event = fetchEvent($apiBase, $slug);
}
if (! $event) {
    $event = fetchFirstUpcomingEvent($apiBase);
}

// ─── Valeurs à injecter dans les meta ─────────────────────────
$title       = $event['title']
    ?? 'Billetterie New Wine Church — Événements à venir';

$description = $event['description'] ?? null;
if ($description) {
    // Nettoie et tronque à 200 chars
    $description = trim(preg_replace('/\s+/', ' ', strip_tags($description)));
    $description = mb_strimwidth($description, 0, 200, '…');
} else {
    $description = 'Réserve tes places pour les événements de New Wine Church.';
}

$image = $event['cover_image'] ?? 'https://newinechurch.org/logos/logo_newwine.png';
// Si l'URL de la cover est relative (rare), on la préfixe
if ($image && ! preg_match('#^https?://#', $image)) {
    $image = 'https://newinechurch.org/' . ltrim($image, '/');
}

// URL canonique = le lien de la SPA sur le site
$canonicalPath = $slug
    ? '/billetterie/' . htmlspecialchars($slug, ENT_QUOTES)
    : '/billetterie';
$canonical = 'https://newinechurch.org' . $canonicalPath;

// Date + lieu pour le title (si event précis)
$eventDate = null;
if (isset($event['starts_at'])) {
    $ts = strtotime($event['starts_at']);
    if ($ts) {
        setlocale(LC_TIME, 'fr_FR.utf8', 'fr_FR', 'French');
        $eventDate = ucfirst(strftime('%A %d %B %Y', $ts));
    }
}

$location = $event['location'] ?? null;

// Titre enrichi pour les meta og:title
$ogTitle = $slug && $eventDate
    ? $title . ' — ' . $eventDate
    : $title;

// Escape final pour output HTML
$e = fn ($s) => htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8');
?><!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= $e($ogTitle) ?></title>
<meta name="description" content="<?= $e($description) ?>">
<link rel="canonical" href="<?= $e($canonical) ?>">

<!-- Open Graph (WhatsApp, Facebook, LinkedIn, iMessage…) -->
<meta property="og:type"        content="event">
<meta property="og:site_name"   content="New Wine Church">
<meta property="og:title"       content="<?= $e($ogTitle) ?>">
<meta property="og:description" content="<?= $e($description) ?>">
<meta property="og:url"         content="<?= $e($canonical) ?>">
<meta property="og:image"       content="<?= $e($image) ?>">
<meta property="og:image:width"  content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale"      content="fr_FR">

<?php if ($eventDate): ?>
<meta property="event:start_time" content="<?= $e($event['starts_at']) ?>">
<?php endif; ?>

<!-- Twitter Card -->
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="<?= $e($ogTitle) ?>">
<meta name="twitter:description" content="<?= $e($description) ?>">
<meta name="twitter:image"       content="<?= $e($image) ?>">

<!-- Redirection propre pour vrai visiteur (au cas où) -->
<meta http-equiv="refresh" content="0;url=<?= $e($canonical) ?>">
<script>window.location.replace(<?= json_encode($canonical) ?>);</script>
</head>
<body>
<h1><?= $e($ogTitle) ?></h1>
<p><?= $e($description) ?></p>
<?php if ($image): ?>
<img src="<?= $e($image) ?>" alt="<?= $e($title) ?>" style="max-width:100%">
<?php endif; ?>
<p><a href="<?= $e($canonical) ?>">Voir sur newinechurch.org</a></p>
</body>
</html>
