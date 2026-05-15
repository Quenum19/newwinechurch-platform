<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

/**
 * Admin → Journal d'activité.
 *
 * Lecture seule. Permet à l'admin de voir qui a fait quoi sur la plateforme :
 * créations, modifications, suppressions de membres, dons, sermons, etc.
 */
class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('view activity log')) abort(403);

        $perPage = min((int) $request->query('per_page', 50), 200);

        $query = Activity::query()->with('causer:id,name,first_name')->latest();

        if ($subjectType = $request->query('subject_type')) {
            $query->where('subject_type', 'like', "%\\{$subjectType}");
        }
        if ($causerId = $request->query('causer_id')) {
            $query->where('causer_id', $causerId);
        }
        if ($event = $request->query('event')) {
            $query->where('event', $event);
        }
        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        $paginated = $query->paginate($perPage);

        // Annoter avec un displayName lisible.
        $paginated->getCollection()->transform(function ($a) {
            return [
                'id'           => $a->id,
                'description'  => $a->description,
                'event'        => $a->event,
                'subject'      => [
                    'type' => class_basename((string) $a->subject_type),
                    'id'   => $a->subject_id,
                ],
                'causer'       => $a->causer ? [
                    'id'        => $a->causer->id,
                    'full_name' => $a->causer->full_name ?? ($a->causer->first_name.' '.$a->causer->name),
                ] : null,
                'changes'      => $a->properties ?? null,
                'created_at'   => $a->created_at?->toIso8601String(),
            ];
        });

        return response()->json($paginated);
    }
}
