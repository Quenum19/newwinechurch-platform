<?php

/**
 * Migration — Historique des gouverneurs par département.
 *
 * Un département peut avoir plusieurs gouverneurs successifs (ou un primaire
 * + des adjoints en parallèle). On garde l'historique complet pour audit
 * et statistiques. is_primary = gouverneur principal courant.
 *
 * Le champ legacy departments.governor_id est le cache du primary courant.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('department_governors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('department_id')->constrained()->cascadeOnDelete();

            $table->boolean('is_primary')->default(false);
            $table->date('appointed_at');
            $table->date('ended_at')->nullable(); // null = mandat en cours
            $table->foreignId('appointed_by')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->text('notes')->nullable(); // contexte de nomination/fin de mandat

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            $table->index(['department_id', 'is_primary']);
            $table->index(['user_id', 'ended_at']);
            $table->index(['department_id', 'ended_at']); // gouverneurs actifs d'un dept
            $table->index('appointed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_governors');
    }
};
