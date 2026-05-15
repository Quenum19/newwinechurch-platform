@extends('emails.layouts.nwc')

@section('content')
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:rgba(178,34,64,0.18);border:2px solid #B22240;border-radius:12px;">
  <tr><td align="center" style="padding:14px;">
    <span style="color:#fff;font-weight:600;letter-spacing:0.08em;font-size:13px;">⚠ ALERTE — RAPPORT EN RETARD</span>
  </td></tr>
</table>

<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#B22240;">
  Le rapport de {{ $department?->name }} attend toujours d'être soumis
</h2>

<p>Bonjour <strong>{{ $recipient->first_name ?? $recipient->name }}</strong>,</p>

<p>
  La période <strong style="color:#C9A84C;">
    {{ $report->period_start?->isoFormat('DD MMM') }}
    → {{ $report->period_end?->isoFormat('DD MMM YYYY') }}
  </strong> est terminée depuis <strong style="color:#B22240;">{{ $daysLate }} jour{{ $daysLate > 1 ? 's' : '' }}</strong>
  et le rapport n'a pas encore été soumis.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(178,34,64,0.08);border:1px solid rgba(178,34,64,0.3);border-radius:12px;">
  <tr><td style="padding:18px 22px;color:rgba(255,255,255,0.85);">
    <p style="margin:0 0 8px;color:#B22240;font-weight:600;">Pourquoi c'est important</p>
    <ul style="padding-left:20px;margin:0;color:rgba(255,255,255,0.8);">
      <li style="margin-bottom:6px;">Les rapports en retard bloquent la consolidation pastorale.</li>
      <li style="margin-bottom:6px;">Les statistiques globales et le digest hebdo en dépendent.</li>
      <li>Plus tu attends, plus c'est difficile de te rappeler le détail des activités.</li>
    </ul>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center">
    <a href="{{ $url }}"
       style="display:inline-block;padding:14px 32px;background:#B22240;color:#fff;text-decoration:none;border-radius:9999px;font-weight:700;letter-spacing:0.06em;font-size:15px;">
      Soumettre maintenant
    </a>
  </td></tr>
</table>

<p style="margin-top:24px;color:rgba(255,255,255,0.55);font-size:13px;">
  Si tu rencontres une difficulté, contacte directement l'équipe pastorale.
</p>
@endsection
