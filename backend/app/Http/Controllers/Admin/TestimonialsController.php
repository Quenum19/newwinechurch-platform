<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\TestimonialResource;
use App\Models\Testimonial;
use App\Rules\SafeUploadedFile;
use App\Traits\HandlesImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class TestimonialsController extends Controller
{
    use HandlesImageUpload;

    public function index(Request $request): AnonymousResourceCollection
    {
        abort_unless($request->user()?->can('manage testimonials'), 403);

        $perPage = min((int) $request->query('per_page', 20), 100);

        $query = Testimonial::query()->with('user:id,name,first_name');

        if ($request->boolean('trashed')) $query->onlyTrashed();
        if ($status = $request->query('status')) {
            $query->where('is_published', $status === 'published');
        }
        if ($search = trim((string) $request->query('search'))) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('quote', 'like', "%{$search}%")
                  ->orWhere('role', 'like', "%{$search}%");
            });
        }

        $query->orderBy('sort_order')->orderByDesc('created_at');

        return TestimonialResource::collection($query->paginate($perPage));
    }

    public function show(Request $request, int $id): TestimonialResource
    {
        abort_unless($request->user()?->can('manage testimonials'), 403);
        $testimonial = Testimonial::withTrashed()->findOrFail($id);
        return new TestimonialResource($testimonial);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage testimonials'), 403);

        $data = $this->validateData($request);
        $testimonial = Testimonial::create($data);
        $this->handleUploads($request, $testimonial);

        return response()->json([
            'message' => 'Témoignage créé.',
            'data'    => new TestimonialResource($testimonial->fresh()),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage testimonials'), 403);

        $testimonial = Testimonial::findOrFail($id);
        $data = $this->validateData($request, $id);

        $testimonial->fill($data)->save();
        $this->handleUploads($request, $testimonial);

        return response()->json([
            'message' => 'Témoignage mis à jour.',
            'data'    => new TestimonialResource($testimonial->fresh()),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage testimonials'), 403);

        $testimonial = Testimonial::findOrFail($id);

        // Soft delete par défaut ; les fichiers restent jusqu'à purge manuelle.
        $testimonial->delete();
        return response()->json(['message' => 'Témoignage archivé.']);
    }

    public function bulk(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage testimonials'), 403);
        $request->validate([
            'action' => ['required', 'in:publish,unpublish,feature,unfeature,delete'],
            'ids'    => ['required', 'array', 'min:1', 'max:200'],
            'ids.*'  => ['integer'],
        ]);
        $ids = $request->input('ids');
        $a = $request->input('action');
        $count = match ($a) {
            'publish'   => Testimonial::whereIn('id', $ids)->update(['is_published' => true]),
            'unpublish' => Testimonial::whereIn('id', $ids)->update(['is_published' => false]),
            'feature'   => Testimonial::whereIn('id', $ids)->update(['is_featured' => true]),
            'unfeature' => Testimonial::whereIn('id', $ids)->update(['is_featured' => false]),
            'delete'    => Testimonial::whereIn('id', $ids)->delete(),
        };
        $labels = ['publish' => 'publié(s)', 'unpublish' => 'dépublié(s)', 'feature' => 'mis en avant', 'unfeature' => 'retiré(s) de la mise en avant', 'delete' => 'archivé(s)'];
        return response()->json(['message' => "$count témoignage(s) " . $labels[$a] . '.', 'count' => $count]);
    }

    public function togglePublish(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage testimonials'), 403);
        $t = Testimonial::findOrFail($id);
        $t->update(['is_published' => ! $t->is_published]);
        return response()->json([
            'message' => $t->is_published ? 'Témoignage publié.' : 'Témoignage dépublié.',
            'data'    => new TestimonialResource($t->fresh()),
        ]);
    }

    private function validateData(Request $request, ?int $ignoreId = null): array
    {
        $imageRule = new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp']);

        return $request->validate([
            'name'         => ['required', 'string', 'max:100'],
            'age'          => ['nullable', 'integer', 'min:1', 'max:120'],
            'role'         => ['nullable', 'string', 'max:150'],
            'location'     => ['nullable', 'string', 'max:100'],
            'quote'        => ['required', 'string', 'max:2000'],
            'video_url'    => ['nullable', 'url', 'max:500'],
            'is_published' => ['nullable', 'boolean'],
            'is_featured'  => ['nullable', 'boolean'],
            'sort_order'   => ['nullable', 'integer', 'min:0', 'max:9999'],
            'user_id'      => ['nullable', 'integer', 'exists:users,id'],
            // Photo de la personne (jusqu'à 10 Mo)
            'image_file'   => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240', $imageRule],
            // Vidéo uploadée (jusqu'à 200 Mo — un témoignage > 5 min serait rare et trop long).
            'video_file'   => ['nullable', 'file', 'mimes:mp4,mov,webm,m4v', 'max:204800'],
        ]);
    }

    private function handleUploads(Request $request, Testimonial $testimonial): void
    {
        if ($request->hasFile('image_file')) {
            $this->processAndStoreImage(
                model: $testimonial,
                file: $request->file('image_file'),
                attribute: 'image_path',
                targetDir: 'testimonials/photos',
                options: ['max_width' => 800, 'max_height' => 800, 'fit' => 'cover'],
            );
        }

        if ($request->hasFile('video_file')) {
            $disk = Storage::disk(config('filesystems.default'));
            $file = $request->file('video_file');
            $path = sprintf(
                'testimonials/videos/%s.%s',
                bin2hex(random_bytes(16)),
                strtolower($file->getClientOriginalExtension() ?: 'mp4'),
            );
            $disk->put($path, file_get_contents($file->getRealPath()), ['visibility' => 'public']);

            // Si on uploade une nouvelle vidéo, on retire l'URL externe (exclusifs).
            $testimonial->update(['video_path' => $path, 'video_url' => null]);
        }
    }
}
