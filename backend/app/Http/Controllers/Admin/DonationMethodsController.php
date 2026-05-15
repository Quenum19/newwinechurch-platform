<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DonationMethod;
use App\Rules\SafeUploadedFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * Admin — CRUD des méthodes de don affichées sur la page publique.
 */
class DonationMethodsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('view donations'), 403);

        $items = DonationMethod::ordered()->get();
        return response()->json(['data' => $items]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('view donations'), 403);

        return response()->json(['data' => DonationMethod::findOrFail($id)]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('manage donation accounts'), 403);

        $data = $this->validateData($request);
        $data['logo_path'] = $this->handleLogoUpload($request);
        $data['code'] = $data['code'] ?? Str::slug($data['name'], '_');

        $method = DonationMethod::create($data);

        return response()->json([
            'message' => 'Méthode de don créée.',
            'data'    => $method,
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage donation accounts'), 403);

        $method = DonationMethod::findOrFail($id);
        $data = $this->validateData($request, $method);

        $newLogo = $this->handleLogoUpload($request);
        if ($newLogo) {
            // Supprime l'ancien logo s'il était local
            if ($method->logo_path && Storage::disk('public')->exists($method->logo_path)) {
                Storage::disk('public')->delete($method->logo_path);
            }
            $data['logo_path'] = $newLogo;
        }

        $method->update($data);

        return response()->json([
            'message' => 'Méthode mise à jour.',
            'data'    => $method->fresh(),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage donation accounts'), 403);

        $method = DonationMethod::findOrFail($id);
        if ($method->logo_path && Storage::disk('public')->exists($method->logo_path)) {
            Storage::disk('public')->delete($method->logo_path);
        }
        $method->delete();
        return response()->json(['message' => 'Méthode supprimée.']);
    }

    public function toggle(Request $request, int $id): JsonResponse
    {
        abort_unless($request->user()?->can('manage donation accounts'), 403);

        $method = DonationMethod::findOrFail($id);
        $method->update(['is_active' => ! $method->is_active]);
        return response()->json([
            'message' => $method->is_active ? 'Activée.' : 'Désactivée.',
            'data'    => $method->fresh(),
        ]);
    }

    protected function validateData(Request $request, ?DonationMethod $existing = null): array
    {
        $codeRule = ['nullable', 'string', 'max:50', 'regex:/^[a-z][a-z0-9_]*$/'];
        if (! $existing) {
            $codeRule[] = 'unique:donation_methods,code';
        } else {
            $codeRule[] = 'unique:donation_methods,code,'.$existing->id;
        }

        return Validator::make($request->all(), [
            'name'           => ['required', 'string', 'max:100'],
            'code'           => $codeRule,
            'account_number' => ['nullable', 'string', 'max:30'],
            'recipient_name' => ['nullable', 'string', 'max:120'],
            'color_hex'      => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'instructions'   => ['nullable', 'string', 'max:2000'],
            'ussd_code'      => ['nullable', 'string', 'max:50'],
            'sort_order'     => ['nullable', 'integer', 'min:0', 'max:999'],
            'is_active'      => ['nullable', 'boolean'],
        ])->validate();
    }

    /** Upload optionnel d'un logo (PNG/JPG/SVG, max 1Mo) sur disk 'public'. */
    protected function handleLogoUpload(Request $request): ?string
    {
        if (! $request->hasFile('logo')) return null;

        $request->validate([
            // Durcissement strict via SafeUploadedFile (magic bytes + signatures interdites).
            'logo' => ['file', 'mimes:png,jpg,jpeg,svg,webp', 'max:1024',
                       new SafeUploadedFile(['png', 'jpg', 'jpeg', 'svg', 'webp'])],
        ]);

        return $request->file('logo')->store('operators', 'public');
    }
}
