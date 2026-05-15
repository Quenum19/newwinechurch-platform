<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Anniversaires {{ $monthName }} — NWC</title>
<style>
  @page { margin: 22mm 16mm 18mm 16mm; }
  body { font-family: DejaVu Sans, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.4; }

  .pdf-header { width: 100%; border-bottom: 2px solid #8B1A2F; padding-bottom: 8px; margin-bottom: 14px; }
  .pdf-header td { vertical-align: middle; }
  .brand { font-family: serif; color: #8B1A2F; font-weight: bold; font-size: 16px; letter-spacing: 0.04em; }
  .brand small { display: block; font-size: 9px; color: #666; font-weight: normal; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 2px; }

  h1.report-title { font-size: 19px; color: #8B1A2F; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
  .report-subtitle { color: #666; font-size: 10px; margin-bottom: 18px; }

  .summary { background: #f5e9ea; border-left: 3px solid #8B1A2F; padding: 10px 14px; margin-bottom: 18px; font-size: 12px; }
  .summary strong { color: #8B1A2F; font-size: 14px; }

  table.list { width: 100%; border-collapse: collapse; }
  table.list th { background: #f5e9ea; color: #8B1A2F; padding: 8px 10px; text-align: left; font-size: 10px;
                  text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 2px solid #d8b2b9; }
  table.list td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #eee; }
  table.list tr:nth-child(even) td { background: #fafafa; }
  table.list .day { font-weight: bold; color: #8B1A2F; text-align: center; width: 50px; }
  table.list .name { font-weight: 600; }
  table.list .age { text-align: center; color: #666; font-size: 10px; width: 60px; }

  .pdf-footer { position: fixed; bottom: -14mm; left: 0; right: 0; text-align: center; font-size: 9px; color: #888; }
  .pdf-footer .pagenum:after { content: counter(page); }
</style>
</head>
<body>

<table class="pdf-header" cellpadding="0" cellspacing="0">
  <tr>
    <td style="width: 60px;">
      @if(file_exists(public_path('images/logo_newwine.png')))
        <img src="{{ public_path('images/logo_newwine.png') }}" alt="NWC" style="height: 44px;">
      @endif
    </td>
    <td>
      <div class="brand">
        NEW WINE CHURCH
        <small>La Maison de la Destinée</small>
      </div>
    </td>
    <td style="text-align: right; font-size: 9px; color: #666;">
      Liste anniversaires<br>
      <strong style="color: #8B1A2F;">{{ now()->isoFormat('DD MMM YYYY') }}</strong>
    </td>
  </tr>
</table>

<h1 class="report-title">🎂 Anniversaires — {{ $monthName }}</h1>
<p class="report-subtitle">Liste des membres à fêter ce mois.</p>

<div class="summary">
  <strong>{{ $count }}</strong> {{ $count > 1 ? 'membres fêtent' : 'membre fête' }} leur anniversaire en
  <strong>{{ $monthName }}</strong>.
  N'oublie pas de leur souhaiter une belle journée 🎉
</div>

<table class="list">
  <thead>
    <tr>
      <th style="width: 50px; text-align: center;">Jour</th>
      <th>Nom complet</th>
      <th style="width: 60px; text-align: center;">Âge</th>
      <th>Téléphone</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    @foreach($members as $m)
      @php
        $birth = \Carbon\Carbon::parse($m->birth_date);
        $age = $year - $birth->year; // âge atteint cette année
      @endphp
      <tr>
        <td class="day">{{ $birth->format('d') }}</td>
        <td class="name">{{ $m->full_name ?? trim(($m->first_name ?? '').' '.($m->name ?? '')) }}</td>
        <td class="age">{{ $age }} ans</td>
        <td>{{ $m->phone ?? '—' }}</td>
        <td style="font-size: 10px; color: #555;">{{ $m->email }}</td>
      </tr>
    @endforeach
  </tbody>
</table>

<div class="pdf-footer">
  New Wine Church · La Maison de la Destinée · Anniversaires {{ $monthName }} · Page <span class="pagenum"></span>
</div>

</body>
</html>
