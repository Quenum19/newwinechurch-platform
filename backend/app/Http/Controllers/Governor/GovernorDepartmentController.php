<?php

namespace App\Http\Controllers\Governor;

use App\Http\Controllers\Controller;
use App\Http\Resources\Governor\DepartmentReportTemplateResource;
use App\Http\Resources\Governor\GovernorDepartmentResource;
use App\Models\Department;
use App\Models\DepartmentReportTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Espace gouverneur — informations sur SON département.
 */
class GovernorDepartmentController extends Controller
{
    public function show(Request $request)
    {
        $deptId = (int) $request->governor_department_id;

        $dept = Department::with([
                'governor:id,name,first_name,avatar,phone,department_id',
                'governor.governorProfile',
            ])
            ->withCount(['members', 'reports'])
            ->findOrFail($deptId);

        return new GovernorDepartmentResource($dept);
    }

    /**
     * Template de rapport actif du département du gouverneur.
     * Le formulaire de rapport (côté frontend) consomme ce schema pour
     * rendre dynamiquement les champs spécifiques au département.
     */
    public function reportTemplate(Request $request): JsonResponse
    {
        $deptId = (int) $request->governor_department_id;

        $template = DepartmentReportTemplate::active()
            ->where('department_id', $deptId)
            ->orderByDesc('version')
            ->first();

        if (! $template) {
            return response()->json([
                'message' => 'Aucun template de rapport actif pour ce département.',
            ], 404);
        }

        return response()->json([
            'data' => new DepartmentReportTemplateResource($template),
        ]);
    }
}
