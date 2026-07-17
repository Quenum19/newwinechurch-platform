<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaGalleryResource;
use App\Models\MediaGallery;
use App\Rules\SafeUploadedFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Intervention\Image\Drivers\Gd\Driver as GdDriver;
use Intervention\Image\Encoders\WebpEncoder;
use Intervention\Image\ImageManager;

/**
 * Admin → Galerie médias (photos/vidéos publiques).
 *
 * Drag-drop multi-upload : on accepte une liste de fichiers, on stocke chaque
 * fichier dans tmp-uploads/, on dispatch un ProcessUploadedImageJob par fichier
 * (queue → traitement parallèle scalable).
 *
 * Pour les vidéos, on les stocke directement (pas de transcodage côté Phase 6 —
 * idéalement on les pousse vers un service externe type Mux/Cloudflare Stream
 * en Phase 8).
 */
class MediaGalleryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('view gallery'), 403);

        $perPage = min((int) $request->query('per_page', 36), 200);

        $query = MediaGallery::query()
            ->with([
                'event:id,title,slug',
                'department:id,name,slug',
                'uploader:id,name,first_name',
            ])
            ->latest();

        if ($type = $request->query('file_type')) {
            $query->where('file_type', $type);
        }
        if ($eventId = $request->query('event_id')) {
            $query->where('event_id', $eventId);
        }
        if ($deptId = $request->query('department_id')) {
            $query->where('department_id', $deptId);
        }
        if ($request->has('published')) {
            $query->where('is_published', $request->boolean('published'));
        }

        return MediaGalleryResource::collection($query->paginate($perPage));
    }

    /**
     * Upload multi-fichiers.
     * Body : multipart/form-data avec files[] (jusqu'à 20 fichiers/requête).
     */
    public function uploadBatch(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('upload media'), 403);

        // Durcissement images : on applique SafeUploadedFile uniquement aux fichiers
        // détectés comme image (les conteneurs vidéo type mp4 peuvent contenir des
        // octets `MZ` en début de stream et déclencher des faux positifs).
        $safeImageRule = new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp', 'gif']);

        $request->validate([
            'files'   => ['required', 'array', 'min:1', 'max:20'],
            // Limites larges : photos jusqu'à 30 Mo, vidéos jusqu'à 300 Mo
            // (la borne effective est aussi conditionnée par php.ini upload_max_filesize).
            'files.*' => ['file',
                          'mimes:jpg,jpeg,png,webp,gif,heic,heif,mp4,mov,webm,m4v',
                          'max:307200',
                          // SafeUploadedFile conditionnelle : seulement pour images.
                          function (string $attribute, mixed $value, \Closure $fail) use ($safeImageRule) {
                              if (! $value instanceof \Illuminate\Http\UploadedFile) return;
                              $mime = $value->getMimeType() ?? '';
                              if (str_starts_with($mime, 'image/')) {
                                  // Exclut heic/heif (pas dans la MAP) : pour ces formats on
                                  // se contente du mimes: + max: ci-dessus, sinon la rule
                                  // les rejette systématiquement.
                                  $ext = strtolower($value->getClientOriginalExtension());
                                  if (in_array($ext, ['heic', 'heif'], true)) return;
                                  $safeImageRule->validate($attribute, $value, $fail);
                              }
                          },
                         ],
            'event_id'      => ['nullable', 'integer', 'exists:events,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'title'         => ['nullable', 'string', 'max:200'],
            'description'   => ['nullable', 'string', 'max:1000'],
        ]);

        $eventId = $request->input('event_id');
        $deptId  = $request->input('department_id');
        $title   = $request->input('title');
        $desc    = $request->input('description');

        $disk = Storage::disk(config('filesystems.default'));
        $created = [];

        foreach ($request->file('files') as $file) {
            $isImage = str_starts_with($file->getMimeType() ?? '', 'image/');
            $type    = $isImage ? 'image' : 'video';
            $targetDir = $eventId ? "gallery/event-{$eventId}" : 'gallery/general';

            try {
                if ($isImage) {
                    // === Traitement IMAGE en synchrone ===
                    // Intervention Image v4 : ImageManager(driver)->decode($path) puis encode(WebpEncoder).
                    // En sync (pas de queue) on évite les états transitoires "tmp-uploads"
                    // qui faisaient "casser" l'image entre 2 uploads.
                    $manager = new ImageManager(new GdDriver());
                    $image   = $manager->decode($file->getRealPath());
                    $image->scaleDown(2000, 2000);
                    $webp    = (string) $image->encode(new WebpEncoder(quality: 88));

                    $finalPath = sprintf('%s/%s.webp', $targetDir, bin2hex(random_bytes(16)));
                    $disk->put($finalPath, $webp, ['visibility' => 'public']);

                    $media = MediaGallery::create([
                        'title'        => $title,
                        'description'  => $desc,
                        'file_path'    => $finalPath,
                        'file_type'    => 'image',
                        'file_size'    => strlen($webp),
                        'event_id'      => $eventId,
                        'department_id' => $deptId,
                        'uploaded_by'   => $request->user()->id,
                        'is_published'  => true,
                    ]);
                } else {
                    // === Vidéo : copie directe vers le dossier final ===
                    $videoDir = $eventId ? "gallery/event-{$eventId}/videos" : 'gallery/videos';
                    $finalPath = sprintf(
                        '%s/%s.%s',
                        $videoDir,
                        bin2hex(random_bytes(16)),
                        strtolower($file->getClientOriginalExtension() ?: 'mp4'),
                    );
                    $disk->put($finalPath, file_get_contents($file->getRealPath()), ['visibility' => 'public']);

                    $media = MediaGallery::create([
                        'title'        => $title,
                        'description'  => $desc,
                        'file_path'    => $finalPath,
                        'file_type'    => 'video',
                        'file_size'    => $file->getSize(),
                        'event_id'      => $eventId,
                        'department_id' => $deptId,
                        'uploaded_by'   => $request->user()->id,
                        'is_published'  => true,
                    ]);
                }

                $created[] = $media->id;
            } catch (\Throwable $e) {
                // Continue avec les autres fichiers si l'un échoue (ex: image corrompue).
                \Illuminate\Support\Facades\Log::warning('Media upload failed', [
                    'name'  => $file->getClientOriginalName(),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        // 200 maintenant (pas 202) car le traitement est terminé en sortie de boucle.
        return response()->json([
            'message' => count($created).' média(s) ajouté(s).',
            'ids'     => $created,
        ], 200);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('delete media'), 403);

        $media = MediaGallery::findOrFail($id);

        // Supprime le fichier physique.
        if ($media->file_path && ! str_starts_with($media->file_path, 'http')) {
            Storage::disk(config('filesystems.default'))->delete($media->file_path);
        }
        if ($media->thumbnail) {
            Storage::disk(config('filesystems.default'))->delete($media->thumbnail);
        }

        $media->delete();
        return response()->json(['message' => 'Média supprimé.']);
    }

    public function togglePublish(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('upload media'), 403);
        $media = MediaGallery::findOrFail($id);
        $media->update(['is_published' => ! $media->is_published]);
        return response()->json([
            'message' => $media->is_published ? 'Publié.' : 'Dépublié.',
        ]);
    }

    /**
     * Actions en lot sur plusieurs médias.
     *
     * Body : { action, ids: [int], payload?: object }
     * Actions :
     *   - delete       → suppression définitive + fichiers physiques
     *   - publish      → is_published = true
     *   - unpublish    → is_published = false
     *   - attach_event → met event_id (payload.event_id, null pour détacher)
     *   - attach_dept  → met department_id (payload.department_id, null pour détacher)
     *
     * Limité à 200 IDs par appel pour borner le coût de fichiers à supprimer.
     */
    public function bulk(Request $request): JsonResponse
    {
        $request->validate([
            'action'                 => ['required', 'string', 'in:delete,publish,unpublish,attach_event,attach_dept'],
            'ids'                    => ['required', 'array', 'min:1', 'max:200'],
            'ids.*'                  => ['integer', 'exists:media_gallery,id'],
            'payload'                => ['nullable', 'array'],
            'payload.event_id'       => ['nullable', 'integer', 'exists:events,id'],
            'payload.department_id'  => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        $user   = $request->user();
        $action = $request->input('action');
        $ids    = $request->input('ids');

        // Vérif permissions selon l'action (granulaire).
        $permission = match ($action) {
            'delete'                              => 'delete media',
            'publish', 'unpublish', 'attach_event', 'attach_dept' => 'upload media',
        };
        abort_unless($user?->can($permission), 403);

        $query = MediaGallery::whereIn('id', $ids);
        $count = 0;

        switch ($action) {
            case 'delete':
                $disk = Storage::disk(config('filesystems.default'));
                foreach ($query->get() as $media) {
                    if ($media->file_path && ! str_starts_with($media->file_path, 'http')) {
                        $disk->delete($media->file_path);
                    }
                    if ($media->thumbnail) {
                        $disk->delete($media->thumbnail);
                    }
                    $media->delete();
                    $count++;
                }
                return response()->json([
                    'message' => "$count média(s) supprimé(s).",
                    'count'   => $count,
                ]);

            case 'publish':
                $count = $query->update(['is_published' => true]);
                return response()->json(['message' => "$count média(s) publié(s).", 'count' => $count]);

            case 'unpublish':
                $count = $query->update(['is_published' => false]);
                return response()->json(['message' => "$count média(s) dépublié(s).", 'count' => $count]);

            case 'attach_event':
                $eventId = $request->input('payload.event_id'); // null = détacher
                $count = $query->update(['event_id' => $eventId]);
                $msg = $eventId
                    ? "$count média(s) rattaché(s) à l'événement."
                    : "$count média(s) détaché(s) de leur événement.";
                return response()->json(['message' => $msg, 'count' => $count]);

            case 'attach_dept':
                $deptId = $request->input('payload.department_id');
                $count = $query->update(['department_id' => $deptId]);
                $msg = $deptId
                    ? "$count média(s) rattaché(s) au département."
                    : "$count média(s) détaché(s) de leur département.";
                return response()->json(['message' => $msg, 'count' => $count]);
        }

        return response()->json(['message' => 'Action inconnue.'], 400);
    }
}
