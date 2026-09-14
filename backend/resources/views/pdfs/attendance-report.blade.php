{{-- Rapport de présence PDF — design pro NWC (A4, marges normales) --}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport de présence — {{ $event->title }}</title>
<style>
  @page { size: A4 portrait; margin: 20mm 15mm 20mm 15mm; }
  * { box-sizing: border-box; }
  body { font-family: DejaVu Sans, Helvetica, sans-serif; font-size: 11px; color: #1F1A14; margin: 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { vertical-align: top; padding: 6px 8px; }

  .header { border-bottom: 3px solid #8B1A2F; padding-bottom: 12px; margin-bottom: 16px; }
  .header .brand { font-size: 20px; font-weight: bold; color: #8B1A2F; letter-spacing: 2px; }
  .header .tag { font-size: 8px; letter-spacing: 3px; color: #A89A82; text-transform: uppercase; margin-top: 2px; }
  .logo { width: 60px; height: auto; }

  h1 { font-size: 18px; margin: 8px 0 4px 0; color: #1F1A14; }
  .subtitle { color: #6B5F4E; font-size: 11px; margin-bottom: 14px; }

  .kpi-band { margin-bottom: 16px; }
  .kpi-cell {
    background: #FAF6EE;
    border: 1px solid #E8DFC9;
    padding: 10px 8px;
    text-align: center;
  }
  .kpi-label { font-size: 8px; letter-spacing: 2px; color: #8B1A2F; font-weight: bold; text-transform: uppercase; }
  .kpi-value { font-size: 22px; font-weight: bold; color: #1F1A14; margin-top: 4px; }
  .kpi-value.accent { color: #8B1A2F; }

  .section-title {
    background: #6B1422;
    color: #fff;
    padding: 8px 12px;
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: bold;
  }

  table.data th {
    background: #8B1A2F;
    color: #fff;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    text-align: left;
    padding: 8px;
  }
  table.data td {
    border-bottom: 1px solid #E5E0D0;
    font-size: 10px;
    padding: 6px 8px;
  }
  table.data tr.even td { background: #FAF6EE; }
  .num { text-align: center; font-weight: bold; color: #8B1A2F; }
  .code { font-family: DejaVu Sans Mono, monospace; font-size: 9px; letter-spacing: 1px; }

  .footer {
    position: fixed;
    bottom: -12mm;
    left: 0; right: 0;
    text-align: center;
    color: #A89A82;
    font-size: 8px;
    letter-spacing: 1.5px;
    font-style: italic;
  }

  .empty {
    padding: 40px;
    text-align: center;
    color: #6B5F4E;
    font-style: italic;
    border: 1px dashed #E5E0D0;
  }
</style>
</head>
<body>

<div class="header">
  <table>
    <tr>
      <td style="width: 70px;">
        @if($logoDataUri)
          <img src="{{ $logoDataUri }}" alt="NWC" class="logo">
        @endif
      </td>
      <td>
        <div class="brand">NEW WINE CHURCH</div>
        <div class="tag">Rapport de présence · événement</div>
      </td>
      <td style="text-align: right; font-size: 9px; color: #A89A82;">
        Généré le<br>
        <strong style="color: #1F1A14; font-size: 10px;">
          {{ $generatedAt->locale('fr')->isoFormat('LL [à] HH:mm') }}
        </strong>
      </td>
    </tr>
  </table>
</div>

<h1>{{ $event->title }}</h1>
<p class="subtitle">
  @if($event->starts_at)
    {{ $event->starts_at->locale('fr')->isoFormat('dddd D MMMM YYYY [à] HH:mm') }}
  @endif
  @if($event->location)
    · {{ $event->location }}
  @endif
</p>

{{-- KPI band --}}
<table class="kpi-band">
  <tr>
    <td class="kpi-cell" style="width: 25%;">
      <div class="kpi-label">Attendus</div>
      <div class="kpi-value">{{ $kpi['total_expected'] }}</div>
    </td>
    <td style="width: 1%;"></td>
    <td class="kpi-cell" style="width: 25%;">
      <div class="kpi-label">Présents</div>
      <div class="kpi-value accent">{{ $kpi['total_arrived'] }}</div>
    </td>
    <td style="width: 1%;"></td>
    <td class="kpi-cell" style="width: 25%;">
      <div class="kpi-label">No-shows</div>
      <div class="kpi-value" style="color: #B91C1C;">{{ $kpi['no_shows_count'] }}</div>
    </td>
    <td style="width: 1%;"></td>
    <td class="kpi-cell" style="width: 23%;">
      <div class="kpi-label">Taux de présence</div>
      <div class="kpi-value">{{ $kpi['taux_presence'] ?? 0 }}%</div>
    </td>
  </tr>
</table>

<div class="section-title">
  {{ $section_label }} · {{ $rows->count() }} personne(s)
</div>

@if($rows->count() === 0)
  <div class="empty">Aucune ligne à afficher pour cette section.</div>
@else
  <table class="data">
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">N°</th>
        <th>Nom</th>
        <th>Prénom</th>
        <th style="width: 90px;">Téléphone</th>
        <th>Email</th>
        <th style="width: 70px;">Type</th>
        <th style="width: 60px; text-align: center;">Code</th>
      </tr>
    </thead>
    <tbody>
      @foreach($rows as $i => $t)
        <tr class="{{ $i % 2 === 1 ? 'even' : '' }}">
          <td class="num">{{ $i + 1 }}</td>
          <td><strong>{{ $t->last_name ?? '—' }}</strong></td>
          <td>{{ $t->first_name ?? '—' }}</td>
          <td>{{ $t->phone ?? '—' }}</td>
          <td style="font-size: 9px;">{{ $t->email ?? '—' }}</td>
          <td>{{ $t->ticketType?->name ?? '—' }}</td>
          <td class="code">{{ strtoupper($t->short_code ?? '—') }}</td>
        </tr>
      @endforeach
    </tbody>
  </table>
@endif

<div class="footer">
  © New Wine Church · Document confidentiel · {{ $event->title }}
</div>

</body>
</html>
