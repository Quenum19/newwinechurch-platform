<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Vote anonyme pour le Roi et la Reine du Bal 2026.
 *
 * Anti-triche : sha256(ip + user_agent + cookie 'nwc_vote_id').
 * Unique (event_id, voter_fingerprint) — un même fingerprint ne peut
 * pas voter deux fois pour le même event.
 */
class BalVote extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'event_ticket_id',
        'roi_candidate_id',
        'reine_candidate_id',
        'voter_fingerprint',
        'ip_address',
        'user_agent',
    ];

    /** On masque le fingerprint et l'IP dans les réponses JSON par défaut. */
    protected $hidden = [
        'voter_fingerprint',
        'ip_address',
        'user_agent',
    ];

    /** Event auquel appartient ce vote. */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    /** Candidat Roi choisi (nullable si vote uniquement pour la reine). */
    public function roi(): BelongsTo
    {
        return $this->belongsTo(BalCandidate::class, 'roi_candidate_id');
    }

    /** Candidat Reine choisie (nullable si vote uniquement pour le roi). */
    public function reine(): BelongsTo
    {
        return $this->belongsTo(BalCandidate::class, 'reine_candidate_id');
    }
}
