@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#fff;">
  Ton ticket est prêt 🎟
</h2>

<p>
  Bonjour <strong style="color:#C9A84C;">{{ $ticket->first_name }}</strong>,<br>
  Nous confirmons ta réservation pour <strong>{{ $event->title }}</strong>.
  Présente ce ticket à l'entrée pour être scanné.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.3);border-radius:12px;">
  <tr><td style="padding:24px;text-align:center;">
    <p style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;color:#C9A84C;margin:0 0 4px;">
      {{ $event->title }}
    </p>
    <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:0 0 18px;">
      @if($event->starts_at)
        {{ $event->starts_at->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH[h]mm') }}
        @if($event->location) · {{ $event->location }} @endif
      @endif
    </p>

    <table align="center" cellpadding="0" cellspacing="0" style="background:#fff;padding:14px;border-radius:8px;">
      <tr><td>
        {{-- QR inline en base64 pour rendu instantané dans le client mail --}}
        {{-- URL absolue vers l'endpoint public QR (fonctionne dans Gmail contrairement aux data URLs SVG) --}}
        <img src="{{ rtrim(config('app.url'), '/') }}/api/tickets/qr/{{ $ticket->access_token }}"
             alt="QR Ticket" width="200" height="200"
             style="display:block;width:200px;height:200px;">
      </td></tr>
    </table>

    <p style="font-family:monospace;font-size:18px;letter-spacing:3px;color:#fff;margin:18px 0 4px;">
      {{ $ticket->short_code }}
    </p>
    <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:0;">
      Code de secours si le QR est illisible
    </p>
  </td></tr>
</table>

<p style="text-align:center;margin:24px 0;">
  <a href="{{ $myTicketUrl }}"
     style="display:inline-block;padding:14px 32px;background:#C9A84C;color:#0A0908;font-weight:bold;text-decoration:none;border-radius:6px;font-size:14px;letter-spacing:1px;">
    VOIR MON TICKET EN LIGNE
  </a>
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;font-size:13px;color:rgba(255,255,255,0.7);">
  <tr><td style="padding:6px 0;">N° de commande</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;color:#fff;">{{ $ticket->order_code }}</td></tr>
  <tr><td style="padding:6px 0;">N° du ticket</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;color:#fff;">{{ $ticket->ticket_number }}</td></tr>
  <tr><td style="padding:6px 0;">Au nom de</td>
      <td style="padding:6px 0;text-align:right;color:#fff;">{{ $ticket->full_name }}</td></tr>
</table>

<p style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:24px;line-height:1.6;">
  <strong>Important :</strong> ce ticket est individuel et à usage unique. Une fois scanné,
  il ne pourra plus être réutilisé. Si tu ne peux pas venir, annule ta réservation depuis
  la page « Voir mon ticket en ligne » pour laisser ta place à quelqu'un d'autre.
</p>

<p style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:12px;">
  Le PDF du ticket est aussi en pièce jointe.
</p>
@endsection
