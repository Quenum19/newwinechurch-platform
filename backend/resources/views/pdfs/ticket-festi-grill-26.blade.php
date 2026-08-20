{{--
    Ticket PDF — Festi Grill '26 (design final validé par le user)
    dompdf-safe : tables, couleurs plates, aucun flex/grid/gradient/box-shadow
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>E-ticket — Festi Grill '26</title>
<style>
  /* Marges page = 0 : le ticket occupe toute la page A4, aucun blanc autour. */
  @page { size: A4 portrait; margin: 0; }
  body { margin: 0; padding: 0; font-family: DejaVu Sans, Helvetica, sans-serif; font-size: 12px; color: #f6ece3; background: #120d0b; }
  table { border-collapse: collapse; width: 100%; }
  td { vertical-align: top; }
  .mono { font-family: DejaVu Sans Mono, monospace; }
  .k { font-size: 8px; font-weight: bold; letter-spacing: 1.8px; color: #f0a71b; }
  .k-d { font-size: 8px; font-weight: bold; letter-spacing: 1.8px; color: #9a8b7e; }
  .v { font-size: 13px; font-weight: bold; color: #ffffff; padding-top: 4px; line-height: 1.25; }
  .s { font-size: 10px; color: #b6a79b; padding-top: 3px; line-height: 1.35; }
  .li { font-size: 11px; color: #f6ece3; padding-top: 4px; }
  .mountain-badge {
    display: inline-block;
    background: #f0a71b;
    color: #120d0b;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 1.5px;
    padding: 5px 11px;
    margin-top: 6px;
  }
</style>
</head>
<body>

@php
    // Mapping enum → libellé humain pour l'affichage
    $mountainLabels = [
        'religion'          => 'Religion',
        'media'             => 'Média',
        'gouvernement'      => 'Gouvernement',
        'economie'          => 'Économie',
        'education'         => 'Éducation',
        'famille'           => 'Famille',
        'art_musique_sport' => 'Art · Musique · Sport',
    ];
    $mountainLabel = ($mountain ?? null) ? ($mountainLabels[$mountain] ?? $mountain) : null;
@endphp

<table style="width:100%;margin:0;background:#120d0b;border:0">

  {{-- BANDEAU --}}
  <tr>
    <td style="background:#120d0b;padding:11px 20px;border-bottom:2px solid #f0a71b">
      <table>
        <tr>
          <td style="color:#ffffff;font-size:12.5px;font-weight:bold;letter-spacing:2.4px">NEW WINE CHURCH
            <div style="font-size:8px;letter-spacing:2.6px;color:#8d7f74;padding-top:3px">E-TICKET OFFICIEL &middot; NON TRANSF&Eacute;RABLE</div>
          </td>
          <td class="mono" style="text-align:right;width:130px">
            <span style="font-size:9px;font-weight:bold;letter-spacing:1.6px;color:#120d0b;background:#f0a71b;padding:6px 11px">1 PERSONNE</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  {{-- VISUEL OFFICIEL --}}
  <tr>
    <td style="padding:0">
      @if($heroPath ?? null)
        <img src="{{ $heroPath }}" alt="Festi Grill'26" style="width:100%;display:block">
      @endif
    </td>
  </tr>

  {{-- DATE / HEURE --}}
  <tr>
    <td style="background:#f0a71b;padding:9px 20px">
      <table>
        <tr>
          <td style="color:#120d0b;font-size:15px;font-weight:bold;letter-spacing:1.2px">
            @if($event->starts_at)
              {{ strtoupper($event->starts_at->locale('fr')->isoFormat('ddd D MMMM YYYY')) }}
            @else
              SAM. 12 SEPTEMBRE 2026
            @endif
          </td>
          <td style="text-align:right;color:#120d0b;font-size:15px;font-weight:bold;letter-spacing:1.2px">
            @if($event->starts_at)
              &Agrave; {{ $event->starts_at->format('G') }} HEURES
            @else
              &Agrave; 15 HEURES
            @endif
          </td>
        </tr>
      </table>
    </td>
  </tr>

  {{-- LIEU + PLACE --}}
  <tr>
    <td style="padding:0">
      <table>
        <tr>
          <td style="width:58%;padding:14px 20px;border-right:1px solid #2a2019">
            <div class="k-d">LIEU</div>
            <div class="v">{{ $event->location ?? 'Église La Maison de la Destinée' }}</div>
            <div class="s">{{ $event->address ?? 'Riviera Bonoumin, Rue 65 · Abidjan' }}</div>
          </td>
          <td style="padding:14px 20px;background:#1b1310">
            <div class="k">TYPE DE PLACE</div>
            <div class="v" style="font-size:19px;color:#f0a71b;letter-spacing:.5px">
              @if(($ticket->price_fcfa ?? 0) > 0)
                {{ number_format($ticket->price_fcfa, 0, ',', ' ') }} F CFA
              @else
                ENTR&Eacute;E GRATUITE
              @endif
            </div>
            <div class="s">{{ $ticket->ticketType->name ?? 'Place Festi Grill' }} &mdash; 1 personne</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  {{-- MENU --}}
  <tr>
    <td style="padding:0;border-top:1px solid #2a2019">
      <table>
        <tr>
          <td style="width:58%;padding:13px 20px;border-right:1px solid #2a2019">
            <div class="k">AU MENU</div>
            <div class="li">Porc brais&eacute; &nbsp;&middot;&nbsp; Porc saut&eacute; revenir &nbsp;&middot;&nbsp; Poulet brais&eacute;</div>
          </td>
          <td style="padding:13px 20px">
            <div class="k">ACCOMPAGNEMENT</div>
            <div class="li">Alloco &nbsp;&middot;&nbsp; Atti&eacute;k&eacute; &nbsp;&middot;&nbsp; Frites</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  {{-- PERFORATION --}}
  <tr>
    <td style="padding:0;background:#120d0b;border-top:2px dashed #4a3a2c;height:8px;font-size:1px">&nbsp;</td>
  </tr>

  {{-- QR + PORTEUR --}}
  <tr>
    <td style="padding:18px 20px;background:#1b1310">
      <table>
        <tr>
          <td style="width:158px">
            <table style="width:146px;background:#ffffff">
              <tr><td style="padding:8px">
                @if($qrPngPath ?? null)
                  <img src="{{ $qrPngPath }}" alt="QR" style="width:130px;height:130px;display:block">
                @elseif($qrSvgPath ?? null)
                  <div style="width:130px;height:130px">{!! file_get_contents($qrSvgPath) !!}</div>
                @endif
              </td></tr>
            </table>
            <div class="k" style="padding-top:7px;text-align:center;width:146px">SCAN &Agrave; L'ENTR&Eacute;E</div>
          </td>
          <td style="padding-left:20px">
            <div class="k-d">AU NOM DE</div>
            <div style="font-size:26px;font-weight:bold;color:#ffffff;line-height:1.15;padding-top:3px">{{ $ticket->full_name ?? ($ticket->first_name.' '.$ticket->last_name) }}</div>

            @if($mountainLabel)
              <div style="padding-top:8px">
                <span class="k-d">SPH&Egrave;RE D'INFLUENCE :</span>
                <span class="mountain-badge">{{ strtoupper($mountainLabel) }}</span>
              </div>
            @endif

            <table style="margin-top:13px">
              <tr>
                <td style="width:33%;background:#120d0b;border:1px solid #2a2019;padding:8px 11px">
                  <div class="k-d">N&deg; TICKET</div>
                  <div class="mono" style="font-size:11px;color:#f0a71b;padding-top:3px">{{ $ticket->ticket_number }}</div>
                </td>
                <td style="width:33%;background:#120d0b;border:1px solid #2a2019;padding:8px 11px;border-left:0">
                  <div class="k-d">COMMANDE</div>
                  <div class="mono" style="font-size:11px;color:#f0a71b;padding-top:3px">{{ $ticket->order_code }}</div>
                </td>
                <td style="background:#120d0b;border:1px solid #2a2019;padding:8px 11px;border-left:0">
                  <div class="k-d">CODE COURT</div>
                  <div class="mono" style="font-size:11px;color:#f0a71b;padding-top:3px">{{ strtoupper($ticket->short_code ?? '—') }}</div>
                </td>
              </tr>
            </table>

            @if($ticket->email)
              <div class="s" style="padding-top:8px">
                <span class="k-d">E-MAIL :</span>
                <span style="color:#f6ece3">{{ $ticket->email }}</span>
              </div>
            @endif
            @if($ticket->phone)
              <div class="s" style="padding-top:3px">
                <span class="k-d">T&Eacute;L&Eacute;PHONE :</span>
                <span style="color:#f6ece3">{{ $ticket->phone }}</span>
              </div>
            @endif

            <div class="s" style="padding-top:11px">Ticket individuel &agrave; usage unique. Le QR code n'est scann&eacute; qu'une seule fois &mdash; garde-le pour toi.</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  {{-- PIED --}}
  <tr>
    <td style="background:#120d0b;padding:9px 20px;border-top:1px solid #2a2019">
      <table>
        <tr>
          <td style="color:#b6a79b;font-size:10px">Assistance &middot; <span style="color:#ffffff;font-weight:bold">{{ $event->support_phone ?: '+225 07 57 07 67 74' }}</span></td>
          <td class="mono" style="text-align:right;color:#f0a71b;font-size:9px;letter-spacing:1.6px">WWW.NEWWINECHURCH.ORG</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<div style="padding:9px 20px;background:#0a0705;font-size:8px;line-height:1.5;color:#9a8b7e;text-align:center">
  Un lien personnel vous a &eacute;t&eacute; envoy&eacute; par e-mail pour revoir, t&eacute;l&eacute;charger ou annuler la r&eacute;servation.
  Toute falsification, revente ou transfert de ce ticket est interdit. &copy; {{ date('Y') }} NEW WINE CHURCH.
</div>

</body>
</html>
