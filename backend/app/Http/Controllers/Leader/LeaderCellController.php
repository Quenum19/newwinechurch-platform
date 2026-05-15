<?php

namespace App\Http\Controllers\Leader;

use App\Http\Controllers\Controller;
use App\Http\Resources\Leader\MemberInCellResource;
use App\Models\Cell;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Cellule courante du leader authentifié + liste paginée de ses membres.
 */
class LeaderCellController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $cellId = (int) $request->leader_cell_id;

        $cell = Cell::with([
                'leader:id,name,first_name,avatar,phone',
            ])
            ->withCount('members')
            ->findOrFail($cellId);

        return response()->json([
            'data' => [
                'id'               => $cell->id,
                'name'             => $cell->name,
                'slug'             => $cell->slug,
                'zone'             => $cell->zone,
                'description'      => $cell->description,
                'meeting_day'      => $cell->meeting_day,
                'meeting_time'     => $cell->meeting_time?->format('H:i'),
                'meeting_location' => $cell->meeting_location,
                'target_size'      => $cell->target_size,
                'whatsapp_link'    => $cell->whatsapp_link,
                'is_active'        => (bool) $cell->is_active,
                'members_count'    => $cell->members_count,
                'leader' => $cell->leader ? [
                    'id'        => $cell->leader->id,
                    'full_name' => $cell->leader->full_name,
                    'avatar'    => $cell->leader->avatar_url,
                    'phone'     => $cell->leader->phone,
                ] : null,
            ],
        ]);
    }

    /** Membres de sa cellule, paginés (cursor). */
    public function members(Request $request)
    {
        $cellId = (int) $request->leader_cell_id;

        $cell = Cell::findOrFail($cellId);

        $query = $cell->members()
            ->select('users.id', 'users.name', 'users.first_name', 'users.phone',
                     'users.avatar', 'users.city', 'users.is_baptized',
                     'users.status', 'users.joined_at')
            ->orderBy('users.name')
            ->orderBy('users.first_name');

        if ($status = $request->query('status')) {
            $query->where('users.status', $status);
        }

        $perPage = min((int) $request->query('per_page', 20), 100);
        return MemberInCellResource::collection($query->cursorPaginate($perPage));
    }
}
