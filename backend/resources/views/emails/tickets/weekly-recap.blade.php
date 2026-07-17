@extends('emails.layouts.nwc')

@section('content')

<h1 style="font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#C9A84C;margin:0 0 8px;text-align:center;">
  Récap billetterie
</h1>
<p style="text-align:center;font-size:14px;color:rgba(255,255,255,0.7);margin:0 0 24px;">
  Semaine du {{ $week_label ?? '—' }}
</p>

{{-- KPIs grid --}}
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td style="width:50%;padding:6px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.5);">Inscriptions semaine</p>
          <p style="margin:6px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#fff;">{{ $week_signups ?? 0 }}</p>
        </td></tr>
      </table>
    </td>
    <td style="width:50%;padding:6px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.5);">Revenus semaine</p>
          <p style="margin:6px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:28px;color:#C9A84C;">
            {{ number_format($week_revenue ?? 0, 0, ',', ' ') }} <span style="font-size:14px;font-family:monospace;">FCFA</span>
          </p>
        </td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:6px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.5);">Conversion 30j</p>
          <p style="margin:6px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:#fff;">{{ $conversion_rate ?? 0 }}%</p>
        </td></tr>
      </table>
    </td>
    <td style="padding:6px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:8px;">
        <tr><td style="padding:14px 18px;">
          <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.5);">À valider</p>
          <p style="margin:6px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:24px;color:{{ ($pending_count ?? 0) > 0 ? '#FCA5A5' : '#fff' }};">
            {{ $pending_count ?? 0 }}
          </p>
        </td></tr>
      </table>
    </td>
  </tr>
</table>

{{-- Alerts --}}
@if(! empty($alerts))
<p style="font-size:13px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin:0 0 10px;">Alertes</p>
@foreach($alerts as $alert)
  <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(220,38,38,0.08);border:1px solid rgba(220,38,38,0.4);border-radius:6px;margin-bottom:8px;">
    <tr><td style="padding:12px 16px;">
      <p style="margin:0;font-size:13px;color:#fff;">⚠ {{ $alert }}</p>
    </td></tr>
  </table>
@endforeach
@endif

{{-- Top events --}}
@if(! empty($top_events))
<p style="font-size:13px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.1em;margin:24px 0 10px;">Top événements</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  @foreach($top_events as $e)
    <tr style="border-bottom:1px solid rgba(255,255,255,0.08);">
      <td style="padding:10px 0;font-size:13px;color:rgba(255,255,255,0.85);">
        {{ $e['title'] }}
        <br>
        <span style="font-size:11px;color:rgba(255,255,255,0.5);">{{ $e['sold'] }} place(s)
          @if($e['capacity']) / {{ $e['capacity'] }} ({{ $e['fill_rate'] ?? 0 }}%) @endif
        </span>
      </td>
      <td style="padding:10px 0;font-size:14px;text-align:right;color:#C9A84C;font-family:monospace;">
        {{ number_format($e['revenue'] ?? 0, 0, ',', ' ') }} FCFA
      </td>
    </tr>
  @endforeach
</table>
@endif

{{-- CTA --}}
<p style="text-align:center;margin:32px 0 8px;">
  <a href="{{ rtrim(config('app.frontend_url', config('app.url')), '/') }}/admin/billetterie"
     style="display:inline-block;padding:14px 32px;background:#C9A84C;color:#0A0908;font-weight:bold;text-decoration:none;border-radius:6px;font-size:14px;letter-spacing:1px;">
    VOIR LE DASHBOARD COMPLET
  </a>
</p>

@endsection
