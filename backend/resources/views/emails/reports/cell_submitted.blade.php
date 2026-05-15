@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#C9A84C;">
  📊 Rapport cellule reçu
</h2>

<p>
  <strong>{{ $leader?->full_name ?? 'Un leader' }}</strong> vient de soumettre le rapport
  hebdomadaire de la cellule <strong style="color:#C9A84C;">{{ $cell->name }}</strong>.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(201,168,76,0.08);border-radius:12px;">
  <tr><td style="padding:18px 22px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:6px 0;width:50%;color:rgba(255,255,255,0.6);">Semaine</td>
        <td style="padding:6px 0;text-align:right;">{{ $report->week_start?->isoFormat('DD MMM YYYY') }}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Présents</td>
        <td style="padding:6px 0;text-align:right;color:#C9A84C;font-weight:600;">{{ $report->attendance_count }}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Taux de présence</td>
        <td style="padding:6px 0;text-align:right;color:{{ $attendanceRate >= 75 ? '#1F8B3D' : ($attendanceRate >= 50 ? '#C9A84C' : '#B22240') }};font-weight:600;">{{ number_format($attendanceRate, 1) }}%</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Nouveaux membres</td>
        <td style="padding:6px 0;text-align:right;">{{ $report->new_members }}</td>
      </tr>
      @if($report->needs_followup)
      <tr>
        <td colspan="2" style="padding:10px 0;color:#B22240;font-size:13px;">
          ⚠ Le leader a marqué ce rapport comme <strong>nécessitant un suivi</strong>.
        </td>
      </tr>
      @endif
    </table>
  </td></tr>
</table>

@if($report->highlights)
<p style="background:rgba(31,139,61,0.1);padding:14px 18px;border-radius:8px;border-left:3px solid #1F8B3D;">
  <strong style="color:#1F8B3D;">Faits marquants :</strong><br>
  {{ $report->highlights }}
</p>
@endif

@if($report->challenges)
<p style="background:rgba(178,34,64,0.08);padding:14px 18px;border-radius:8px;border-left:3px solid #B22240;">
  <strong style="color:#B22240;">Défis :</strong><br>
  {{ $report->challenges }}
</p>
@endif

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td align="center">
    <a href="{{ $url }}"
       style="display:inline-block;padding:12px 28px;background:#C9A84C;color:#1a0510;text-decoration:none;border-radius:9999px;font-weight:600;">
      Voir le détail
    </a>
  </td></tr>
</table>
@endsection
