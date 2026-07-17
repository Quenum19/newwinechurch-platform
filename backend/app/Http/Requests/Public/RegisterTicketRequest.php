<?php

namespace App\Http\Requests\Public;

use App\Rules\SafeUploadedFile;
use Illuminate\Foundation\Http\FormRequest;

class RegisterTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Endpoint public — pas d'auth.
        return true;
    }

    public function rules(): array
    {
        return [
            'event_id'   => ['required', 'integer', 'exists:events,id'],

            // Le inscrit principal — peut acheter pour lui + d'autres personnes.
            'first_name' => ['required', 'string', 'max:80'],
            'last_name'  => ['required', 'string', 'max:80'],
            'email'      => ['required', 'email', 'max:180'],
            'phone'      => ['required', 'string', 'max:30', 'regex:/^[\d\s\+\-\(\)]+$/'],

            // Phase 1 : 1-3 tickets — Phase 2 : panier par type (cf. items[]).
            // Si items[] présent, quantity est calculé serveur-side et ignoré.
            'quantity'   => ['nullable', 'integer', 'min:1', 'max:3'],

            // Si quantity > 1, on peut nommer chaque personne (Tikerama style).
            // Sinon on duplique le inscrit principal pour chaque ticket.
            'guests'                    => ['nullable', 'array', 'max:9'], // jusqu'à 10 places total
            'guests.*.first_name'       => ['required_with:guests', 'string', 'max:80'],
            'guests.*.last_name'        => ['required_with:guests', 'string', 'max:80'],

            // === Phase 2 — panier multi-type ===
            // Si l'event a des ticket_types, le front envoie items: [{ticket_type_id, quantity}].
            'items'                     => ['nullable', 'array', 'max:5'],
            'items.*.ticket_type_id'    => ['required_with:items', 'integer', 'exists:event_ticket_types,id'],
            'items.*.quantity'          => ['required_with:items', 'integer', 'min:1', 'max:10'],

            // Selfie optionnel — seulement si l'event l'exige.
            'selfie'     => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120',
                             new SafeUploadedFile(['jpg', 'jpeg', 'png', 'webp'])],

            // Phase 3 — Opt-in WhatsApp (coché par défaut côté front).
            'whatsapp_opt_in' => ['nullable', 'boolean'],

            // Honeypot anti-bot.
            'website'    => ['nullable', 'max:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'quantity.max'       => 'Maximum 3 tickets par réservation.',
            'phone.regex'        => 'Format téléphone invalide.',
            'website.max'        => 'Erreur — réessaie.', // bot honeypot trigger
        ];
    }
}
