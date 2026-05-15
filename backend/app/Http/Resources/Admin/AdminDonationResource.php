<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminDonationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'amount'       => (float) $this->amount,
            'currency'     => $this->currency,
            'method'       => $this->method,
            'reference'    => $this->reference,
            'type'         => $this->type,
            'status'       => $this->status,
            'donor_name'   => $this->donor_name,
            'donor_phone'  => $this->donor_phone,
            'note'         => $this->note,
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'created_at'   => $this->created_at?->toIso8601String(),
            'user'         => $this->whenLoaded('user', fn () => $this->user ? [
                'id'         => $this->user->id,
                'full_name'  => $this->user->full_name,
                'email'      => $this->user->email,
                'avatar_url' => $this->user->avatar_url,
            ] : null),
            'confirmer'    => $this->whenLoaded('confirmer', fn () => $this->confirmer ? [
                'id'        => $this->confirmer->id,
                'full_name' => $this->confirmer->full_name,
            ] : null),
        ];
    }
}
