<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\LiveStreamResource;
use App\Models\LiveStream;

/**
 * Contrôleur public — état du live streaming.
 *
 * Le frontend appelle GET /api/live/current toutes les 60s (ou via WebSocket
 * Reverb plus tard) pour afficher le badge "EN DIRECT" partout.
 */
class LiveStreamController extends Controller
{
    /**
     * Renvoie le live actuellement en cours, ou null si aucun.
     * Le body JSON est littéralement `null` (et non `{}`) côté absence,
     * pour que le frontend puisse faire `if (data) { ... }` simplement.
     */
    public function current()
    {
        $live = LiveStream::current()->latest('started_at')->first();
        return $live
            ? response()->json(new LiveStreamResource($live))
            : response('null', 200, ['Content-Type' => 'application/json']);
    }

    /**
     * Renvoie le prochain live planifié (s'il y en a un).
     */
    public function next()
    {
        $next = LiveStream::scheduled()->first();
        return $next
            ? response()->json(new LiveStreamResource($next))
            : response('null', 200, ['Content-Type' => 'application/json']);
    }
}
