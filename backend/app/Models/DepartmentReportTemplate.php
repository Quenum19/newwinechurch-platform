<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Template de rapport périodique d'un département.
 *
 * Schema JSON :
 * [
 *   {
 *     "title": "Identité du rapport",
 *     "fields": [
 *       {"key": "period", "label": "Période", "type": "text", "required": true},
 *       {"key": "edited_at", "label": "Date d'édition", "type": "date"}
 *     ]
 *   },
 *   {
 *     "title": "Programmes du culte",
 *     "fields": [
 *       {
 *         "key": "programmes",
 *         "label": "Programmes",
 *         "type": "table",
 *         "rows": [
 *           {"key": "MONTAGNE", "label": "Montagne"},
 *           {"key": "LOUANGE",  "label": "Louange"},
 *           ...
 *         ],
 *         "columns": [
 *           {"key": "start", "label": "Heure début", "type": "time"},
 *           {"key": "end",   "label": "Heure fin",   "type": "time"},
 *           {"key": "respected", "label": "Respect timing", "type": "yesno"},
 *           {"key": "notes", "label": "Observations", "type": "text"}
 *         ]
 *       }
 *     ]
 *   }
 * ]
 *
 * Types de champs supportés :
 *  - text       : input simple
 *  - textarea   : zone de texte multi-lignes
 *  - number     : nombre
 *  - date       : sélecteur de date
 *  - time       : sélecteur d'heure
 *  - datetime   : date + heure
 *  - select     : liste déroulante (options: [{value, label}])
 *  - yesno      : oui/non (radio)
 *  - checkbox   : case unique
 *  - table      : tableau à lignes fixes (rows) × colonnes typées (columns)
 *  - rich-text  : éditeur riche (futur Tiptap)
 */
class DepartmentReportTemplate extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'department_id', 'name', 'frequency', 'schema',
        'version', 'is_active', 'created_by',
    ];

    protected $casts = [
        'schema'    => 'array',
        'is_active' => 'boolean',
        'version'   => 'integer',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('is_active', true);
    }

    public function scopeFor(Builder $q, int $departmentId, ?string $frequency = null): Builder
    {
        $q->where('department_id', $departmentId);
        if ($frequency) $q->where('frequency', $frequency);
        return $q;
    }
}
