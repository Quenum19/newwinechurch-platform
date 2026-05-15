<?php

namespace App\Http\Controllers\Member;

use App\Http\Controllers\Controller;
use App\Http\Resources\DepartmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Endpoints contextuels du membre (cellule, départements).
 *
 *  GET /api/me/cell         → ma cellule (avec leader + co-membres)
 *  GET /api/me/departments  → mes départements (avec capitaine)
 */
class MyContextController extends Controller
{
    /** Ma cellule (la principale). */
    public function cell(Request $request): JsonResponse
    {
        $cell = $request->user()->cells()
            ->with(['leader:id,name,first_name,avatar', 'members:id,name,first_name,avatar'])
            ->first();

        if (! $cell) {
            return response()->json(['cell' => null]);
        }

        return response()->json([
            'cell' => [
                'id'               => $cell->id,
                'name'             => $cell->name,
                'slug'             => $cell->slug,
                'description'      => $cell->description,
                'zone'             => $cell->zone,
                'meeting_day'      => $cell->meeting_day,
                'meeting_time'     => $cell->meeting_time,
                'meeting_location' => $cell->meeting_location,
                'leader' => $cell->leader ? [
                    'id'         => $cell->leader->id,
                    'full_name'  => $cell->leader->full_name,
                    'avatar_url' => $cell->leader->avatar_url,
                ] : null,
                'members' => $cell->members->map(fn ($m) => [
                    'id'         => $m->id,
                    'full_name'  => $m->full_name,
                    'avatar_url' => $m->avatar_url,
                    'role'       => $m->pivot->role,
                ]),
                'role' => $cell->pivot->role,
            ],
        ]);
    }

    /** Mes départements. */
    public function departments(Request $request)
    {
        $departments = $request->user()->departments()
            ->with(['governor:id,name,first_name,avatar'])
            ->withCount('members')
            ->get();

        return DepartmentResource::collection($departments);
    }
}
