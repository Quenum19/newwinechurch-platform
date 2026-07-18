@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#fff;">
  ⏰ C'est demain — {{ $event->title }}
</h2>

<p>Bonjour {{ $ticket->first_name ?? 'ami(e)' }},</p>

<p>
  On te rappelle que <strong style="color:#C9A84C;">{{ $event->title }}</strong> a lieu <strong>demain</strong>.
  On a hâte de te voir !
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.2);border-radius:12px;">
  <tr><td style="padding:20px;">
    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">🕐 Horaire</p>
    <p style="margin:0 0 14px;font-size:17px;color:#fff;">
      <strong>{{ optional($event->starts_at)->locale('fr')->isoFormat('dddd D MMMM · HH[h]mm') }}</strong>
      @if($event->ends_at)
        — {{ optional($event->ends_at)->format('H\hi') }}
      @endif
    </p>

    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">📍 Lieu</p>
    <p style="margin:0 0 4px;font-size:15px;color:#fff;">{{ $event->location ?? '—' }}</p>
    @if($event->address)
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.7);">{{ $event->address }}</p>
    @endif

    @if($event->is_online && $event->online_link)
      <p style="margin:12px 0 0;font-size:14px;color:#C9A84C;">
        Live : <a href="{{ $event->online_link }}" style="color:#C9A84C;">{{ $event->online_link }}</a>
      </p>
    @endif
  </td></tr>
</table>

@if($qr_data)
<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">
  <tr><td align="center" style="padding:20px;background:#fff;border-radius:12px;">
    <img src="{{ $qr_data }}" alt="QR ticket" width="220" height="220" style="display:block;margin:0 auto 8px;" />
    <p style="margin:0;color:#080808;font-family:'Courier New',monospace;font-size:15px;letter-spacing:0.08em;">
      <strong>{{ $ticket->short_code }}</strong>
    </p>
    <p style="margin:4px 0 0;color:rgba(0,0,0,0.6);font-size:11px;">Présente ce QR à l'entrée</p>
  </td></tr>
</table>
@endif

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">
  <tr><td align="center">
    <a href="{{ $ticket_url }}" style="display:inline-block;padding:12px 26px;background:#C9A84C;color:#1a1a1a;font-weight:600;text-decoration:none;border-radius:8px;">
      Voir mon ticket
    </a>
  </td></tr>
</table>

<p style="color:rgba(255,255,255,0.75);margin-top:22px;">
  À demain,<br>
  <span style="color:#C9A84C;font-style:italic;">L'équipe New Wine Church</span>
</p>
@endsection
