<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource membre vu par un admin — expose tout (email, phone, status, roles).
 * À utiliser uniquement dans les controllers Admin\*.
 */
class AdminMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'first_name'        => $this->first_name,
            'name'              => $this->name,
            'full_name'         => $this->full_name,
            'email'             => $this->email,
            'phone'             => $this->phone,
            'avatar_url'        => $this->avatar_url,
            'gender'            => $this->gender,
            'birth_date'        => $this->birth_date?->toDateString(),
            'address'           => $this->address,
            'city'              => $this->city,
            'bio'               => $this->bio,
            'status'            => $this->status,
            'is_baptized'       => $this->is_baptized,
            'joined_at'         => $this->joined_at?->toDateString(),
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'created_at'        => $this->created_at?->toIso8601String(),
            'deleted_at'        => $this->deleted_at?->toIso8601String(),
            'roles'             => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')),
            'departments'       => $this->whenLoaded('departments', fn () =>
                $this->departments->map(fn ($d) => [
                    'id'   => $d->id,
                    'name' => $d->name,
                    'slug' => $d->slug,
                    'role' => $d->pivot->role ?? 'member',
                ])
            ),
            'cells'             => $this->whenLoaded('cells', fn () =>
                $this->cells->map(fn ($c) => [
                    'id'   => $c->id,
                    'name' => $c->name,
                    'role' => $c->pivot->role ?? 'member',
                ])
            ),
            'donations_total'   => $this->whenLoaded('donations',
                fn () => (float) $this->donations->where('status', 'completed')->sum('amount')
            ),
        ];
    }
}
