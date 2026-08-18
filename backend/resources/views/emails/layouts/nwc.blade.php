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
{{--
  Font stack : Georgia = serif safe partout (Gmail, Outlook, Apple Mail) —
  rendu naturel, jamais "fake IA" comme le Cormorant Garamond qui n'est
  installée nulle part et retombe sur du fake-italic vitreux.
  Corps : system-ui pour un rendu native dans chaque OS/client mail.
--}}
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#EDEDED;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
  <tr><td align="center" style="padding:32px 16px;">

    <table width="600" cellpadding="0" cellspacing="0" style="background:#141414;border-radius:14px;overflow:hidden;">

      {{-- Header sobre : fond noir + fine barre bordeaux en bas.
           Plus de gradient massif, plus léger et éditorial. --}}
      <tr><td align="center" style="padding:36px 24px 28px;background:#111;border-bottom:2px solid #8B1A2F;">
        <img
          src="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/logos/logo_newwine.png"
          alt="New Wine Church"
          width="56"
          height="56"
          style="display:block;margin:0 auto 14px;border:0;outline:none;"
        />
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;letter-spacing:0.5px;color:#F5F5F5;">
          New Wine Church
        </h1>
        <p style="margin:6px 0 0;color:#A68A4A;font-size:12px;letter-spacing:2px;text-transform:uppercase;">
          Sauvé pour Sauver
        </p>
      </td></tr>

      {{-- Body --}}
      <tr><td style="padding:36px 36px;color:#EDEDED;font-size:15px;line-height:1.65;">
        @yield('content')
      </td></tr>

      {{-- Footer --}}
      <tr><td style="padding:22px 24px;background:#0E0E0E;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:rgba(255,255,255,0.5);text-align:center;">
        <p style="margin:0 0 6px;color:rgba(255,255,255,0.75);">
          New Wine Church · Cocody-Bonoumin, Abidjan
        </p>
        <p style="margin:0 0 8px;">
          Culte du dimanche 13h00 — 15h00
        </p>
        <p style="margin:0;">
          <a href="{{ config('app.url') }}" style="color:#A68A4A;text-decoration:none;">newinechurch.org</a>
        </p>
        @hasSection('footer-extra')
          <p style="margin:14px 0 0;font-size:11px;">
            @yield('footer-extra')
          </p>
        @endif
      </td></tr>
    </table>

    <p style="margin:14px 0 0;font-size:11px;color:rgba(255,255,255,0.28);">
      © {{ date('Y') }} New Wine Church · Maison mère : Église La Maison de la Destinée
    </p>
  </td></tr>
</table>
</body>
</html>
