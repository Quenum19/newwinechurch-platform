<?php

/**
 * Migration — Historique des leaders de cellule.
 *
 * Une cellule peut avoir plusieurs leaders dans son historique (passage de
 * relais, congé, etc.). is_primary = leader principal courant.
 *
 * Le champ legacy cells.leader_id est le cache du primary courant.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('cell_leaders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('cell_id')->constrained()->cascadeOnDelete();

            $table->boolean('is_primary')->default(false);
            $table->date('appointed_at');
            $table->date('ended_at')->nullable();
            $table->foreignId('appointed_by')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['cell_id', 'is_primary']);
            $table->index(['user_id', 'ended_at']);
            $table->index(['cell_id', 'ended_at']);
            $table->index('appointed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cell_leaders');
    }
};
