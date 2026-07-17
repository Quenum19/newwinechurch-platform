@extends('emails.layouts.nwc')

@section('content')

<h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#C9A84C;margin:0 0 8px;text-align:center;">
  Merci pour ta commande !
</h1>
<p style="text-align:center;font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 24px;">
  Reçue · en attente de paiement Mobile Money
</p>

{{-- Event card --}}
<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;margin-bottom:24px;">
  <tr><td style="padding:18px 20px;">
    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#C9A84C;margin:0 0 4px;">
      {{ $event->title }}
    </p>
    @if($event->starts_at)
      <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:0;">
        {{ $event->starts_at->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH[h]mm') }}
        @if($event->location) · {{ $event->location }}@endif
      </p>
    @endif
  </td></tr>
</table>

{{-- Récap commande --}}
<p style="font-size:13px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin:0 0 6px;">
  N° de commande
</p>
<p style="font-family:monospace;font-size:20px;color:#fff;letter-spacing:3px;margin:0 0 18px;">
  {{ $orderCode }}
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:18px;">
  @foreach($tickets as $t)
    <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
      <td style="padding:8px 0;font-size:13px;color:rgba(255,255,255,0.85);">
        {{ $t->full_name }}
        @if($t->ticketType) <span style="color:#C9A84C;">— {{ $t->ticketType->name }}</span>@endif
      </td>
      <td style="padding:8px 0;font-size:13px;text-align:right;color:#fff;font-family:monospace;">
        {{ number_format($t->price_fcfa, 0, ',', ' ') }} FCFA
      </td>
    </tr>
  @endforeach
  <tr>
    <td style="padding:12px 0 4px;font-size:14px;font-weight:bold;color:#fff;text-transform:uppercase;">Total</td>
    <td style="padding:12px 0 4px;font-size:18px;text-align:right;color:#C9A84C;font-family:monospace;font-weight:bold;">
      {{ number_format($totalFcfa, 0, ',', ' ') }} FCFA
    </td>
  </tr>
</table>

{{-- Instructions paiement --}}
<table width="100%" cellpadding="0" cellspacing="0" style="background:#C9A84C;border-radius:8px;margin-bottom:24px;">
  <tr><td style="padding:18px 20px;color:#0A0908;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;font-weight:bold;">
      💳 Étapes pour valider ta commande
    </p>
    <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.7;">
      <li>Envoie <strong>{{ number_format($totalFcfa, 0, ',', ' ') }} FCFA</strong> via Mobile Money à un des numéros ci-dessous</li>
      <li>En motif/référence, indique : <strong>{{ $orderCode }}</strong></li>
      <li>L'équipe NWC valide ton paiement (généralement &lt; 2h en journée)</li>
      <li>Tu reçois ton ticket avec QR par email — c'est tout !</li>
    </ol>
  </td></tr>
</table>

{{-- Méthodes Mobile Money --}}
<p style="font-size:13px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">
  Numéros pour payer
</p>
@foreach($paymentMethods as $m)
  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:6px;margin-bottom:8px;">
    <tr>
      <td style="padding:12px 16px;width:55%;">
        <p style="margin:0;font-size:13px;color:#fff;font-weight:bold;">{{ $m['name'] }}</p>
        @if(! empty($m['recipient_name']))
          <p style="margin:2px 0 0;font-size:11px;color:rgba(255,255,255,0.6);">{{ $m['recipient_name'] }}</p>
        @endif
      </td>
      <td style="padding:12px 16px;text-align:right;font-family:monospace;color:#C9A84C;font-size:14px;">
        {{ $m['account_number'] }}
      </td>
    </tr>
  </table>
@endforeach

{{-- CTA Suivi commande --}}
<p style="text-align:center;margin:28px 0;">
  <a href="{{ $orderTrackingUrl }}"
     style="display:inline-block;padding:14px 32px;background:#C9A84C;color:#0A0908;font-weight:bold;text-decoration:none;border-radius:6px;font-size:14px;letter-spacing:1px;">
    SUIVRE MA COMMANDE
  </a>
</p>

@if($expiresAt)
  <p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.5);margin:0;">
    ⏱ Ta commande expire le {{ $expiresAt->locale('fr')->isoFormat('D MMM [à] HH[h]mm') }} sans paiement.
  </p>
@endif

@endsection
