@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#C9A84C;">
  👑 Bénédiction sur ta nomination, {{ $recipient->first_name ?? $recipient->name }}
</h2>

<p>Tu viens d'être officiellement nommé(e) <strong style="color:#C9A84C;">gouverneur(e)</strong>
   du département <strong style="color:#C9A84C;">« {{ $department->name }} »</strong> de New Wine Church.</p>

<h3 style="margin:24px 0 12px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">Tes responsabilités</h3>
<ul style="padding-left:20px;color:rgba(255,255,255,0.85);">
  <li style="margin-bottom:8px;"><strong>Conduire</strong> les membres de ton département avec sagesse et amour</li>
  <li style="margin-bottom:8px;"><strong>Soumettre les rapports périodiques</strong> sur les activités</li>
  <li style="margin-bottom:8px;"><strong>Superviser</strong> les cellules d'évangélisation rattachées (membres de ton département)</li>
  <li style="margin-bottom:8px;"><strong>Maintenir une vision claire</strong> alignée sur celle de l'église</li>
</ul>

<h3 style="margin:28px 0 12px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">Guide rapide</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0;">
  <tr>
    <td style="padding:10px;width:33%;vertical-align:top;background:rgba(201,168,76,0.08);border-radius:10px;">
      <div style="font-size:13px;color:#C9A84C;font-weight:600;margin-bottom:4px;">1. Profil</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);">Mets à jour ta photo, ta vision et ta bio.</div>
    </td>
    <td width="10"></td>
    <td style="padding:10px;width:33%;vertical-align:top;background:rgba(201,168,76,0.08);border-radius:10px;">
      <div style="font-size:13px;color:#C9A84C;font-weight:600;margin-bottom:4px;">2. Membres</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);">Consulte l'annuaire et organise tes cellules.</div>
    </td>
    <td width="10"></td>
    <td style="padding:10px;width:33%;vertical-align:top;background:rgba(201,168,76,0.08);border-radius:10px;">
      <div style="font-size:13px;color:#C9A84C;font-weight:600;margin-bottom:4px;">3. Rapports</div>
      <div style="font-size:13px;color:rgba(255,255,255,0.75);">Soumets ton premier rapport mensuel.</div>
    </td>
  </tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center" style="padding:14px;background:rgba(201,168,76,0.12);border:1px solid rgba(201,168,76,0.3);border-radius:12px;">
    <p style="margin:0 0 12px;color:rgba(255,255,255,0.92);">Accède à ton espace gouverneur :</p>
    <a href="{{ $url }}"
       style="display:inline-block;padding:12px 28px;background:#C9A84C;color:#1a0510;text-decoration:none;border-radius:9999px;font-weight:600;letter-spacing:0.04em;">
      Ouvrir mon espace
    </a>
  </td></tr>
</table>

<p style="margin-top:24px;color:rgba(255,255,255,0.75);font-style:italic;text-align:center;">
  « Et si l'un de vous manque de sagesse, qu'il la demande à Dieu… elle lui sera donnée. » — Jacques 1:5
</p>

<p style="margin-top:24px;font-size:13px;color:rgba(255,255,255,0.6);">
  Pour toute question, écris à <a href="mailto:{{ $pastorEmail }}" style="color:#C9A84C;">{{ $pastorEmail }}</a>.
</p>

<p style="margin-top:24px;color:#C9A84C;font-style:italic;">Le bureau de New Wine Church</p>
@endsection
