<?php

use App\Models\MembershipRequest;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Généralisation "enrôlements par événement".
 *
 * Le pattern hub d'enrôlement (formulaire "Rejoindre la NWC" via QR) est
 * réutilisable pour tout event futur (concert, retraite, séminaire, etc.),
 * pas seulement le bal 2026. On rattache donc chaque enrôlement à l'event
 * source via une FK nullable :
 *   - event_id = id de l'événement d'où vient le lead (via QR paramétré)
 *   - event_id null → enrôlement générique (pas lié à un event particulier)
 *
 * On ajoute aussi :
 *   - enrollment_status : cycle de vie DÉDIÉ aux enrôlements (nouveau,
 *     contacté, converti, écarté). Distinct du `status` classique qui gère
 *     le workflow /rejoindre (pending → approved → user créé).
 *   - admin_notes : notes libres saisies par l'accueil après appel.
 *
 * Backfill : les enrôlements existants marqués source='bal-2026' sont
 * automatiquement rattachés à l'event id=3 (bal 2026, hardcodé dans le
 * frontend actuel). Pas de perte de donnée.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->foreignId('event_id')->nullable()->after('interested_department_id')
                ->constrained('events')->nullOnDelete();

            $table->enum('enrollment_status', ['nouveau', 'contacte', 'converti', 'ecarte'])
                ->nullable()->after('status');

            $table->text('admin_notes')->nullable()->after('enrollment_status');

            $table->index(['event_id', 'enrollment_status'], 'membership_event_status_idx');
        });

        // Backfill : bal 2026 (event_id=3) sur les enrôlements existants.
        if (Schema::hasTable('events')) {
            MembershipRequest::where('source', 'bal-2026')
                ->whereNull('event_id')
                ->update([
                    'event_id'          => 3,
                    'enrollment_status' => 'nouveau',
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('membership_requests', function (Blueprint $table) {
            $table->dropIndex('membership_event_status_idx');
            $table->dropForeign(['event_id']);
            $table->dropColumn(['event_id', 'enrollment_status', 'admin_notes']);
        });
    }
};
