{{--
    ==========================================================
     Layout Blade brandé NWC pour tous les emails transactionnels.
     Utilisation : @extends('emails.layouts.nwc') + @section('content').
    ==========================================================
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ $subject ?? 'New Wine Church' }}</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:'Outfit','Helvetica Neue',Arial,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;">
  <tr><td align="center" style="padding:32px 16px;">

    <table width="600" cellpadding="0" cellspacing="0" style="background:#1A1A1A;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);">

      {{-- Header --}}
      <tr><td align="center" style="padding:36px 24px 28px;background:linear-gradient(135deg,#8B1A2F 0%,#530F1B 100%);">
        {{-- Logo NWC : URL absolue vers le frontend (les fichiers statiques sont sur newinechurch.org, pas sur api.newinechurch.org). --}}
        <img
          src="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/logos/logo_newwine.png"
          alt="New Wine Church"
          width="64"
          height="64"
          style="display:block;margin:0 auto 12px;border:0;outline:none;"
        />
        <h1 style="margin:0;font-family:'Cormorant Garamond',Georgia,serif;font-size:34px;letter-spacing:-0.02em;color:#fff;">New Wine Church</h1>
        <p style="margin:8px 0 0;font-style:italic;color:#C9A84C;font-size:18px;">« Sauvé pour Sauver »</p>
      </td></tr>

      {{-- Body --}}
      <tr><td style="padding:36px 32px;color:#fff;font-size:15px;line-height:1.7;">
        @yield('content')
      </td></tr>

      {{-- Footer --}}
      <tr><td style="padding:24px 24px;background:#111;border-top:1px solid rgba(201,168,76,0.2);font-size:12px;color:rgba(255,255,255,0.5);text-align:center;">
        <p style="margin:0 0 8px;">
          <strong style="color:rgba(255,255,255,0.8);">New Wine Church</strong><br>
          Cocody-Bonoumin, Abidjan, Côte d'Ivoire<br>
          Culte : Dimanche 13h00 — 15h00
        </p>
        <p style="margin:8px 0 0;">
          <a href="{{ config('app.url') }}" style="color:#C9A84C;text-decoration:none;">{{ config('app.url') }}</a>
        </p>
        @hasSection('footer-extra')
          <p style="margin:16px 0 0;font-size:11px;">
            @yield('footer-extra')
          </p>
        @endif
      </td></tr>
    </table>

    <p style="margin:16px 0 0;font-size:11px;color:rgba(255,255,255,0.3);">
      © {{ date('Y') }} New Wine Church. Maison mère : Église La Maison de la Destinée.
    </p>
  </td></tr>
</table>
</body>
</html>
