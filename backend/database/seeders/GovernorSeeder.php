<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\GovernorProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeder — Vrais gouverneurs NWC (consomme DepartmentSeeder::ACTIVE_DEPTS).
 *
 * Pour chaque département actif avec un gouverneur déclaré :
 *  - crée (ou retrouve) un User avec le vrai nom + téléphone
 *  - assigne le rôle "gouverneur"
 *  - crée le mandat dans department_governors (is_primary)
 *  - met à jour le cache departments.governor_id
 *  - crée le GovernorProfile + placeholders Picsum
 *
 * Email : prenom.nom@nwc-test.org. Mot de passe initial : Gouverneur@NWC2025!
 */
class GovernorSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        $defaultPassword = Hash::make('Gouverneur@NWC2025!');
        $created = 0;
        $skipped = 0;

        foreach (DepartmentSeeder::ACTIVE_DEPTS as $deptData) {
            if (! $deptData['governor']) {
                $skipped++;
                continue;
            }

            $dept = Department::where('slug', Str::slug($deptData['name']))->first();
            if (! $dept) continue;

            [$firstName, $lastName] = self::splitName($deptData['governor']);
            $email = self::buildEmail($firstName, $lastName);

            // Réutilise l'utilisateur s'il existe déjà (double poste : Sio Romuald
            // Quenum → Informatique + PowerPoint, etc.).
            $governor = User::firstOrCreate(
                ['email' => $email],
                [
                    'name'              => strtoupper($lastName),
                    'first_name'        => self::titleCase($firstName),
                    'password'          => $defaultPassword,
                    'phone'             => $deptData['phone'],
                    'gender'            => null,
                    'status'            => 'active',
                    'is_baptized'       => true,
                    'joined_at'         => now()->subYears(rand(2, 10))->toDateString(),
                    'email_verified_at' => $now,
                    'department_id'     => $dept->id,
                    'is_governor'       => true,
                ]
            );

            // Maj phone si manquant et fourni.
            if (! $governor->wasRecentlyCreated && ! $governor->phone && $deptData['phone']) {
                $governor->update(['phone' => $deptData['phone']]);
            }

            // Rôle Spatie.
            if (! $governor->hasRole('gouverneur')) {
                $governor->assignRole('gouverneur');
            }

            // Pivot department_user.
            DB::table('department_user')->updateOrInsert(
                ['department_id' => $dept->id, 'user_id' => $governor->id],
                [
                    'role'       => 'governor',
                    'joined_at'  => $now->copy()->subMonths(rand(6, 24))->toDateString(),
                    'created_at' => $now,
                    'updated_at' => $now,
                ]
            );

            // Mandat historique (idempotent).
            $existingMandate = DB::table('department_governors')
                ->where('department_id', $dept->id)
                ->where('user_id', $governor->id)
                ->whereNull('ended_at')
                ->exists();

            if (! $existingMandate) {
                DB::table('department_governors')->insert([
                    'department_id' => $dept->id,
                    'user_id'       => $governor->id,
                    'is_primary'    => true,
                    'appointed_at'  => $now->copy()->subMonths(rand(6, 24))->toDateString(),
                    'ended_at'      => null,
                    'appointed_by'  => null,
                    'notes'         => 'Nomination initiale (seed).',
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ]);
            }

            // Cache departments.governor_id + bannières placeholder.
            $dept->update([
                'governor_id'   => $governor->id,
                'banner_image'  => "https://picsum.photos/seed/dept-{$dept->slug}/1600/600",
                'profile_photo' => "https://picsum.photos/seed/deptp-{$dept->slug}/600/600",
            ]);

            // Profil enrichi.
            GovernorProfile::updateOrCreate(
                ['user_id' => $governor->id],
                [
                    'photo_profile'    => "https://picsum.photos/seed/gov-{$dept->slug}/400/400",
                    'banner_image'     => "https://picsum.photos/seed/banner-{$dept->slug}/1200/400",
                    'bio'              => "Gouverneur du département « {$dept->name} » — passionné par l'œuvre de Dieu et le service de la communauté.",
                    'phone_direct'     => $deptData['phone'],
                    'years_in_role'    => rand(1, 6),
                    'vision_statement' => "Bâtir un département qui glorifie Dieu et impacte des vies.",
                ]
            );

            $created++;
        }

        $this->command->info("  ✓ {$created} mandats gouverneur seedés, {$skipped} départements sans gouverneur déclaré");
    }

    /** Décompose "FIRST LAST EXTRA" → ['FIRST', 'LAST EXTRA']. */
    public static function splitName(string $full): array
    {
        $parts = preg_split('/\s+/', trim($full));
        if (count($parts) === 1) return [$parts[0], $parts[0]];
        $first = array_shift($parts);
        return [$first, implode(' ', $parts)];
    }

    /** Génère un email ASCII basé sur prenom.nom + suffixe nwc-test.org. */
    public static function buildEmail(string $first, string $last): string
    {
        $slug = Str::slug($first.'.'.$last, '.', 'fr');
        if (! $slug) $slug = 'gouverneur.'.uniqid();
        return $slug.'@nwc-test.org';
    }

    /** Convertit "ATTOUNBRE" → "Attounbre". */
    public static function titleCase(string $word): string
    {
        return mb_convert_case(mb_strtolower($word, 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
    }
}
