<?php

namespace App\Http\Resources\Governor;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Resource publique d'un template de rapport (consommée par le frontend
 * pour rendre dynamiquement le formulaire du gouverneur).
 */
class DepartmentReportTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'             => $this->id,
            'department_id'  => $this->department_id,
            'name'           => $this->name,
            'frequency'      => $this->frequency,
            'version'        => $this->version,
            'schema'         => $this->schema,
            'updated_at'     => $this->updated_at?->toIso8601String(),
        ];
    }
}
