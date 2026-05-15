@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#fff;">
  Bienvenue à NWC 🙌
</h2>

<p>
  Bonjour <strong style="color:#C9A84C;">{{ $user->first_name ?? $user->name }}</strong>,<br>
  Ta demande d'adhésion a été <strong style="color:#1F8B3D;">validée</strong>. Bienvenue
  dans la famille New Wine Church !
</p>

<p style="color:rgba(255,255,255,0.8);margin-top:20px;">
  Voici tes accès pour te connecter à ton espace personnel :
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:12px;">
  <tr><td style="padding:18px 22px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:rgba(255,255,255,0.88);">
      <tr>
        <td style="padding:6px 0;width:35%;color:rgba(255,255,255,0.6);">Email</td>
        <td style="padding:6px 0;color:#C9A84C;"><strong>{{ $user->email }}</strong></td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Mot de passe initial</td>
        <td style="padding:6px 0;">
          <code style="background:rgba(0,0,0,0.4);padding:4px 10px;border-radius:4px;color:#fff;font-size:15px;letter-spacing:1px;">
            {{ $initialPassword }}
          </code>
        </td>
      </tr>
    </table>
  </td></tr>
</table>

<p style="background:rgba(255,180,0,0.1);border-left:4px solid #FFA500;padding:14px 18px;color:rgba(255,255,255,0.9);font-size:14px;border-radius:6px;">
  🔒 <strong>Important :</strong> Pour ta sécurité, tu seras invité(e) à <strong>changer ton mot de passe</strong>
  dès ta première connexion.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center" style="padding:14px;">
    <a href="{{ $loginUrl }}"
       style="display:inline-block;padding:14px 32px;background:#C9A84C;color:#1a0510;text-decoration:none;border-radius:9999px;font-weight:600;letter-spacing:0.04em;">
      Me connecter maintenant
    </a>
  </td></tr>
</table>

<p style="color:rgba(255,255,255,0.7);font-size:14px;">
  Une fois connecté(e), pense à <strong>compléter ton profil</strong> (profession, congrégation,
  contact d'urgence…) pour que ton département et la RH puissent mieux t'accompagner.
</p>

<p style="margin-top:32px;color:rgba(255,255,255,0.6);font-style:italic;">
  Que la grâce de Dieu t'accompagne 🙏<br>
  L'équipe NWC
</p>
@endsection
