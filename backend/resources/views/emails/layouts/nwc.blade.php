{{--
    ==========================================================
     Layout Blade brandé NWC pour tous les emails transactionnels.
     Utilisation : @extends('emails.layouts.nwc') + @section('content').

     La variable $accent (passée par le mailable, ex TicketIssuedMail)
     drive la palette du mail : header, ligne accent, bouton, bordures.
     Fallback bordeaux NWC si non fournie.
    ==========================================================
--}}
@php
    $accent = $accent ?? '#8B1A2F';
    // Version "profonde" de l'accent pour le gradient (assombri ~35%)
    // — calcul simple : rgb chaque canal × 0.65
    $rgbDeep = 'rgba(0,0,0,0.45)';
@endphp
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{{ $subject ?? 'New Wine Church' }}</title>
</head>
{{-- Fond légèrement plus clair (#1a1a1a) pour ne pas être "trop sombre" — reste
     éditorial mais respire mieux que le pur noir. --}}
<body style="margin:0;padding:0;background:#1E1E1E;font-family:-apple-system,'Segoe UI','Helvetica Neue',Arial,sans-serif;color:#EDEDED;-webkit-font-smoothing:antialiased;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1E1E1E;">
  <tr><td align="center" style="padding:28px 16px;">

    <table width="600" cellpadding="0" cellspacing="0" style="background:#242424;border-radius:14px;overflow:hidden;">

      {{-- Header : couleur = accent du type de ticket. Gradient subtil
           pour de la profondeur. Le mail change de mood selon l'event. --}}
      <tr><td align="center" style="padding:34px 24px 28px;background:linear-gradient(135deg,{{ $accent }} 0%,{{ $accent }} 55%,{{ $rgbDeep }} 100%),{{ $accent }};">
        <img
          src="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/logos/logo_newwine.png"
          alt="New Wine Church"
          width="52"
          height="52"
          style="display:block;margin:0 auto 12px;border:0;outline:none;"
        />
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;letter-spacing:0.3px;color:#fff;">
          New Wine Church
        </h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;">
          Sauvé pour Sauver
        </p>
      </td></tr>

      {{-- Body — plus clair pour ne pas être trop sombre --}}
      <tr><td style="padding:34px 36px;color:#EDEDED;font-size:15px;line-height:1.65;">
        @yield('content')
      </td></tr>

      {{-- Footer --}}
      <tr><td style="padding:22px 24px;background:#1A1A1A;border-top:2px solid {{ $accent }};font-size:12px;color:rgba(255,255,255,0.55);text-align:center;">
        <p style="margin:0 0 6px;color:rgba(255,255,255,0.8);">
          New Wine Church · Cocody-Bonoumin, Abidjan
        </p>
        <p style="margin:0 0 8px;">
          Culte du dimanche 13h00 — 15h00
        </p>
        <p style="margin:0;">
          <a href="{{ config('app.url') }}" style="color:{{ $accent }};text-decoration:none;font-weight:600;">newinechurch.org</a>
        </p>
        @hasSection('footer-extra')
          <p style="margin:14px 0 0;font-size:11px;">
            @yield('footer-extra')
          </p>
        @endif
      </td></tr>
    </table>

    <p style="margin:14px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">
      © {{ date('Y') }} New Wine Church · Maison mère : Église La Maison de la Destinée
    </p>
  </td></tr>
</table>
</body>
</html>
