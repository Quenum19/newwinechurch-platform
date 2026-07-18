@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 12px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  @if($threshold >= 95) 🚨 @else ⚠️ @endif Billetterie {{ $threshold }}% remplie
</h2>

<p>Bonjour {{ $recipient->first_name ?? 'équipe' }},</p>

<p>L'événement <strong style="color:#C9A84C;">{{ $event->title }}</strong> a atteint <strong>{{ $threshold }}%</strong> de sa capacité.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;background:rgba(139,26,47,0.15);border:1px solid rgba(139,26,47,0.4);border-radius:12px;">
  <tr><td style="padding:22px 20px;text-align:center;">
    <p style="margin:0 0 4px;color:rgba(255,255,255,0.65);font-size:12px;text-transform:uppercase;letter-spacing:0.06em;">Taux de remplissage</p>
    <p style="margin:0;font-size:42px;font-weight:700;color:#fff;">{{ number_format($rate, 1) }}%</p>
    <p style="margin:8px 0 0;color:#C9A84C;font-size:15px;">{{ $remaining }} place(s) restante(s)</p>
  </td></tr>
</table>

@if($threshold >= 95)
<p style="padding:14px 18px;background:rgba(255,220,120,0.08);border-left:3px solid #C9A84C;border-radius:6px;color:rgba(255,255,255,0.85);">
  <strong>Action recommandée :</strong> ferme la billetterie manuellement si tu veux garder une marge,
  ou active la liste d'attente pour capter les intéressés.
</p>
@else
<p style="color:rgba(255,255,255,0.75);">
  Pense à surveiller les inscriptions et à activer la file d'attente si nécessaire.
</p>
@endif

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
  <tr><td align="center">
    <a href="{{ $url }}" style="display:inline-block;padding:12px 26px;background:#C9A84C;color:#1a1a1a;font-weight:600;text-decoration:none;border-radius:8px;">
      Gérer la billetterie
    </a>
  </td></tr>
</table>
@endsection
