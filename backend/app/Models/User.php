<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Permission\Traits\HasRoles;

/**
 * Modèle User étendu pour New Wine Church.
 *
 * Refonte Étape 1 :
 *  - Ajout cell_id / department_id (cache appartenance principale).
 *  - Flags is_governor / is_cell_leader pour scoping rapide.
 *  - notification_preferences (JSON) pour préférences canal/module.
 *  - Relations vers GovernorProfile, mandats historiques, présences cellule.
 */
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens, HasRoles, SoftDeletes, LogsActivity;

    /** Spatie ActivityLog : trace les changements sensibles. */
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly([
                'name', 'first_name', 'email', 'phone', 'status', 'is_baptized',
                'is_governor', 'is_cell_leader', 'department_id', 'cell_id',
            ])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs()
            ->setDescriptionForEvent(fn ($event) => "Membre {$event}");
    }

    /**
     * Champs assignables en masse (mass assignment).
     */
    /**
     * ⚠️ SÉCURITÉ : `is_governor` et `is_cell_leader` NE SONT PAS en $fillable
     * intentionnellement pour éviter les élévations de privilège via mass
     * assignment (ex: PUT /me { "is_governor": true } serait rejeté par
     * validation MAIS un dev futur pourrait utiliser $request->all() par erreur).
     *
     * Ces flags ne s'assignent QUE via forceFill() explicite dans les
     * controllers d'admin après vérification de rôle.
     */
    protected $fillable = [
        'name', 'first_name', 'email', 'password', 'phone',
        'avatar', 'birth_date', 'gender', 'address', 'city', 'bio',
        'status', 'is_baptized', 'joined_at',
        // Refonte Étape 1 — appartenance département / cellule (dérive du rôle).
        'department_id', 'cell_id',
        'last_active_at', 'notification_preferences',
        // Fiche membre NWC étendue (profil complet, rempli après inscription).
        'profession', 'education_level', 'residence_area',
        'congregation', 'mountain', 'mentor_name',
        'emergency_contact_name', 'emergency_contact_phone',
        // Force changement de mot de passe à la 1re connexion (workflow admission).
        'must_change_password',
    ];

    /**
     * Champs masqués lors de la sérialisation JSON (jamais exposés à l'API).
     */
    protected $hidden = [
        'password', 'remember_token',
    ];

    /**
     * Conversions automatiques d'attributs.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'        => 'datetime',
            'password'                 => 'hashed',
            'birth_date'               => 'date',
            'joined_at'                => 'date',
            'is_baptized'              => 'boolean',
            'is_governor'              => 'boolean',
            'is_cell_leader'           => 'boolean',
            'last_active_at'           => 'datetime',
            'notification_preferences' => 'array',
            'must_change_password'     => 'boolean',
        ];
    }

    /**
     * Accesseur : notification_preferences défaut [] (l'application traite tjs
     * cette valeur comme un array, jamais null — cross-DB compat).
     */
    public function getNotificationPreferencesAttribute($value): array
    {
        if ($value === null) return [];
        if (is_array($value)) return $value;
        return json_decode((string) $value, true) ?? [];
    }

    /**
     * Le nom complet à afficher (prénom + nom si dispo, sinon name).
     */
    public function getFullNameAttribute(): string
    {
        return trim(($this->first_name ?? '').' '.($this->name ?? ''));
    }

    /**
     * URL absolue de l'avatar (ou null si non défini).
     * L'avatar est stocké en chemin relatif (ex: "avatars/abc.webp") sur
     * le disque "public" — accessible via /storage/avatars/abc.webp.
     */
    public function getAvatarUrlAttribute(): ?string
    {
        if (! $this->avatar) return null;
        // Chemin déjà absolu (URL S3 ou autre) → on retourne tel quel.
        if (str_starts_with($this->avatar, 'http')) return $this->avatar;
        return asset('storage/'.ltrim($this->avatar, '/'));
    }

    // === RELATIONS LEGACY (pivots multi-appartenance) ===

    public function departments(): BelongsToMany
    {
        return $this->belongsToMany(Department::class, 'department_user')
                    ->withPivot('role', 'joined_at')
                    ->withTimestamps();
    }

    public function cells(): BelongsToMany
    {
        return $this->belongsToMany(Cell::class, 'cell_user')
                    ->withPivot('role', 'joined_at', 'is_convert')
                    ->withTimestamps();
    }

    /** Cellules dont l'utilisateur est le leader principal (cache). */
    public function ledCells(): HasMany
    {
        return $this->hasMany(Cell::class, 'leader_id');
    }

    /** Départements dont l'utilisateur est gouverneur principal (cache). */
    public function governedDepartments(): HasMany
    {
        return $this->hasMany(Department::class, 'governor_id');
    }

    // === RELATIONS DIRECTES (cache) ===

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function cell(): BelongsTo
    {
        return $this->belongsTo(Cell::class);
    }

    // === RELATIONS ÉTAPE 1 ===

    /** Profil gouverneur (1-1, existe seulement si is_governor). */
    public function governorProfile(): HasOne
    {
        return $this->hasOne(GovernorProfile::class);
    }

    /** Historique des mandats gouverneur. */
    public function governorAppointments(): HasMany
    {
        return $this->hasMany(DepartmentGovernor::class);
    }

    /** Historique des mandats leader de cellule. */
    public function cellLeaderAppointments(): HasMany
    {
        return $this->hasMany(CellLeader::class);
    }

    /** Rapports de département soumis. */
    public function departmentReports(): HasMany
    {
        return $this->hasMany(DepartmentReport::class, 'governor_id');
    }

    /** Rapports de cellule soumis. */
    public function cellReports(): HasMany
    {
        return $this->hasMany(CellReport::class, 'leader_id');
    }

    /** Présences enregistrées (en tant que membre). */
    public function attendances(): HasMany
    {
        return $this->hasMany(CellAttendance::class, 'member_id');
    }

    public function donations(): HasMany
    {
        return $this->hasMany(Donation::class);
    }

    public function eventRegistrations(): HasMany
    {
        return $this->hasMany(EventRegistration::class);
    }

    /** Grants event-scopés (Étape A rôles billetterie). */
    public function eventStaff(): HasMany
    {
        return $this->hasMany(EventStaff::class);
    }

    /** Magic-link scanners invités créés par ce user. */
    public function guestScannerTokensCreated(): HasMany
    {
        return $this->hasMany(GuestScannerToken::class, 'created_by_id');
    }

    public function prayerRequests(): HasMany
    {
        return $this->hasMany(PrayerRequest::class);
    }

    // === HELPERS RÔLES & SCOPE (Étape 3) ===

    /**
     * Indique si l'utilisateur a un mandat ouvert de gouverneur sur ce département.
     * Utilisé par les Channels Reverb pour autoriser l'écoute.
     */
    public function isGovernorOf(int $departmentId): bool
    {
        if (! $this->is_governor) return false;
        return $this->governorAppointments()
                    ->where('department_id', $departmentId)
                    ->whereNull('ended_at')
                    ->exists();
    }

    /** Mandat ouvert de leader sur cette cellule. */
    public function isCellLeaderOf(int $cellId): bool
    {
        if (! $this->is_cell_leader) return false;
        return $this->cellLeaderAppointments()
                    ->where('cell_id', $cellId)
                    ->whereNull('ended_at')
                    ->exists();
    }

    /** Rôles transverses staff. */
    public function isAdminOrPastor(): bool
    {
        return $this->hasAnyRole(['superadmin', 'pasteur', 'admin']);
    }

    /**
     * Préférences notification effectives, fusionnées avec les défauts NWC.
     * Permet aux Notifications via() de filtrer les canaux selon les
     * préférences user.
     */
    public function notificationChannels(string $category, string $channel): bool
    {
        $prefs = $this->notification_preferences ?? [];
        // Défauts : tout activé sauf SMS (pas configuré).
        $defaults = [
            'reports'    => ['email' => true, 'broadcast' => true, 'sms' => false],
            'attendance' => ['email' => false, 'broadcast' => true, 'sms' => false],
            'digest'     => ['email' => true, 'broadcast' => false, 'sms' => false],
            'appointment'=> ['email' => true, 'broadcast' => true, 'sms' => false],
        ];
        $merged = array_replace_recursive($defaults, $prefs);
        return (bool) ($merged[$category][$channel] ?? false);
    }

    // === SCOPES ===

    public function scopeActive(Builder $q): Builder
    {
        return $q->where('status', 'active');
    }

    public function scopeGovernors(Builder $q): Builder
    {
        return $q->where('is_governor', true);
    }

    public function scopeCellLeaders(Builder $q): Builder
    {
        return $q->where('is_cell_leader', true);
    }
}
