@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  🚨 Anomalie de sécurité billetterie
</h2>

<p>Bonjour {{ $recipient->first_name ?? 'superadmin' }},</p>

<p>Plusieurs tentatives de scan invalides ont été détectées en moins d'une minute.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:rgba(139,26,47,0.20);border:1px solid rgba(139,26,47,0.5);border-radius:12px;">
  <tr><td style="padding:18px 20px;">
    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Adresse IP</p>
    <p style="margin:0 0 14px;font-size:17px;color:#fff;font-family:'Courier New',monospace;"><strong>{{ $ip }}</strong></p>

    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Tentatives</p>
    <p style="margin:0 0 14px;font-size:22px;color:#C9A84C;"><strong>{{ $attempts }}</strong> scans invalides</p>

    @if($event)
    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Événement</p>
    <p style="margin:0 0 14px;font-size:15px;color:#fff;">{{ $event->title }}</p>
    @endif

    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Horodatage</p>
    <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">{{ \Illuminate\Support\Carbon::parse($when)->locale('fr')->isoFormat('LLLL') }}</p>
  </td></tr>
</table>

<p style="padding:14px 18px;background:rgba(255,220,120,0.08);border-left:3px solid #C9A84C;border-radius:6px;color:rgba(255,255,255,0.85);">
  <strong>Actions recommandées :</strong><br>
  1. Vérifie le log d'activité (source du scan).<br>
  2. Si comportement anormal confirmé : bloque l'IP au niveau Cloudflare/Nginx.<br>
  3. Contacte le responsable sécurité de l'événement.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;">
  <tr><td align="center">
    <a href="{{ $url }}" style="display:inline-block;padding:12px 26px;background:#8B1A2F;color:#fff;font-weight:600;text-decoration:none;border-radius:8px;">
      Ouvrir le journal d'activité
    </a>
  </td></tr>
</table>

<p style="margin-top:24px;color:rgba(255,255,255,0.5);font-size:12px;">
  Cette alerte est critique et ne peut pas être désactivée dans tes préférences.
</p>
@endsection
