@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  📊 Digest billetterie — {{ $data['date_label'] }}
</h2>

<p>Bonjour {{ $recipient->first_name ?? 'équipe' }},</p>

<p>Voici le bilan billetterie de la veille.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;">
  <tr>
    <td width="33%" valign="top" style="padding:14px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.15);border-radius:10px;text-align:center;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">Tickets</p>
      <p style="margin:0;font-size:26px;color:#fff;font-weight:700;">{{ $data['tickets_count'] ?? 0 }}</p>
    </td>
    <td width="4"></td>
    <td width="33%" valign="top" style="padding:14px;background:rgba(201,168,76,0.05);border:1px solid rgba(201,168,76,0.15);border-radius:10px;text-align:center;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">Revenus</p>
      <p style="margin:0;font-size:22px;color:#C9A84C;font-weight:700;">{{ number_format((int) ($data['revenue_total'] ?? 0), 0, ',', ' ') }}</p>
      <p style="margin:2px 0 0;color:rgba(255,255,255,0.6);font-size:11px;">F CFA</p>
    </td>
    <td width="4"></td>
    <td width="33%" valign="top" style="padding:14px;background:rgba(139,26,47,0.15);border:1px solid rgba(139,26,47,0.35);border-radius:10px;text-align:center;">
      <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;">Remb.</p>
      <p style="margin:0;font-size:26px;color:#fff;font-weight:700;">{{ $data['refunds_count'] ?? 0 }}</p>
    </td>
  </tr>
</table>

@if(!empty($data['revenue_by_method']))
<h3 style="margin:26px 0 10px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">Revenus par moyen de paiement</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  @foreach($data['revenue_by_method'] as $method => $amount)
  <tr>
    <td style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);">{{ $method }}</td>
    <td align="right" style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.08);color:#C9A84C;font-weight:600;">
      {{ number_format((int) $amount, 0, ',', ' ') }} F
    </td>
  </tr>
  @endforeach
</table>
@endif

@if(!empty($data['top_event']))
<h3 style="margin:26px 0 10px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">🏆 Top event du jour</h3>
<p style="padding:14px 18px;background:rgba(201,168,76,0.06);border-left:3px solid #C9A84C;border-radius:6px;color:rgba(255,255,255,0.85);">
  <strong style="color:#fff;">{{ $data['top_event']['title'] }}</strong> — {{ $data['top_event']['count'] }} ticket(s)
</p>
@endif

@if(!empty($data['alerts']))
<h3 style="margin:26px 0 10px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">⚠️ Alertes</h3>
<ul style="padding-left:20px;color:rgba(255,255,255,0.85);">
  @foreach($data['alerts'] as $alert)
    <li style="margin-bottom:8px;">{{ $alert }}</li>
  @endforeach
</ul>
@endif

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
  <tr><td align="center">
    <a href="{{ $url }}" style="display:inline-block;padding:12px 26px;background:#C9A84C;color:#1a1a1a;font-weight:600;text-decoration:none;border-radius:8px;">
      Ouvrir le dashboard
    </a>
  </td></tr>
</table>

<p style="margin-top:24px;color:rgba(255,255,255,0.5);font-size:12px;">
  Tu peux gérer la réception du digest depuis
  <a href="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/admin/profil/notifications" style="color:#C9A84C;">tes préférences</a>.
</p>
@endsection
