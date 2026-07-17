<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Sluggable\HasSlug;
use Spatie\Sluggable\SlugOptions;

/**
 * Modèle Event — événement de l'église (culte, prière, formation...).
 */
class Event extends Model
{
    use HasFactory, HasSlug, SoftDeletes, \App\Models\Concerns\HasBilingualFields;

    /** Champs bilingues — accessibles via $event->display_title, etc. */
    protected array $bilingualFields = ['title', 'description', 'location'];

    protected $fillable = [
        'title', 'title_en',
        'slug', 'description', 'description_en', 'type',
        'location', 'location_en', 'address', 'starts_at', 'ends_at',
        'cover_image', 'max_attendees',
        'registration_required', 'registration_deadline',
        'is_online', 'online_link',
        'is_featured', 'is_published', 'created_by',
        // Billetterie (Phase 1)
        'ticketing_enabled', 'tickets_per_email_max', 'tickets_capacity',
        'tickets_closes_at', 'require_selfie', 'allow_waitlist', 'support_phone',
        // Série (Phase 5)
        'series_id', 'series_sort_order',
        // Mode paiement (Phase 7)
        'payment_mode',
    ];

    protected $casts = [
        'starts_at'             => 'datetime',
        'ends_at'               => 'datetime',
        'registration_deadline' => 'datetime',
        'max_attendees'         => 'integer',
        'registration_required' => 'boolean',
        'is_online'             => 'boolean',
        'is_featured'           => 'boolean',
        'is_published'          => 'boolean',
        'ticketing_enabled'     => 'boolean',
        'tickets_per_email_max' => 'integer',
        'tickets_capacity'      => 'integer',
        'tickets_closes_at'     => 'datetime',
        'require_selfie'        => 'boolean',
        'allow_waitlist'        => 'boolean',
    ];

    public function getSlugOptions(): SlugOptions
    {
        return SlugOptions::create()
            ->generateSlugsFrom('title')
            ->saveSlugsTo('slug');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function registrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    /** Médias (photos/vidéos) rattachés à cet événement. */
    public function media(): HasMany
    {
        return $this->hasMany(MediaGallery::class, 'event_id');
    }

    /** Tickets émis (Phase 1 billetterie). */
    public function tickets(): HasMany
    {
        return $this->hasMany(EventTicket::class);
    }

    /** Types de tickets (Phase 2 billetterie payante). */
    public function ticketTypes(): HasMany
    {
        return $this->hasMany(EventTicketType::class)->orderBy('sort_order');
    }

    /** Série parente (Phase 5) — nullable, un event peut être indépendant. */
    public function series(): BelongsTo
    {
        return $this->belongsTo(EventSeries::class, 'series_id');
    }

    public function waitlist(): HasMany
    {
        return $this->hasMany(EventTicketWaitlist::class);
    }

    /**
     * Compteur "vendus" — un ticket compte UNIQUEMENT s'il est :
     *  - en statut présentiel actif (confirmed / used)
     *  - ET en statut paiement actif (free / pending / paid)
     *
     * Les refused/expired ne comptent PAS contre la capacité (Phase 2).
     */
    public function getTicketsSoldAttribute(): int
    {
        return $this->tickets()
            ->whereIn('status', ['confirmed', 'used'])
            ->whereIn('payment_status', ['free', 'pending', 'paid'])
            ->count();
    }

    public function getTicketsRemainingAttribute(): ?int
    {
        if (! $this->tickets_capacity) return null;
        return max(0, $this->tickets_capacity - $this->tickets_sold);
    }

    public function getTicketingIsOpenAttribute(): bool
    {
        if (! $this->ticketing_enabled) return false;
        if ($this->tickets_closes_at && now()->gt($this->tickets_closes_at)) return false;
        if ($this->starts_at && now()->gt($this->starts_at)) return false;
        if ($this->tickets_capacity && $this->tickets_sold >= $this->tickets_capacity) return false;
        return true;
    }

    /** Départements rattachés à l'événement (Étape 5). */
    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class, 'event_department')->withTimestamps();
    }

    /** Staff scopé à l'event (managers + scanner_lead + scanners). */
    public function staff(): HasMany
    {
        return $this->hasMany(EventStaff::class);
    }

    /** Staff encore actif (non révoqué). */
    public function activeStaff(): HasMany
    {
        return $this->hasMany(EventStaff::class)->whereNull('revoked_at');
    }

    /** Magic-links des scanners invités externes. */
    public function guestScannerTokens(): HasMany
    {
        return $this->hasMany(GuestScannerToken::class);
    }

    // === HELPERS AUTORISATIONS ===

    /**
     * L'utilisateur possède-t-il AU MOINS ce grant sur cet event ?
     * Les rôles globaux pasteur/admin/RH sont considérés manager implicites.
     */
    public function userHasGrant(User $user, string $requiredGrant): bool
    {
        if ($user->isAdminOrPastor() || $user->hasRole('rh')) {
            return true;
        }
        $row = $this->activeStaff()->where('user_id', $user->id)->first();
        return $row?->isAtLeast($requiredGrant) ?? false;
    }

    public function userCanManage(User $user): bool
    {
        return $this->userHasGrant($user, EventStaff::GRANT_MANAGER);
    }

    public function userCanManageScanners(User $user): bool
    {
        return $this->userHasGrant($user, EventStaff::GRANT_SCANNER_LEAD);
    }

    public function userCanScan(User $user): bool
    {
        return $this->userHasGrant($user, EventStaff::GRANT_SCANNER);
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('is_published', true);
    }

    /** Événements à venir (publiés). */
    public function scopeUpcoming(Builder $q): Builder
    {
        return $q->published()->where('starts_at', '>=', now()->startOfDay())
                 ->orderBy('starts_at');
    }

    /** Événements passés (publiés). */
    public function scopePast(Builder $q): Builder
    {
        return $q->published()->where('starts_at', '<', now()->startOfDay())
                 ->orderByDesc('starts_at');
    }

    public function scopeFeatured(Builder $q): Builder
    {
        return $q->where('is_featured', true);
    }

    /** L'événement accepte-t-il encore des inscriptions ? */
    public function isRegistrationOpen(): bool
    {
        if (! $this->registration_required) return false;
        if ($this->registration_deadline && now()->gt($this->registration_deadline)) return false;
        if ($this->starts_at && now()->gt($this->starts_at)) return false;
        if ($this->max_attendees) {
            $count = $this->registrations()->where('status', 'registered')->count();
            if ($count >= $this->max_attendees) return false;
        }
        return true;
    }
}
