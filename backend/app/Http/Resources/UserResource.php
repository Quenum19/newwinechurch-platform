<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * UserResource — représentation publique du profil membre.
 *
 * On expose uniquement les champs sûrs (jamais password, remember_token,
 * et l'email seulement à l'utilisateur lui-même ou aux admins).
 */
class UserResource extends JsonResource
{
    /** Force l'exposition des champs sensibles (utilisé par login/register). */
    protected bool $forceExpose = false;

    /**
     * Active l'exposition complète (à utiliser quand on retourne le profil
     * au user lui-même mais qu'auth() n'est pas encore initialisé — login/register).
     */
    public function expose(bool $expose = true): static
    {
        $this->forceExpose = $expose;
        return $this;
    }

    public function toArray(Request $request): array
    {
        $isSelf   = $request->user()?->id === $this->id;
        $isStaff  = $request->user()?->hasAnyRole(['superadmin', 'pasteur', 'admin']);
        $expose   = $this->forceExpose || $isSelf || $isStaff;
        $showPerms = $this->forceExpose || $isSelf;

        return [
            'id'           => $this->id,
            'first_name'   => $this->first_name,
            'name'         => $this->name,
            'full_name'    => $this->full_name,
            'avatar_url'   => $this->avatar_url,
            'bio'          => $this->bio,
            'city'         => $this->city,

            // Champs sensibles → exposés uniquement à soi-même ou aux admins.
            'email'             => $expose ? $this->email : null,
            'phone'             => $expose ? $this->phone : null,
            'address'           => $expose ? $this->address : null,
            'birth_date'        => $expose ? $this->birth_date?->toDateString() : null,
            'gender'            => $expose ? $this->gender : null,
            'status'            => $expose ? $this->status : null,
            'is_baptized'       => $expose ? $this->is_baptized : null,
            'joined_at'         => $expose ? $this->joined_at?->toDateString() : null,
            'email_verified_at' => $expose ? $this->email_verified_at?->toIso8601String() : null,

            // Flag "premier login" : frontend redirige vers /changer-mot-de-passe si TRUE.
            'must_change_password' => $isSelf ? (bool) $this->must_change_password : null,

            // Fiche membre complète (visible à soi + admins/RH).
            'profession'              => $expose ? $this->profession : null,
            'education_level'         => $expose ? $this->education_level : null,
            'residence_area'          => $expose ? $this->residence_area : null,
            'congregation'            => $expose ? $this->congregation : null,
            'mountain'                => $expose ? $this->mountain : null,
            'mentor_name'             => $expose ? $this->mentor_name : null,
            'emergency_contact_name'  => $expose ? $this->emergency_contact_name : null,
            'emergency_contact_phone' => $expose ? $this->emergency_contact_phone : null,

            // Rôles + permissions Spatie (utiles pour l'UI conditionnelle côté front).
            'roles'       => $this->whenLoaded('roles', fn () => $this->roles->pluck('name')),
            'permissions' => $this->when($showPerms, fn () => $this->getAllPermissions()->pluck('name')),
        ];
    }
}
