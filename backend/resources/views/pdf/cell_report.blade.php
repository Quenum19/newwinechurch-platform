<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport cellule — {{ $cell->name ?? 'Cellule' }}</title>
<style>
  @page { margin: 22mm 16mm 18mm 16mm; }
  body { font-family: DejaVu Sans, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.4; }

  .pdf-header { width: 100%; border-bottom: 2px solid #8B1A2F; padding-bottom: 8px; margin-bottom: 14px; }
  .pdf-header td { vertical-align: middle; }
  .brand { font-family: serif; color: #8B1A2F; font-weight: bold; font-size: 16px; letter-spacing: 0.04em; }
  .brand small { display: block; font-size: 9px; color: #666; font-weight: normal; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 2px; }

  h1.report-title { font-size: 17px; color: #8B1A2F; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
  .report-subtitle { color: #666; font-size: 10px; margin-bottom: 18px; }

  .meta-box { width: 100%; background: #f5e9ea; border-left: 3px solid #8B1A2F; padding: 10px 12px; margin-bottom: 18px; }
  .meta-box td { padding: 3px 6px; font-size: 11px; }
  .meta-box .lbl { color: #666; width: 28%; }
  .meta-box .val { color: #1a1a1a; font-weight: 600; }

  .section { margin-bottom: 16px; page-break-inside: avoid; }
  .section h2 { font-size: 12px; color: #fff; background: #8B1A2F; padding: 6px 10px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.06em; }

  .field { margin-bottom: 8px; }
  .field .lbl { color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
  .field .val { color: #1a1a1a; font-size: 11px; padding: 4px 6px; border-bottom: 1px solid #ddd; min-height: 14px; }
  .field .val.multi { white-space: pre-line; background: #fafafa; border: 1px solid #eee; padding: 6px 8px; border-radius: 3px; min-height: 24px; }

  .stats-row { display: table; width: 100%; margin-bottom: 12px; }
  .stats-row .stat { display: table-cell; width: 33%; background: #fafafa; border: 1px solid #eee; padding: 8px; text-align: center; }
  .stats-row .stat .num { font-size: 18px; color: #8B1A2F; font-weight: bold; }
  .stats-row .stat .lbl { font-size: 9px; color: #666; text-transform: uppercase; }

  ul.list { margin: 4px 0 8px 0; padding-left: 18px; }
  ul.list li { padding: 2px 0; font-size: 11px; }

  .signature-box { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 10px; color: #555; }
  .signature-box strong { color: #1a1a1a; }

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
      Rapport cellule<br>
      <strong style="color: #8B1A2F;">{{ ($report->submitted_at ?? now())->isoFormat('DD MMM YYYY') }}</strong>
    </td>
  </tr>
</table>

<h1 class="report-title">Rapport hebdomadaire — {{ $cell->name ?? '—' }}</h1>
<p class="report-subtitle">
  Cellule {{ $cell->zone ?? '' }} · Semaine du
  {{ $report->week_start?->isoFormat('DD MMM') }} au
  {{ $report->week_end?->isoFormat('DD MMM YYYY') }}
</p>

<table class="meta-box" cellpadding="0" cellspacing="0">
  <tr>
    <td class="lbl">Cellule</td><td class="val">{{ $cell->name ?? '—' }}</td>
    <td class="lbl">Leader</td><td class="val">{{ $leader?->full_name ?? '—' }}</td>
  </tr>
  <tr>
    <td class="lbl">Période</td>
    <td class="val">
      {{ $report->week_start?->isoFormat('DD/MM/YYYY') }}
      → {{ $report->week_end?->isoFormat('DD/MM/YYYY') }}
    </td>
    <td class="lbl">Soumis le</td>
    <td class="val">{{ $report->submitted_at?->isoFormat('DD/MM/YYYY HH:mm') }}</td>
  </tr>
  <tr>
    <td class="lbl">Statut</td><td class="val" style="color: #1f7a3a;">{{ strtoupper($report->status) }}</td>
    <td class="lbl">Suivi requis</td>
    <td class="val">{{ $report->needs_followup ? '⚠️ Oui' : 'Non' }}</td>
  </tr>
</table>

{{-- Stats clés --}}
<div class="section">
  <h2>Chiffres clés</h2>
  <div class="stats-row">
    <div class="stat"><div class="num">{{ $report->attendance_count ?? 0 }}</div><div class="lbl">Présents</div></div>
    <div class="stat"><div class="num">{{ $report->new_members ?? 0 }}</div><div class="lbl">Nouveaux</div></div>
    <div class="stat"><div class="num">{{ round($attendanceRate) }}%</div><div class="lbl">Taux présence</div></div>
  </div>
</div>

{{-- Activités --}}
@if($report->activities && count($report->activities))
  <div class="section">
    <h2>Activités de la semaine</h2>
    <ul class="list">
      @foreach($report->activities as $a)
        <li>{{ is_array($a) ? ($a['label'] ?? json_encode($a)) : $a }}</li>
      @endforeach
    </ul>
  </div>
@endif

{{-- Prières --}}
@if($report->prayer_requests && count($report->prayer_requests))
  <div class="section">
    <h2>Sujets de prière</h2>
    <ul class="list">
      @foreach($report->prayer_requests as $p)
        <li>{{ is_array($p) ? ($p['label'] ?? json_encode($p)) : $p }}</li>
      @endforeach
    </ul>
  </div>
@endif

{{-- Témoignages --}}
@if($report->highlights)
  <div class="section">
    <h2>Témoignages & points forts</h2>
    <div class="field"><div class="val multi">{{ $report->highlights }}</div></div>
  </div>
@endif

{{-- Défis --}}
@if($report->challenges)
  <div class="section">
    <h2>Défis</h2>
    <div class="field"><div class="val multi">{{ $report->challenges }}</div></div>
  </div>
@endif

<div class="signature-box">
  <table width="100%">
    <tr>
      <td style="width: 50%;">
        Soumis par <strong>{{ $leader?->full_name ?? '—' }}</strong><br>
        Leader de la cellule {{ $cell->name ?? '' }}
      </td>
      <td style="width: 50%; text-align: right;">
        Date de soumission :
        <strong>{{ $report->submitted_at?->isoFormat('DD MMMM YYYY') }}</strong>
      </td>
    </tr>
  </table>
</div>

<div class="pdf-footer">
  New Wine Church · La Maison de la Destinée · Rapport cellule #{{ $report->id }} · Page <span class="pagenum"></span>
</div>

</body>
</html>
