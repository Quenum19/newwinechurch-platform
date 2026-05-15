<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreNewsletterSubscriberRequest;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NewsletterController extends Controller
{
    /**
     * Inscription à la newsletter (double opt-in).
     *
     * Si l'email existe déjà :
     *   - confirmé → on ne fait rien, message neutre (pas de leak)
     *   - non confirmé → on régénère le token et on relance le mail
     */
    public function subscribe(StoreNewsletterSubscriberRequest $request): JsonResponse
    {
        $data = $request->validated();

        $subscriber = NewsletterSubscriber::firstOrNew(['email' => $data['email']]);
        $subscriber->name     = $data['name'] ?? $subscriber->name;
        $subscriber->language = $data['language'] ?? $subscriber->language ?? 'fr';

        if (! $subscriber->is_confirmed) {
            $subscriber->confirmation_token = NewsletterSubscriber::generateToken();
        }

        // Si l'utilisateur s'était désinscrit, on le réactive.
        $subscriber->unsubscribed_at = null;

        $subscriber->save();

        // TODO Phase 8 : envoi de l'email de double opt-in via queue.

        return response()->json([
            'message' => 'Vérifiez votre boîte mail pour confirmer votre inscription.',
        ], 201);
    }

    /**
     * Confirmation d'inscription via lien email (token unique).
     */
    public function confirm(string $token): JsonResponse
    {
        $subscriber = NewsletterSubscriber::where('confirmation_token', $token)
                                          ->whereNull('confirmed_at')
                                          ->firstOrFail();

        $subscriber->update([
            'is_confirmed'       => true,
            'confirmed_at'       => now(),
            'confirmation_token' => null,
        ]);

        return response()->json(['message' => 'Inscription confirmée. Bienvenue !']);
    }

    /**
     * Désinscription one-click via lien email (token = email hashé).
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $email = (string) $request->query('email');
        $token = (string) $request->query('token');

        $subscriber = NewsletterSubscriber::where('email', $email)->firstOrFail();

        // Vérification simple : token = sha256(email + APP_KEY).
        $expected = hash('sha256', $email.config('app.key'));
        abort_unless(hash_equals($expected, $token), 403);

        $subscriber->update(['unsubscribed_at' => now()]);

        return response()->json(['message' => 'Vous êtes désormais désinscrit. À bientôt.']);
    }
}
