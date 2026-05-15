@extends('emails.layouts.nwc')

@section('content')
<h2 style="margin:0 0 16px;font-family:'Cormorant Garamond',Georgia,serif;font-size:26px;color:#fff;">
  Merci pour ton don 💛
</h2>

<p>{{ $donorName }},</p>

<p>Nous confirmons la réception de ton don. Ta générosité finance directement la mission de NWC : évangélisation, formation et rayonnement parmi les jeunes adultes d'Abidjan.</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background:#0F0F0F;border:1px solid rgba(201,168,76,0.2);border-radius:12px;">
  <tr><td style="padding:24px;">
    <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#C9A84C;">Reçu de don</p>
    <p style="margin:8px 0 0;font-family:'Cormorant Garamond',Georgia,serif;font-size:36px;color:#fff;">
      {{ number_format($donation->amount, 0, ',', ' ') }} <span style="font-size:18px;color:#C9A84C;">{{ $donation->currency }}</span>
    </p>
    <table width="100%" style="margin-top:16px;font-size:14px;color:rgba(255,255,255,0.7);">
      <tr><td style="padding:4px 0;">Date</td><td align="right" style="color:#fff;">{{ $donation->confirmed_at?->translatedFormat('d F Y') }}</td></tr>
      <tr><td style="padding:4px 0;">Méthode</td><td align="right" style="color:#fff;">{{ $methodLabel }}</td></tr>
      <tr><td style="padding:4px 0;">Type</td><td align="right" style="color:#fff;">{{ ucfirst($donation->type) }}</td></tr>
      @if($donation->reference)
      <tr><td style="padding:4px 0;">Référence</td><td align="right" style="color:#C9A84C;font-family:monospace;font-size:12px;">{{ $donation->reference }}</td></tr>
      @endif
    </table>
  </td></tr>
</table>

<p style="font-style:italic;color:rgba(255,255,255,0.7);">« Donne et il te sera donné. » — Luc 6:38</p>

<p style="margin-top:24px;">Que le Seigneur te bénisse abondamment.</p>
<p style="margin:4px 0 0;color:#C9A84C;font-style:italic;">L'équipe NWC</p>
@endsection

@section('footer-extra')
Pour toute question concernant ce reçu, contacte-nous à
<a href="mailto:contact@newinechurch.org" style="color:#C9A84C;">contact@newinechurch.org</a>.
@endsection
