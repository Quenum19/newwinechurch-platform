<?php

namespace App\Observers;

use App\Models\Testimonial;
use App\Services\NotifyAdmins;

/**
 * Notifie les admins d'un nouveau témoignage à modérer.
 */
class TestimonialObserver
{
    public function created(Testimonial $t): void
    {
        $author = $t->author_name ?? 'Anonyme';
        NotifyAdmins::global([
            'type'           => 'new_testimonial',
            'title'          => 'Nouveau témoignage soumis',
            'body'           => "{$author} a partagé un témoignage à modérer.",
            'testimonial_id' => $t->id,
            'url'            => '/admin/temoignages',
        ]);
    }
}
