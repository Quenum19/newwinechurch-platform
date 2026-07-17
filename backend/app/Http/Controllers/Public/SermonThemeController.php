<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\SermonThemeResource;
use App\Models\SermonTheme;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Catalogue public des thèmes (utilisé par les filtres de la page Messages).
 * Retourne uniquement les thèmes qui ont au moins un sermon publié, triés
 * par popularité — pour ne pas montrer des tags vides au visiteur.
 */
class SermonThemeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $themes = SermonTheme::query()
            ->withCount(['sermons' => fn ($q) => $q->where('is_published', true)])
            ->having('sermons_count', '>', 0)
            ->orderByDesc('sermons_count')
            ->orderBy('name')
            ->get();

        return SermonThemeResource::collection($themes);
    }
}
