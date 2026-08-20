<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\MembershipRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;

/**
 * Formulaire d'inscription générique — 1 endpoint pour TOUS les events.
 *
 * Piloté par `events.registration_form_config` (JSON) + `events.modules_enabled` :
 *   - quels champs afficher/obligatoires
 *   - fenêtre opens_at/closes_at
 *   - message de succès
 *   - cross-check "était au bal" auto (via cross_check_previous_event_id)
 *
 * Un event doit avoir modules_enabled.registration = true pour que
 * l'endpoint accepte les requêtes.
 *
 * Endpoints :
 *   GET  /public/events/{slug}/registration-config → rend le formulaire
 *   POST /public/events/{slug}/register            → enregistre la préinscription
 *
 * L'écriture va dans membership_requests (mutualisation avec le hub existant
 * /admin/demandes-adhesion). Un token magic-link est généré pour l'étape 2
 * (choix montagne / activité qui déclenchera la génération du ticket).
 */
class PublicEventRegistrationController extends Controller
{
    /** Les 13 communes du Grand Abidjan (dropdown + centroïde géo côté admin). */
    public const COMMUNES_ABIDJAN = [
        'Abobo', 'Adjamé', 'Anyama', 'Attecoubé', 'Bingerville', 'Cocody',
        'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Songon', 'Treichville', 'Yopougon',
    ];

    /** Champs par défaut si registration_form_config.fields est vide. */
    private const DEFAULT_FIELDS = [
        ['key' => 'first_name', 'required' => true],
        ['key' => 'name',       'required' => true],
        ['key' => 'email',      'required' => true],
        ['key' => 'phone',      'required' => true],
    ];

    /** GET /public/events/{slug}/registration-config */
    public function config(string $slug): JsonResponse
    {
        $event = Event::where('is_published', true)->where('slug', $slug)->firstOrFail();
        $modules = $event->modules_enabled ?? [];
        $config  = $event->registration_form_config ?? [];

        if (! ($modules['registration'] ?? false)) {
            return response()->json([
                'message' => "L'inscription n'est pas activée sur cet événement.",
            ], 404);
        }

        // Dates : PRIORITÉ aux colonnes standards éditables via /admin/evenements/{id}
        // (tickets_closes_at si billetterie, sinon registration_deadline) — le
        // JSON registration_form_config.closes_at n'est qu'un fallback pour
        // les events qui n'ont pas de billetterie ni d'inscription classique.
        // Sans ça, la date affichée reste figée sur la valeur JSON de la
        // migration data — non synchronisée avec les modifs admin.
        $opensAt  = isset($config['opens_at']) ? Carbon::parse($config['opens_at']) : null;

        $closesAt = $event->tickets_closes_at
                 ?? $event->registration_deadline
                 ?? (isset($config['closes_at']) ? Carbon::parse($config['closes_at']) : null);

        $now = now();
        $isOpen = (! $opensAt || $now->gte($opensAt)) && (! $closesAt || $now->lte($closesAt));

        return response()->json([
            'event' => [
                'id'          => $event->id,
                'slug'        => $event->slug,
                'title'       => $event->title,
                'starts_at'   => $event->starts_at?->toIso8601String(),
                'location'    => $event->location,
                'description' => $event->description,
                'cover_image' => $event->cover_image
                    ? Storage::disk('public')->url($event->cover_image)
                    : null,
            ],
            'form' => [
                'fields'          => $config['fields'] ?? self::DEFAULT_FIELDS,
                'success_message' => $config['success_message']
                    ?? "Merci ! Ta pré-inscription est bien enregistrée. On te recontacte pour la suite.",
                'opens_at'        => $opensAt?->toIso8601String(),
                // On renvoie l'objet Carbon (ou instance datetime) — cast en ISO
                'closes_at'       => $closesAt ? Carbon::parse($closesAt)->toIso8601String() : null,
                'is_open'         => $isOpen,
            ],
            'options' => [
                'communes' => self::COMMUNES_ABIDJAN,
            ],
        ]);
    }

