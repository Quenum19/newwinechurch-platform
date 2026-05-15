@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 14px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#C9A84C;">
  📈 Digest hebdomadaire
</h2>

<p style="color:rgba(255,255,255,0.75);">
  Semaine du <strong>{{ \Carbon\Carbon::parse($data['week_start'])->isoFormat('DD MMM') }}</strong>
  au <strong>{{ \Carbon\Carbon::parse($data['week_end'])->isoFormat('DD MMM YYYY') }}</strong>
  @if(($data['scope'] ?? '') === 'governor' && ($data['dept_name'] ?? null))
    — département <strong style="color:#C9A84C;">{{ $data['dept_name'] }}</strong>
  @endif
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 8px;">
  <tr>
    <td width="33%" valign="top" style="padding:14px;background:rgba(201,168,76,0.08);border-radius:10px;">
      <div style="font-size:11px;letter-spacing:0.08em;color:#C9A84C;text-transform:uppercase;">Rapports</div>
      <div style="font-size:24px;color:#fff;margin-top:6px;font-weight:600;">
        {{ $data['reports_submitted'] ?? 0 }}<span style="color:rgba(255,255,255,0.5);font-size:14px;"> / {{ $data['reports_expected'] ?? 0 }}</span>
      </div>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);">soumis cette semaine</div>
    </td>
    <td width="10"></td>
    <td width="33%" valign="top" style="padding:14px;background:rgba(201,168,76,0.08);border-radius:10px;">
      <div style="font-size:11px;letter-spacing:0.08em;color:#C9A84C;text-transform:uppercase;">Présence moy.</div>
      <div style="font-size:24px;color:#fff;margin-top:6px;font-weight:600;">{{ number_format(($data['attendance_avg'] ?? 0), 1) }}%</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);">cellules</div>
    </td>
    <td width="10"></td>
    <td width="33%" valign="top" style="padding:14px;background:rgba(201,168,76,0.08);border-radius:10px;">
      <div style="font-size:11px;letter-spacing:0.08em;color:#C9A84C;text-transform:uppercase;">Nouveaux</div>
      <div style="font-size:24px;color:#fff;margin-top:6px;font-weight:600;">{{ $data['new_members_count'] ?? 0 }}</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.6);">membres</div>
    </td>
  </tr>
</table>

@if(! empty($data['alerts']))
<h3 style="margin:24px 0 10px;color:#B22240;font-family:'Cormorant Garamond',serif;font-size:18px;">⚠ Alertes</h3>
<ul style="padding-left:20px;margin:0;color:rgba(255,255,255,0.85);">
  @foreach($data['alerts'] as $alert)
    <li style="margin-bottom:6px;">
      <strong style="color:#B22240;">{{ $alert['count'] ?? '' }}</strong> {{ $alert['label'] ?? '' }}
    </li>
  @endforeach
</ul>
@endif

@if(! empty($data['departments']))
<h3 style="margin:24px 0 10px;color:#C9A84C;font-family:'Cormorant Garamond',serif;font-size:18px;">Vue par département</h3>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
  <thead>
    <tr>
      <th align="left" style="padding:8px;border-bottom:1px solid rgba(201,168,76,0.25);color:#C9A84C;">Département</th>
      <th align="right" style="padding:8px;border-bottom:1px solid rgba(201,168,76,0.25);color:#C9A84C;">Rapports</th>
      <th align="right" style="padding:8px;border-bottom:1px solid rgba(201,168,76,0.25);color:#C9A84C;">Cellules</th>
    </tr>
  </thead>
  <tbody>
    @foreach($data['departments'] as $dept)
    <tr>
      <td style="padding:8px;color:rgba(255,255,255,0.85);">{{ $dept['name'] }}</td>
      <td align="right" style="padding:8px;color:rgba(255,255,255,0.85);">{{ $dept['reports_count'] ?? 0 }}</td>
      <td align="right" style="padding:8px;color:rgba(255,255,255,0.85);">{{ $dept['cells_count'] ?? 0 }}</td>
    </tr>
    @endforeach
  </tbody>
</table>
@endif

<p style="margin-top:28px;color:rgba(255,255,255,0.6);font-size:13px;font-style:italic;">
  Digest généré automatiquement chaque vendredi à 17h — NWC Notification System.
</p>
@endsection
