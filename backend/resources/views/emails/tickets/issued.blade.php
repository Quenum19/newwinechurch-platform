@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#F5F5F5;letter-spacing:-0.2px;">
  Ton ticket est prêt
</h2>

<p style="margin:0 0 22px;color:#D6D6D6;">
  Bonjour <strong style="color:#F5F5F5;">{{ $ticket->first_name }}</strong>,<br>
  Ta réservation pour <strong style="color:#F5F5F5;">{{ $event->title }}</strong> est confirmée.
  Présente ce ticket à l'entrée le jour J.
</p>

{{-- Encart ticket sobre : fond léger, fine bordure gold, pas de couleur agressive --}}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#0E0E0E;border:1px solid rgba(166,138,74,0.25);border-radius:10px;">
  <tr><td style="padding:26px 24px;text-align:center;">

    <p style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#F5F5F5;margin:0 0 6px;">
      {{ $event->title }}
    </p>
    <p style="font-size:13px;color:rgba(255,255,255,0.55);margin:0 0 22px;">
      @if($event->starts_at)
        {{ $event->starts_at->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH[h]mm') }}
      @endif
      @if($event->location)
        <br>{{ $event->location }}
      @endif
    </p>

    <table align="center" cellpadding="0" cellspacing="0" style="background:#fff;padding:12px;border-radius:6px;">
      <tr><td>
        {{-- URL absolue vers l'endpoint public QR (fonctionne dans Gmail contrairement aux data URLs SVG) --}}
        <img src="{{ rtrim(config('app.url'), '/') }}/api/tickets/qr/{{ $ticket->access_token }}"
             alt="QR Ticket" width="180" height="180"
             style="display:block;width:180px;height:180px;">
      </td></tr>
    </table>

    <p style="font-family:'SF Mono',Consolas,Menlo,monospace;font-size:15px;letter-spacing:3px;color:#F5F5F5;margin:16px 0 4px;">
      {{ $ticket->short_code }}
    </p>
    <p style="font-size:11px;color:rgba(255,255,255,0.4);margin:0;">
      Code de secours si le QR est illisible
    </p>
  </td></tr>
</table>

<p style="text-align:center;margin:28px 0;">
  <a href="{{ $myTicketUrl }}"
     style="display:inline-block;padding:13px 28px;background:transparent;color:#F5F5F5;border:1px solid #A68A4A;text-decoration:none;border-radius:4px;font-size:13px;letter-spacing:1.5px;text-transform:uppercase;">
    Voir mon ticket en ligne
  </a>
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;font-size:13px;color:rgba(255,255,255,0.6);border-top:1px solid rgba(255,255,255,0.06);border-bottom:1px solid rgba(255,255,255,0.06);">
  <tr><td style="padding:10px 0;">N° de commande</td>
      <td style="padding:10px 0;text-align:right;font-family:'SF Mono',Consolas,monospace;color:#EDEDED;">{{ $ticket->order_code }}</td></tr>
  <tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);">N° du ticket</td>
      <td style="padding:10px 0;text-align:right;font-family:'SF Mono',Consolas,monospace;color:#EDEDED;border-top:1px solid rgba(255,255,255,0.06);">{{ $ticket->ticket_number }}</td></tr>
  <tr><td style="padding:10px 0;border-top:1px solid rgba(255,255,255,0.06);">Au nom de</td>
      <td style="padding:10px 0;text-align:right;color:#EDEDED;border-top:1px solid rgba(255,255,255,0.06);">{{ $ticket->full_name }}</td></tr>
</table>

<p style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:22px;line-height:1.6;">
  Ce ticket est individuel et à usage unique. Une fois scanné, il ne pourra plus
  être réutilisé. Si tu ne peux pas venir, annule ta réservation depuis
  « Voir mon ticket en ligne » pour laisser ta place à quelqu'un d'autre.
</p>

<p style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:10px;">
  Le PDF du ticket est aussi en pièce jointe.
</p>
@endsection
