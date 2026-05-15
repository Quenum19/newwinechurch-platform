<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Rapport — {{ $department->name ?? 'Département' }}</title>
<style>
  @page { margin: 22mm 16mm 18mm 16mm; }
  body { font-family: DejaVu Sans, sans-serif; color: #1a1a1a; font-size: 11px; line-height: 1.4; }
  /* Header */
  .pdf-header { width: 100%; border-bottom: 2px solid #8B1A2F; padding-bottom: 8px; margin-bottom: 14px; }
  .pdf-header td { vertical-align: middle; }
  .brand { font-family: serif; color: #8B1A2F; font-weight: bold; font-size: 16px; letter-spacing: 0.04em; }
  .brand small { display: block; font-size: 9px; color: #666; font-weight: normal; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 2px; }

  /* Title */
  h1.report-title { font-size: 17px; color: #8B1A2F; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
  .report-subtitle { color: #666; font-size: 10px; margin-bottom: 18px; }

  /* Meta box */
  .meta-box { width: 100%; background: #f5e9ea; border-left: 3px solid #8B1A2F; padding: 10px 12px; margin-bottom: 18px; }
  .meta-box td { padding: 3px 6px; font-size: 11px; }
  .meta-box .lbl { color: #666; width: 28%; }
  .meta-box .val { color: #1a1a1a; font-weight: 600; }

  /* Sections */
  .section { margin-bottom: 18px; page-break-inside: avoid; }
  .section h2 { font-size: 12px; color: #fff; background: #8B1A2F; padding: 6px 10px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.06em; }
  .field { margin-bottom: 8px; }
  .field .lbl { color: #555; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
  .field .val { color: #1a1a1a; font-size: 11px; padding: 4px 6px; border-bottom: 1px solid #ddd; min-height: 14px; }
  .field .val.multi { white-space: pre-line; background: #fafafa; border: 1px solid #eee; padding: 6px 8px; border-radius: 3px; }

  /* Tables */
  table.report-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.report-table th { background: #f5e9ea; color: #8B1A2F; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid #d8b2b9; }
  table.report-table td { padding: 6px 8px; font-size: 11px; border: 1px solid #e6cdd2; vertical-align: top; }
  table.report-table .row-label { font-weight: 600; color: #8B1A2F; background: #fafafa; }

  /* Footer signature */
  .signature-box { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 10px; color: #555; }
  .signature-box strong { color: #1a1a1a; }

  /* Page footer */
  .pdf-footer { position: fixed; bottom: -14mm; left: 0; right: 0; text-align: center; font-size: 9px; color: #888; }
  .pdf-footer .pagenum:after { content: counter(page); }
</style>
</head>
<body>

{{-- Header --}}
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
      Rapport officiel<br>
      <strong style="color: #8B1A2F;">{{ ($submittedAt ?? now())->isoFormat('DD MMM YYYY') }}</strong>
    </td>
  </tr>
</table>

{{-- Title --}}
<h1 class="report-title">
  Rapport — {{ $department->name ?? '—' }}
</h1>
<p class="report-subtitle">
  {{ $template?->name ?? 'Rapport périodique' }}
  · Version {{ $template?->version ?? 1 }}
  · {{ $template?->frequency === 'weekly' ? 'Hebdomadaire' : 'Mensuel' }}
</p>

{{-- Meta --}}
<table class="meta-box" cellpadding="0" cellspacing="0">
  <tr>
    <td class="lbl">Département</td><td class="val">{{ $department->name ?? '—' }}</td>
    <td class="lbl">Gouverneur</td><td class="val">{{ $governor?->full_name ?? '—' }}</td>
  </tr>
  <tr>
    <td class="lbl">Période</td>
    <td class="val">
      {{ $report->period_start?->isoFormat('DD/MM/YYYY') }}
      → {{ $report->period_end?->isoFormat('DD/MM/YYYY') }}
    </td>
    <td class="lbl">Soumis le</td>
    <td class="val">{{ $report->submitted_at?->isoFormat('DD/MM/YYYY HH:mm') }}</td>
  </tr>
  <tr>
    <td class="lbl">Type</td><td class="val">{{ $report->report_type }}</td>
    <td class="lbl">Statut</td><td class="val" style="color: #1f7a3a;">{{ strtoupper($report->status) }}</td>
  </tr>
</table>

{{-- Sections : on supporte les 2 formats du template --}}
@php
  $isSectioned = is_array($schema) && isset($schema[0]['fields']);
  $sections = $isSectioned
      ? $schema
      : [ ['title' => 'Données du rapport', 'fields' => $schema] ];
@endphp

@foreach($sections as $section)
  <div class="section">
    <h2>{{ $section['title'] ?? 'Section' }}</h2>

    @foreach(($section['fields'] ?? []) as $field)
      @php
        $key   = $field['key']   ?? null;
        $label = $field['label'] ?? $key;
        $type  = $field['type']  ?? 'text';
        $value = $key ? ($formData[$key] ?? null) : null;
      @endphp

      @if($type === 'table')
        <p class="field"><span class="lbl">{{ $label }}</span></p>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 22%;">Élément</th>
              @foreach(($field['columns'] ?? []) as $col)
                <th>{{ $col['label'] ?? $col['key'] }}</th>
              @endforeach
            </tr>
          </thead>
          <tbody>
            @foreach(($field['rows'] ?? []) as $row)
              <tr>
                <td class="row-label">{{ $row['label'] ?? $row['key'] }}</td>
                @foreach(($field['columns'] ?? []) as $col)
                  @php
                    $cell = is_array($value) ? ($value[$row['key']][$col['key']] ?? null) : null;
                    if ($cell === 'oui') $cell = 'Oui';
                    elseif ($cell === 'non') $cell = 'Non';
                  @endphp
                  <td>{{ $cell !== null && $cell !== '' ? $cell : '—' }}</td>
                @endforeach
              </tr>
            @endforeach
          </tbody>
        </table>
      @elseif($type === 'textarea')
        <div class="field">
          <div class="lbl">{{ $label }}</div>
          <div class="val multi">{{ $value !== null && $value !== '' ? $value : '—' }}</div>
        </div>
      @elseif($type === 'yesno')
        <div class="field">
          <div class="lbl">{{ $label }}</div>
          <div class="val">
            @if($value === 'oui') ✓ Oui
            @elseif($value === 'non') ✗ Non
            @else —
            @endif
          </div>
        </div>
      @elseif($type === 'checkbox-group')
        <div class="field">
          <div class="lbl">{{ $label }}</div>
          <div class="val">
            @if(is_array($value) && count($value)) {{ implode(', ', $value) }}
            @else —
            @endif
          </div>
        </div>
      @else
        <div class="field">
          <div class="lbl">{{ $label }}</div>
          <div class="val">{{ $value !== null && $value !== '' ? $value : '—' }}</div>
        </div>
      @endif
    @endforeach
  </div>
@endforeach

{{-- Signature --}}
<div class="signature-box">
  <table width="100%">
    <tr>
      <td style="width: 50%;">
        Soumis par <strong>{{ $governor?->full_name ?? '—' }}</strong><br>
        Gouverneur du département {{ $department->name ?? '' }}
      </td>
      <td style="width: 50%; text-align: right;">
        Date de soumission :
        <strong>{{ $report->submitted_at?->isoFormat('DD MMMM YYYY') }}</strong>
      </td>
    </tr>
  </table>
</div>

<div class="pdf-footer">
  New Wine Church · La Maison de la Destinée · Rapport #{{ $report->id }} · Page <span class="pagenum"></span>
</div>

</body>
</html>
