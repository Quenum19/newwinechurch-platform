<?php

namespace App\Http\Controllers\Governor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Governor\MoveMemberCellRequest;
use App\Http\Resources\Admin\AdminMemberResource;
use App\Models\Cell;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Membres du département du gouverneur authentifié.
 *
 * Filtres : cell_id, search (name+email+phone), baptized, status.
 * Pagination : cursorPaginate(20) pour scalabilité mobile.
 */
class GovernorMembersController extends Controller
{
    public function index(Request $request)
    {
        $deptId = (int) $request->governor_department_id;

        $query = User::query()
            ->where('department_id', $deptId)
            ->with(['cell:id,name,zone', 'roles:id,name'])
            ->whereNull('users.deleted_at');

        // Filtre cellule.
        if ($cellId = $request->query('cell_id')) {
            $query->where('cell_id', (int) $cellId);
        }

        // Filtre statut.
        if ($status = $request->query('status')) {
            if (in_array($status, ['active', 'inactive', 'pending'])) {
                $query->where('status', $status);
            }
        }

        // Filtre baptisé.
        if ($request->has('baptized')) {
            $query->where('is_baptized', filter_var($request->query('baptized'), FILTER_VALIDATE_BOOLEAN));
        }

        // Recherche (LIKE fulltext-ish sur name+email+phone, indexes sont posés).
        if ($search = trim((string) $request->query('search'))) {
            $like = "%{$search}%";
            $query->where(function ($q) use ($like) {
                $q->where('name', 'like', $like)
                  ->orWhere('first_name', 'like', $like)
                  ->orWhere('email', 'like', $like)
                  ->orWhere('phone', 'like', $like);
            });
        }

        $query->orderBy('users.name')->orderBy('users.first_name');

        $perPage = min((int) $request->query('per_page', 20), 100);
        return AdminMemberResource::collection($query->cursorPaginate($perPage));
    }

    /** Déplacer un membre vers une autre cellule du même département. */
    public function moveToCell(MoveMemberCellRequest $request, int $userId): JsonResponse
    {
        $deptId = (int) $request->governor_department_id;
        $targetCellId = $request->input('cell_id');

        // Vérifier que le membre appartient au département du gouverneur.
        $member = User::where('id', $userId)
            ->where('department_id', $deptId)
            ->firstOrFail();

        // Vérifier que la cellule cible est dans le périmètre (leader.department_id).
        if ($targetCellId) {
            $cell = Cell::with('leader:id,department_id')->find($targetCellId);
            if (! $cell || ! $cell->leader || $cell->leader->department_id !== $deptId) {
                return response()->json([
                    'message' => 'Cette cellule n\'appartient pas à votre département.',
                ], 422);
            }
        }

        DB::transaction(function () use ($member, $targetCellId) {
            $oldCellId = $member->cell_id;

            // Mise à jour cache + pivot cell_user.
            $member->update(['cell_id' => $targetCellId]);

            if ($oldCellId) {
                DB::table('cell_user')
                    ->where('cell_id', $oldCellId)
                    ->where('user_id', $member->id)
                    ->delete();
            }
            if ($targetCellId) {
                DB::table('cell_user')->updateOrInsert(
                    ['cell_id' => $targetCellId, 'user_id' => $member->id],
                    [
                        'role'       => 'member',
                        'joined_at'  => now()->toDateString(),
                        'is_convert' => false,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }
        });

        // Invalide le cache du dashboard pour refléter la nouvelle distribution.
        \Illuminate\Support\Facades\Cache::forget(GovernorDashboardController::cacheKey($deptId));

        return response()->json([
            'message' => $targetCellId ? 'Membre déplacé.' : 'Membre retiré de toute cellule.',
        ]);
    }
}
