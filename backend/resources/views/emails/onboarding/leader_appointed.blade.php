@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#C9A84C;">
  🙌 Tu es maintenant leader de cellule, {{ $recipient->first_name ?? $recipient->name }}
</h2>

<p>Tu viens d'être nommé(e) <strong style="color:#C9A84C;">leader de la cellule</strong>
   <strong style="color:#C9A84C;">« {{ $cell->name }} »</strong>.
   Une belle responsabilité spirituelle t'est confiée.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(201,168,76,0.08);border-radius:12px;">
  <tr><td style="padding:18px 22px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      @if($cell->zone)
      <tr>
        <td style="padding:6px 0;width:35%;color:rgba(255,255,255,0.6);">Zone</td>
        <td style="padding:6px 0;">{{ $cell->zone }}</td>
      </tr>
      @endif
      @if($cell->meeting_day)
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Jour de réunion</td>
        <td style="padding:6px 0;">{{ ucfirst($cell->meeting_day) }} @if($cell->meeting_time) à {{ \Carbon\Carbon::parse($cell->meeting_time)->format('H:i') }} @endif</td>
      </tr>
      @endif
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Membres actuels</td>
        <td style="padding:6px 0;color:#C9A84C;font-weight:600;">{{ $membersCount }}</td>
      </tr>
    </table>
  </td></tr>
</table>

<h3 style="margin:24px 0 12px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">Tes premières actions</h3>
<ol style="padding-left:22px;color:rgba(255,255,255,0.85);">
  <li style="margin-bottom:8px;"><strong>Contacte tes membres</strong> — fais un tour de présentation</li>
  <li style="margin-bottom:8px;"><strong>Planifie la prochaine rencontre</strong> — confirme date et lieu</li>
  <li style="margin-bottom:8px;"><strong>Crée un groupe WhatsApp</strong> et renseigne le lien dans les paramètres de la cellule</li>
  <li style="margin-bottom:8px;"><strong>Soumets ton premier rapport hebdomadaire</strong> dès la réunion suivante</li>
</ol>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center" style="padding:14px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);border-radius:12px;">
    <p style="margin:0 0 12px;color:rgba(255,255,255,0.92);">Accède à ton espace leader :</p>
    <a href="{{ $url }}"
       style="display:inline-block;padding:12px 28px;background:#C9A84C;color:#1a0510;text-decoration:none;border-radius:9999px;font-weight:600;letter-spacing:0.04em;">
      Ouvrir mon espace
    </a>
  </td></tr>
</table>

<p style="margin-top:24px;color:rgba(255,255,255,0.75);font-style:italic;text-align:center;">
  « Là où deux ou trois sont assemblés en mon nom, je suis au milieu d'eux. » — Matthieu 18:20
</p>
@endsection