    /** POST /public/events/{slug}/register */
    public function store(Request $request, string $slug): JsonResponse
    {
        $event = Event::where('is_published', true)->where('slug', $slug)->firstOrFail();
        $modules = $event->modules_enabled ?? [];
        $config  = $event->registration_form_config ?? [];

        // === Anti-bot honeypot ===
        // Le formulaire client ajoute un champ "website" invisible pour les
        // humains. Si un bot le remplit → on renvoie un 200 factice (le bot
        // pense avoir réussi) sans créer d'enregistrement. Silencieux volontaire
        // (renvoyer 4xx apprendrait au bot à contourner).
        if (! empty($request->input('website'))) {
            Log::info('Registration honeypot triggered', [
                'ip'       => sha1($request->ip() ?? ''),
                'event_id' => $event->id,
                'ua'       => substr((string) $request->userAgent(), 0, 200),
            ]);
            return response()->json([
                'message'  => "Merci ! Ta pré-inscription a été enregistrée.",
                'id'       => 0,
                'token'    => 'bot-ignored',
                'duplicate'=> false,
            ], 201);
        }

        if (! ($modules['registration'] ?? false)) {
            return response()->json(['message' => "Les inscriptions sont fermées."], 422);
        }

        // Fenêtre temporelle — même logique de priorité que ::config()
        // (colonnes editables admin > JSON legacy).
        $now = now();
        if (! empty($config['opens_at']) && $now->lt(Carbon::parse($config['opens_at']))) {
            return response()->json([
                'message' => "Les inscriptions ne sont pas encore ouvertes.",
            ], 422);
        }
        $closesAt = $event->tickets_closes_at
                 ?? $event->registration_deadline
                 ?? (! empty($config['closes_at']) ? Carbon::parse($config['closes_at']) : null);
        if ($closesAt && $now->gt($closesAt)) {
            return response()->json(['message' => "Les inscriptions sont fermées."], 422);
        }

        // Rate limit anti-spam : 5 tentatives/min/IP
        $key = 'event-registration:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);
            return response()->json([
                'message' => "Trop de tentatives. Réessaie dans {$seconds}s.",
            ], 429);
        }
        RateLimiter::hit($key, 60);

        // Validation dynamique selon les champs déclarés
        $fields = $config['fields'] ?? self::DEFAULT_FIELDS;
        $rules  = $this->buildValidationRules($fields);
        $data   = $request->validate($rules);

        // Au moins un canal de contact obligatoire (email OU phone)
        if (empty($data['email']) && empty($data['phone'])) {
            return response()->json([
                'message' => "Merci de fournir au moins un email ou un téléphone.",
            ], 422);
        }

        // Dédoublonnage : si un email/tel est déjà inscrit pour CET event, on
        // renvoie une erreur 422 avec un message sur le CHAMP concerné.
        // → l'utilisateur reste sur le formulaire et peut corriger (changer
        //   d'email/tel) au lieu de voir un écran plein "déjà inscrit".
        $existing = MembershipRequest::where('event_id', $event->id)
            ->where(function ($q) use ($data) {
                if (! empty($data['email'])) $q->orWhere('email', $data['email']);
                if (! empty($data['phone'])) $q->orWhere('phone', $data['phone']);
            })
            ->first();
        if ($existing) {
            $errors = [];
            if (! empty($data['email']) && strcasecmp($existing->email ?? '', $data['email']) === 0) {
                $errors['email'] = ['Cet email est déjà utilisé pour une pré-inscription. Utilise un autre email.'];
            }
            if (! empty($data['phone']) && ($existing->phone ?? '') === $data['phone']) {
                $errors['phone'] = ['Ce numéro est déjà utilisé pour une pré-inscription. Utilise un autre numéro.'];
            }
            // Fallback si le match n'a matché par aucun des 2 champs exactement.
            if (empty($errors)) {
                $errors['email'] = ['Une pré-inscription existe déjà avec ces coordonnées.'];
            }
            return response()->json([
                'message' => 'Cet email ou ce numéro est déjà utilisé pour une pré-inscription.',
                'errors'  => $errors,
            ], 422);
        }

