<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SendNewsletterRequest;
use App\Jobs\SendNewsletterBatchJob;
use App\Models\NewsletterSubscriber;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Admin → Newsletter (abonnés + envoi).
 *
 * Workflow envoi :
 *   1. Admin compose subject + body (Tiptap, HTML sanitisé)
 *   2. Optionnel : test_email → envoi immédiat à 1 destinataire
 *   3. Sinon : on dispatch des SendNewsletterBatchJob de 1000 abonnés chacun
 *      pour scaler horizontalement (1M abonnés → 1000 jobs)
 */
class NewsletterController extends Controller
{
    /** Liste des abonnés. */
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage newsletter subscribers'), 403);

        $perPage = min((int) $request->query('per_page', 50), 200);

        $query = NewsletterSubscriber::query();

        if ($request->has('confirmed')) {
            $query->where('is_confirmed', $request->boolean('confirmed'));
        }
        if ($request->has('unsubscribed')) {
            $request->boolean('unsubscribed')
                ? $query->whereNotNull('unsubscribed_at')
                : $query->whereNull('unsubscribed_at');
        }
        if ($lang = $request->query('language')) {
            $query->where('language', $lang);
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }

        $query->orderByDesc('created_at');

        $stats = [
            'total'        => NewsletterSubscriber::count(),
            'confirmed'    => NewsletterSubscriber::where('is_confirmed', true)
                                ->whereNull('unsubscribed_at')->count(),
            'unconfirmed'  => NewsletterSubscriber::where('is_confirmed', false)->count(),
            'unsubscribed' => NewsletterSubscriber::whereNotNull('unsubscribed_at')->count(),
            'fr'           => NewsletterSubscriber::where('language', 'fr')->count(),
            'en'           => NewsletterSubscriber::where('language', 'en')->count(),
        ];

        return response()->json([
            'subscribers' => $query->paginate($perPage),
            'stats'       => $stats,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage newsletter subscribers'), 403);
        NewsletterSubscriber::findOrFail($id)->delete();
        return response()->json(['message' => 'Abonné supprimé.']);
    }

    /** Action en lot — désabonner ou supprimer. */
    public function bulk(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage newsletter subscribers'), 403);
        $request->validate([
            'action' => ['required', 'in:unsubscribe,delete'],
            'ids'    => ['required', 'array', 'min:1', 'max:500'],
            'ids.*'  => ['integer'],
        ]);
        $ids = $request->input('ids');
        $a = $request->input('action');
        $count = match ($a) {
            'unsubscribe' => NewsletterSubscriber::whereIn('id', $ids)->update(['unsubscribed_at' => now()]),
            'delete'      => NewsletterSubscriber::whereIn('id', $ids)->delete(),
        };
        $labels = ['unsubscribe' => 'désabonné(s)', 'delete' => 'supprimé(s)'];
        return response()->json(['message' => "$count abonné(s) " . $labels[$a] . '.', 'count' => $count]);
    }

    /**
     * Envoyer la newsletter.
     * - Si test_email présent : envoi immédiat synchrone à cette adresse.
     * - Sinon : queue batch de 1000 par 1000.
     */
    public function send(SendNewsletterRequest $request): JsonResponse
    {
        abort_unless($request->user()?->can('send newsletter'), 403);

        $data = $request->validated();

        // === Mode test : envoi immédiat à une seule adresse. ===
        if (! empty($data['test_email'])) {
            $body = $this->wrapTemplate($data['body'], $data['subject']);
            Mail::html($body, function ($m) use ($data) {
                $m->to($data['test_email'])
                  ->subject('[TEST] '.$data['subject'])
                  ->from(config('mail.from.address'), config('mail.from.name'));
            });
            return response()->json([
                'message' => 'Email de test envoyé à '.$data['test_email'],
            ]);
        }

        // === Mode envoi de masse en queue. ===
        $query = NewsletterSubscriber::query()
            ->where('is_confirmed', true)
            ->whereNull('unsubscribed_at');

        if (! empty($data['language'])) {
            $query->where('language', $data['language']);
        }

        $totalSubscribers = $query->count();
        if ($totalSubscribers === 0) {
            return response()->json(['message' => 'Aucun abonné confirmé pour cette langue.'], 422);
        }

        // Wrapping HTML brandé NWC.
        $finalBody = $this->wrapTemplate($data['body'], $data['subject']);

        // On chunk les ids en lots de 1000 → 1 job par lot.
        $jobsCount = 0;
        $query->select('id')->chunkById(1000, function ($chunk) use (&$jobsCount, $data, $finalBody, $request) {
            SendNewsletterBatchJob::dispatch(
                subject: $data['subject'],
                body: $finalBody,
                subscriberIds: $chunk->pluck('id')->all(),
                senderUserId: $request->user()->id,
            );
            $jobsCount++;
        });

        return response()->json([
            'message'           => 'Envoi planifié.',
            'total_subscribers' => $totalSubscribers,
            'batches_queued'    => $jobsCount,
        ], 202);
    }

    /**
     * Enveloppe HTML brandée NWC autour du contenu de l'email.
     * Inclut le logo, le slogan, et les variables {{name}}, {{unsubscribe_url}}
     * (remplacées dans SendNewsletterBatchJob).
     */
    private function wrapTemplate(string $body, string $subject): string
    {
        $appUrl = e(config('app.url'));
        $appName = e(config('app.name'));

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{$subject}</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:'Outfit',Arial,sans-serif;color:#fff;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;">
  <tr><td align="center" style="padding:40px 20px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:12px;overflow:hidden;">
      <tr><td align="center" style="padding:32px 24px;background:linear-gradient(135deg,#8B1A2F,#530F1B);">
        <h1 style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;color:#fff;">New Wine Church</h1>
        <p style="margin:6px 0 0;font-style:italic;color:#C9A84C;">« Sauvé pour Sauver »</p>
      </td></tr>
      <tr><td style="padding:32px 24px;color:#fff;font-size:15px;line-height:1.7;">
        Bonjour {{name}},<br><br>
        {$body}
      </td></tr>
      <tr><td style="padding:24px;background:#111;border-top:1px solid rgba(201,168,76,0.2);font-size:12px;color:rgba(255,255,255,0.5);text-align:center;">
        New Wine Church · Cocody-Bonoumin, Abidjan<br>
        <a href="{$appUrl}" style="color:#C9A84C;">{$appUrl}</a><br><br>
        <a href="{{unsubscribe_url}}" style="color:rgba(255,255,255,0.4);text-decoration:underline;">Se désinscrire</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }
}
