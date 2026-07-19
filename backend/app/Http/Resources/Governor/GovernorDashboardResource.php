<?php

namespace App\Http\Resources\Governor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource pour le payload dashboard gouverneur.
 *
 * La structure du resource sait que $this->resource est un array (issu
 * du Cache::remember dans le controller). On expose les champs tels quels
 * en s'assurant des types numériques côté front.
 */
class GovernorDashboardResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        $d = (array) $this->resource;

        return [
            'department' => [
                'id'   => $d['department']['id'] ?? null,
                'name' => $d['department']['name'] ?? null,
                'slug' => $d['department']['slug'] ?? null,
            ],
            'kpis' => [
                'members_count'             => (int) ($d['members_count'] ?? 0),
                'cells_count'               => (int) ($d['cells_count'] ?? 0),
                'active_cells_count'        => (int) ($d['active_cells_count'] ?? 0),
                'reports_pending_count'     => (int) ($d['reports_pending_count'] ?? 0),
                'reports_late_count'        => (int) ($d['reports_late_count'] ?? 0),
                'attendance_avg_last_4_weeks' => (float) ($d['attendance_avg_last_4_weeks'] ?? 0),
            ],
            'trends' => [
                'members_trend'    => $this->asArray($d['members_trend']    ?? []),
                'attendance_trend' => $this->asArray($d['attendance_trend'] ?? []),
            ],
            // Force array : le cache peut désérialiser une Collection Eloquent
            // comme objet non-itérable côté JSON. `values()` garantit un tableau indexé.
            'cells_health' => $this->asArray($d['cells_health'] ?? []),
            'cached_until' => $d['cached_until'] ?? null,
        ];
    }

    /** Convertit toute Collection Laravel/objet itérable en array indexé simple. */
    private function asArray($value): array
    {
        if (is_array($value)) return array_values($value);
        if ($value instanceof \Illuminate\Support\Collection) return $value->values()->all();
        if (is_iterable($value)) return array_values(iterator_to_array($value));
        return [];
    }
}
