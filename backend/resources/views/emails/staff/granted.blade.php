{{--
    Étape F — Mail d'attribution d'un grant staff événement.
    Style sobre aligné avec account_credentials.blade.php (fond clair, 1 filet
    couleur, logo NWC, pas d'emojis flashy).
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nouvelle mission billetterie NWC</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1a1a1a;">

@php
    $roleLabels = [
        'manager'      => ['name' => 'Manager', 'color' => '#8B1A2F'],
        'scanner_lead' => ['name' => 'Chef sécurité', 'color' => '#C9A84C'],
        'scanner'      => ['name' => 'Scanner', 'color' => '#2563EB'],
    ];
    $role = $roleLabels[$grant] ?? ['name' => 'Staff', 'color' => '#8B1A2F'];
@endphp

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;">
  <tr><td align="center" style="padding:40px 16px;">

    <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e5e5;">

      {{-- Filet couleur wine --}}
      <tr><td style="height:3px;background:#8B1A2F;line-height:3px;font-size:0;">&nbsp;</td></tr>

      {{-- Header avec logo --}}
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
          @if ($assigner)
            <strong>{{ trim(($assigner->first_name ?? '') . ' ' . ($assigner->name ?? '')) }}</strong> t'a assigné une nouvelle mission billetterie sur l'événement :
          @else
            Tu as été assigné(e) automatiquement à une mission billetterie sur l'événement :
          @endif
        </p>

        {{-- Carte event --}}
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;">
          <tr>
            <td style="padding:16px 0;">
              <p style="margin:0 0 6px;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Événement</p>
              <p style="margin:0;font-size:17px;font-weight:600;color:#1a1a1a;">{{ $event->title }}</p>
            </td>
          </tr>
          @if ($event->starts_at)
          <tr>
            <td style="padding:12px 0;border-top:1px solid #f0f0f0;">
              <p style="margin:0 0 4px;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Date</p>
              <p style="margin:0;font-size:14px;color:#1a1a1a;">
                {{ \Carbon\Carbon::parse($event->starts_at)->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH[h]mm') }}
              </p>
            </td>
          </tr>
          @endif
          @if ($event->location)
          <tr>
            <td style="padding:12px 0;border-top:1px solid #f0f0f0;">
              <p style="margin:0 0 4px;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Lieu</p>
              <p style="margin:0;font-size:14px;color:#1a1a1a;">{{ $event->location }}</p>
            </td>
          </tr>
          @endif
          <tr>
            <td style="padding:12px 0;border-top:1px solid #f0f0f0;">
              <p style="margin:0 0 4px;font-size:11px;color:#888;letter-spacing:1px;text-transform:uppercase;">Ton rôle</p>
              <p style="margin:0;font-size:14px;color:{{ $role['color'] }};font-weight:600;">
                {{ $role['name'] }}
              </p>
              <p style="margin:6px 0 0;font-size:13px;color:#555;line-height:1.5;">
                Tu es responsable du {{ $mission }}.
              </p>
            </td>
          </tr>
        </table>

        {{-- Bouton principal --}}
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td style="background:#1a1a1a;">
            <a href="{{ $actionUrl }}"
               style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:500;">
              {{ $actionLabel }}
            </a>
          </td></tr>
        </table>

        <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#555;">
          Ton accès est limité à cet événement uniquement, aucun droit global ne t'est donné.
          Il sera automatiquement révoqué 24h après la fin de l'événement.
        </p>

        <p style="margin:0;font-size:12px;line-height:1.5;color:#888;">
          Si tu n'attendais pas cette assignation, contacte l'organisateur ou ignore ce message.
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
