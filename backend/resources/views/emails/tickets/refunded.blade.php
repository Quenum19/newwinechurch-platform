@extends('emails.layouts.nwc')

@section('content')

<h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#C9A84C;margin:0 0 8px;text-align:center;">
  @if($isPaid)Remboursement émis@else Annulation confirmée@endif
</h1>
<p style="text-align:center;font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 24px;">
  Pour ta commande <strong>{{ $ticket->order_code }}</strong> · {{ $event->title }}
</p>

{{-- Détails refund --}}
<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:18px;">
  <tr><td style="padding:18px 20px;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.5);">
      Raison
    </p>
    <p style="margin:0;font-size:14px;color:#fff;line-height:1.5;">
      {{ $reason }}
    </p>
  </td></tr>
</table>

@if($isPaid && $ticket->refund_amount_fcfa)
<table width="100%" cellpadding="0" cellspacing="0" style="background:#C9A84C;border-radius:8px;margin-bottom:18px;">
  <tr><td style="padding:18px 20px;color:#0A0908;">
    <p style="margin:0;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;">Montant remboursé</p>
    <p style="margin:6px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:32px;">
      {{ number_format($ticket->refund_amount_fcfa, 0, ',', ' ') }} <span style="font-size:16px;font-family:monospace;">FCFA</span>
    </p>
    @if($ticket->refund_method)
      <p style="margin:8px 0 0;font-size:13px;">
        Via <strong>{{ ucfirst(str_replace('_', ' ', $ticket->refund_method)) }}</strong>
        @if($ticket->refund_reference) · ref. <span style="font-family:monospace;">{{ $ticket->refund_reference }}</span>@endif
      </p>
    @endif
  </td></tr>
</table>

<p style="font-size:13px;color:rgba(255,255,255,0.8);line-height:1.6;margin:0 0 18px;">
  Le transfert a été envoyé sur le numéro utilisé lors de ton inscription
  (<span style="font-family:monospace;">{{ $ticket->phone }}</span>).
  Si tu ne vois rien après 24h, contacte-nous.
</p>
@else
<p style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.6;margin:0 0 18px;">
  Ton inscription a été annulée. Aucun frais n'avait été perçu.
</p>
@endif

@if($event->support_phone)
  <p style="text-align:center;margin:28px 0;">
    <a href="tel:{{ $event->support_phone }}"
       style="display:inline-block;padding:14px 32px;background:#C9A84C;color:#0A0908;font-weight:bold;text-decoration:none;border-radius:6px;font-size:14px;letter-spacing:1px;">
      📞 NOUS APPELER
    </a>
  </p>
  <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.5);margin:0;">
    {{ $event->support_phone }}
  </p>
@endif

@endsection
