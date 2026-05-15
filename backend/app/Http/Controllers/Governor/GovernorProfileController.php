<?php

namespace App\Http\Controllers\Governor;

use App\Http\Controllers\Controller;
use App\Http\Requests\Governor\UpdateGovernorProfileRequest;
use App\Http\Resources\Governor\GovernorProfileResource;
use App\Jobs\ProcessUploadedImageJob;
use App\Models\GovernorProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Profil enrichi du gouverneur authentifié (CRUD self).
 *
 * Photos : upload en temp, dispatch ProcessUploadedImageJob (resize + WebP +
 * strip EXIF). Le path final est mis à jour de manière asynchrone — l'API
 * retourne immédiatement avec le path temp pendant que le job tourne.
 */
class GovernorProfileController extends Controller
{
    /** Retourne le profil courant (création vide si pas encore créé). */
    public function show(Request $request)
    {
        $user = $request->user();
        $profile = GovernorProfile::firstOrCreate(['user_id' => $user->id]);
        return new GovernorProfileResource($profile);
    }

    /** Mise à jour du profil + dispatch jobs d'image asynchrones. */
    public function update(UpdateGovernorProfileRequest $request)
    {
        $user = $request->user();
        $data = $request->safe()->except(['photo_profile', 'banner_image']);

        $profile = DB::transaction(function () use ($user, $data, $request) {
            $profile = GovernorProfile::firstOrCreate(['user_id' => $user->id]);
            $profile->fill($data)->save();

            // === Photo profile (carré 400x400) ===
            if ($request->hasFile('photo_profile')) {
                $disk = Storage::disk(config('filesystems.default'));
                $tempPath = $request->file('photo_profile')->store(
                    'tmp-uploads/governor-photo',
                    config('filesystems.default')
                );
                ProcessUploadedImageJob::dispatch(
                    modelClass: GovernorProfile::class,
                    modelId:    $profile->id,
                    attribute:  'photo_profile',
                    tempPath:   $tempPath,
                    targetDir:  'governors/'.$user->id.'/photos',
                    maxWidth:   400,
                    maxHeight:  400,
                    fit:        'cover',
                    quality:    85,
                    oldPath:    $profile->photo_profile,
                );
            }

            // === Bannière (1200x400) ===
            if ($request->hasFile('banner_image')) {
                $tempPath = $request->file('banner_image')->store(
                    'tmp-uploads/governor-banner',
                    config('filesystems.default')
                );
                ProcessUploadedImageJob::dispatch(
                    modelClass: GovernorProfile::class,
                    modelId:    $profile->id,
                    attribute:  'banner_image',
                    tempPath:   $tempPath,
                    targetDir:  'governors/'.$user->id.'/banners',
                    maxWidth:   1200,
                    maxHeight:  400,
                    fit:        'cover',
                    quality:    85,
                    oldPath:    $profile->banner_image,
                );
            }

            return $profile;
        });

        return new GovernorProfileResource($profile->fresh());
    }
}
