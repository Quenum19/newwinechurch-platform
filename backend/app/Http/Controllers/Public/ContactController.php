<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreContactMessageRequest;
use App\Models\ContactMessage;
use Illuminate\Http\JsonResponse;

class ContactController extends Controller
{
    /**
     * Réception d'un nouveau message du formulaire de contact.
     * Le message est stocké en base et visible dans /admin/contact.
     */
    public function store(StoreContactMessageRequest $request): JsonResponse
    {
        $message = ContactMessage::create($request->validated());

        // TODO Phase 8 : envoyer notification email à l'admin (queue).

        return response()->json([
            'message' => 'Message bien reçu. Nous reviendrons vers vous rapidement.',
            'id'      => $message->id,
        ], 201);
    }
}
