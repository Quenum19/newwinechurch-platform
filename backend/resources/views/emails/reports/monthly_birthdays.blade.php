@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  🎂 Anniversaires de {{ $monthName }}
</h2>

<p>
  Bonjour {{ $recipient->first_name ?? $recipient->name }},<br>
  Voici la liste des <strong style="color:#C9A84C;">{{ $count }}</strong>
  {{ $count > 1 ? 'membres' : 'membre' }} dont l'anniversaire tombe en
  <strong>{{ $monthName }}</strong>.
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:12px;">
  <tr><td style="padding:18px 22px;color:rgba(255,255,255,0.88);font-size:14px;">
    📎 Le détail complet (jour, âge, contact) est joint à ce mail au format PDF.
    Pense à organiser un petit message ou une attention pour chacun(e) 🙌
  </td></tr>
</table>

<p style="background:rgba(201,168,76,0.1);padding:14px 18px;border-radius:8px;color:rgba(255,255,255,0.85);font-size:14px;">
  <strong style="color:#C9A84C;">Bonne pratique :</strong> envoie un message le matin du jour J,
  et propose à la cellule / au département concerné de chanter pendant la prochaine réunion.
</p>

<p style="margin-top:32px;color:rgba(255,255,255,0.6);font-style:italic;">L'équipe NWC</p>
@endsection
