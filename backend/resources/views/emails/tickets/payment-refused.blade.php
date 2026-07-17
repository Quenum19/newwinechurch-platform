@extends('emails.layouts.nwc')

@section('content')

<h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#C9A84C;margin:0 0 8px;text-align:center;">
  Paiement non confirmé
</h1>
<p style="text-align:center;font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 24px;">
  Pour ta commande <strong>{{ $ticket->order_code }}</strong> · {{ $event->title }}
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.4);border-radius:8px;margin-bottom:24px;">
  <tr><td style="padding:18px 20px;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#FCA5A5;font-weight:bold;">
      Raison
    </p>
    <p style="margin:0;font-size:14px;color:#fff;line-height:1.5;">
      {{ $reason }}
    </p>
  </td></tr>
</table>

<p style="font-size:14px;color:rgba(255,255,255,0.85);line-height:1.6;margin:0 0 18px;">
  Pas de panique — si tu penses qu'il y a une erreur, contacte-nous pour vérifier ensemble.
</p>

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

<p style="text-align:center;font-size:12px;color:rgba(255,255,255,0.5);margin:24px 0 0;">
  Tu peux aussi reprendre une inscription depuis <a href="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/billetterie/{{ $event->slug }}" style="color:#C9A84C;text-decoration:underline;">la page billetterie</a>.
</p>

@endsection
