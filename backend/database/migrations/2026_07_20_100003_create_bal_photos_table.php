<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Table `bal_photos` — photos d'ambiance uploadées par les photographes
 * pendant le Bal. Utilisées par la slide "ambiance" de l'écran live.
 *
 * `is_visible = false` permet de cacher une photo (modération) sans la supprimer.
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('bal_photos', function (Blueprint $table) {
            $table->id();

            $table->foreignId('event_id')->constrained()->cascadeOnDelete();

            // Chemin relatif dans storage/app/public/bal-photos/.
            $table->string('path', 255);
            $table->string('caption', 255)->nullable();

            // Photographe (nullable : utilisateur peut être supprimé).
            $table->foreignId('uploaded_by')->nullable()
                  ->constrained('users')->nullOnDelete();

            $table->unsignedInteger('display_order')->default(0);
            $table->boolean('is_visible')->default(true);

            $table->timestamps();

            $table->index(['event_id', 'is_visible', 'display_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bal_photos');
    }
};
