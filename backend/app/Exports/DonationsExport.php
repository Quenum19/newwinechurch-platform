<?php

namespace App\Exports;

use App\Models\Donation;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;

class DonationsExport implements FromQuery, WithHeadings, WithMapping, ShouldAutoSize
{
    public function __construct(protected array $filters = []) {}

    public function query()
    {
        $query = Donation::query()->with('user', 'confirmer');

        foreach (['status', 'method', 'type'] as $key) {
            if ($v = $this->filters[$key] ?? null) {
                $query->where($key, $v);
            }
        }
        if ($from = $this->filters['from'] ?? null) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $this->filters['to'] ?? null) {
            $query->whereDate('created_at', '<=', $to);
        }

        return $query->orderByDesc('created_at');
    }

    public function headings(): array
    {
        return [
            'ID', 'Date', 'Montant', 'Devise', 'Méthode', 'Type', 'Statut',
            'Référence', 'Donateur', 'Email donateur', 'Téléphone',
            'Confirmé le', 'Confirmé par', 'Note',
        ];
    }

    public function map($d): array
    {
        $methodLabels = [
            'orange_money' => 'Orange Money', 'wave' => 'Wave',
            'mtn_momo' => 'MTN MoMo', 'card' => 'Carte',
            'cash' => 'Espèces', 'other' => 'Autre',
        ];
        $statusLabels = ['pending' => 'En attente', 'completed' => 'Confirmé', 'failed' => 'Rejeté'];

        return [
            $d->id,
            $d->created_at?->format('d/m/Y H:i'),
            (float) $d->amount,
            $d->currency,
            $methodLabels[$d->method] ?? $d->method,
            ucfirst($d->type),
            $statusLabels[$d->status] ?? $d->status,
            $d->reference,
            $d->user?->full_name ?? $d->donor_name ?? 'Anonyme',
            $d->user?->email ?? '',
            $d->donor_phone ?? $d->user?->phone ?? '',
            $d->confirmed_at?->format('d/m/Y H:i'),
            $d->confirmer?->full_name,
            $d->note,
        ];
    }
}
