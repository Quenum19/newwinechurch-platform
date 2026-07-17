<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsStorageUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EventTicketResource extends JsonResource
{
    use FormatsStorageUrls;

    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'order_code'     => $this->order_code,
            'ticket_number'  => $this->ticket_number,
            'short_code'     => $this->short_code,
            'access_token'   => $this->when($request->user() || $request->route('token'), $this->access_token),

            'first_name'     => $this->first_name,
            'last_name'      => $this->last_name,
            'full_name'      => $this->full_name,
            'email'          => $this->email,
            'phone'          => $this->phone,
            'selfie_url'     => $this->fullStorageUrl($this->selfie_path),

            'status'         => $this->status,
            'used_at'        => $this->used_at?->toIso8601String(),
            'created_at'     => $this->created_at?->toIso8601String(),

            // Phase 2
            'price_fcfa'     => $this->price_fcfa,
            'payment_status' => $this->payment_status,

            // Phase 3 — WhatsApp
            'whatsapp_opt_in'      => (bool) $this->whatsapp_opt_in,
            'whatsapp_sent_at'     => $this->whatsapp_sent_at?->toIso8601String(),
            'whatsapp_last_status' => $this->whatsapp_last_status,

            // Phase 6 — Refund
            'refunded_at'        => $this->refunded_at?->toIso8601String(),
            'refund_reason'      => $this->refund_reason,
            'refund_method'      => $this->refund_method,
            'refund_reference'   => $this->refund_reference,
            'refund_amount_fcfa' => $this->refund_amount_fcfa,

            'event'          => $this->whenLoaded('event', fn () => [
                'id'           => $this->event->id,
                'title'        => $this->event->title,
                'slug'         => $this->event->slug,
                'starts_at'    => $this->event->starts_at?->toIso8601String(),
                'ends_at'      => $this->event->ends_at?->toIso8601String(),
                'location'     => $this->event->location,
                'address'      => $this->event->address,
                'cover_image'  => $this->event->cover_image ? $this->fullStorageUrl($this->event->cover_image) : null,
            ]),

            'used_by'        => $this->whenLoaded('usedBy', fn () => $this->usedBy ? [
                'id'   => $this->usedBy->id,
                'name' => trim(($this->usedBy->first_name ?? '').' '.($this->usedBy->name ?? '')),
            ] : null),
        ];
    }
}
