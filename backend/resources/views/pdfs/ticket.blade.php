{{--
    Ticket PDF — Style Tikerama sobre et fidèle
    Structure exacte : header text top + grille 2×2 avec bordures pointillées
    Rendu dompdf : garde DejaVu Sans (support FR + accents)
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Ticket {{ $ticket->short_code }} — {{ $event->title }}</title>
<style>
  @page { margin: 24px 32px; }
  * { box-sizing: border-box; }
  body {
    font-family: 'DejaVu Sans', sans-serif;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 0;
    font-size: 11px;
    line-height: 1.4;
  }

  .top-tag {
    text-align: center;
    font-size: 10px;
    color: #4A4A4A;
    padding: 8px 0 14px;
  }
  .top-tag .brand { color: #8B1A2F; font-weight: bold; }

  /* GRID 2x2 : layout à la Tikerama */
  table.ticket-grid {
    width: 100%;
    border-collapse: collapse;
  }
  table.ticket-grid td {
    vertical-align: top;
    padding: 22px;
  }

  /* Bordures pointillées façon découpe Tikerama */
  .tl { border: 2px dashed #6B6B6B; border-right: none; border-bottom: none; width: 40%; }
  .tr { border: 2px dashed #6B6B6B; border-bottom: none; }
  .bl { border: 2px dashed #6B6B6B; border-right: none; border-top: none; width: 40%; }
  .br { border: 2px dashed #6B6B6B; border-top: none; }

  /* Bloc QR */
  .qr-label {
    text-align: center;
    font-size: 11px;
    color: #000;
    margin: 0 0 12px;
    line-height: 1.35;
  }
  .qr-holder {
    text-align: center;
    padding: 4px;
  }

  /* Bloc titre + infos event */
  .event-title {
    font-size: 22px;
    font-weight: bold;
    color: #000;
    margin: 0 0 16px;
    line-height: 1.15;
  }
  .info-line {
    margin: 6px 0;
    font-size: 12px;
    color: #000;
  }
  .info-line .icon {
    display: inline-block;
    width: 22px;
    height: 12px;
    background: #8B1A2F;
    color: #fff;
    text-align: center;
    font-size: 9px;
    font-weight: bold;
    line-height: 12px;
    margin-right: 6px;
    letter-spacing: 0;
  }
  .info-line strong {
    color: #000;
  }
  .info-line .amount {
    background: #C9A961;
    color: #000;
    padding: 2px 8px;
    font-weight: bold;
    display: inline-block;
    margin-left: 4px;
  }

  /* Meta commande (souligné style Tikerama) */
  .meta-line {
    margin: 4px 0;
    font-size: 11px;
    color: #000;
  }
  .meta-line .k {
    text-decoration: underline;
    color: #000;
  }
  .meta-line .v {
    color: #000;
    font-family: 'DejaVu Sans Mono', monospace;
  }
  .meta-block {
    margin-top: 22px;
  }

  /* Bas gauche : catégorie event */
  .category-label {
    font-size: 11px;
    color: #000;
    margin: 0 0 10px;
  }

  /* Bas droit : assistance */
  .assist-title {
    font-size: 13px;
    font-weight: bold;
    color: #000;
    margin: 0 0 6px;
  }
  .assist-text {
    font-size: 11px;
    color: #000;
    margin: 0 0 14px;
    line-height: 1.45;
  }
  .assist-text .phone { color: #8B1A2F; }

  /* Legal en bas */
  .legal-title {
    font-size: 11px;
    font-weight: bold;
    color: #000;
    margin: 30px 0 8px;
  }
  .legal {
    font-size: 8.5px;
    color: #000;
    line-height: 1.5;
    text-align: justify;
  }

  .copyright {
    margin-top: 22px;
    text-align: center;
    font-size: 9px;
    color: #666;
  }
  .copyright a { color: #8B1A2F; text-decoration: none; font-weight: bold; }
</style>
</head>
<body>

<div class="top-tag">
  E-ticket officiel <span class="brand">NEW WINE CHURCH</span>, présente ce ticket à l'entrée pour valider ta place.
</div>

<table class="ticket-grid">
  {{-- Ligne haut : QR (gauche) + Infos event (droite) --}}
  <tr>
    <td class="tl">
      <p class="qr-label">Fais scanner ce QR code<br/>pour valider ton entrée</p>
      <div class="qr-holder">
        @if($qrPngPath ?? null)
          <img src="{{ $qrPngPath }}" alt="QR" style="width:200px;height:200px;display:block;margin:0 auto;">
        @elseif($qrSvgPath ?? null)
          <div style="width:200px;height:200px;margin:0 auto;">
            {!! file_get_contents($qrSvgPath) !!}
          </div>
        @endif
      </div>
    </td>
    <td class="tr">
      <h1 class="event-title">{{ $event->title }}</h1>

      @if($event->starts_at)
        <p class="info-line">
          <span class="icon">DATE</span>
          <strong>
            {{ $event->starts_at->locale('fr')->isoFormat('ddd D MMMM YYYY [à] HH[h]mm') }}
          </strong>
        </p>
      @endif

      @if($event->location)
        <p class="info-line">
          <span class="icon">LIEU</span>
          {{ $event->location }}
          @if($event->address)<br/><span style="display:inline-block;width:28px;"></span><span style="color:#4A4A4A;font-size:10px;">{{ $event->address }}</span>@endif
        </p>
      @endif

      <p class="info-line">
        <span class="icon">TYPE</span>
        @if(($ticket->price_fcfa ?? 0) > 0)
          @if($ticket->ticketType)<strong>{{ $ticket->ticketType->name }},</strong>@endif
          <span class="amount">{{ number_format($ticket->price_fcfa, 0, ',', ' ') }} F CFA</span>
        @else
          <span class="amount">ENTRÉE GRATUITE</span>
        @endif
      </p>

      <div class="meta-block">
        <p class="meta-line">
          <span class="k">N° de commande</span> : <span class="v">{{ $ticket->order_code }}</span>
        </p>
        <p class="meta-line">
          <span class="k">N° du ticket</span> : <span class="v">{{ $ticket->ticket_number }}</span>
        </p>
        <p class="meta-line">
          <span class="k">Au nom de</span> : <span class="v">{{ $ticket->full_name ?? ($ticket->first_name.' '.$ticket->last_name) }}</span>
        </p>
        <p class="meta-line">
          <span class="k">Adresse e-mail</span> : <span class="v">{{ $ticket->email }}</span>
        </p>
        @if($ticket->phone)
          <p class="meta-line">
            <span class="k">Téléphone</span> : <span class="v">{{ $ticket->phone }}</span>
          </p>
        @endif
      </div>
    </td>
  </tr>

  {{-- Ligne bas : Affiche event (gauche) + Assistance (droite) --}}
  <tr>
    <td class="bl">
      @if(($coverPngPath ?? null) && @is_file($coverPngPath))
        <img src="{{ $coverPngPath }}" alt=""
             style="max-width:220px;max-height:220px;display:block;margin:8px auto 0;">
      @else
        <table style="width:220px;height:180px;margin:8px auto 0;background:#F5F1E9;border:1px dashed #D5CFB8;">
          <tr><td style="text-align:center;color:#8B7A65;font-size:10px;font-style:italic;">
            Affiche non disponible
          </td></tr>
        </table>
      @endif
    </td>
    <td class="br">
      <p class="assist-title">Des questions à propos de<br/>l'événement ?</p>
      <p class="assist-text">
        Appelle le numéro d'assistance fourni par<br/>l'organisateur :
        @if($event->support_phone)
          <span class="phone">{{ $event->support_phone }}</span>
        @else
          <span class="phone">contact@newinechurch.org</span>
        @endif
      </p>

      <p class="assist-title">Retrouve ton ticket en ligne</p>
      <p class="assist-text">
        Un lien personnel t'a été envoyé par email.<br/>
        Il permet de revoir, télécharger ou annuler ta réservation.
      </p>
    </td>
  </tr>
</table>

<p class="legal-title">DISPOSITIONS GÉNÉRALES</p>
<p class="legal">
Ce ticket est individuel et à usage unique. Il est conservé de façon sécurisée pendant toute la période de l'événement dans le compte NEW WINE CHURCH qui a servi lors de l'inscription. Nous déconseillons l'impression papier pour des raisons écologiques et de sécurité. Mais, en cas d'impression papier, veillez à protéger le QR code, c'est une preuve intangible de votre inscription. Toute quelconque falsification, d'une quelconque manière et à quelque fin que ce soit, est formellement et expressément interdite, sous peine d'éventuelles poursuites. L'utilisation quelconque de ce ticket emporte contractuellement l'acceptation sans réserve de l'intégralité des conditions générales applicables au moment de l'inscription. Sauf accord préalable et écrit de NEW WINE CHURCH, il est formellement et expressément interdit d'offrir à la vente, vendre, revendre, échanger ou transférer ce ticket, d'une quelconque manière et à quelque fin que ce soit. NEW WINE CHURCH suit les politiques de sécurité de l'organisateur ainsi que les lois et restrictions locales.
</p>

<p class="copyright">
  © {{ date('Y') }}
  <a href="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}">NEW WINE CHURCH</a>,
  tous droits réservés.
</p>

</body>
</html>
