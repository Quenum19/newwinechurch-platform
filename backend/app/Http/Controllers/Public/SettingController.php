<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\JsonResponse;

class SettingController extends Controller
{
    /**
     * Renvoie l'ensemble des settings publics du site,
     * groupés par préfixe (identity, contact, branding, social, donation, live).
     *
     * Le frontend les charge au montage de l'app pour le footer, les boutons
     * Mobile Money, les liens sociaux, etc.
     */
    public function index(): JsonResponse
    {
        $flat = SiteSetting::publicSettings();

        // Regroupement plat → arborescent : ['contact' => ['email' => '...', ...], ...]
        $tree = [];
        foreach ($flat as $key => $value) {
            [$group, $field] = array_pad(explode('.', $key, 2), 2, null);
            if ($field) {
                $tree[$group][$field] = $value;
            } else {
                $tree[$group] = $value;
            }
        }

        return response()->json($tree);
    }
}
