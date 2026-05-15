@extends('emails.layouts.nwc')

@section('content')
@php
  $color = $isApproved ? '#1F8B3D' : ($isRejected ? '#B22240' : '#C9A84C');
  $emoji = $isApproved ? '✅' : ($isRejected ? '⚠️' : '📋');
  $headline = $isApproved ? 'Rapport approuvé !'
            : ($isRejected ? 'Rapport à corriger' : 'Rapport revu');
@endphp

<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:{{ $color }};">
  {{ $emoji }} {{ $headline }}
</h2>

@if($isApproved)
  <p>Félicitations <strong style="color:#C9A84C;">{{ $recipient->first_name ?? $recipient->name }}</strong> !
    Le rapport de <strong>{{ $department?->name }}</strong> a été <strong style="color:#1F8B3D;">approuvé</strong>
    par {{ $reviewer?->full_name ?? 'l\'équipe pastorale' }}.</p>

  @if($report->review_comment)
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(31,139,61,0.1);border-left:4px solid #1F8B3D;border-radius:8px;">
    <tr><td style="padding:16px 18px;color:rgba(255,255,255,0.9);">
      <strong style="color:#1F8B3D;display:block;margin-bottom:6px;">Commentaire</strong>
      {{ $report->review_comment }}
    </td></tr>
  </table>
  @endif

  <p style="color:rgba(255,255,255,0.85);">Continue ce travail d'excellence pour la gloire de Dieu 🙌</p>
@elseif($isRejected)
  <p>Le rapport soumis pour <strong>{{ $department?->name }}</strong> nécessite des
    <strong style="color:#B22240;">corrections avant d'être validé</strong>.</p>

  @if($report->review_comment)
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:rgba(178,34,64,0.12);border-left:4px solid #B22240;border-radius:8px;">
    <tr><td style="padding:18px 20px;color:#fff;">
      <strong style="color:#B22240;display:block;margin-bottom:8px;font-size:15px;">Motif du rejet</strong>
      <span style="white-space:pre-line;">{{ $report->review_comment }}</span>
    </td></tr>
  </table>
  @endif
@else
  <p>Le rapport de <strong>{{ $department?->name }}</strong> a été <strong>revu</strong>.</p>
  @if($report->review_comment)
  <p style="background:rgba(201,168,76,0.1);padding:14px 18px;border-radius:8px;">{{ $report->review_comment }}</p>
  @endif
@endif

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;">
  <tr><td align="center">
    <a href="{{ $url }}"
       style="display:inline-block;padding:12px 28px;background:{{ $isRejected ? '#B22240' : '#C9A84C' }};color:{{ $isRejected ? '#fff' : '#1a0510' }};text-decoration:none;border-radius:9999px;font-weight:600;letter-spacing:0.04em;">
      {{ $isRejected ? 'Corriger le rapport' : 'Voir le rapport' }}
    </a>
  </td></tr>
</table>

<p style="margin-top:24px;color:rgba(255,255,255,0.6);font-style:italic;">L'équipe NWC</p>
@endsection