        // Cross-check auto "était au bal" via email/téléphone matching sur un
        // event antérieur (cross_check_previous_event_id sur modules_enabled).
        // Complète le champ déclaratif si non fourni ou pré-coche si absent.
        $attendedAuto = false;
        $crossId = $modules['cross_check_previous_event_id'] ?? null;
        if ($crossId) {
            $attendedAuto = MembershipRequest::where('event_id', $crossId)
                ->where(function ($q) use ($data) {
                    if (! empty($data['email'])) $q->orWhere('email', $data['email']);
                    if (! empty($data['phone'])) $q->orWhere('phone', $data['phone']);
                })
                ->exists();
        }
        $attendedFinal = array_key_exists('attended_bal', $data)
            ? (bool) $data['attended_bal']
            : $attendedAuto;

        // Génération magic-link token — utilisé pour l'étape 2 (choix montagne)
        // et pour toute action ultérieure sans re-taper prénom/nom.
        $token = bin2hex(random_bytes(20)); // 40 chars

        $req = MembershipRequest::create([
            'first_name'          => $data['first_name'] ?? null,
            'name'                => $data['name'] ?? null,
            'email'               => $data['email'] ?? null,
            'phone'               => $data['phone'] ?? null,
            'whatsapp'            => $data['whatsapp'] ?? null,
            'commune'             => $data['commune'] ?? null,
            'quartier'            => $data['quartier'] ?? null,
            'city'                => $data['commune'] ?? null, // rétrocompat colonne legacy
            'attended_bal'        => $attendedFinal,
            'event_id'            => $event->id,
            'source'              => 'event-registration',
            'enrollment_type'     => 'discover',
            'enrollment_status'   => 'nouveau',
            'status'              => 'pending',
            'registration_token'  => $token,
            'registration_step'   => 'pre',
        ]);

        // TODO Bloc D : envoi email de confirmation avec lien magic-link vers
        // /evenements/{slug}/choix-montagne?token=... quand cette étape sera prête.
        // Pour l'instant : silent, l'admin recontacte manuellement OU le batch
        // WhatsApp fait le follow-up.

        Log::info('Event registration', [
            'event_id'     => $event->id,
            'membership_id'=> $req->id,
            'attended_auto'=> $attendedAuto,
            'attended_final'=> $attendedFinal,
        ]);

        return response()->json([
            'message'  => $config['success_message']
                ?? "Merci ! Ta pré-inscription est bien enregistrée. On te recontacte pour la suite.",
            'id'       => $req->id,
            'token'    => $token,
            'duplicate'=> false,
        ], 201);
    }

    /** Construit les rules Laravel selon la config des champs. */
    private function buildValidationRules(array $fields): array
    {
        $rules = [];
        foreach ($fields as $field) {
            $key = $field['key'] ?? null;
            if (! $key) continue;
            $required = (bool) ($field['required'] ?? false);
            $r = $this->rulesForField($key, $required);
            if ($r) $rules[$key] = $r;
        }
        return $rules;
    }

    /** Rules par type de champ — extensible. */
    private function rulesForField(string $key, bool $required): array
    {
        $base = $required ? ['required'] : ['nullable'];
        // Regex téléphone : + optionnel + chiffres/espaces/tirets/points/parenthèses
        // Autorise du "+225 07 00 00 00 00" ou "07-00-00-00-00" ou "(225) 0700000000"
        // 8 chiffres minimum utile (chiffres réels ignore les séparateurs).
        $phonePattern = ['regex:/^\+?[0-9\s().-]{8,30}$/'];
        return match ($key) {
            'first_name'   => array_merge($base, ['string', 'max:80', 'regex:/^[\p{L}\s\'-]+$/u']),
            'name'         => array_merge($base, ['string', 'max:80', 'regex:/^[\p{L}\s\'-]+$/u']),
            'email'        => array_merge($base, ['email:rfc,dns', 'max:180']),
            'phone'        => array_merge($base, ['string', 'max:30'], $phonePattern),
            'whatsapp'     => array_merge($base, ['string', 'max:30'], $phonePattern),
            'commune'      => array_merge($base, ['string', 'max:80']),
            'quartier'     => array_merge($base, ['string', 'max:120']),
            'attended_bal' => ['nullable', 'boolean'],
            'birth_date'   => array_merge($base, ['date', 'before:today', 'after:1900-01-01']),
            'gender'       => array_merge($base, ['in:M,F,other']),
            default        => [],
        };
    }
}
