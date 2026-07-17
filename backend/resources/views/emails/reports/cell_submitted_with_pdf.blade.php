@extends('emails.layouts.nwc')

@section('content')
@php
  $titles = [
    'pasteur'  => 'Rapport cellule soumis',
    'governor' => 'Un de vos leaders a soumis son rapport',
    'leader'   => 'Votre rapport a bien été soumis',
  ];
  // ⚠️ SÉCURITÉ : ces intros contiennent du HTML (`<strong>`), utilisé plus bas
  // avec `{!! !!}` (échappement DÉSACTIVÉ). Toute donnée user-fournie (nom,
  // email…) DOIT être passée à `e()` sinon XSS stocké possible. Voir audit #M4.
  $intros = [
    'pasteur'  => 'La cellule <strong style="color:#C9A84C;">' . e($cell->name) . '</strong> vient de soumettre son rapport hebdomadaire. Le PDF officiel est joint à ce mail.',
    'governor' => 'Le leader <strong style="color:#C9A84C;">' . e($leader->full_name ?? '—') . '</strong> a soumis le rapport de la cellule <strong>' . e($cell->name) . '</strong>. PDF en pièce jointe.',
    'leader'   => 'Bonjour ' . e($recipient->first_name ?? $recipient->name) . ', votre rapport pour la cellule <strong style="color:#C9A84C;">' . e($cell->name) . '</strong> a bien été enregistré et transmis. Vous trouverez le PDF officiel en pièce jointe.',
  ];
  $cta = [
    'pasteur'  => ['url' => $adminUrl,    'label' => 'Consulter la cellule'],
    'governor' => ['url' => $governorUrl, 'label' => 'Voir la cellule'],
    'leader'   => ['url' => $leaderUrl,   'label' => 'Voir mon rapport'],
  ];
@endphp

<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  {{ $titles[$audience] ?? 'Rapport cellule' }} 📄
</h2>

<p>{!! $intros[$audience] ?? '' !!}</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:12px;">
  <tr><td style="padding:18px 22px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:rgba(255,255,255,0.88);">
      <tr>
        <td style="padding:6px 0;width:35%;color:rgba(255,255,255,0.6);">Cellule</td>
        <td style="padding:6px 0;color:#C9A84C;"><strong>{{ $cell->name }}</strong></td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Leader</td>
        <td style="padding:6px 0;">{{ $leader?->full_name ?? '—' }}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Semaine du</td>
        <td style="padding:6px 0;">
          {{ $report->week_start?->isoFormat('DD MMM') }}
          → {{ $report->week_end?->isoFormat('DD MMM YYYY') }}
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Présents</td>
        <td style="padding:6px 0;">
          <strong>{{ $report->attendance_count ?? 0 }}</strong>
          <span style="color:rgba(255,255,255,0.5);">({{ round($attendanceRate) }}% de la cellule)</span>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 0;color:rgba(255,255,255,0.6);">Nouveaux membres</td>
        <td style="padding:6px 0;">{{ $report->new_members ?? 0 }}</td>
      </tr>
    </table>
  </td></tr>
</table>

<p style="background:rgba(255,255,255,0.04);border-left:3px solid #C9A84C;padding:12px 16px;color:rgba(255,255,255,0.8);font-size:14px;">
  📎 Le rapport complet est joint à ce mail au format PDF.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center" style="padding:14px;">
    <a href="{{ $cta[$audience]['url'] ?? $adminUrl }}"
       style="display:inline-block;padding:12px 28px;background:#C9A84C;color:#1a0510;text-decoration:none;border-radius:9999px;font-weight:600;letter-spacing:0.04em;">
      {{ $cta[$audience]['label'] ?? 'Voir le rapport' }}
    </a>
  </td></tr>
</table>

@if($audience === 'leader')
<p style="color:rgba(255,255,255,0.7);font-size:14px;">
  Tu seras notifié(e) dès qu'un retour sera disponible. Merci pour ton service au sein de la cellule.
</p>
@endif

<p style="margin-top:32px;color:rgba(255,255,255,0.6);font-style:italic;">L'équipe NWC</p>
@endsection
