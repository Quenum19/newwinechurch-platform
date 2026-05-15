<?php

/**
 * Migration 14 — Articles de blog.
 *
 * Le blog est utilisé pour : enseignements, témoignages, annonces,
 * comptes-rendus d'événements, articles d'inspiration.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->text('excerpt')->nullable();          // résumé pour cartes
            $table->longText('content');                  // HTML enrichi (Tiptap)
            $table->string('cover_image')->nullable();

            $table->foreignId('author_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('category_id')->nullable()
                  ->constrained('post_categories')->nullOnDelete();

            $table->enum('status', ['draft', 'published', 'archived'])
                  ->default('draft');
            $table->boolean('is_featured')->default(false);
            $table->timestamp('published_at')->nullable();

            $table->unsignedBigInteger('views_count')->default(0);

            $table->timestamps();
            $table->softDeletes();

            // === INDEX ===
            $table->index('status');
            $table->index('is_featured');
            $table->index('published_at');
            $table->index(['status', 'published_at']);  // listing public
            $table->index('author_id');
            $table->index('category_id');

            // Recherche fulltext articles (MySQL uniquement — SQLite tests ignorent).
            if (DB::connection()->getDriverName() === 'mysql') {
                $table->fullText(['title', 'excerpt', 'content']);
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
