<?php

/**
 * ==============================================================
 *  NEW WINE CHURCH — Routes API
 *
 *  Toutes les routes ici sont préfixées /api et passent par les
 *  middlewares "api" (throttle 60/min, sanctum stateful).
 *
 *  Organisation :
 *    1. Healthcheck
 *    2. Routes publiques (lecture libre, écriture rate-limitée)
 *    3. Authentification (login, register, password, email verification)
 *    4. Espace membre (auth:sanctum)
 *    5. Admin (Phase 5+)
 * ==============================================================
 */

use App\Http\Controllers\Admin\ActivityLogController as AdminActivityLogController;
use App\Http\Controllers\Admin\AdminGovernorsController;
use App\Http\Controllers\Admin\AdminReportReviewController;
use App\Http\Controllers\Admin\AdminReportTemplatesController;
use App\Http\Controllers\Admin\CellsController as AdminCellsController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\DepartmentsController as AdminDepartmentsController;
use App\Http\Controllers\Admin\DonationsController as AdminDonationsController;
use App\Http\Controllers\Admin\EventsController as AdminEventsController;
use App\Http\Controllers\Admin\LiveStreamsController as AdminLiveController;
use App\Http\Controllers\Admin\MediaGalleryController as AdminMediaController;
use App\Http\Controllers\Admin\MembersController as AdminMembersController;
use App\Http\Controllers\Admin\NewsletterController as AdminNewsletterController;
use App\Http\Controllers\Admin\PostsController as AdminPostsController;
use App\Http\Controllers\Admin\PrayerRequestsController as AdminPrayersController;
use App\Http\Controllers\Admin\SermonsController as AdminSermonsController;
use App\Http\Controllers\Admin\SermonSeriesController as AdminSermonSeriesController;
use App\Http\Controllers\Admin\SermonThemesController as AdminSermonThemesController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\TestimonialsController as AdminTestimonialsController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\Member\DonationController as MemberDonationController;
use App\Http\Controllers\Member\EventRegistrationController;
use App\Http\Controllers\Member\MeController;
use App\Http\Controllers\Member\MyContextController;
use App\Http\Controllers\Admin\AuthImagesController;
use App\Http\Controllers\Admin\DonationMethodsController;
use App\Http\Controllers\Admin\MembershipRequestsController;
use App\Http\Controllers\Public\AuthImageController;
use App\Http\Controllers\Public\ContactController;
use App\Http\Controllers\Public\DepartmentController;
use App\Http\Controllers\Public\DonationMethodController;
use App\Http\Controllers\Public\MembershipRequestController;
use App\Http\Controllers\Public\EventController;
use App\Http\Controllers\Public\EventSeriesController as PublicEventSeriesController;
use App\Http\Controllers\Public\PaymentGatewayController as PublicPaymentGatewayController;
use App\Http\Controllers\Public\LiveStreamController;
use App\Http\Controllers\Public\MediaGalleryController as PublicMediaController;
use App\Http\Controllers\Public\NewsletterController;
use App\Http\Controllers\Public\PostController;
use App\Http\Controllers\Public\PrayerRequestController;
use App\Http\Controllers\Public\SermonController;
use App\Http\Controllers\Public\SermonSeriesController;
use App\Http\Controllers\Public\SermonThemeController;
use App\Http\Controllers\Public\TestimonialController;
use App\Http\Controllers\Public\TicketsController as PublicTicketsController;
use App\Http\Controllers\Admin\EventStaffController as AdminEventStaffController;
use App\Http\Controllers\Admin\EventTicketsController as AdminEventTicketsController;
use App\Http\Controllers\Admin\EventAttendanceController as AdminEventAttendanceController;
use App\Http\Controllers\Public\GuestScannerAuthController;
use App\Http\Controllers\Admin\EventTicketTypesController as AdminEventTicketTypesController;
use App\Http\Controllers\Admin\TicketingAnalyticsController as AdminAnalyticsController;
use App\Http\Controllers\Admin\TicketingDashboard360Controller as AdminDashboard360Controller;
use App\Http\Controllers\Admin\EventSeriesController as AdminEventSeriesController;
use App\Http\Controllers\Public\SettingController;
use Illuminate\Support\Facades\Route;

// === 1. HEALTHCHECK ===
Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'app'    => config('app.name'),
    'env'    => config('app.env'),
    'time'   => now()->toIso8601String(),
]));

// === 2. ROUTES PUBLIQUES ===

// Sermons
Route::get('/sermons',                [SermonController::class, 'index']);
Route::get('/sermons/featured',       [SermonController::class, 'featured']);
Route::get('/sermons/{slug}',         [SermonController::class, 'show'])
     ->where('slug', '[a-z0-9-]+');

// Séries
Route::get('/sermon-series',          [SermonSeriesController::class, 'index']);
Route::get('/sermon-series/{slug}',   [SermonSeriesController::class, 'show'])
     ->where('slug', '[a-z0-9-]+');

// Thèmes (catalogue public, utilisé par les filtres de /messages).
Route::get('/sermon-themes',          [SermonThemeController::class, 'index']);

// Témoignages publiés (consommés par la home + page /temoignages).
Route::get('/testimonials',           [TestimonialController::class, 'index']);

// === Billetterie publique (no auth) ===
Route::get('/tickets/events',             [PublicTicketsController::class, 'events']);
Route::get('/tickets/events/{slug}',      [PublicTicketsController::class, 'show'])
     ->where('slug', '[a-z0-9-]+');
Route::post('/tickets/register',          [PublicTicketsController::class, 'register'])
     ->middleware('throttle:public-register');
// Sécurité #H6 audit : rate limits stricts sur les endpoints token public.
Route::get('/tickets/my/{token}',         [PublicTicketsController::class, 'myTicket'])
     ->middleware('throttle:ticket-view');
Route::get('/tickets/qr/{token}',         [PublicTicketsController::class, 'qrImage'])
     ->middleware('throttle:ticket-view');
Route::post('/tickets/cancel/{token}',    [PublicTicketsController::class, 'cancel'])
     ->middleware('throttle:ticket-cancel');

// === Étape C — Magic-link scanners externes (public, sans auth) ===
Route::get ('/scanner-invite/{token}',        [GuestScannerAuthController::class, 'show'])
     ->where('token', '[A-Za-z0-9]+');
