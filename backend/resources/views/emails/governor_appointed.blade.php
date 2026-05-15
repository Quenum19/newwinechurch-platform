@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  Bénédiction sur ta nomination, {{ $user->first_name ?? 'cher serviteur' }} 👑
</h2>

<p>Tu viens d'être officiellement nommé(e) <strong style="color:#C9A84C;">gouverneur(e)</strong> du département
  <strong style="color:#C9A84C;">« {{ $department->name }} »</strong> de New Wine Church.</p>

<p>Cette mission est une responsabilité spirituelle autant qu'opérationnelle. Tu vas :
</p>

<h3 style="margin:24px 0 12px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:20px;">Tes nouvelles responsabilités</h3>
<ul style="padding-left:20px;color:rgba(255,255,255,0.85);">
  <li style="margin-bottom:8px;">Conduire les membres de ton département avec sagesse et amour</li>
  <li style="margin-bottom:8px;">Soumettre les <strong>rapports périodiques</strong> sur tes activités</li>
  <li style="margin-bottom:8px;">Superviser les cellules d'évangélisation rattachées</li>
  <li style="margin-bottom:8px;">Maintenir une <strong>vision claire</strong> alignée sur celle de l'église</li>
</ul>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center" style="padding:18px;background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.3);border-radius:12px;">
    <p style="margin:0 0 12px;color:rgba(255,255,255,0.92);">Accède à ton espace gouverneur :</p>
    <a href="{{ config('app.url') }}/gouverneur"
       style="display:inline-block;padding:12px 28px;background:#C9A84C;color:#1a0510;text-decoration:none;border-radius:9999px;font-weight:600;letter-spacing:0.04em;">
      Ouvrir mon espace
    </a>
  </td></tr>
</table>

<p style="margin-top:24px;color:rgba(255,255,255,0.75);font-style:italic;">
  « Et si l'un de vous manque de sagesse, qu'il la demande à Dieu, qui donne à tous simplement et sans reproche, et elle lui sera donnée. » — Jacques 1:5
</p>

<p style="margin-top:32px;">Que Dieu t'accompagne dans cette nouvelle mission,</p>
<p style="margin:4px 0 0;color:#C9A84C;font-style:italic;">Le bureau de New Wine Church</p>
@endsection
