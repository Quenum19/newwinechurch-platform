<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuthImage;
use App\Rules\SafeUploadedFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

/**
 * Admin — CRUD des images affichées sur les pages connexion/inscription.
 */
class AuthImagesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage settings'), 403);

        return response()->json([
            'data' => AuthImage::orderBy('sort_order')->orderByDesc('id')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage settings'), 403);

        $data = $this->validateMeta($request);

        $request->validate([
            // Durcissement strict via SafeUploadedFile (magic bytes + signatures interdites).
            'image' => ['required', 'file', 'mimes:jpeg,jpg,png,webp', 'max:5120',
                        new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
        ]);

        $data['path']       = $request->file('image')->store('auth-hero', 'public');
        $data['created_by'] = $request->user()->id;

        $image = AuthImage::create($data + ['is_active' => true]);

        return response()->json(['message' => 'Image ajoutée.', 'data' => $image], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage settings'), 403);

        $image = AuthImage::findOrFail($id);
        $data  = $this->validateMeta($request);

        if ($request->hasFile('image')) {
            $request->validate([
                // Durcissement strict via SafeUploadedFile (magic bytes + signatures interdites).
                'image' => ['file', 'mimes:jpeg,jpg,png,webp', 'max:5120',
                            new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],
            ]);
            if ($image->path && Storage::disk('public')->exists($image->path)) {
                Storage::disk('public')->delete($image->path);
            }
            $data['path'] = $request->file('image')->store('auth-hero', 'public');
        }

        $image->update($data);

        return response()->json(['message' => 'Image mise à jour.', 'data' => $image->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage settings'), 403);

        $image = AuthImage::findOrFail($id);
        if ($image->path && Storage::disk('public')->exists($image->path)) {
            Storage::disk('public')->delete($image->path);
        }
        $image->delete();
        return response()->json(['message' => 'Image supprimée.']);
    }

    public function toggle(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage settings'), 403);

        $image = AuthImage::findOrFail($id);
        $image->update(['is_active' => ! $image->is_active]);
        return response()->json([
            'message' => $image->is_active ? 'Activée.' : 'Désactivée.',
            'data'    => $image->fresh(),
        ]);
    }

    protected function validateMeta(Request $request): array
    {
        return Validator::make($request->all(), [
            'title'      => ['nullable', 'string', 'max:160'],
            'verse_ref'  => ['nullable', 'string', 'max:60'],
            'verse_text' => ['nullable', 'string', 'max:600'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:999'],
            'is_active'  => ['nullable', 'boolean'],
        ])->validate();
    }
}
