<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Governor\DepartmentReportTemplateResource;
use App\Models\Department;
use App\Models\DepartmentReportTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * Admin — CRUD des templates de rapport par département.
 *
 * Stratégie de versioning : on n'écrase JAMAIS un template existant.
 *  - update() crée une NOUVELLE version (version++) et marque l'ancienne is_active=false.
 *  - C'est traçable : les rapports déjà soumis restent liés au schema d'origine (snapshot
 *    dans form_data + identifiant template via version qui reste en DB).
 *
 * Le frontend (builder visuel) appelle :
 *   GET    /admin/departments/{id}/report-templates           → liste (toutes versions)
 *   GET    /admin/departments/{id}/report-templates/active    → version active actuelle
 *   POST   /admin/departments/{id}/report-templates           → créer (1ère version)
 *   PUT    /admin/departments/{id}/report-templates/{tplId}   → mettre à jour (= nouvelle version)
 *   DELETE /admin/departments/{id}/report-templates/{tplId}   → soft delete
 *   POST   /admin/departments/{id}/report-templates/{tplId}/activate → réactiver une version
 */
class AdminReportTemplatesController extends Controller
{
    /** Liste toutes les versions de template d'un département. */
    public function index(Request $request, int $departmentId): JsonResponse
    {
        abort_unless($request->user()?->can('view department reports'), 403);

        Department::findOrFail($departmentId);

        $templates = DepartmentReportTemplate::where('department_id', $departmentId)
            ->orderByDesc('version')
            ->get();

        return response()->json([
            'data' => DepartmentReportTemplateResource::collection($templates),
        ]);
    }

    /** Template actif courant. */
    public function active(Request $request, int $departmentId): JsonResponse
    {
        abort_unless($request->user()?->can('view department reports'), 403);

        Department::findOrFail($departmentId);

        $tpl = DepartmentReportTemplate::active()
            ->where('department_id', $departmentId)
            ->orderByDesc('version')
            ->first();

        if (! $tpl) {
            return response()->json(['message' => 'Aucun template actif.'], 404);
        }

        return response()->json(['data' => new DepartmentReportTemplateResource($tpl)]);
    }

    /** Création (1ère version). */
    public function store(Request $request, int $departmentId): JsonResponse
    {
        abort_unless($request->user()?->can('manage department reports'), 403);

        Department::findOrFail($departmentId);

        $data = $this->validatePayload($request);

        $tpl = DB::transaction(function () use ($departmentId, $data, $request) {
            // Désactiver les anciennes versions si on crée une nouvelle.
            DepartmentReportTemplate::where('department_id', $departmentId)
                ->update(['is_active' => false]);

            return DepartmentReportTemplate::create([
                'department_id' => $departmentId,
                'name'          => $data['name'],
                'frequency'     => $data['frequency'],
                'schema'        => $data['schema'],
                'version'       => 1,
                'is_active'     => true,
                'created_by'    => $request->user()->id,
            ]);
        });

        activity('report-templates')
            ->causedBy($request->user())
            ->performedOn($tpl)
            ->withProperties(['department_id' => $departmentId])
            ->log('Template de rapport créé');

        return response()->json([
            'message' => 'Template créé.',
            'data'    => new DepartmentReportTemplateResource($tpl),
        ], 201);
    }

    /**
     * Mise à jour = création d'une NOUVELLE version (versioning immutable).
     * L'ancienne version reste en DB (is_active=false) pour traçabilité.
     */
    public function update(Request $request, int $departmentId, int $tplId): JsonResponse
    {
        abort_unless($request->user()?->can('manage department reports'), 403);

        $existing = DepartmentReportTemplate::where('department_id', $departmentId)
            ->findOrFail($tplId);

        $data = $this->validatePayload($request);

        $newTpl = DB::transaction(function () use ($departmentId, $data, $request) {
            // Désactiver toutes les versions précédentes.
            DepartmentReportTemplate::where('department_id', $departmentId)
                ->update(['is_active' => false]);

            $nextVersion = (int) DepartmentReportTemplate::where('department_id', $departmentId)
                ->max('version') + 1;

            return DepartmentReportTemplate::create([
                'department_id' => $departmentId,
                'name'          => $data['name'],
                'frequency'     => $data['frequency'],
                'schema'        => $data['schema'],
                'version'       => $nextVersion,
                'is_active'     => true,
                'created_by'    => $request->user()->id,
            ]);
        });

        activity('report-templates')
            ->causedBy($request->user())
            ->performedOn($newTpl)
            ->withProperties([
                'department_id'      => $departmentId,
                'previous_version'   => $existing->version,
                'new_version'        => $newTpl->version,
            ])
            ->log('Template de rapport mis à jour (nouvelle version)');

        return response()->json([
            'message' => "Template mis à jour (v{$newTpl->version}).",
            'data'    => new DepartmentReportTemplateResource($newTpl),
        ]);
    }

    /** Soft delete d'une version (ne supprime pas les rapports). */
    public function destroy(Request $request, int $departmentId, int $tplId): JsonResponse
    {
        abort_unless($request->user()?->can('manage department reports'), 403);

        $tpl = DepartmentReportTemplate::where('department_id', $departmentId)
            ->findOrFail($tplId);

        $tpl->update(['is_active' => false]);
        $tpl->delete();

        return response()->json(['message' => 'Template archivé.']);
    }

    /** Réactive une version archivée (ex : revenir à la v2). */
    public function activate(Request $request, int $departmentId, int $tplId): JsonResponse
    {
        abort_unless($request->user()?->can('manage department reports'), 403);

        $tpl = DepartmentReportTemplate::withTrashed()
            ->where('department_id', $departmentId)
            ->findOrFail($tplId);

        DB::transaction(function () use ($tpl, $departmentId) {
            DepartmentReportTemplate::where('department_id', $departmentId)
                ->update(['is_active' => false]);

            if ($tpl->trashed()) $tpl->restore();
            $tpl->update(['is_active' => true]);
        });

        return response()->json([
            'message' => "Version {$tpl->version} réactivée.",
            'data'    => new DepartmentReportTemplateResource($tpl->fresh()),
        ]);
    }

    /**
     * Validation du payload schema.
     * Structure obligatoire : tableau de sections { title, fields: [...] }.
     */
    protected function validatePayload(Request $request): array
    {
        $validator = Validator::make($request->all(), [
            'name'       => ['required', 'string', 'max:160'],
            'frequency'  => ['required', 'in:weekly,monthly'],
            'schema'     => ['required', 'array', 'min:1'],
            'schema.*.title'  => ['required', 'string', 'max:160'],
            'schema.*.fields' => ['required', 'array', 'min:1'],
            'schema.*.fields.*.key'   => ['required', 'string', 'max:60', 'regex:/^[a-z][a-z0-9_]*$/'],
            'schema.*.fields.*.label' => ['required', 'string', 'max:200'],
            'schema.*.fields.*.type'  => ['required', 'in:text,textarea,number,date,time,datetime,select,yesno,checkbox,checkbox-group,table'],
        ], [
            'schema.*.fields.*.key.regex' => 'La clé du champ doit être en snake_case minuscule (ex: nom_du_champ).',
        ]);

        $validator->validate();

        return $validator->validated();
    }
}
