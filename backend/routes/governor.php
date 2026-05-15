<?php

/**
 * Routes /api/governor/* — Espace Gouverneur.
 *
 * Préfixe + middleware (auth:sanctum + governor) appliqués depuis routes/api.php.
 * Chaque endpoint exige un mandat actif dans department_governors via le
 * middleware GovernorMiddleware (cf bootstrap/app.php alias 'governor').
 */

use App\Http\Controllers\Governor\GovernorAnalyticsController;
use App\Http\Controllers\Governor\GovernorCellsController;
use App\Http\Controllers\Governor\GovernorDashboardController;
use App\Http\Controllers\Governor\GovernorDepartmentController;
use App\Http\Controllers\Governor\GovernorMembersController;
use App\Http\Controllers\Governor\GovernorProfileController;
use App\Http\Controllers\Governor\GovernorReportsController;
use Illuminate\Support\Facades\Route;

// === Dashboard & contexte ===
Route::get('/dashboard',  [GovernorDashboardController::class,  'index']);
Route::get('/analytics',  [GovernorAnalyticsController::class,  'index']);
Route::get('/department', [GovernorDepartmentController::class, 'show']);
Route::get('/department/report-template', [GovernorDepartmentController::class, 'reportTemplate']);

// === Profil gouverneur ===
Route::get('/profile',  [GovernorProfileController::class, 'show']);
Route::put('/profile',  [GovernorProfileController::class, 'update']);
Route::post('/profile', [GovernorProfileController::class, 'update']); // alias POST (multipart upload)

// === Membres du département ===
Route::get('/members', [GovernorMembersController::class, 'index']);
Route::post('/members/{id}/move-cell', [GovernorMembersController::class, 'moveToCell'])
     ->whereNumber('id');

// === Cellules ===
Route::get('/cells',                        [GovernorCellsController::class, 'index']);
Route::post('/cells',                       [GovernorCellsController::class, 'store']);
Route::put('/cells/{id}',                   [GovernorCellsController::class, 'update'])->whereNumber('id');
Route::post('/cells/{id}/leader',           [GovernorCellsController::class, 'assignLeader'])->whereNumber('id');

// === Rapports département ===
Route::get('/reports',                  [GovernorReportsController::class, 'index']);
Route::post('/reports',                 [GovernorReportsController::class, 'store']);
Route::get('/reports/{id}',             [GovernorReportsController::class, 'show'])->whereNumber('id');
Route::get('/reports/{id}/pdf',         [GovernorReportsController::class, 'downloadPdf'])->whereNumber('id');
Route::put('/reports/{id}',             [GovernorReportsController::class, 'update'])->whereNumber('id');
Route::post('/reports/{id}/submit',     [GovernorReportsController::class, 'submit'])->whereNumber('id');
Route::delete('/reports/{id}',          [GovernorReportsController::class, 'destroy'])->whereNumber('id');
