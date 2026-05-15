@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  Bienvenue {{ $user->first_name ?? 'cher membre' }} 🙌
</h2>

<p>Nous sommes heureux de t'accueillir dans la famille <strong style="color:#C9A84C;">New Wine Church</strong>.</p>

<p>Tu fais désormais partie d'une <em>armée de jeunes pour Christ</em>, levée pour transformer cette génération.</p>

<h3 style="margin:28px 0 12px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">Prochaines étapes</h3>
<ul style="padding-left:20px;color:rgba(255,255,255,0.85);">
  <li style="margin-bottom:8px;">Rejoins-nous au culte du <strong>dimanche à 13h</strong> à Cocody-Bonoumin</li>
  <li style="margin-bottom:8px;">Découvre nos <a href="{{ config('app.url') }}/communaute" style="color:#C9A84C;">39 départements</a> et trouve ta place</li>
  <li style="margin-bottom:8px;">Écoute nos <a href="{{ config('app.url') }}/messages" style="color:#C9A84C;">messages récents</a></li>
</ul>

@if(! $user->hasVerifiedEmail())
<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center" style="padding:16px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:12px;">
    <p style="margin:0 0 12px;color:#C9A84C;">⚠ N'oublie pas de vérifier ton email pour activer ton compte.</p>
  </td></tr>
</table>
@endif

<p style="margin-top:32px;">À très vite dans la maison du Seigneur,</p>
<p style="margin:4px 0 0;color:#C9A84C;font-style:italic;">L'équipe NWC</p>
@endsection
