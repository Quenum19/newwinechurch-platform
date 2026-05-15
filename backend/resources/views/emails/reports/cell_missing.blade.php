@extends('emails.layouts.nwc')

@section('content')
@php $color = $isUrgent ? '#B22240' : '#C9A84C'; @endphp

<h2 style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:{{ $color }};">
  {{ $isUrgent ? '⚠ Rapport hebdomadaire en retard' : '📝 Rappel rapport hebdomadaire' }}
</h2>

<p>Bonjour <strong>{{ $recipient->first_name ?? $recipient->name }}</strong>,</p>

@if($isUrgent)
<p>Cela fait maintenant <strong style="color:#B22240;">{{ $weeksMissing }} semaines</strong>
   que la cellule <strong>{{ $cell->name }}</strong> n'a pas de rapport soumis.</p>
@else
<p>Petit rappel amical : le rapport de la semaine dernière pour
   la cellule <strong style="color:#C9A84C;">{{ $cell->name }}</strong> n'a pas encore été soumis.</p>
@endif

@if(! empty($missingWeekStarts))
<p style="margin-top:18px;color:rgba(255,255,255,0.85);">Semaines en attente :</p>
<ul style="padding-left:20px;color:rgba(255,255,255,0.8);">
  @foreach($missingWeekStarts as $weekStart)
    <li>Semaine du {{ \Carbon\Carbon::parse($weekStart)->isoFormat('DD MMM YYYY') }}</li>
  @endforeach
</ul>
@endif

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(201,168,76,0.08);border-radius:10px;">
  <tr><td style="padding:14px 18px;color:rgba(255,255,255,0.8);font-size:14px;">
    💡 Un rapport régulier permet à ton gouverneur et au pasteur de prier précisément
    pour la cellule et d'identifier les besoins de soutien.
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td align="center">
    <a href="{{ $url }}"
       style="display:inline-block;padding:12px 28px;background:{{ $color }};color:{{ $isUrgent ? '#fff' : '#1a0510' }};text-decoration:none;border-radius:9999px;font-weight:600;">
      Soumettre le rapport
    </a>
  </td></tr>
</table>
@endsection
