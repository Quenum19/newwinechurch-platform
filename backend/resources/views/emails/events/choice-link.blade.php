@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;color:#F5F5F5;letter-spacing:-0.2px;">
  Dernière étape avant ton ticket
</h2>

<p style="margin:0 0 18px;color:#D6D6D6;">
  Bonjour <strong style="color:#F5F5F5;">{{ $registration->first_name }}</strong>,<br>
  Merci pour ta pré-inscription à <strong style="color:{{ $accent }};">{{ $event->title }}</strong>.
</p>

<p style="margin:0 0 24px;color:#D6D6D6;">
  À New Wine Church, nous croyons que chaque personne a une <em>sphère
  d'influence</em> unique pour transformer sa société. Découvre les <strong>7 sphères</strong>
  et choisis celle qui résonne le plus en toi. Le jour du Festi Grill,
  tu seras accueilli directement dans son atelier — les leaders de chaque
  sphère t'attendent pour partager leur vision.
</p>

{{-- CTA principal --}}
<p style="text-align:center;margin:28px 0;">
  <a href="{{ $choiceUrl }}"
     style="display:inline-block;padding:16px 32px;background:{{ $accent }};color:#fff;text-decoration:none;border-radius:4px;font-size:14px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">
    Je choisis ma sphère
  </a>
</p>

<p style="text-align:center;margin:16px 0 24px;font-size:12px;color:rgba(255,255,255,0.55);">
  Une fois ton choix fait, ton ticket avec QR code<br>t'arrivera par email dans la foulée.
</p>

{{-- Encart infos event --}}
<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#161616;border:1px solid {{ $accent }};border-radius:8px;">
  <tr><td style="padding:18px 20px;text-align:center;">
    <p style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#F5F5F5;margin:0 0 6px;">
      {{ $event->title }}
    </p>
    <p style="font-size:13px;color:rgba(255,255,255,0.65);margin:0;">
      @if($event->starts_at)
        {{ $event->starts_at->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH[h]mm') }}<br>
      @endif
      @if($event->location){{ $event->location }}@endif
    </p>
  </td></tr>
</table>

<p style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:22px;line-height:1.6;">
  <strong style="color:{{ $accent }};">Important :</strong> ce lien est personnel et unique.
  Ne le partage pas — si tu veux inviter quelqu'un, demande-lui de faire sa propre
  pré-inscription depuis <a href="{{ rtrim(config('app.url'), '/') }}/evenements/{{ $event->slug }}"
    style="color:{{ $accent }};">le lien officiel</a>.
</p>

<p style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:10px;">
  Si le bouton ne fonctionne pas, copie-colle ce lien dans ton navigateur :<br>
  <span style="font-family:'SF Mono',Consolas,monospace;color:{{ $accent }};word-break:break-all;font-size:11px;">{{ $choiceUrl }}</span>
</p>
@endsection
