<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Catalogue de base des thèmes — pilier de l'archivage long terme.
 *
 * Ces thèmes sont marqués `is_default = true` → l'admin peut les renommer mais
 * pas les supprimer. Cela garantit qu'en 2046, "prière" existera toujours.
 * L'admin peut en AJOUTER de nouveaux librement.
 *
 * Idempotent : on update si le slug existe déjà, sinon on insert. Tu peux
 * relancer ce seeder n'importe quand sans crainte.
 */
class SermonThemesSeeder extends Seeder
{
    public function run(): void
    {
        // Catégorie → liste de thèmes (couleur partagée par catégorie pour
        // cohérence visuelle dans les badges côté public).
        $catalog = [
            // Vie chrétienne (or chaleureux)
            '#C9A961' => [
                ['Foi', 'Construire et exercer une foi vivante.'],
                ['Identité en Christ', 'Qui sommes-nous dans le Royaume.'],
                ['Salut', 'Œuvre de la croix, repentance, conversion.'],
                ['Saint-Esprit', 'Vie dans l\'Esprit, dons, fruits.'],
                ['Repentance', 'Retournement du cœur vers Dieu.'],
                ['Sainteté', 'Marcher dans la pureté quotidienne.'],
            ],
            // Combat & délivrance (rouge profond)
            '#A8423D' => [
                ['Combat spirituel', 'Résister aux attaques de l\'ennemi.'],
                ['Délivrance', 'Briser les chaînes, les liens, les héritages.'],
                ['Guérison', 'Guérison physique, émotionnelle, intérieure.'],
                ['Miracle', 'Œuvres surnaturelles du Père.'],
            ],
            // Vie pratique (vert mousse)
            '#5B7C4A' => [
                ['Mariage', 'Union, fidélité, vie de couple.'],
                ['Famille', 'Parents, enfants, héritage générationnel.'],
                ['Finances', 'Gestion biblique de l\'argent, dîme, semence.'],
                ['Travail', 'Excellence, intégrité, vocation professionnelle.'],
            ],
            // Spirituel quotidien (bleu profond)
            '#3A5572' => [
                ['Prière', 'Vie de prière, intercession, jeûne.'],
                ['Louange', 'Adoration, gratitude, chant.'],
                ['Parole', 'Étude des Écritures, méditation.'],
                ['Évangélisation', 'Témoigner, gagner des âmes.'],
            ],
            // Mission & église (violet sobre)
            '#6B4F7A' => [
                ['Royaume de Dieu', 'Avènement et règne du Royaume.'],
                ['Leadership', 'Servir, diriger, multiplier.'],
                ['Église', 'Corps de Christ, communion, gouvernance.'],
                ['Mission', 'Appel, envoi, Grande Commission.'],
                ['Jeunesse', 'Génération jeune, vocation, intégrité.'],
            ],
            // Croissance & intérieure (terre cuite)
            '#B8693C' => [
                ['Caractère', 'Transformation intérieure, fruit de l\'Esprit.'],
                ['Pardon', 'Recevoir et donner le pardon.'],
                ['Persévérance', 'Endurer dans l\'épreuve, courir la course.'],
                ['Espérance', 'Vision, promesse, futur en Dieu.'],
            ],
        ];

        $order = 10;
        foreach ($catalog as $color => $themes) {
            foreach ($themes as [$name, $description]) {
                $slug = Str::slug($name);
                DB::table('sermon_themes')->updateOrInsert(
                    ['slug' => $slug],
                    [
                        'name'        => $name,
                        'description' => $description,
                        'color'       => $color,
                        'is_default'  => true,
                        'sort_order'  => $order,
                        'updated_at'  => now(),
                        'created_at'  => DB::raw('COALESCE(created_at, NOW())'),
                    ],
                );
                $order += 10;
            }
        }
    }
}
