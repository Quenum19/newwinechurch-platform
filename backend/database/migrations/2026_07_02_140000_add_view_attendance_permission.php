<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

/**
 * Ajoute la permission `view attendance` (liste de présence billetterie)
 * et l'attribue aux rôles admin, admin-site, pasteur, superadmin.
 *
 * Permet au service accueil de voir la liste temps réel des personnes
 * scannées sans droit de scanner ni gérer les tickets.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('permissions')->insertOrIgnore([
            'name'       => 'view attendance',
            'guard_name' => 'web',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $permId = DB::table('permissions')
            ->where('name', 'view attendance')
            ->where('guard_name', 'web')
            ->value('id');

        if (! $permId) return;

        foreach (['superadmin', 'admin', 'admin-site', 'pasteur', 'tresorier'] as $roleName) {
            $roleId = DB::table('roles')
                ->where('name', $roleName)
                ->where('guard_name', 'web')
                ->value('id');
            if (! $roleId) continue;

            DB::table('role_has_permissions')->insertOrIgnore([
                'permission_id' => $permId,
                'role_id'       => $roleId,
            ]);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        $permId = DB::table('permissions')
            ->where('name', 'view attendance')
            ->where('guard_name', 'web')
            ->value('id');

        if ($permId) {
            DB::table('role_has_permissions')->where('permission_id', $permId)->delete();
            DB::table('model_has_permissions')->where('permission_id', $permId)->delete();
            DB::table('permissions')->where('id', $permId)->delete();
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
};