Route::post('/scanner-invite/{token}/redeem', [GuestScannerAuthController::class, 'redeem'])
     ->where('token', '[A-Za-z0-9]+')
     ->middleware('throttle:public-register');

// === Phase 5 — Séries d'événements (public) ===
Route::get('/series',                     [PublicEventSeriesController::class, 'index']);
Route::get('/series/{slug}',              [PublicEventSeriesController::class, 'show'])
     ->where('slug', '[a-z0-9-]+');
// === Phase 2 : suivi commande payante (avant émission tickets) ===
Route::get('/tickets/order/{orderCode}',  [PublicTicketsController::class, 'showOrder']);
Route::post('/tickets/order/{orderCode}/submit-payment',
    [PublicTicketsController::class, 'submitPayment'])
    ->middleware('throttle:public-register');

// === Phase 7 — Passerelle paiement automatisée ===
Route::post('/tickets/order/{orderCode}/initiate-payment',
    [PublicPaymentGatewayController::class, 'initiate'])
    ->middleware('throttle:public-register');
// Webhook callback fournisseur (CinetPay rappelle ici quand le paiement est terminé).
// Pas d'auth — la vérification se fait dans le driver via /check API.
Route::post('/payments/cinetpay/webhook',
    [PublicPaymentGatewayController::class, 'webhook']);

// Événements
Route::get('/events',                 [EventController::class, 'index']);
Route::get('/events/{slug}',          [EventController::class, 'show'])
     ->where('slug', '[a-z0-9-]+');

// Articles
Route::get('/posts',                  [PostController::class, 'index']);
Route::get('/posts/categories',       [PostController::class, 'categories']);
Route::get('/posts/{slug}',           [PostController::class, 'show'])
     ->where('slug', '[a-z0-9-]+');

// Départements
Route::get('/departments',                  [DepartmentController::class, 'index']);
Route::get('/departments/{slug}',           [DepartmentController::class, 'show'])
     ->where('slug', '[a-z0-9-]+');
// Étape 5 : médias paginés d'un département.
Route::get('/departments/{slug}/media',     [DepartmentController::class, 'media'])
     ->where('slug', '[a-z0-9-]+');

// Live
Route::get('/live/current',           [LiveStreamController::class, 'current']);
Route::get('/live/next',              [LiveStreamController::class, 'next']);

// Galerie publique (photos + vidéos publiées)
// Rate limit doux pour empêcher le scraping massif de médias.
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/media',              [PublicMediaController::class, 'index']);
});

// Mur de prière publique
Route::get('/prayer-requests',        [PrayerRequestController::class, 'publicWall']);
Route::post('/prayer-requests/{id}/pray', [PrayerRequestController::class, 'pray'])
     ->whereNumber('id')
     ->middleware('throttle:30,1');

// Settings publics
Route::get('/settings/public',        [SettingController::class, 'index']);

// Méthodes de don affichées sur /donner (Mobile Money + Wave + …)
Route::get('/donation-methods',       [DonationMethodController::class, 'index']);

// Image hero aléatoire pour les pages auth (connexion / inscription).
Route::get('/auth-images/random',     [AuthImageController::class, 'random']);

// === Bal 2026 — endpoints publics (écran live + vote) ===
Route::get ('/public/events/{id}/bal/state', [\App\Http\Controllers\Public\BalScreenPublicController::class, 'state'])
    ->whereNumber('id');
Route::get ('/public/events/{id}/bal/vote',  [\App\Http\Controllers\Public\BalVoteController::class, 'show'])
    ->whereNumber('id');
Route::post('/public/events/{id}/bal/vote',  [\App\Http\Controllers\Public\BalVoteController::class, 'submit'])
    ->whereNumber('id')
    ->middleware('throttle:10,1');

// Follow us — liens réseaux sociaux NWC
Route::get('/public/nwc/social-links', [\App\Http\Controllers\Public\NwcSocialLinksController::class, 'index']);

// Hub d'enrôlement bal — CTA "Rejoindre la NWC" (page Suis-nous)
Route::get ('/public/enrollment/departments', [\App\Http\Controllers\Public\PublicBalEnrollmentController::class, 'departments']);
Route::post('/public/enrollment/bal',         [\App\Http\Controllers\Public\PublicBalEnrollmentController::class, 'store'])
    ->middleware('throttle:5,1');

// === DONS PUBLIQUES (membres connectés ou anonymes) ===
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/prayer-requests',        [PrayerRequestController::class, 'store']);
    Route::post('/contact',                [ContactController::class, 'store']);
    Route::post('/newsletter/subscribe',   [NewsletterController::class, 'subscribe']);
    Route::post('/donations',              [MemberDonationController::class, 'store']);
    // Demande d'adhésion publique (workflow d'admission). Rate-limit strict
    // pour éviter le spam (5/h/IP via throttle:register existant ne s'applique
    // qu'à /auth/register ; ici on garde 10/min/IP via le groupe parent).
    Route::post('/membership-requests',    [MembershipRequestController::class, 'store']);
});

// Confirmation / désinscription newsletter (lien email).
Route::get('/newsletter/confirm/{token}', [NewsletterController::class, 'confirm']);
Route::get('/newsletter/unsubscribe',     [NewsletterController::class, 'unsubscribe']);

// === 3. AUTH ===

// Inscription directe : DÉSACTIVÉE (modèle admission via membership_requests).
// L'ancienne route /auth/register est conservée en alias vers le nouveau workflow
// pour ne pas casser un éventuel client externe.
Route::middleware('throttle:register')->group(function () {
    Route::post('/auth/register', [MembershipRequestController::class, 'store']);
});

// Connexion (rate-limitée par email+IP).
Route::middleware('throttle:login')->group(function () {
    Route::post('/auth/login', [LoginController::class, 'login']);
});

// Reset password (rate-limitée par email+IP).
Route::middleware('throttle:password-reset')->group(function () {
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'forgot']);
    Route::post('/auth/reset-password',  [PasswordResetController::class, 'reset']);
});

