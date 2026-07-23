<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\MembershipRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

/**
 * Enrôlement bal — hub de contact NWC.
 *
 * Le QR "Suis-nous" imprimé sur les supports de table du bal 2026 pointe vers
 * la page /suivre-nous qui contient un CTA "Rejoindre la New Wine Church".
 * Ce controller reçoit le formulaire court (prénom, nom, tel, email, whatsapp,
 * type d'engagement) et crée une membership_request avec source='bal-2026'.
 *
 * L'équipe accueil traite les demandes depuis /admin/demandes-adhesion — le
 * badge "source: bal-2026" permet de filtrer/prioriser les leads du bal.
 */
class PublicBalEnrollmentController extends Controller
{
    /** POST /api/public/enrollment/bal — soumission formulaire enrôlement bal. */
    public function store(Request $request): JsonResponse
    {
        // Rate limit anti-spam : max 5 demandes par IP par minute.
        $key = 'bal-enrollment:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Trop de tentatives. Réessaye dans {$seconds}s.",
            ], 429);
        }
        RateLimiter::hit($key, 60);

        $data = $request->validate([
            'first_name'    => ['required', 'string', 'max:80'],
            'name'          => ['required', 'string', 'max:80'],
            'phone'         => ['required', 'string', 'max:30'],
            'whatsapp'      => ['nullable', 'string', 'max:30'],
            'city'          => ['required', 'string', 'max:100'],
            // Type d'engagement figé côté serveur : département obligatoire.
            'department_id' => ['required', 'integer', 'exists:departments,id'],
            'event_id'      => ['nullable', 'integer', 'exists:events,id'],
        ]);
        $data['enrollment_type'] = 'department';

        // Fallback intelligent : si le QR scanné ne contient pas ?event=X (ex :
        // supports de table imprimés avant l'ajout du paramètre), on rattache
        // automatiquement à l'event 'bal' à venir ou fraîchement passé. Évite
        // de perdre des leads dans une vue admin globale absente.
        if (empty($data['event_id'])) {
            $fallback = \App\Models\Event::query()
                ->where(function ($q) {
                    $q->where('title', 'like', '%bal%')
                      ->orWhere('slug', 'like', '%bal%')
                      ->orWhere('type', 'bal');
                })
                ->whereDate('starts_at', '>=', now()->subDays(3))
                ->orderBy('starts_at')
                ->first();
            if ($fallback) {
                $data['event_id'] = $fallback->id;
            }
        }

        // WhatsApp stocké dans motivation en attendant une colonne dédiée.
        $notes = [];
        if (! empty($data['whatsapp'])) {
            $notes[] = "WhatsApp : {$data['whatsapp']}";
        }

        $req = MembershipRequest::create([
            'first_name'                => $data['first_name'],
            'name'                      => $data['name'],
            'phone'                     => $data['phone'],
            'city'                      => $data['city'],
            'source'                    => 'enrollment',
            'enrollment_type'           => $data['enrollment_type'],
            'enrollment_status'         => 'nouveau',
            'interested_department_id'  => $data['department_id'] ?? null,
            'event_id'                  => $data['event_id'] ?? null,
            'motivation'                => $notes ? implode(' · ', $notes) : null,
            'status'                    => 'pending',
        ]);

        return response()->json([
            'message' => 'Merci ! Nous te contacterons très rapidement.',
            'id'      => $req->id,
        ], 201);
    }

    /**
     * GET /api/public/enrollment/departments — liste complète pour le sélecteur.
     *
     * Retourne TOUS les départements (actifs + en préparation) : le bal est le
     * bon moment pour "vendre" les départements en cours de lancement — les
     * volontaires les plus intéressés voudront s'y positionner tôt. Les
     * départements non-actifs sont marqués `is_active = false` pour que le
     * front puisse afficher un badge "En lancement" discret.
     */
    public function departments(): JsonResponse
    {
        $departments = Department::ordered()
            ->get(['id', 'name', 'slug', 'description', 'icon', 'color_theme', 'color', 'is_active'])
            ->map(fn ($d) => [
                'id'          => $d->id,
                'name'        => $d->name,
                'slug'        => $d->slug,
                'description' => \Illuminate\Support\Str::limit($d->description, 80),
                'icon'        => $d->icon,
                'color'       => $d->color_theme ?: $d->color ?: '#8B1A2F',
                'is_active'   => (bool) $d->is_active,
            ]);

        return response()->json(['departments' => $departments]);
    }
}
