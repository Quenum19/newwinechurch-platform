<?php

namespace App\Exports;

use App\Models\User;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

/**
 * Export Excel des membres NWC.
 *
 * - FromQuery : utilise la query Eloquent → memory-efficient même avec 1M+ users
 * - WithMapping : transforme chaque row en colonnes de l'export
 * - Hérite des filtres passés depuis MembersController (search, status, role...)
 */
class MembersExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(protected array $filters = []) {}

    public function query()
    {
        $query = User::query()->with('roles', 'departments');

        if ($search = $this->filters['search'] ?? null) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('first_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($status = $this->filters['status'] ?? null) {
            $query->where('status', $status);
        }
        if ($role = $this->filters['role'] ?? null) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $role));
        }

        return $query->orderBy('name');
    }

    public function headings(): array
    {
        return [
            'ID', 'Prénom', 'Nom', 'Email', 'Téléphone',
            'Genre', 'Date de naissance', 'Ville', 'Adresse',
            'Statut', 'Baptisé', 'Date d\'arrivée', 'Email vérifié',
            'Rôles', 'Départements', 'Inscrit le',
        ];
    }

    public function map($user): array
    {
        return [
            $user->id,
            $user->first_name,
            $user->name,
            $user->email,
            $user->phone,
            $user->gender,
            $user->birth_date?->format('d/m/Y'),
            $user->city,
            $user->address,
            $user->status,
            $user->is_baptized ? 'Oui' : 'Non',
            $user->joined_at?->format('d/m/Y'),
            $user->email_verified_at ? 'Oui' : 'Non',
            $user->roles->pluck('name')->implode(', '),
            $user->departments->pluck('name')->implode(', '),
            $user->created_at?->format('d/m/Y H:i'),
        ];
    }
}
