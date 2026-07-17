<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EventTicket extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id', 'ticket_type_id', 'order_code', 'ticket_number', 'short_code',
        'qr_payload', 'access_token',
        'first_name', 'last_name', 'email', 'phone', 'selfie_path',
        'price_fcfa',
        'status', 'used_at', 'used_by_id', 'scan_ip', 'linked_user_id',
        // Phase 2 paiement
        'payment_status', 'payment_method', 'payment_reference', 'payment_proof_path',
        'payment_validated_at', 'payment_validated_by_id', 'payment_refusal_reason',
        'payment_expires_at',
        // Phase 3 WhatsApp
        'whatsapp_opt_in', 'whatsapp_sent_at', 'whatsapp_message_id',
        'whatsapp_last_status', 'whatsapp_last_error',
        // Phase 6 remboursement
        'refunded_at', 'refunded_by_id', 'refund_reason',
        'refund_method', 'refund_reference', 'refund_amount_fcfa',
        // Phase 7 passerelle paiement
        'gateway_provider', 'gateway_transaction_id', 'gateway_payload',
    ];

    protected $casts = [
        'used_at'              => 'datetime',
        'payment_validated_at' => 'datetime',
        'payment_expires_at'   => 'datetime',
        'price_fcfa'           => 'integer',
        'whatsapp_opt_in'      => 'boolean',
        'whatsapp_sent_at'     => 'datetime',
        'refunded_at'          => 'datetime',
        'refund_amount_fcfa'   => 'integer',
        'gateway_payload'      => 'array',
    ];

    protected $hidden = ['qr_payload'];

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function usedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'used_by_id');
    }

    public function linkedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'linked_user_id');
    }

    public function ticketType(): BelongsTo
    {
        return $this->belongsTo(EventTicketType::class, 'ticket_type_id');
    }

    public function paymentValidatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'payment_validated_by_id');
    }

    public function refundedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by_id');
    }

    /** Le ticket est-il remboursé ou refusé (donc inactif) ? Utilisé par scan. */
    public function getIsRefundedAttribute(): bool
    {
        return $this->payment_status === 'refunded';
    }

    public function scopePendingPayment(Builder $q): Builder
    {
        return $q->where('payment_status', 'pending');
    }

    /** Le ticket est-il "émis" (QR/PDF/mail envoyé) ? Sinon en attente paiement. */
    public function getIsIssuedAttribute(): bool
    {
        return in_array($this->payment_status, ['free', 'paid'], true);
    }

    public function scopeConfirmed(Builder $q): Builder
    {
        return $q->where('status', 'confirmed');
    }

    public function scopeUsed(Builder $q): Builder
    {
        return $q->where('status', 'used');
    }

    /** Nom affichable du holder. */
    public function getFullNameAttribute(): string
    {
        return trim("{$this->first_name} {$this->last_name}");
    }

    /** Format affichable du short_code pour le mail/PDF. */
    public function getShortCodeFormattedAttribute(): string
    {
        return strtoupper($this->short_code);
    }
}
