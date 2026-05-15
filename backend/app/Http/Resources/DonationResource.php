<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DonationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'amount'        => (float) $this->amount,
            'currency'      => $this->currency,
            'method'        => $this->method,
            'reference'     => $this->reference,
            'type'          => $this->type,
            'status'        => $this->status,
            'donor_name'    => $this->donor_name,
            'note'          => $this->note,
            'confirmed_at'  => $this->confirmed_at?->toIso8601String(),
            'created_at'    => $this->created_at?->toIso8601String(),
        ];
    }
}
