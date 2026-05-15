<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration — Extension users : fiche membre complète NWC.
 *
 * Ces champs sont remplis par le membre depuis son espace profil après
 * inscription (l'inscription elle-même reste légère : prénom, nom, email,
 * mdp, date_naissance).
 *
 *  - profession              : métier actuel
 *  - education_level         : niveau d'étude
 *  - residence_area          : lieu d'habitation (quartier / commune)
 *  - congregation            : congrégation NWC
 *  - mountain                : montagne (groupe de prière)
 *  - mentor_name             : nom du mentor / parrain spirituel
 *  - emergency_contact_name  : personne à prévenir en cas d'urgence
 *  - emergency_contact_phone : son téléphone
 *
 * (Les champs address, city, phone, birth_date, joined_at existent déjà.)
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('profession', 120)->nullable()->after('bio');
            $table->string('education_level', 120)->nullable()->after('profession');
            $table->string('residence_area', 120)->nullable()->after('education_level');
            $table->string('congregation', 120)->nullable()->after('residence_area');
            $table->string('mountain', 120)->nullable()->after('congregation');
            $table->string('mentor_name', 120)->nullable()->after('mountain');
            $table->string('emergency_contact_name', 120)->nullable()->after('mentor_name');
            $table->string('emergency_contact_phone', 30)->nullable()->after('emergency_contact_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'profession', 'education_level', 'residence_area',
                'congregation', 'mountain', 'mentor_name',
                'emergency_contact_name', 'emergency_contact_phone',
            ]);
        });
    }
};
