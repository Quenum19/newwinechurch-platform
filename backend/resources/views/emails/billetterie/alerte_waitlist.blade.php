@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  📋 Nouvelle inscription en liste d'attente
</h2>

<p>Bonjour {{ $recipient->first_name ?? 'équipe' }},</p>

<p>Quelqu'un s'est mis en liste d'attente pour <strong style="color:#C9A84C;">{{ $event->title }}</strong>.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.2);border-radius:12px;">
  <tr><td style="padding:18px 20px;">
    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Personne</p>
    <p style="margin:0 0 14px;font-size:17px;color:#fff;"><strong>{{ $person }}</strong></p>

    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Contact</p>
    <p style="margin:0 0 14px;font-size:14px;color:rgba(255,255,255,0.85);">
      {{ $entry->email }}@if($entry->phone) · {{ $entry->phone }} @endif
    </p>

    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Position</p>
    <p style="margin:0;font-size:22px;color:#C9A84C;"><strong>#{{ $position }}</strong></p>
  </td></tr>
</table>

<p style="color:rgba(255,255,255,0.75);">
  Si des places se libèrent (remboursement, annulation), tu pourras convertir cette entrée depuis le panneau d'administration.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">
  <tr><td align="center">
    <a href="{{ $url }}" style="display:inline-block;padding:12px 26px;background:#C9A84C;color:#1a1a1a;font-weight:600;text-decoration:none;border-radius:8px;">
      Voir la file d'attente
    </a>
  </td></tr>
</table>
@endsection
