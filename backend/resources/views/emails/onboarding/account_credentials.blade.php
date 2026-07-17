<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tes accès New Wine Church</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
  <tr><td align="center" style="padding:40px 16px;">

    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;">

      {{-- Filet couleur discret --}}
      <tr><td style="height:3px;background:#8B1A2F;line-height:3px;font-size:0;">&nbsp;</td></tr>

      {{-- Header avec logo NWC (sobre, centré) --}}
      <tr><td style="padding:32px 40px 12px;text-align:center;">
        <img
          src="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/logos/logo_newwine.png"
          alt="New Wine Church"
          width="52"
          height="52"
          style="display:inline-block;border:0;outline:none;"
        />
        <p style="margin:10px 0 0;font-size:12px;color:#888;letter-spacing:2px;text-transform:uppercase;">
          New Wine Church
        </p>
      </td></tr>

      {{-- Corps --}}
      <tr><td style="padding:20px 40px 36px;">

        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#333;">
          Bonjour {{ $user->first_name ?? $user->name }},
        </p>

        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#333;">
          Voici tes accès pour te connecter à ton espace membre :
        </p>

        {{-- Credentials --}}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;">
          <tr>
            <td style="padding:14px 0;width:35%;font-size:13px;color:#888;">Email</td>
            <td style="padding:14px 0;font-size:14px;color:#1a1a1a;font-family:'Menlo','Consolas',monospace;">
              {{ $user->email }}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 0;border-top:1px solid #f0f0f0;font-size:13px;color:#888;">Mot de passe</td>
            <td style="padding:14px 0;border-top:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;font-family:'Menlo','Consolas',monospace;">
              {{ $initialPassword }}
            </td>
          </tr>
        </table>

        <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#555;">
          Pour ta sécurité, tu devras choisir un nouveau mot de passe à ta première connexion.
        </p>

        <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
          <tr><td style="background:#1a1a1a;">
            <a href="{{ $loginUrl }}"
               style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">
              Se connecter
            </a>
          </td></tr>
        </table>

        <p style="margin:0;font-size:13px;line-height:1.6;color:#888;">
          Si tu n'attendais pas cet email, ignore-le simplement.
        </p>

      </td></tr>

      {{-- Footer sobre --}}
      <tr><td style="padding:20px 40px;border-top:1px solid #f0f0f0;font-size:12px;color:#999;text-align:center;">
        New Wine Church · Cocody-Bonoumin, Abidjan
      </td></tr>

    </table>

  </td></tr>
</table>

</body>
</html>
