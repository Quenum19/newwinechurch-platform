<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\MediaGallery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Endpoint public — galerie photos/vidéos.
 *
 * Étape 5 : ajout du filtre `?department={slug}` pour la galerie filtrée
 * par département.
 */
class MediaGalleryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $perPage = min((int) $request->query('per_page', 24), 100);

        $query = MediaGallery::query()
            ->where('is_published', true)
            ->latest();

        if ($type = $request->query('file_type')) {
            $query->where('file_type', $type);
        }

        // Filtre par département via slug (canonique côté frontend).
        if ($deptSlug = $request->query('department')) {
            $dept = Department::where('slug', $deptSlug)->first();
            if ($dept) {
                $query->where('department_id', $dept->id);
            } else {
                $query->where('id', 0); // slug invalide → zéro résultat sans 404
            }
        }

        return JsonResource::collection($query->paginate($perPage));
    }
}
