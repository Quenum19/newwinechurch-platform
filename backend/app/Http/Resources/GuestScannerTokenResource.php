<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Sortie API d'un magic-link scanner invité — affiché dans le panneau Staff.
 *
 * Le token brut N'EST PAS exposé après création (une seule fois via l'action
 * store/regenerate qui retourne le lien complet).
 */
class GuestScannerTokenResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'event_id'      => $this->event_id,
            'display_name'  => $this->display_name,
            'contact'       => $this->contact,
            'contact_type'  => $this->contact_type,
            'status'        => $this->status,
            'expires_at'    => $this->expires_at?->toIso8601String(),
            'last_used_at'  => $this->last_used_at?->toIso8601String(),
            'scan_count'    => (int) $this->scan_count,
            'is_valid'      => $this->isValid(),
            'created_at'    => $this->created_at?->toIso8601String(),
            'created_by'    => $this->whenLoaded('createdBy', fn () => $this->createdBy ? [
                'id'   => $this->createdBy->id,
                'name' => trim(($this->createdBy->first_name ?? '').' '.($this->createdBy->name ?? '')),
            ] : null),
        ];
    }
}
