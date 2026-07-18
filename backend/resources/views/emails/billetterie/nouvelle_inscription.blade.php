@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  Nouvelle inscription — {{ $event->title }}
</h2>

<p>Bonjour {{ $recipient->first_name ?? 'équipe' }},</p>

<p>Une nouvelle inscription vient d'être enregistrée sur la billetterie.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.2);border-radius:12px;">
  <tr><td style="padding:18px 20px;">
    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Inscrit</p>
    <p style="margin:0 0 14px;font-size:17px;color:#fff;"><strong>{{ $buyer_name }}</strong></p>

    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Type de ticket</p>
    <p style="margin:0 0 14px;font-size:16px;color:#fff;">{{ $type }}</p>

    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Prix</p>
    <p style="margin:0 0 14px;font-size:16px;color:#C9A84C;"><strong>{{ $price }}</strong></p>

    <p style="margin:0 0 6px;color:rgba(255,255,255,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Remplissage</p>
    <p style="margin:0;font-size:16px;color:#fff;">{{ $total_sold }} / {{ $capacity }} ticket(s) vendus</p>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 8px;">
  <tr><td align="center">
    <a href="{{ $url }}" style="display:inline-block;padding:12px 26px;background:#C9A84C;color:#1a1a1a;font-weight:600;text-decoration:none;border-radius:8px;">
      Voir la billetterie
    </a>
  </td></tr>
</table>

<p style="margin-top:24px;color:rgba(255,255,255,0.5);font-size:12px;">
  Tu reçois cet email parce que tu gères la billetterie NWC. Tu peux désactiver
  ces notifications depuis <a href="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/admin/profil/notifications" style="color:#C9A84C;">tes préférences</a>.
</p>
@endsection
