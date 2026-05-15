@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  {{ $isPasteur ? 'Nouveau rapport à examiner' : 'Rapport département disponible' }} 📋
</h2>

<p>
  Le département <strong style="color:#C9A84C;">{{ $department->name }}</strong>
  vient de soumettre son rapport pour la période suivante.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:12px;">
  <tr><td style="padding:18px 22px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:rgba(255,255,255,0.88);">
      <tr>
        <td style="padding:6px 0;width:35%;color:rgba(255,255,255,0.6);">Gouverneur</td>
        <td style="padding:6px 0;color:#C9A84C;"><strong>{{ $governor?->full_name ?? '—' }}</strong></td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Type</td>
        <td style="padding:6px 0;">{{ $report->report_type }}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Période</td>
        <td style="padding:6px 0;">
          {{ $report->period_start?->isoFormat('DD MMM YYYY') }}
          → {{ $report->period_end?->isoFormat('DD MMM YYYY') }}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Soumis le</td>
        <td style="padding:6px 0;">{{ $report->submitted_at?->isoFormat('DD MMM YYYY, HH:mm') }}</td>
      </tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center" style="padding:14px;">
    <a href="{{ $adminUrl }}"
       style="display:inline-block;padding:12px 28px;background:#C9A84C;color:#1a0510;text-decoration:none;border-radius:9999px;font-weight:600;letter-spacing:0.04em;">
      {{ $isPasteur ? 'Examiner le rapport' : 'Voir le rapport' }}
    </a>
  </td></tr>
</table>

@if($isPasteur)
<p style="color:rgba(255,255,255,0.7);font-size:14px;">
  En tant que pasteur, tu peux <strong>approuver</strong>, <strong>marquer comme revu</strong>
  ou <strong>rejeter avec commentaire</strong> ce rapport depuis le panneau admin.
</p>
@endif

<p style="margin-top:32px;color:rgba(255,255,255,0.6);font-style:italic;">L'équipe NWC</p>
@endsection
