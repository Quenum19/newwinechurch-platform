<?php

/**
 * Routes /api/leader/* — Espace Leader de Cellule.
 *
 * Préfixe + middleware (auth:sanctum + cell-leader) appliqués depuis api.php.
 * Chaque endpoint exige un mandat actif dans cell_leaders via le middleware
 * CellLeaderMiddleware (alias 'cell-leader' dans bootstrap/app.php).
 */

use App\Http\Controllers\Leader\LeaderAnalyticsController;
use App\Http\Controllers\Leader\LeaderAttendanceController;
use App\Http\Controllers\Leader\LeaderCellController;
use App\Http\Controllers\Leader\LeaderDashboardController;
use App\Http\Controllers\Leader\LeaderReportController;
use Illuminate\Support\Facades\Route;

// === Dashboard & contexte ===
Route::get('/dashboard', [LeaderDashboardController::class, 'index']);
Route::get('/analytics', [LeaderAnalyticsController::class, 'index']);
Route::get('/cell',      [LeaderCellController::class,      'show']);
Route::get('/members',   [LeaderCellController::class,      'members']);

// === Présences ===
Route::post('/attendance', [LeaderAttendanceController::class, 'store']);
Route::get('/attendance',  [LeaderAttendanceController::class, 'index']);

// === Rapports cellule ===
Route::get('/reports',              [LeaderReportController::class, 'index']);
Route::post('/reports',             [LeaderReportController::class, 'store']);
Route::get('/reports/{id}',         [LeaderReportController::class, 'show'])->whereNumber('id');
Route::get('/reports/{id}/pdf',     [LeaderReportController::class, 'downloadPdf'])->whereNumber('id');
Route::put('/reports/{id}',         [LeaderReportController::class, 'update'])->whereNumber('id');
Route::post('/reports/{id}/submit', [LeaderReportController::class, 'submit'])->whereNumber('id');
