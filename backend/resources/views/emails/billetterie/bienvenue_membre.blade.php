@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#fff;">
  Bienvenue {{ $first_name }} 🙌
</h2>

<p>Toute l'équipe est heureuse de t'accueillir dans la famille <strong style="color:#C9A84C;">New Wine Church</strong>.</p>

<p style="color:rgba(255,255,255,0.85);">
  Tu rejoins une <em>armée de jeunes pour Christ</em>, levée pour transformer cette génération.
</p>

<h3 style="margin:28px 0 12px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">Ton espace membre</h3>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr><td align="center">
    <a href="{{ $espace_url }}" style="display:inline-block;padding:12px 28px;background:#C9A84C;color:#1a1a1a;font-weight:600;text-decoration:none;border-radius:8px;">
      Accéder à mon espace
    </a>
  </td></tr>
</table>

<h3 style="margin:28px 0 12px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">À découvrir</h3>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">
  <tr>
    <td width="50%" valign="top" style="padding:14px;">
      <a href="{{ $events_url }}" style="text-decoration:none;color:#fff;">
        <div style="padding:16px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:10px;">
          <p style="margin:0 0 4px;color:#C9A84C;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">🎟️ Événements</p>
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Cultes, formations et sorties de la NWC</p>
        </div>
      </a>
    </td>
    <td width="50%" valign="top" style="padding:14px;">
      <a href="{{ $sermons_url }}" style="text-decoration:none;color:#fff;">
        <div style="padding:16px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:10px;">
          <p style="margin:0 0 4px;color:#C9A84C;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">🎙️ Messages</p>
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Sermons audio & vidéo du pasteur</p>
        </div>
      </a>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top" style="padding:14px;">
      <a href="{{ $blog_url }}" style="text-decoration:none;color:#fff;">
        <div style="padding:16px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:10px;">
          <p style="margin:0 0 4px;color:#C9A84C;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">📖 Blog</p>
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Articles pour ton édification</p>
        </div>
      </a>
    </td>
    <td width="50%" valign="top" style="padding:14px;">
      <a href="{{ $cellules_url }}" style="text-decoration:none;color:#fff;">
        <div style="padding:16px;background:rgba(201,168,76,0.06);border:1px solid rgba(201,168,76,0.2);border-radius:10px;">
          <p style="margin:0 0 4px;color:#C9A84C;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">🤝 Cellules</p>
          <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Rejoins un groupe près de chez toi</p>
        </div>
      </a>
    </td>
  </tr>
</table>

<h3 style="margin:28px 0 12px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">Rejoins une cellule</h3>
<p style="color:rgba(255,255,255,0.85);">
  Chez NWC, on grandit ensemble. Trouve la cellule la plus proche de chez toi et rejoins un groupe
  de disciples pour prier, étudier la Parole et faire équipe.
</p>

<p style="margin-top:32px;">À très vite dans la maison du Seigneur,</p>
<p style="margin:4px 0 0;color:#C9A84C;font-style:italic;">L'équipe NWC</p>
@endsection
