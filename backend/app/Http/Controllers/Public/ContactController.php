<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreContactMessageRequest;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ContactController extends Controller
{
    /**
     * Réception d'un nouveau message du formulaire de contact.
     * Le message est stocké en base et visible dans /admin/contact.
     *
     * Sécurité :
     *  - Rate limit strict (throttle:contact-form dans routes/api.php)
     *  - Honeypot 'website' : si rempli = bot → 201 factice + log (le bot
     *    pense avoir réussi, aucun message créé)
     *  - Regex validation stricte sur name/phone
     *  - email:rfc,dns pour éliminer les emails fake
     */
    public function store(StoreContactMessageRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Honeypot anti-bot — renvoie un succès factice sans créer d'entrée
        if (! empty($data['website'] ?? '')) {
            Log::info('Contact honeypot triggered', [
                'ip' => sha1($request->ip() ?? ''),
                'ua' => substr((string) $request->userAgent(), 0, 200),
            ]);
            return response()->json([
                'message' => 'Message bien reçu. Nous reviendrons vers vous rapidement.',
                'id'      => 0,
            ], 201);
        }
        unset($data['website']);

        // Dédoublonnage soft : même email + même message dans les 5 dernières
        // minutes = doublon (utilisateur qui refresh + resoumet, ou spam).
        $recent = ContactMessage::where('email', $data['email'])
            ->where('message', $data['message'])
            ->where('created_at', '>=', now()->subMinutes(5))
            ->first();
        if ($recent) {
            return response()->json([
                'message' => 'Message déjà reçu — pas la peine de renvoyer.',
                'id'      => $recent->id,
            ], 200);
        }

        $message = ContactMessage::create($data);

        return response()->json([
            'message' => 'Message bien reçu. Nous reviendrons vers vous rapidement.',
            'id'      => $message->id,
        ], 201);
    }
}
