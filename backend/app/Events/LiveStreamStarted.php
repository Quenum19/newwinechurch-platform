<?php

namespace App\Events;

use App\Models\LiveStream;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Diffusé sur le channel public "live" quand l'admin démarre un live.
 * Le frontend s'abonne et affiche le badge "EN DIRECT" partout.
 */
class LiveStreamStarted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public LiveStream $stream) {}

    public function broadcastOn(): Channel
    {
        return new Channel('live');
    }

    public function broadcastAs(): string
    {
        return 'live.started';
    }

    public function broadcastWith(): array
    {
        return [
            'id'           => $this->stream->id,
            'title'        => $this->stream->title,
            'description'  => $this->stream->description,
            'channel_name' => $this->stream->channel_name,
            'cover_image'  => $this->stream->cover_image,
            'started_at'   => $this->stream->started_at?->toIso8601String(),
        ];
    }
}
