<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsStorageUrls;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * MediaGalleryResource — expose un média (photo ou vidéo) avec son URL ABSOLUE.
 *
 * Sans ce Resource, file_path était envoyé tel quel (chemin relatif) et le
 * frontend (sur newinechurch.org) le préfixait avec /storage/ → résolu sur la
 * mauvaise origine → 404. Maintenant on retourne une URL résolue vers
 * api.newinechurch.org/storage/... directement consommable côté SPA.
 */
class MediaGalleryResource extends JsonResource
{
    use FormatsStorageUrls;

    public function toArray(Request $request): array
    {
        return [
            'id'            => $this->id,
            'title'         => $this->title,
            'description'   => $this->description,
            // URL ABSOLUE — cohérent avec EventResource, SermonResource, etc.
            'file_path'     => $this->fullStorageUrl($this->file_path),
            'thumbnail'     => $this->fullStorageUrl($this->thumbnail),
            'file_type'     => $this->file_type,
            'file_size'     => $this->file_size,
            'is_published'  => (bool) $this->is_published,
            'is_featured'   => (bool) $this->is_featured,
            'sort_order'    => (int) $this->sort_order,
            'created_at'    => $this->created_at?->toIso8601String(),

            'event' => $this->whenLoaded('event', fn () => $this->event ? [
                'id'    => $this->event->id,
                'title' => $this->event->title,
                'slug'  => $this->event->slug,
            ] : null),

            'department' => $this->whenLoaded('department', fn () => $this->department ? [
                'id'    => $this->department->id,
                'name'  => $this->department->name,
                'slug'  => $this->department->slug,
            ] : null),

            'uploader' => $this->whenLoaded('uploader', fn () => $this->uploader ? [
                'id'   => $this->uploader->id,
                'name' => trim(($this->uploader->first_name ?? '').' '.($this->uploader->name ?? '')) ?: null,
            ] : null),
        ];
    }
}
