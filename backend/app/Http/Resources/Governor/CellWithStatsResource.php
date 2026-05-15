<?php

namespace App\Http\Resources\Governor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource d'une cellule pour la vue gouverneur.
 *
 * Inclut : infos cellule, leader, members_count, attendance_rate (moyenne 4
 * dernières semaines), date du dernier rapport, statut santé.
 *
 * Les champs members_count, attendance_rate_4w, last_report_date sont
 * calculés en amont par le controller (subquery / withCount / aggregate)
 * pour éviter le N+1 sur de grandes listes.
 */
class CellWithStatsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $attendanceRate = $this->attendance_rate_4w ?? null;
        $lastReportDate = $this->last_report_date ?? null;

        return [
            'id'               => $this->id,
            'name'             => $this->name,
            'slug'             => $this->slug,
            'zone'             => $this->zone,
            'meeting_day'      => $this->meeting_day,
            'meeting_time'     => $this->meeting_time?->format('H:i'),
            'meeting_location' => $this->meeting_location,
            'target_size'      => $this->target_size,
            'whatsapp_link'    => $this->whatsapp_link,
            'is_active'        => (bool) $this->is_active,

            'members_count'         => $this->whenCounted('members'),
            'attendance_rate_4w'    => $attendanceRate !== null ? (float) $attendanceRate : null,
            'last_report_date'      => $lastReportDate,

            // Statut santé : good (>75% présence + rapport <7j),
            //               warning (50-75% OU rapport 7-14j),
            //               critical (<50% OU rapport >14j ou jamais).
            'health_status'    => $this->healthStatus($attendanceRate, $lastReportDate),

            'leader' => $this->whenLoaded('leader', fn () => $this->leader ? [
                'id'        => $this->leader->id,
                'full_name' => $this->leader->full_name,
                'avatar'    => $this->leader->avatar_url,
                'phone'     => $this->leader->phone,
            ] : null),
        ];
    }

    /**
     * Calcule un statut santé synthétique pour le coup d'œil rapide.
     * Valeurs : good / warning / critical.
     */
    protected function healthStatus(?float $rate, ?string $lastReportDate): string
    {
        $daysSinceReport = $lastReportDate
            ? now()->diffInDays(\Carbon\Carbon::parse($lastReportDate))
            : 999;

        if ($rate === null && $daysSinceReport > 14) return 'critical';
        if ($rate !== null && $rate < 50) return 'critical';
        if ($daysSinceReport > 14) return 'critical';
        if ($rate !== null && $rate < 75) return 'warning';
        if ($daysSinceReport > 7) return 'warning';
        return 'good';
    }
}