// Vérification email — URL signée Laravel (anti-falsification).
Route::get('/auth/email/verify/{id}/{hash}',
        [EmailVerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

// === 4. ESPACE MEMBRE (auth:sanctum) ===

Route::middleware('auth:sanctum')->group(function () {

    // Logout (mode SPA ou token).
    Route::post('/auth/logout',     [LoginController::class, 'logout']);
    Route::post('/auth/logout-all', [LoginController::class, 'logoutAll']);

    // Renvoi de l'email de vérification.
    Route::post('/auth/email/resend', [EmailVerificationController::class, 'resend'])
         ->middleware('throttle:6,1');

    // Profil
    Route::get('/me',           [MeController::class, 'show']);
    Route::put('/me',           [MeController::class, 'update']);
    Route::put('/me/password',  [MeController::class, 'changePassword']);

    // Avatar — limite stockage : 10 uploads / jour / user.
    // Étape F — Missions billetterie actives du user connecté (panneau "Mes missions").
    Route::get('/me/staff-assignments', [MeController::class, 'staffAssignments']);

    Route::post('/me/avatar',   [MeController::class, 'uploadAvatar'])
         ->middleware('throttle:avatar-upload');
    Route::delete('/me/avatar', [MeController::class, 'deleteAvatar']);

    // Mes dons
    Route::get('/me/donations',      [MemberDonationController::class, 'mine']);
    Route::get('/me/donations/{id}', [MemberDonationController::class, 'show'])
         ->whereNumber('id');

    // Inscription événements
    Route::post('/events/{id}/register',   [EventRegistrationController::class, 'register'])
         ->whereNumber('id');
    Route::delete('/events/{id}/register', [EventRegistrationController::class, 'unregister'])
         ->whereNumber('id');
    Route::get('/me/events',               [EventRegistrationController::class, 'mine']);

    // Cellule + départements
    Route::get('/me/cell',         [MyContextController::class, 'cell']);
    Route::get('/me/departments',  [MyContextController::class, 'departments']);

    // === Sprint B — Préférences notifications utilisateur ===
    Route::get('/me/notification-preferences',
               [\App\Http\Controllers\Member\NotificationPreferencesController::class, 'index']);
    Route::post('/me/notification-preferences',
               [\App\Http\Controllers\Member\NotificationPreferencesController::class, 'update']);

    // === Étape 3 — Inbox notifications (Laravel Notifications database channel) ===
    Route::get('/notifications',                   [\App\Http\Controllers\Member\NotificationsController::class, 'index']);
    Route::get('/notifications/count',             [\App\Http\Controllers\Member\NotificationsController::class, 'count']);
    Route::post('/notifications/mark-read',        [\App\Http\Controllers\Member\NotificationsController::class, 'markAllRead']);
    Route::post('/notifications/{id}/mark-read',   [\App\Http\Controllers\Member\NotificationsController::class, 'markRead']);
    Route::delete('/notifications/{id}',           [\App\Http\Controllers\Member\NotificationsController::class, 'destroy']);
});

// === 5. ADMIN (auth:sanctum + role staff + permission "access admin panel") ===
//
// Le rôle "membre" est exclu via role_or_permission middleware sur la perm "access admin panel"
// (les capitaines y ont accès — leurs vues sont scopées par Policy).
Route::middleware(['auth:sanctum', 'permission:access admin panel'])
    ->prefix('admin')
    ->group(function () {

    // Dashboard
    Route::get('/dashboard', [AdminDashboardController::class, 'index']);

    // === Activity Log (lecture seule) ===
    Route::get('/activity-log', [AdminActivityLogController::class, 'index']);

    // === Membres ===
    Route::get('/members',                  [AdminMembersController::class, 'index']);
    Route::get('/members/export',           [AdminMembersController::class, 'export']);
    Route::post('/members/bulk',            [AdminMembersController::class, 'bulk']);
    Route::post('/members',                 [AdminMembersController::class, 'store']);
    Route::get('/members/{id}',                  [AdminMembersController::class, 'show'])->whereNumber('id');
    Route::get('/members/{id}/deletion-impact',  [AdminMembersController::class, 'deletionImpact'])->whereNumber('id');
    Route::put('/members/{id}',                  [AdminMembersController::class, 'update'])->whereNumber('id');
    Route::delete('/members/{id}',               [AdminMembersController::class, 'destroy'])->whereNumber('id');
    Route::post('/members/{id}/restore',    [AdminMembersController::class, 'restore'])->whereNumber('id');
    Route::delete('/members/{id}/force',     [AdminMembersController::class, 'forceDelete'])->whereNumber('id');
    Route::post('/members/{id}/resend-credentials',
                                            [AdminMembersController::class, 'resendCredentials'])->whereNumber('id');
    Route::post('/members/{id}/toggle-status',
                                            [AdminMembersController::class, 'toggleStatus'])->whereNumber('id');
    Route::post('/members/{id}/avatar',      [AdminMembersController::class, 'uploadAvatar'])->whereNumber('id');
    Route::put('/members/{id}/roles',       [AdminMembersController::class, 'assignRoles'])->whereNumber('id');

    // === Départements ===
    Route::get('/departments',                                 [AdminDepartmentsController::class, 'index']);
    Route::post('/departments',                                [AdminDepartmentsController::class, 'store']);
    Route::get('/departments/{id}',                            [AdminDepartmentsController::class, 'show'])->whereNumber('id');
    Route::put('/departments/{id}',                            [AdminDepartmentsController::class, 'update'])->whereNumber('id');
    // Variante POST + _method=PUT pour multipart (upload bannière).
    Route::post('/departments/{id}',                           [AdminDepartmentsController::class, 'update'])->whereNumber('id');
    Route::delete('/departments/{id}',                         [AdminDepartmentsController::class, 'destroy'])->whereNumber('id');
    // Nouvelle route gouverneur (canonique).
    Route::put('/departments/{id}/governor',                   [AdminDepartmentsController::class, 'assignGovernor'])->whereNumber('id');
    // Alias rétrocompatibilité legacy (frontend Étape 4 migrera vers /governor).
    Route::put('/departments/{id}/captain',                    [AdminDepartmentsController::class, 'assignGovernor'])->whereNumber('id');
    Route::post('/departments/{id}/members',                   [AdminDepartmentsController::class, 'addMember'])->whereNumber('id');
    Route::delete('/departments/{id}/members/{userId}',        [AdminDepartmentsController::class, 'removeMember'])
         ->whereNumber('id')->whereNumber('userId');
    // Historique des gouverneurs (timeline + export CSV via ?format=csv).
    Route::get('/departments/{id}/governors-history',          [AdminDepartmentsController::class, 'governorsHistory'])->whereNumber('id');
    // Stats globales pour le dashboard de la liste admin.
    Route::get('/departments-stats',                           [AdminDepartmentsController::class, 'stats']);

    // === Cellules + Rapports ===
    Route::get('/cells',                                  [AdminCellsController::class, 'index']);
    Route::post('/cells',                                 [AdminCellsController::class, 'store']);
    Route::get('/cells/{id}',                             [AdminCellsController::class, 'show'])->whereNumber('id');
    Route::put('/cells/{id}',                             [AdminCellsController::class, 'update'])->whereNumber('id');
    Route::delete('/cells/{id}',                          [AdminCellsController::class, 'destroy'])->whereNumber('id');
    Route::post('/cells/{id}/members',                    [AdminCellsController::class, 'addMember'])->whereNumber('id');
    Route::delete('/cells/{id}/members/{userId}',         [AdminCellsController::class, 'removeMember'])
         ->whereNumber('id')->whereNumber('userId');
    Route::get('/cells/{id}/reports',                     [AdminCellsController::class, 'reports'])->whereNumber('id');
    Route::post('/cells/{id}/reports',                    [AdminCellsController::class, 'storeReport'])->whereNumber('id');
    Route::put('/cells/{cellId}/reports/{reportId}/validate',
                [AdminCellsController::class, 'validateReport'])
         ->whereNumber('cellId')->whereNumber('reportId');
    Route::get('/cells/{cellId}/reports/{reportId}/pdf',
                [AdminCellsController::class, 'downloadCellReportPdf'])
         ->whereNumber('cellId')->whereNumber('reportId')->middleware('throttle:30,1');
    Route::post('/cells/{cellId}/reports/{reportId}/regenerate-pdf',
                [AdminCellsController::class, 'regenerateCellReportPdf'])
         ->whereNumber('cellId')->whereNumber('reportId');

    // === Dons ===
    Route::get('/donations',             [AdminDonationsController::class, 'index']);
    Route::get('/donations/export',      [AdminDonationsController::class, 'export']);
    Route::get('/donations/stats',       [AdminDonationsController::class, 'stats']);
    Route::get('/donations/{id}',        [AdminDonationsController::class, 'show'])->whereNumber('id');
    Route::post('/donations/{id}/confirm', [AdminDonationsController::class, 'confirm'])->whereNumber('id');
    Route::post('/donations/{id}/reject',  [AdminDonationsController::class, 'reject'])->whereNumber('id');

    // === Paramètres ===
    Route::get('/settings',         [AdminSettingsController::class, 'index']);
    Route::put('/settings',         [AdminSettingsController::class, 'update']);
    Route::post('/settings/logo',   [AdminSettingsController::class, 'uploadLogo']);

    // === Méthodes de don (CRUD opérateurs Mobile Money) ===
    Route::get('/donation-methods',             [DonationMethodsController::class, 'index']);
    Route::post('/donation-methods',            [DonationMethodsController::class, 'store']);
    Route::get('/donation-methods/{id}',        [DonationMethodsController::class, 'show'])->whereNumber('id');
    Route::post('/donation-methods/{id}',       [DonationMethodsController::class, 'update'])->whereNumber('id'); // multipart spoof
    Route::put('/donation-methods/{id}',        [DonationMethodsController::class, 'update'])->whereNumber('id');
    Route::delete('/donation-methods/{id}',     [DonationMethodsController::class, 'destroy'])->whereNumber('id');
    Route::post('/donation-methods/{id}/toggle',[DonationMethodsController::class, 'toggle'])->whereNumber('id');

    // === Images auth (hero pages connexion/inscription) — superadmin uniquement ===
    Route::get('/auth-images',                  [AuthImagesController::class, 'index']);
    Route::post('/auth-images',                 [AuthImagesController::class, 'store']);
    Route::post('/auth-images/{id}',            [AuthImagesController::class, 'update'])->whereNumber('id'); // multipart spoof
    Route::put('/auth-images/{id}',             [AuthImagesController::class, 'update'])->whereNumber('id');
    Route::delete('/auth-images/{id}',          [AuthImagesController::class, 'destroy'])->whereNumber('id');
    Route::post('/auth-images/{id}/toggle',     [AuthImagesController::class, 'toggle'])->whereNumber('id');

    // === Demandes d'adhésion (workflow admission RH) ===
    Route::get('/membership-requests',                  [MembershipRequestsController::class, 'index']);
    Route::get('/membership-requests/pending-count',    [MembershipRequestsController::class, 'pendingCount']);
    Route::get('/membership-requests/{id}',             [MembershipRequestsController::class, 'show'])->whereNumber('id');
    Route::post('/membership-requests/{id}/approve',    [MembershipRequestsController::class, 'approve'])->whereNumber('id');
    Route::post('/membership-requests/{id}/reject',     [MembershipRequestsController::class, 'reject'])->whereNumber('id');
    Route::post('/membership-requests/bulk',            [MembershipRequestsController::class, 'bulk']);

    // ============================================================
    // === PHASE 6 : ADMIN CONTENU ================================
    // ============================================================

    // === Sermons ===
    Route::get('/sermons',                       [AdminSermonsController::class, 'index']);
    Route::post('/sermons',                      [AdminSermonsController::class, 'store']);
    Route::get('/sermons/{id}',                  [AdminSermonsController::class, 'show'])->whereNumber('id');
    Route::put('/sermons/{id}',                  [AdminSermonsController::class, 'update'])->whereNumber('id');
    // POST + _method=PUT pour multipart : Laravel gère via spoofing
    Route::post('/sermons/{id}',                 [AdminSermonsController::class, 'update'])->whereNumber('id');
    Route::delete('/sermons/{id}',               [AdminSermonsController::class, 'destroy'])->whereNumber('id');
    Route::post('/sermons/{id}/restore',         [AdminSermonsController::class, 'restore'])->whereNumber('id');
    Route::post('/sermons/{id}/toggle-publish',  [AdminSermonsController::class, 'togglePublish'])->whereNumber('id');
    Route::post('/sermons/bulk',                 [AdminSermonsController::class, 'bulk']);

    // === Séries de sermons (admin) ===
    Route::get('/sermon-series',                 [AdminSermonSeriesController::class, 'index']);
    Route::post('/sermon-series',                [AdminSermonSeriesController::class, 'store']);
    Route::get('/sermon-series/{id}',            [AdminSermonSeriesController::class, 'show'])->whereNumber('id');
    Route::put('/sermon-series/{id}',            [AdminSermonSeriesController::class, 'update'])->whereNumber('id');
    Route::post('/sermon-series/{id}',           [AdminSermonSeriesController::class, 'update'])->whereNumber('id');
    Route::delete('/sermon-series/{id}',         [AdminSermonSeriesController::class, 'destroy'])->whereNumber('id');

    // === Thèmes de sermons (catalogue de tags) ===
    Route::get('/sermon-themes',                 [AdminSermonThemesController::class, 'index']);
    Route::post('/sermon-themes',                [AdminSermonThemesController::class, 'store']);
    Route::put('/sermon-themes/{id}',            [AdminSermonThemesController::class, 'update'])->whereNumber('id');
    Route::delete('/sermon-themes/{id}',         [AdminSermonThemesController::class, 'destroy'])->whereNumber('id');

    // === Events ===
    Route::get('/events',                                [AdminEventsController::class, 'index']);
    Route::post('/events',                               [AdminEventsController::class, 'store']);
    Route::get('/events/{id}',                           [AdminEventsController::class, 'show'])->whereNumber('id');
    Route::put('/events/{id}',                           [AdminEventsController::class, 'update'])->whereNumber('id');
    Route::post('/events/{id}',                          [AdminEventsController::class, 'update'])->whereNumber('id');
    Route::delete('/events/{id}',                        [AdminEventsController::class, 'destroy'])->whereNumber('id');
    Route::post('/events/{id}/restore',                  [AdminEventsController::class, 'restore'])->whereNumber('id');
    Route::post('/events/{id}/toggle-publish',           [AdminEventsController::class, 'togglePublish'])->whereNumber('id');
    Route::post('/events/bulk',                          [AdminEventsController::class, 'bulk']);

    // === Phase 4 — Analytics billetterie AGGREGÉES (admin uniquement) ===
    Route::get('/ticketing/overview',                             [AdminAnalyticsController::class, 'overview']);
    Route::get('/ticketing/revenue-monthly',                      [AdminAnalyticsController::class, 'revenueMonthly']);
    Route::get('/ticketing/payment-methods',                      [AdminAnalyticsController::class, 'paymentMethods']);
    Route::get('/ticketing/types-breakdown',                      [AdminAnalyticsController::class, 'typesBreakdown']);
    Route::get('/ticketing/pending-orders',                       [AdminAnalyticsController::class, 'allPendingOrders']);
    Route::get('/ticketing/export-overview',                      [AdminAnalyticsController::class, 'exportOverview']);

    // === Sprint C — Dashboard billetterie 360° ===
    // Permission dédiée `view billetterie dashboard` (admin, admin-site,
    // pasteur, rh, tresorier, superadmin).
    Route::middleware('permission:view billetterie dashboard')->prefix('billetterie/dashboard-360')->group(function () {
        Route::get('/kpis',              [AdminDashboard360Controller::class, 'kpis']);
        Route::get('/revenue-timeline',  [AdminDashboard360Controller::class, 'revenueTimeline']);
        Route::get('/payment-breakdown', [AdminDashboard360Controller::class, 'paymentBreakdown']);
        Route::get('/top-events',        [AdminDashboard360Controller::class, 'topEvents']);
        Route::get('/alerts',            [AdminDashboard360Controller::class, 'alerts']);
        Route::get('/segmentation',      [AdminDashboard360Controller::class, 'segmentation']);
        Route::get('/no-show-rate',      [AdminDashboard360Controller::class, 'noShowRate']);
        Route::get('/live-scans',        [AdminDashboard360Controller::class, 'liveScans']);
        Route::get('/export-monthly',    [AdminDashboard360Controller::class, 'exportMonthly']);
    });

    // === Phase 5 — Séries d'événements (admin) ===
    Route::get('/event-series',                                   [AdminEventSeriesController::class, 'index']);
    Route::post('/event-series',                                  [AdminEventSeriesController::class, 'store']);
    Route::get('/event-series/{id}',                              [AdminEventSeriesController::class, 'show'])->whereNumber('id');
    Route::put('/event-series/{id}',                              [AdminEventSeriesController::class, 'update'])->whereNumber('id');
    Route::post('/event-series/{id}',                             [AdminEventSeriesController::class, 'update'])->whereNumber('id'); // support FormData
    Route::delete('/event-series/{id}',                           [AdminEventSeriesController::class, 'destroy'])->whereNumber('id');
    Route::post('/event-series/{id}/generate',                    [AdminEventSeriesController::class, 'generateOccurrences'])->whereNumber('id');
    Route::post('/event-series/{id}/add-occurrence',              [AdminEventSeriesController::class, 'addOccurrence'])->whereNumber('id');
    Route::get('/events/{id}/registrations',             [AdminEventsController::class, 'registrations'])->whereNumber('id');
    Route::post('/events/{id}/registrations/{userId}/attended',
                                                         [AdminEventsController::class, 'markAttended'])
         ->whereNumber('id')->whereNumber('userId');

    // === Posts (blog Tiptap) ===
    Route::get('/posts',                          [AdminPostsController::class, 'index']);
    Route::post('/posts',                         [AdminPostsController::class, 'store']);
    Route::get('/posts/{id}',                     [AdminPostsController::class, 'show'])->whereNumber('id');
    Route::put('/posts/{id}',                     [AdminPostsController::class, 'update'])->whereNumber('id');
    Route::post('/posts/{id}',                    [AdminPostsController::class, 'update'])->whereNumber('id');
    Route::delete('/posts/{id}',                  [AdminPostsController::class, 'destroy'])->whereNumber('id');
    Route::post('/posts/{id}/restore',            [AdminPostsController::class, 'restore'])->whereNumber('id');
    Route::post('/posts/{id}/toggle-publish',     [AdminPostsController::class, 'togglePublish'])->whereNumber('id');
    Route::post('/posts/bulk',                    [AdminPostsController::class, 'bulk']);
    Route::post('/posts/inline-image',            [AdminPostsController::class, 'uploadInlineImage']);

    // === Galerie médias ===
    // === Témoignages ===
    Route::get('/testimonials',                  [AdminTestimonialsController::class, 'index']);
    Route::post('/testimonials',                 [AdminTestimonialsController::class, 'store']);
    Route::get('/testimonials/{id}',             [AdminTestimonialsController::class, 'show'])->whereNumber('id');
    Route::put('/testimonials/{id}',             [AdminTestimonialsController::class, 'update'])->whereNumber('id');
    Route::post('/testimonials/{id}',            [AdminTestimonialsController::class, 'update'])->whereNumber('id');
    Route::delete('/testimonials/{id}',          [AdminTestimonialsController::class, 'destroy'])->whereNumber('id');
    Route::post('/testimonials/{id}/toggle-publish',
                                                 [AdminTestimonialsController::class, 'togglePublish'])->whereNumber('id');
    Route::post('/testimonials/bulk',            [AdminTestimonialsController::class, 'bulk']);

    Route::get('/media',                  [AdminMediaController::class, 'index']);
    Route::post('/media/upload',          [AdminMediaController::class, 'uploadBatch']);
    Route::post('/media/bulk',            [AdminMediaController::class, 'bulk']);
    Route::delete('/media/{id}',          [AdminMediaController::class, 'destroy'])->whereNumber('id');
    Route::post('/media/{id}/toggle-publish',
                                          [AdminMediaController::class, 'togglePublish'])->whereNumber('id');

    // === Demandes de prière ===
    Route::get('/prayers',                          [AdminPrayersController::class, 'index']);
    Route::get('/prayers/{id}',                     [AdminPrayersController::class, 'show'])->whereNumber('id');
    Route::put('/prayers/{id}',                     [AdminPrayersController::class, 'update'])->whereNumber('id');
    Route::delete('/prayers/{id}',                  [AdminPrayersController::class, 'destroy'])->whereNumber('id');
    Route::post('/prayers/{id}/toggle-publish',     [AdminPrayersController::class, 'togglePublish'])->whereNumber('id');

    // === Newsletter ===
    Route::get('/newsletter/subscribers',           [AdminNewsletterController::class, 'index']);
    Route::delete('/newsletter/subscribers/{id}',   [AdminNewsletterController::class, 'destroy'])->whereNumber('id');
    Route::post('/newsletter/subscribers/bulk',     [AdminNewsletterController::class, 'bulk']);
    Route::post('/newsletter/send',                 [AdminNewsletterController::class, 'send']);

    // === Live streaming (Agora + Reverb) ===
    Route::get('/live',                  [AdminLiveController::class, 'index']);
    Route::post('/live',                 [AdminLiveController::class, 'store']);
    Route::get('/live/{id}',             [AdminLiveController::class, 'show'])->whereNumber('id');
    Route::delete('/live/{id}',          [AdminLiveController::class, 'destroy'])->whereNumber('id');
    Route::post('/live/{id}/start',      [AdminLiveController::class, 'start'])->whereNumber('id');
    Route::post('/live/{id}/end',        [AdminLiveController::class, 'end'])->whereNumber('id');

    // ============================================================
    // === ÉTAPE 2 : ADMIN ÉTENDU — Gouverneurs, Rapports, Analytics
    // ============================================================

    // Liste & assignation gouverneurs.
    Route::get('/governors',                                       [AdminGovernorsController::class, 'index']);
    Route::post('/departments/{id}/governor-assign',               [AdminGovernorsController::class, 'assign'])->whereNumber('id');
    Route::delete('/departments/{id}/governor/{userId}',           [AdminGovernorsController::class, 'remove'])
         ->whereNumber('id')->whereNumber('userId');

    // Vue admin/pasteur des rapports d'un département / cellule.
    Route::get('/departments/{id}/reports',                        [AdminReportReviewController::class, 'departmentReports'])->whereNumber('id');
    Route::get('/cells/{id}/reports-all',                          [AdminReportReviewController::class, 'cellReports'])->whereNumber('id');

    // Review (approuve/rejette/marque revu) d'un rapport département.
    Route::post('/department-reports/{id}/review',                 [AdminReportReviewController::class, 'reviewDepartmentReport'])->whereNumber('id');

    // === Étape 5 : liste globale rapports + téléchargement PDF ===
    Route::get('/department-reports',                              [AdminReportReviewController::class, 'allDepartmentReports']);
    Route::get('/department-reports/{id}',                         [AdminReportReviewController::class, 'showReport'])->whereNumber('id');
    Route::get('/department-reports/{id}/pdf',                     [AdminReportReviewController::class, 'downloadReportPdf'])
         ->whereNumber('id')->middleware('throttle:30,1');
    Route::post('/department-reports/{id}/regenerate-pdf',         [AdminReportReviewController::class, 'regeneratePdf'])->whereNumber('id');

    // === Étape 5 : Builder visuel des templates de rapport ===
    Route::get('/departments/{id}/report-templates',                            [AdminReportTemplatesController::class, 'index'])->whereNumber('id');
    Route::get('/departments/{id}/report-templates/active',                     [AdminReportTemplatesController::class, 'active'])->whereNumber('id');
    Route::post('/departments/{id}/report-templates',                           [AdminReportTemplatesController::class, 'store'])->whereNumber('id');
    Route::put('/departments/{id}/report-templates/{tplId}',                    [AdminReportTemplatesController::class, 'update'])
         ->whereNumber('id')->whereNumber('tplId');
    Route::delete('/departments/{id}/report-templates/{tplId}',                 [AdminReportTemplatesController::class, 'destroy'])
         ->whereNumber('id')->whereNumber('tplId');
    Route::post('/departments/{id}/report-templates/{tplId}/activate',          [AdminReportTemplatesController::class, 'activate'])
         ->whereNumber('id')->whereNumber('tplId');

    // Analytics globales tous départements.
    Route::get('/analytics/departments',                           [AdminReportReviewController::class, 'departmentsAnalytics']);
});

// ═══════════════════════════════════════════════════════════════════════════
// ÉTAPE F — BILLETTERIE SCOPÉE (routes accessibles hors permission admin)
//
// Ces routes gardent le préfixe /admin pour compat frontend, mais ne passent
// PAS par le gate 'permission:access admin panel'. Chaque contrôleur enforce
// l'autorisation event-scopée en interne (via $event->userCanManage/Scan()).
//
// Cas d'usage : un gouverneur/leader/membre avec un grant event_staff manager
// sur un event spécifique peut gérer SA billetterie via /mission/evenement/{id}
// sans avoir la permission globale 'access admin panel'.
// ═══════════════════════════════════════════════════════════════════════════
Route::middleware(['auth:sanctum'])
    ->prefix('admin')
    ->group(function () {

    // Billetterie — lecture/écriture par event
    Route::get('/events/{id}/tickets',                   [AdminEventTicketsController::class, 'index'])->whereNumber('id');
    Route::get('/events/{id}/tickets/stats',             [AdminEventTicketsController::class, 'stats'])->whereNumber('id');
    Route::get('/events/{id}/tickets/export',            [AdminEventTicketsController::class, 'export'])->whereNumber('id');
    // Doublons potentiels — détection + vérification manuelle + export.
    Route::get ('/events/{id}/tickets/duplicates',        [AdminEventTicketsController::class, 'duplicates'])->whereNumber('id');
    Route::get ('/events/{id}/tickets/duplicates/export', [AdminEventTicketsController::class, 'duplicatesExport'])->whereNumber('id');
    Route::post('/events/{id}/tickets/duplicates/verify', [AdminEventTicketsController::class, 'verifyDuplicateGroup'])->whereNumber('id');
    // Fiche call center — PDF pré-rempli avec script d'appel pour l'équipe accueil.
    Route::get ('/events/{id}/tickets/callcenter-sheet',  [AdminEventTicketsController::class, 'callcenterSheet'])->whereNumber('id');
    Route::post('/events/{id}/tickets/{tid}/resend',     [AdminEventTicketsController::class, 'resend'])
         ->whereNumber('id')->whereNumber('tid');
    // Sécurité #H7 audit : rate limit sur scan (anti brute-force short_code)
    Route::post('/tickets/scan',                         [AdminEventTicketsController::class, 'scan'])
         ->middleware('throttle:ticket-scan');
    Route::post('/tickets/{id}/unscan',                  [AdminEventTicketsController::class, 'unscan'])->whereNumber('id');

    // === Liste de présence temps réel (Étape D — accueil) ===
    Route::get ('/events/{id}/attendance',                [AdminEventAttendanceController::class, 'index'])->whereNumber('id');
    Route::get ('/events/{id}/attendance/export/xlsx',    [AdminEventAttendanceController::class, 'exportXlsx'])->whereNumber('id');
    Route::get ('/events/{id}/attendance/export/pdf',     [AdminEventAttendanceController::class, 'exportPdf'])->whereNumber('id');
    Route::get ('/events/{id}/attendance/backup-pdf',     [AdminEventAttendanceController::class, 'backupPdf'])->whereNumber('id');
    Route::post('/events/{id}/attendance/manual',         [AdminEventAttendanceController::class, 'manualCheckIn'])->whereNumber('id');

    // === Enrôlements par événement (générique : leads captés via QR "Suis-nous") ===
    Route::get   ('/events/{id}/enrolements',                        [\App\Http\Controllers\Admin\EventEnrolementsController::class, 'index'])->whereNumber('id');
    Route::get   ('/events/{id}/enrolements/export/excel',           [\App\Http\Controllers\Admin\EventEnrolementsController::class, 'exportExcel'])->whereNumber('id');
    Route::get   ('/events/{id}/enrolements/export/pdf',             [\App\Http\Controllers\Admin\EventEnrolementsController::class, 'exportPdf'])->whereNumber('id');
    Route::patch ('/events/{id}/enrolements/{enrolId}/status',       [\App\Http\Controllers\Admin\EventEnrolementsController::class, 'updateStatus'])->whereNumber('id')->whereNumber('enrolId');
    Route::patch ('/events/{id}/enrolements/{enrolId}/notes',        [\App\Http\Controllers\Admin\EventEnrolementsController::class, 'updateNotes'])->whereNumber('id')->whereNumber('enrolId');
    Route::delete('/events/{id}/enrolements/{enrolId}',              [\App\Http\Controllers\Admin\EventEnrolementsController::class, 'destroy'])->whereNumber('id')->whereNumber('enrolId');

    // === Bal 2026 — Régie de l'écran live + candidats + photos ambiance ===
    Route::get ('/events/{id}/bal/state',                 [\App\Http\Controllers\Admin\BalScreenController::class, 'state'])->whereNumber('id');
    Route::post('/events/{id}/bal/slide',                 [\App\Http\Controllers\Admin\BalScreenController::class, 'setSlide'])->whereNumber('id');
    Route::post('/events/{id}/bal/upload-media',          [\App\Http\Controllers\Admin\BalScreenController::class, 'uploadMedia'])->whereNumber('id');
    Route::post('/events/{id}/bal/vote/open',             [\App\Http\Controllers\Admin\BalScreenController::class, 'openVote'])->whereNumber('id');
    Route::post('/events/{id}/bal/vote/close',            [\App\Http\Controllers\Admin\BalScreenController::class, 'closeVote'])->whereNumber('id');
    Route::post('/events/{id}/bal/proclamer',             [\App\Http\Controllers\Admin\BalScreenController::class, 'proclamer'])->whereNumber('id');
    Route::get ('/events/{id}/bal/results',               [\App\Http\Controllers\Admin\BalResultsController::class, 'results'])->whereNumber('id');
    // CRUD candidats
    Route::get   ('/events/{id}/bal/candidates',            [\App\Http\Controllers\Admin\BalCandidatesController::class, 'index'])->whereNumber('id');
    Route::post  ('/events/{id}/bal/candidates',            [\App\Http\Controllers\Admin\BalCandidatesController::class, 'store'])->whereNumber('id');
    Route::post  ('/events/{id}/bal/candidates/{cid}',      [\App\Http\Controllers\Admin\BalCandidatesController::class, 'update'])->whereNumber('id')->whereNumber('cid');
    Route::delete('/events/{id}/bal/candidates/{cid}',      [\App\Http\Controllers\Admin\BalCandidatesController::class, 'destroy'])->whereNumber('id')->whereNumber('cid');
    Route::post  ('/events/{id}/bal/candidates/reorder',    [\App\Http\Controllers\Admin\BalCandidatesController::class, 'reorder'])->whereNumber('id');
    // Photos ambiance
    Route::get   ('/events/{id}/bal/photos',                [\App\Http\Controllers\Admin\BalPhotosController::class, 'index'])->whereNumber('id');
    Route::post  ('/events/{id}/bal/photos',                [\App\Http\Controllers\Admin\BalPhotosController::class, 'store'])->whereNumber('id');
    Route::patch ('/events/{id}/bal/photos/{pid}/visibility',[\App\Http\Controllers\Admin\BalPhotosController::class, 'toggleVisibility'])->whereNumber('id')->whereNumber('pid');
    Route::delete('/events/{id}/bal/photos/{pid}',          [\App\Http\Controllers\Admin\BalPhotosController::class, 'destroy'])->whereNumber('id')->whereNumber('pid');
    // PDF supports de table imprimables
    Route::get   ('/events/{id}/bal/table-supports',        [\App\Http\Controllers\Admin\BalSupportsController::class, 'tableSupportsPdf'])->whereNumber('id');
    Route::get   ('/events/{id}/bal/vote-qr-pdf',           [\App\Http\Controllers\Admin\BalSupportsController::class, 'voteQrPdf'])->whereNumber('id');
    Route::get ('/events/{id}/attendance/report',         [AdminEventAttendanceController::class, 'report'])->whereNumber('id');

    // Types de tickets (Phase 2)
    Route::get   ('/events/{eventId}/ticket-types',        [AdminEventTicketTypesController::class, 'index'])->whereNumber('eventId');
    Route::post  ('/events/{eventId}/ticket-types',        [AdminEventTicketTypesController::class, 'store'])->whereNumber('eventId');
    Route::put   ('/events/{eventId}/ticket-types/{id}',   [AdminEventTicketTypesController::class, 'update'])->whereNumber('eventId')->whereNumber('id');
    Route::delete('/events/{eventId}/ticket-types/{id}',   [AdminEventTicketTypesController::class, 'destroy'])->whereNumber('eventId')->whereNumber('id');

    // Validation paiements + bulk (Phase 2)
    Route::get ('/events/{eventId}/tickets/pending-orders', [AdminEventTicketsController::class, 'pendingOrders'])->whereNumber('eventId');
    Route::post('/events/{eventId}/tickets/bulk',           [AdminEventTicketsController::class, 'bulkAction'])->whereNumber('eventId');

    // Staff événement (Étape B) + magic-links invités (Étape C)
    Route::get   ('/events/{eventId}/staff',                                [AdminEventStaffController::class, 'index'])->whereNumber('eventId');
    Route::post  ('/events/{eventId}/staff',                                [AdminEventStaffController::class, 'store'])->whereNumber('eventId');
    Route::delete('/events/{eventId}/staff/{staffId}',                      [AdminEventStaffController::class, 'destroy'])->whereNumber('eventId')->whereNumber('staffId');
    Route::post  ('/events/{eventId}/staff/{staffId}/resend-notification',  [AdminEventStaffController::class, 'resendNotification'])->whereNumber('eventId')->whereNumber('staffId');
    Route::patch ('/events/{eventId}/guest-scanners/{tokenId}',             [AdminEventStaffController::class, 'updateGuest'])->whereNumber('eventId')->whereNumber('tokenId');
    Route::delete('/events/{eventId}/guest-scanners/{tokenId}',             [AdminEventStaffController::class, 'destroyGuest'])->whereNumber('eventId')->whereNumber('tokenId');
    Route::post  ('/events/{eventId}/guest-scanners',                       [AdminEventStaffController::class, 'inviteGuest'])->whereNumber('eventId');
    Route::post  ('/events/{eventId}/guest-scanners/{tokenId}/regenerate',  [AdminEventStaffController::class, 'regenerateGuest'])->whereNumber('eventId')->whereNumber('tokenId');
    Route::get   ('/users/search',                                          [AdminEventStaffController::class, 'searchUsers']);

    // Liste d'attente
    Route::get   ('/events/{eventId}/waitlist',                     [AdminEventTicketsController::class, 'waitlist'])->whereNumber('eventId');
    Route::post  ('/events/{eventId}/waitlist/{id}/convert',        [AdminEventTicketsController::class, 'waitlistConvert'])->whereNumber('eventId')->whereNumber('id');
    Route::post  ('/events/{eventId}/waitlist/bulk-convert',        [AdminEventTicketsController::class, 'waitlistBulkConvert'])->whereNumber('eventId');
    Route::delete('/events/{eventId}/waitlist/{id}',                [AdminEventTicketsController::class, 'waitlistRemove'])->whereNumber('eventId')->whereNumber('id');

    // Paiements + remboursements (Phase 2 + 6)
    Route::post('/tickets/orders/{orderCode}/validate-payment',   [AdminEventTicketsController::class, 'validatePayment']);
    Route::post('/tickets/orders/{orderCode}/refuse-payment',     [AdminEventTicketsController::class, 'refusePayment']);
    Route::post('/tickets/{id}/refund',                           [AdminEventTicketsController::class, 'refundTicket'])->whereNumber('id');
    Route::post('/tickets/orders/{orderCode}/refund',             [AdminEventTicketsController::class, 'refundOrder']);
    Route::post('/events/{eventId}/cancel-and-refund',            [AdminEventTicketsController::class, 'refundWholeEvent'])->whereNumber('eventId');

    // Analytics d'UN event (aggregate reste en admin-only)
    Route::get ('/events/{eventId}/analytics',                    [AdminAnalyticsController::class, 'eventDetail'])->whereNumber('eventId');
});

// ============================================================
// === ÉTAPE 2 : ESPACE GOUVERNEUR (/api/governor/*) ==========
// ============================================================
Route::prefix('governor')
    ->middleware(['auth:sanctum', 'governor'])
    ->group(__DIR__.'/governor.php');

// ============================================================
// === ÉTAPE 2 : ESPACE LEADER DE CELLULE (/api/leader/*) =====
// ============================================================
Route::prefix('leader')
    ->middleware(['auth:sanctum', 'cell-leader'])
    ->group(__DIR__.'/leader.php');

// === Token Agora pour viewer (auth ou public anonyme) ===
Route::get('/live/{id}/token', [AdminLiveController::class, 'viewerToken'])
     ->whereNumber('id');

