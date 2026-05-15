<?php

namespace App\Http\Controllers\Admin;

use App\Events\LiveStreamEnded;
use App\Events\LiveStreamStarted;
use App\Http\Controllers\Controller;
use App\Http\Resources\LiveStreamResource;
use App\Models\LiveStream;
use App\Services\AgoraTokenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Admin → Live streaming Agora.io.
 *
 * Workflow :
 *   1. Admin crée un live (programmé) → status='scheduled'
 *   2. Admin démarre → status='live' + génération token RTC publisher
 *      → broadcast LiveStreamStarted → frontend affiche badge "EN DIRECT"
 *   3. Admin termine → status='ended' + replay_url optionnel
 *      → broadcast LiveStreamEnded
 *
 * Sécurité :
 *   - Permission "manage live streams" requise pour CRUD
 *   - Tokens Agora générés server-side (jamais le secret côté client)
 *   - Un seul live en cours à la fois (transaction lockForUpdate)
 */
class LiveStreamsController extends Controller
{
    public function __construct(protected AgoraTokenService $agora) {}

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage live streams'), 403);

        $query = LiveStream::query()->with('creator:id,name,first_name');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        $query->orderByDesc('created_at');

        return response()->json($query->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage live streams'), 403);

        $data = $request->validate([
            'title'        => ['required', 'string', 'max:200'],
            'description'  => ['nullable', 'string', 'max:5000'],
            'scheduled_at' => ['required', 'date'],
            'cover_image'  => ['nullable', 'string'],
        ]);

        // Génération d'un channel name unique (Agora exige < 64 chars).
        $data['channel_name'] = 'nwc-'.Str::lower(Str::random(12));
        $data['status']       = 'scheduled';
        $data['created_by']   = $request->user()->id;

        $stream = LiveStream::create($data);
        return response()->json([
            'message' => 'Live programmé.',
            'data'    => new LiveStreamResource($stream),
        ], 201);
    }

    public function show(Request $request, int $id): LiveStreamResource
    {
        abort_unless($request->user()?->can('manage live streams'), 403);
        $stream = LiveStream::with('creator')->findOrFail($id);
        return new LiveStreamResource($stream);
    }

    /**
     * Démarrer le live.
     * - Met status='live' (transaction)
     * - Génère token Agora publisher pour l'admin
     * - Broadcast l'event LiveStreamStarted (badge frontend)
     */
    public function start(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('start live'), 403);

        $stream = DB::transaction(function () use ($id, $request) {
            // S'assure qu'aucun autre live n'est actif (1 seul live à la fois).
            $existing = LiveStream::where('status', 'live')->where('id', '!=', $id)->lockForUpdate()->first();
            if ($existing) {
                abort(409, 'Un live est déjà en cours : "'.$existing->title.'". Termine-le d\'abord.');
            }

            $stream = LiveStream::lockForUpdate()->findOrFail($id);

            if ($stream->status === 'ended') {
                abort(422, 'Ce live est déjà terminé. Crée-en un nouveau.');
            }

            $stream->update([
                'status'     => 'live',
                'started_at' => now(),
            ]);
            return $stream;
        });

        // Broadcast pour les clients connectés.
        broadcast(new LiveStreamStarted($stream));

        // Génère un token publisher pour l'admin diffuseur.
        $token = null;
        if ($this->agora->isConfigured()) {
            try {
                $token = $this->agora->buildToken(
                    channelName: $stream->channel_name,
                    uid:         $request->user()->id,
                    role:        AgoraTokenService::ROLE_PUBLISHER,
                    expirySeconds: 6 * 3600, // 6h max par session
                );
            } catch (\Throwable $e) {
                // On démarre quand même, mais sans token (admin verra le warning).
            }
        }

        return response()->json([
            'message'      => 'Live démarré.',
            'data'         => new LiveStreamResource($stream),
            'agora'        => [
                'app_id'       => config('services.agora.app_id', env('AGORA_APP_ID')),
                'channel_name' => $stream->channel_name,
                'uid'          => $request->user()->id,
                'token'        => $token,
                'configured'   => $this->agora->isConfigured(),
            ],
        ]);
    }

    /**
     * Terminer le live.
     * Optionnel : replay_url (URL VOD post-stream).
     */
    public function end(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('end live'), 403);

        $data = $request->validate([
            'replay_url' => ['nullable', 'url', 'max:500'],
        ]);

        $stream = LiveStream::findOrFail($id);
        $stream->update([
            'status'     => 'ended',
            'ended_at'   => now(),
            'replay_url' => $data['replay_url'] ?? null,
        ]);

        broadcast(new LiveStreamEnded($stream));

        return response()->json([
            'message' => 'Live terminé.',
            'data'    => new LiveStreamResource($stream),
        ]);
    }

    /**
     * Récupère un token Agora pour un viewer (membre connecté ou public).
     * Utilisé par /live page côté frontend.
     */
    public function viewerToken(Request $request, int $id): JsonResponse
    {
        $stream = LiveStream::where('status', 'live')->findOrFail($id);

        if (! $this->agora->isConfigured()) {
            return response()->json([
                'configured' => false,
                'message'    => 'Agora non configuré. Renseigne AGORA_APP_ID + AGORA_APP_CERTIFICATE.',
            ], 503);
        }

        $uid = $request->user()?->id ?? random_int(100000, 999999); // anonyme = uid random
        $token = $this->agora->buildToken(
            channelName: $stream->channel_name,
            uid:         $uid,
            role:        AgoraTokenService::ROLE_SUBSCRIBER,
            expirySeconds: 3600,
        );

        return response()->json([
            'configured'   => true,
            'app_id'       => config('services.agora.app_id', env('AGORA_APP_ID')),
            'channel_name' => $stream->channel_name,
            'uid'          => $uid,
            'token'        => $token,
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage live streams'), 403);
        $stream = LiveStream::findOrFail($id);
        if ($stream->status === 'live') {
            abort(422, 'Impossible de supprimer un live en cours. Terminez-le d\'abord.');
        }
        $stream->delete();
        return response()->json(['message' => 'Live supprimé.']);
    }
}
