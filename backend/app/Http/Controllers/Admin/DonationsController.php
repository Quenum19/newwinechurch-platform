<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminDonationResource;
use App\Models\Donation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

/**
 * Admin → Dons (workflow Mobile Money).
 *
 *   - Liste paginée + filtres (status, method, date range, montant range)
 *   - Confirmer un don pending → status=completed (en transaction, idempotent)
 *   - Stats : totaux par mois / méthode / type
 *
 * Anti-double-confirmation : on vérifie status='pending' AVANT update.
 */
class DonationsController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        if (! $request->user()->can('view donations')) abort(403);

        $perPage = min((int) $request->query('per_page', 25), 100);

        $query = Donation::with(['user:id,name,first_name,email,avatar', 'confirmer:id,name,first_name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($method = $request->query('method')) {
            $query->where('method', $method);
        }
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }
        if ($minAmount = $request->query('min_amount')) {
            $query->where('amount', '>=', $minAmount);
        }
        if ($maxAmount = $request->query('max_amount')) {
            $query->where('amount', '<=', $maxAmount);
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('reference', 'like', "%{$search}%")
                  ->orWhere('donor_name', 'like', "%{$search}%")
                  ->orWhere('donor_phone', 'like', "%{$search}%")
                  ->orWhere('note', 'like', "%{$search}%");
            });
        }

        $sort = (string) $request->query('sort', 'created_at');
        $allowed = ['created_at', 'amount', 'status', 'confirmed_at'];
        if (! in_array($sort, $allowed, true)) $sort = 'created_at';
        $direction = $request->query('direction') === 'asc' ? 'asc' : 'desc';
        $query->orderBy($sort, $direction);

        return AdminDonationResource::collection($query->paginate($perPage));
    }

    public function show(int $id): AdminDonationResource
    {
        if (! request()->user()->can('view donations')) abort(403);

        $donation = Donation::with(['user', 'confirmer'])->findOrFail($id);
        return new AdminDonationResource($donation);
    }

    /**
     * Confirmer un don pending.
     * Idempotent : si déjà confirmé, on retourne sans changer.
     */
    public function confirm(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('confirm donations')) abort(403);

        $donation = DB::transaction(function () use ($request, $id) {
            // SELECT FOR UPDATE → empêche double confirmation simultanée.
            $donation = Donation::lockForUpdate()->findOrFail($id);

            if ($donation->status === 'completed') {
                return $donation; // idempotent
            }
            if ($donation->status === 'failed') {
                abort(422, 'Ce don est marqué comme échoué.');
            }

            $donation->update([
                'status'       => 'completed',
                'confirmed_at' => now(),
                'confirmed_by' => $request->user()->id,
            ]);

            return $donation;
        });

        // Envoi automatique du reçu au donateur (queue), si on a un email.
        $donation->loadMissing('user');
        $emailTo = $donation->user?->email
                 ?: ($donation->donor_phone ? null : null); // pas d'email donor anonyme
        if ($emailTo) {
            \Illuminate\Support\Facades\Mail::to($emailTo)
                ->queue(new \App\Mail\DonationConfirmedMail($donation));
        }

        return response()->json([
            'message' => 'Don confirmé.',
            'data'    => new AdminDonationResource($donation->fresh(['user', 'confirmer'])),
        ]);
    }

    /**
     * Export Excel des dons avec filtres préservés.
     */
    public function export(Request $request)
    {
        if (! $request->user()->can('export donations')) abort(403);

        $filename = 'dons-nwc-'.now()->format('Y-m-d_His').'.xlsx';
        return \Maatwebsite\Excel\Facades\Excel::download(
            new \App\Exports\DonationsExport($request->only(['status', 'method', 'type', 'from', 'to'])),
            $filename
        );
    }

    /** Marquer un don comme "failed" (référence Mobile Money invalide). */
    public function reject(Request $request, int $id): JsonResponse
    {
        if (! $request->user()->can('confirm donations')) abort(403);

        $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        $donation = Donation::findOrFail($id);
        if ($donation->status !== 'pending') {
            abort(422, 'Seuls les dons en attente peuvent être rejetés.');
        }

        $donation->update([
            'status'       => 'failed',
            'note'         => trim(($donation->note ? $donation->note . "\n— " : '') . ($request->input('reason') ?? 'Référence invalide.')),
            'confirmed_by' => $request->user()->id,
            'confirmed_at' => now(),
        ]);

        return response()->json(['message' => 'Don rejeté.', 'data' => new AdminDonationResource($donation)]);
    }

    /**
     * Statistiques globales (utilisé par le dashboard admin).
     *
     * Renvoie :
     *   - totaux par status / method / type
     *   - série mensuelle (12 derniers mois) pour graphique
     *   - top donateurs (5 max)
     */
    public function stats(Request $request): JsonResponse
    {
        if (! $request->user()->can('view donations')) abort(403);

        // Compteurs simples
        $byStatus = Donation::select('status', DB::raw('COUNT(*) as count'), DB::raw('COALESCE(SUM(amount),0) as total'))
            ->groupBy('status')->get();
        $byMethod = Donation::where('status', 'completed')
            ->select('method', DB::raw('COUNT(*) as count'), DB::raw('COALESCE(SUM(amount),0) as total'))
            ->groupBy('method')->get();
        $byType   = Donation::where('status', 'completed')
            ->select('type', DB::raw('COUNT(*) as count'), DB::raw('COALESCE(SUM(amount),0) as total'))
            ->groupBy('type')->get();

        // Série mensuelle 12 derniers mois (timezone Africa/Abidjan).
        $monthly = Donation::where('status', 'completed')
            ->where('created_at', '>=', now()->subYear()->startOfMonth())
            ->select(
                DB::raw("DATE_FORMAT(created_at, '%Y-%m') as month"),
                DB::raw('COUNT(*) as count'),
                DB::raw('COALESCE(SUM(amount),0) as total')
            )
            ->groupBy('month')->orderBy('month')->get();

        $topDonors = Donation::where('status', 'completed')
            ->whereNotNull('user_id')
            ->select('user_id', DB::raw('SUM(amount) as total'))
            ->groupBy('user_id')->orderByDesc('total')->limit(5)
            ->with('user:id,name,first_name')->get();

        return response()->json([
            'by_status'  => $byStatus,
            'by_method'  => $byMethod,
            'by_type'    => $byType,
            'monthly'    => $monthly,
            'top_donors' => $topDonors,
            'pending_count' => Donation::pending()->count(),
            'total_completed_year' => (float) Donation::where('status', 'completed')
                ->where('created_at', '>=', now()->startOfYear())->sum('amount'),
        ]);
    }
}
