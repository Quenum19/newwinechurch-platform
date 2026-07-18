<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * Ajoute :
 *  - Nouveau rôle `accueil` (service d'accueil des événements)
 *  - Nouvelle permission `view billetterie dashboard`
 *  - Étend `view attendance` au rôle `rh`
 *
 * Le rôle accueil a un accès ciblé :
 *  - Voir la liste de présence des events (view attendance)
 *  - Faire des check-in manuels (scan tickets)
 *  - Pas d'accès admin panel (n'est pas un rôle managérial)
 *
 * La perm `view billetterie dashboard` permet à pasteur+RH d'avoir la
 * vue 360° sans avoir la gestion technique billetterie.
 */
return new class extends Migration
{
    private function permId(string $name): ?int
    {
        return DB::table('permissions')
            ->where('name', $name)
            ->where('guard_name', 'web')
            ->value('id');
    }

    private function roleId(string $name): ?int
    {
        return DB::table('roles')
            ->where('name', $name)
            ->where('guard_name', 'web')
            ->value('id');
    }

    private function grant(int $roleId, int $permId): void
    {
        DB::table('role_has_permissions')->insertOrIgnore([
            'permission_id' => $permId,
            'role_id'       => $roleId,
        ]);
    }

    public function up(): void
    {
        // === 1. Créer la nouvelle permission `view billetterie dashboard` ===
        DB::table('permissions')->insertOrIgnore([
            'name'       => 'view billetterie dashboard',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $dashboardPermId = $this->permId('view billetterie dashboard');

        $attendancePermId = $this->permId('view attendance');
        $scanPermId       = $this->permId('scan tickets');
        $accessAdminId    = $this->permId('access admin panel');
        $viewDashboardId  = $this->permId('view dashboard');
        $viewEventsId     = $this->permId('view events');

        // === 2. Créer le rôle `accueil` ===
        DB::table('roles')->insertOrIgnore([
            'name'       => 'accueil',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $accueilRoleId = $this->roleId('accueil');

        if ($accueilRoleId) {
            // Accueil : voir liste présence + faire check-in manuel + accès panel
            if ($attendancePermId) $this->grant($accueilRoleId, $attendancePermId);
            if ($scanPermId)       $this->grant($accueilRoleId, $scanPermId);
            if ($accessAdminId)    $this->grant($accueilRoleId, $accessAdminId);
            if ($viewDashboardId)  $this->grant($accueilRoleId, $viewDashboardId);
            if ($viewEventsId)     $this->grant($accueilRoleId, $viewEventsId);
        }

        // === 3. Étendre `view attendance` à `rh` ===
        if ($attendancePermId) {
            $rhId = $this->roleId('rh');
            if ($rhId) $this->grant($rhId, $attendancePermId);
        }

        // === 4. Distribuer `view billetterie dashboard` ===
        // Superadmin, admin, admin-site, pasteur, rh, tresorier
        if ($dashboardPermId) {
            foreach (['superadmin', 'admin', 'admin-site', 'pasteur', 'rh', 'tresorier'] as $roleName) {
                $rid = $this->roleId($roleName);
                if ($rid) $this->grant($rid, $dashboardPermId);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Supprimer le rôle accueil
        $accueilRoleId = $this->roleId('accueil');
        if ($accueilRoleId) {
            DB::table('role_has_permissions')->where('role_id', $accueilRoleId)->delete();
            DB::table('model_has_roles')->where('role_id', $accueilRoleId)->delete();
            DB::table('roles')->where('id', $accueilRoleId)->delete();
        }

        // Supprimer la permission dashboard
        $dashboardPermId = $this->permId('view billetterie dashboard');
        if ($dashboardPermId) {
            DB::table('role_has_permissions')->where('permission_id', $dashboardPermId)->delete();
            DB::table('model_has_permissions')->where('permission_id', $dashboardPermId)->delete();
            DB::table('permissions')->where('id', $dashboardPermId)->delete();
        }

        // Retirer view attendance de RH
        $attendancePermId = $this->permId('view attendance');
        $rhId = $this->roleId('rh');
        if ($attendancePermId && $rhId) {
            DB::table('role_has_permissions')
                ->where('permission_id', $attendancePermId)
                ->where('role_id', $rhId)
                ->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
