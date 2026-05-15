<?php

/**
 * ==============================================================
 *  Définition des channels WebSocket (Reverb).
 *
 *  - Channel public "live" : ouverte à tous, broadcast LiveStreamStarted/Ended
 *  - Channel privé "App.Models.User.{id}" : notifications personnelles
 *  - Channel privé "admin.dashboard" : refresh dashboard temps réel (staff)
 *  - Étape 3 : channels scope rôle (governor, cell-leader, pastor, hr, dept feed)
 * ==============================================================
 */

use Illuminate\Support\Facades\Broadcast;

// === Notifications personnelles (Laravel Notifications) ===
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// === Dashboard admin temps réel (staff) ===
Broadcast::channel('admin.dashboard', function ($user) {
    return $user->hasAnyRole(['superadmin', 'pasteur', 'admin']);
});

// === Étape 3 — Channels scope rôle ===

// Notifications gouverneur du département (rapport cellule, alertes…).
Broadcast::channel('governor.{deptId}', function ($user, $deptId) {
    return $user->isGovernorOf((int) $deptId);
});

// Notifications leader de cellule.
Broadcast::channel('cell-leader.{cellId}', function ($user, $cellId) {
    return $user->isCellLeaderOf((int) $cellId);
});

// Notifications pasteur (rapport département soumis, alertes globales).
Broadcast::channel('pastor.notifications', function ($user) {
    return $user->hasRole('pasteur');
});

// Notifications RH (rapports département disponibles, exports…).
Broadcast::channel('hr.notifications', function ($user) {
    return $user->hasRole('rh');
});

// Feed d'activité par département (gouverneur concerné + admin/pasteur).
Broadcast::channel('department.{deptId}.feed', function ($user, $deptId) {
    return $user->isGovernorOf((int) $deptId) || $user->isAdminOrPastor();
});
