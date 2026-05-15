<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LiveStreamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'title'          => $this->title,
            'description'    => $this->description,
            'channel_name'   => $this->channel_name,
            'status'         => $this->status,
            'scheduled_at'   => $this->scheduled_at?->toIso8601String(),
            'started_at'     => $this->started_at?->toIso8601String(),
            'ended_at'       => $this->ended_at?->toIso8601String(),
            'replay_url'     => $this->replay_url,
            'cover_image'    => $this->cover_image,
            'viewers_count'  => $this->viewers_count,
        ];
    }
}
