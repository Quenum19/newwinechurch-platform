{{--
  Fiche PDF paysage — liste des enrôlements d'un événement.

  Design NWC ivoire/bordeaux/or, tableau tabulaire large en paysage A4,
  optimisé pour l'équipe accueil qui appelle les contacts.

  Variables :
    $event       (Event)
    $enrolements (Collection<MembershipRequest>)
    $logoDataUri (string|null)
    $generatedAt (Carbon)
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Enrôlements — {{ $event->title }}</title>
<style>
  @page { margin: 18mm 15mm 18mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: DejaVu Sans, sans-serif;
    color: #1F1A14;
    font-size: 9px;
  }

  /* En-tête */
  .header {
    display: table;
    width: 100%;
    background: #FAF6EE;
    border-bottom: 2pt solid #C9A961;
    margin-bottom: 3mm;
    padding: 3mm 4mm;
  }
  .header-left { display: table-cell; width: 60%; vertical-align: middle; }
  .header-right { display: table-cell; width: 40%; text-align: right; vertical-align: middle; }
  .header .logo { height: 40px; vertical-align: middle; margin-right: 6mm; }
  .header .brand {
    display: inline-block;
    vertical-align: middle;
    font-size: 16pt;
    font-weight: bold;
    color: #8B1A2F;
    letter-spacing: 0.05em;
  }
  .header .meta {
    font-size: 8.5pt;
    color: #6B5F4E;
    line-height: 1.4;
  }
  .header .meta strong { color: #8B1A2F; }

  .title-band {
    background: #8B1A2F;
    color: #FFF;
    padding: 3mm 5mm;
    margin-bottom: 4mm;
    font-size: 12pt;
    font-weight: bold;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-align: center;
  }

  /* Table */
  table.enrol {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }
  table.enrol thead {
    display: table-header-group; /* répète l'en-tête sur chaque page */
  }
  table.enrol thead th {
    background: #6B1422;
    color: #FFF;
    padding: 2.5mm 2mm;
    font-weight: bold;
    text-align: center;
    border: 0.5pt solid #4A0E1A;
    font-size: 8pt;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  table.enrol tbody tr {
    page-break-inside: avoid;
  }
  table.enrol tbody td {
    padding: 2.2mm 2mm;
    border: 0.5pt solid #E5E0D0;
    vertical-align: top;
  }
  table.enrol tbody tr:nth-child(even) td { background: #FAF6EE; }
  table.enrol tbody tr:nth-child(odd) td { background: #FFF; }

  .num { text-align: center; font-weight: bold; color: #6B5F4E; width: 6mm; }
  .date { text-align: center; width: 12mm; color: #6B5F4E; }
  .nom { font-weight: bold; }
  .center { text-align: center; }

  .badge {
    display: inline-block;
    padding: 0.5mm 1.5mm;
    border-radius: 2mm;
    font-size: 7.5pt;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }
  .badge-nouveau  { background: #FFF7E0; color: #8A6D1F; border: 0.5pt solid #C9A961; }
  .badge-contacte { background: #E0EBFF; color: #1E40AF; border: 0.5pt solid #2563EB; }
  .badge-converti { background: #DFF5E4; color: #14532D; border: 0.5pt solid #15803D; }
  .badge-ecarte   { background: #F3F4F6; color: #4B5563; border: 0.5pt solid #9CA3AF; }

  .notes {
    font-size: 8pt;
    color: #4A3F32;
    font-style: italic;
    line-height: 1.4;
  }

  .empty {
    text-align: center;
    padding: 20mm 0;
    color: #A89A82;
    font-style: italic;
  }

  .footer {
    position: fixed;
    bottom: 4mm;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 7.5pt;
    color: #A89A82;
    font-style: italic;
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-left">
    @if($logoDataUri)
      <img src="{{ $logoDataUri }}" class="logo" alt="NWC">
    @endif
    <span class="brand">NEW WINE CHURCH</span>
  </div>
  <div class="header-right">
    <div class="meta">
      Généré le <strong>{{ $generatedAt->locale('fr')->isoFormat('LL [à] HH:mm') }}</strong><br/>
      {{ $enrolements->count() }} enrôlement{{ $enrolements->count() > 1 ? 's' : '' }}
    </div>
  </div>
</div>

<div class="title-band">
  Enrôlements — {{ $event->title }}
</div>

@if($enrolements->isEmpty())
  <div class="empty">
    Aucun enrôlement pour l'instant.
  </div>
@else
<table class="enrol">
  <thead>
    <tr>
      <th style="width:6mm">#</th>
      <th style="width:12mm">Date</th>
      <th style="width:22mm">Prénom</th>
      <th style="width:24mm">Nom</th>
      <th style="width:24mm">Téléphone</th>
      <th style="width:24mm">WhatsApp</th>
      <th style="width:26mm">Lieu d'habitation</th>
      <th style="width:26mm">Département</th>
      <th style="width:26mm">Montagne</th>
      <th style="width:18mm">Statut</th>
      <th>Notes</th>
    </tr>
  </thead>
  <tbody>
    @foreach($enrolements as $i => $r)
      @php
        $whatsapp = null;
        if ($r->motivation && preg_match('/WhatsApp\s*:\s*([^·]+)/i', $r->motivation, $m)) {
            $whatsapp = trim($m[1]);
        }
        $statut = $r->enrollment_status ?: 'nouveau';
        $mountain = \App\Http\Controllers\Admin\EventEnrolementsController::mountainLabel($r->interested_mountain);
      @endphp
      <tr>
        <td class="num">{{ $i + 1 }}</td>
        <td class="date">{{ $r->created_at?->format('d/m') ?? '—' }}</td>
        <td>{{ $r->first_name ?? '—' }}</td>
        <td class="nom">{{ $r->name ?? '—' }}</td>
        <td class="center">{{ $r->phone ?? '—' }}</td>
        <td class="center">{{ $whatsapp ?? '—' }}</td>
        <td>{{ $r->city ?? '—' }}</td>
        <td>{{ $r->interestedDepartment?->name ?? '—' }}</td>
        <td>{{ $mountain ?? '—' }}</td>
        <td class="center">
          <span class="badge badge-{{ $statut }}">
            {{ match($statut) {
              'contacte' => 'Contacté',
              'converti' => 'Converti',
              'ecarte'   => 'Écarté',
              default    => 'Nouveau',
            } }}
          </span>
        </td>
        <td class="notes">{{ $r->admin_notes ?? '' }}</td>
      </tr>
    @endforeach
  </tbody>
</table>
@endif

<div class="footer">
  © New Wine Church · Document confidentiel · Liste enrôlements événement
</div>

</body>
</html>
