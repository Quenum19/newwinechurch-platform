<?php

namespace App\Events;

use App\Models\LiveStream;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class LiveStreamEnded implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public LiveStream $stream) {}

    public function broadcastOn(): Channel
    {
        return new Channel('live');
    }

    public function broadcastAs(): string
    {
        return 'live.ended';
    }

    public function broadcastWith(): array
    {
        return [
            'id'         => $this->stream->id,
            'replay_url' => $this->stream->replay_url,
        ];
    }
}
