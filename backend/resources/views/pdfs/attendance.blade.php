{{--
  Liste de présence PDF — DESIGN PRO NWC (refonte 2026-07-20).
  Modes : "live" (déjà scannés) ou "backup" (vierge à cocher).

  Variables :
    $event        (Event)
    $tickets      (Collection<EventTicket>)
    $stats        (array — capacity, sold, used, remaining, fill_rate)
    $logoDataUri  (string|null)
    $generatedAt  (Carbon)
    $mode         'live' | 'backup'
--}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Liste de présence — {{ $event->title }}</title>
<style>
  /* ─── PAGE ─── */
  @page {
    margin: 20mm 15mm 20mm 15mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: DejaVu Sans, sans-serif;
    color: #1F1A14;
    font-size: 10px;
    line-height: 1.4;
    background: #FDFBF6;
  }

  /* ─── HEADER : logo + titre + badge ─── */
  .header {
    padding-bottom: 16px;
    margin-bottom: 22px;
    border-bottom: 3px solid #8B1A2F;
  }
  .header-table { width: 100%; border-collapse: collapse; }
  .header-table td { vertical-align: middle; }
  .header-logo-cell { width: 80px; padding-right: 14px; }
  .header-logo {
    width: 70px;
    height: 70px;
    object-fit: contain;
  }
  .header-logo-placeholder {
    width: 70px;
    height: 70px;
    background: #8B1A2F;
    color: #FFFFFF;
    text-align: center;
    line-height: 70px;
    font-size: 26px;
    font-weight: bold;
    border-radius: 6px;
  }
  .brand-name {
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 4px;
    color: #8B1A2F;
    text-transform: uppercase;
  }
  .brand-tagline {
    font-size: 8.5px;
    color: #A89A82;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    margin-top: 2px;
  }
  .doc-title {
    font-size: 26px;
    font-weight: bold;
    color: #1F1A14;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    line-height: 1;
    margin-top: 4px;
  }
  .doc-generated {
    font-size: 9px;
    color: #8B7960;
    margin-top: 6px;
    font-style: italic;
  }
  .header-badge-cell {
    width: 110px;
    text-align: right;
    padding-left: 10px;
  }
  .mode-badge {
    display: inline-block;
    padding: 6px 12px;
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    border-radius: 4px;
    line-height: 1;
  }
  .mode-live   { background: #DCF5DE; color: #1B5E20; border: 1.5px solid #388E3C; }
  .mode-backup { background: #FFF3E0; color: #C25100; border: 1.5px solid #F57C00; }

  /* ─── MÉTA événement ─── */
  .meta-block {
    background: #FAF6EE;
    border-left: 4px solid #8B1A2F;
    padding: 12px 16px;
    margin-bottom: 18px;
    border-radius: 0 3px 3px 0;
  }
  .meta-table { width: 100%; border-collapse: collapse; }
  .meta-table td { padding: 3px 0; vertical-align: top; }
  .meta-label {
    width: 90px;
    font-size: 8.5px;
    font-weight: bold;
    color: #8B1A2F;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    padding-right: 12px;
  }
  .meta-value {
    font-size: 11px;
    color: #1F1A14;
    font-weight: 500;
  }

  /* ─── STATS ─── */
  .stats {
    width: 100%;
    margin-bottom: 20px;
    border-collapse: separate;
    border-spacing: 8px 0;
  }
  .stat-cell {
    background: #FFFFFF;
    border: 1.5px solid #E5DBC7;
    padding: 12px 10px;
    text-align: center;
    width: 33.33%;
    border-radius: 4px;
  }
  .stat-cell-highlight { background: #FDF9EE; border-color: #C9A961; }
  .stat-label {
    font-size: 8.5px;
    font-weight: bold;
    color: #8B1A2F;
    text-transform: uppercase;
    letter-spacing: 1.8px;
    margin-bottom: 6px;
  }
  .stat-value {
    font-size: 26px;
    font-weight: bold;
    color: #1F1A14;
    line-height: 1;
    margin: 4px 0 2px;
  }
  .stat-hint {
    font-size: 8.5px;
    color: #8B7960;
    font-style: italic;
    margin-top: 3px;
  }

  /* ─── TABLE ─── */
  table.attendance {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
    page-break-inside: auto;
  }
  table.attendance thead th {
    background: #6B1422;
    color: #FFFFFF;
    padding: 9px 6px;
    text-align: center;
    font-size: 9.5px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    border: 1px solid #4A0E1A;
  }
  table.attendance thead { display: table-header-group; }
  table.attendance tbody td {
    padding: 7px 6px;
    border: 1px solid #E5DBC7;
    vertical-align: middle;
    font-size: 10px;
  }
  table.attendance tbody tr { page-break-inside: avoid; }
  table.attendance tbody tr:nth-child(even) td { background: #FAF6EE; }
  table.attendance tbody tr:nth-child(odd) td  { background: #FFFFFF; }

  .col-num   { width: 34px; text-align: center; font-weight: bold; color: #6B5F4E; font-family: DejaVu Sans Mono, monospace; }
  .col-name  { width: auto; text-align: left; }
  .col-name .lastname { font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; }
  .col-name .firstname { color: #4A3D2A; }
  .col-phone { width: 90px; text-align: center; font-family: DejaVu Sans Mono, monospace; color: #4A3D2A; }
  .col-type  { width: 68px; text-align: center; }
  .col-type .badge {
    display: inline-block;
    padding: 2px 7px;
    background: #F0E7D1;
    color: #6B5F4E;
    font-size: 8.5px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    border-radius: 3px;
  }
  .col-type .badge-vip {
    background: linear-gradient(135deg, #C9A961 0%, #B08A3F 100%);
    color: #FFFFFF;
  }
  .col-code  { width: 68px; text-align: center; font-family: DejaVu Sans Mono, monospace; font-weight: bold; letter-spacing: 0.5px; }
  .col-time  { width: 60px; text-align: center; font-weight: bold; color: #8B1A2F; font-family: DejaVu Sans Mono, monospace; }
  .col-check { width: 44px; text-align: center; font-size: 18px; color: #C9A961; font-family: DejaVu Sans, sans-serif; }

  .empty {
    text-align: center;
    padding: 60px 30px;
    color: #8B7960;
    font-style: italic;
    background: #FAF6EE;
    border: 1.5px dashed #C9A961;
    border-radius: 6px;
    font-size: 12px;
  }
  .empty-icon { font-size: 32px; margin-bottom: 12px; }

  /* ─── FOOTER ─── */
  .footer {
    position: fixed;
    bottom: -12mm;
    left: 0;
    right: 0;
    height: 10mm;
    padding: 6px 8mm;
    border-top: 1px solid #E5DBC7;
    background: #FDFBF6;
    font-size: 8.5px;
    color: #8B7960;
  }
  .footer-table { width: 100%; }
  .footer-table td { vertical-align: middle; }
  .footer-left { text-align: left; font-style: italic; }
  .footer-center { text-align: center; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: #8B1A2F; }
  .footer-right { text-align: right; }
  .page-num:after { content: "Page " counter(page) " / " counter(pages); }

  /* ─── Backup mode note ─── */
  .backup-note {
    background: #FFF3E0;
    border: 1.5px solid #F57C00;
    padding: 10px 14px;
    margin-bottom: 14px;
    font-size: 10px;
    color: #C25100;
    border-radius: 4px;
    line-height: 1.5;
  }
  .backup-note strong { color: #8B3D00; }
</style>
</head>
<body>

{{-- ═══════════════════════ HEADER ═══════════════════════ --}}
<div class="header">
  <table class="header-table">
    <tr>
      <td class="header-logo-cell">
        @if($logoDataUri)
          <img src="{{ $logoDataUri }}" alt="NWC" class="header-logo">
        @else
          <div class="header-logo-placeholder">NWC</div>
        @endif
      </td>
      <td>
        <div class="brand-name">New Wine Church</div>
        <div class="brand-tagline">Abidjan · Sauvé pour Sauver</div>
        <div class="doc-title">Liste de présence</div>
        <div class="doc-generated">
          Document généré le {{ $generatedAt->locale('fr')->isoFormat('LL [à] HH[h]mm') }}
        </div>
      </td>
    </tr>
  </table>
</div>

{{-- ═══════════════════════ MÉTA event ═══════════════════════ --}}
<div class="meta-block">
  <table class="meta-table">
    <tr>
      <td class="meta-label">Événement</td>
      <td class="meta-value">{{ $event->title }}</td>
    </tr>
    @if($event->starts_at)
    <tr>
      <td class="meta-label">Date</td>
      <td class="meta-value">{{ $event->starts_at->locale('fr')->isoFormat('dddd LL  ·  HH[h]mm') }}</td>
    </tr>
    @endif
    @if($event->location)
    <tr>
      <td class="meta-label">Lieu</td>
      <td class="meta-value">{{ $event->location }}</td>
    </tr>
    @endif
  </table>
</div>

{{-- ═══════════════════════ STATS (live seulement) ═══════════════════════ --}}
@if($mode === 'live')
  <table class="stats">
    <tr>
      <td class="stat-cell stat-cell-highlight">
        <div class="stat-label">Présents</div>
        <div class="stat-value">{{ $stats['used'] ?? 0 }}</div>
        <div class="stat-hint">personnes scannées</div>
      </td>
      <td class="stat-cell">
        <div class="stat-label">Attendus</div>
        <div class="stat-value">{{ $stats['sold'] ?? 0 }}</div>
        <div class="stat-hint">tickets émis</div>
      </td>
      <td class="stat-cell">
        <div class="stat-label">Taux</div>
        <div class="stat-value">{{ $stats['fill_rate'] ?? 0 }}%</div>
        <div class="stat-hint">de présence</div>
      </td>
    </tr>
  </table>
@else
  <div class="backup-note">
    <strong>Mode dégradé (backup papier)</strong> — cette liste contient tous les tickets vendus,
    triés par ordre alphabétique. Coche la case ☐ à l'entrée pour chaque personne présente.
    À utiliser uniquement si le scan numérique est indisponible.
  </div>
@endif

{{-- ═══════════════════════ TABLE tickets ═══════════════════════ --}}
@if($tickets->isEmpty())
  <div class="empty">
    <div class="empty-icon">◌</div>
    @if($mode === 'live')
      Aucune personne n'a encore été scannée pour cet événement.<br>
      <span style="font-size: 9.5px; opacity: 0.7;">La liste se remplira au fur et à mesure des arrivées.</span>
    @else
      Aucun ticket vendu pour cet événement.
    @endif
  </div>
@else
<table class="attendance">
  <thead>
    <tr>
      <th class="col-num">#</th>
      <th class="col-name" style="text-align: left; padding-left: 10px;">Nom &amp; Prénom</th>
      <th class="col-phone">Téléphone</th>
      <th class="col-type">Type</th>
      <th class="col-code">Code</th>
      @if($mode === 'live')
        <th class="col-time">Arrivée</th>
      @else
        <th class="col-check">☐</th>
      @endif
    </tr>
  </thead>
  <tbody>
    @foreach($tickets as $i => $t)
    @php
      $isVip = $t->ticketType && stripos($t->ticketType->name ?? '', 'vip') !== false;
    @endphp
    <tr>
      <td class="col-num">{{ str_pad($i + 1, 3, '0', STR_PAD_LEFT) }}</td>
      <td class="col-name" style="padding-left: 10px;">
        <span class="lastname">{{ $t->last_name ?? '—' }}</span>
        <span class="firstname"> {{ $t->first_name ?? '' }}</span>
      </td>
      <td class="col-phone">{{ $t->phone ?: '—' }}</td>
      <td class="col-type">
        <span class="badge {{ $isVip ? 'badge-vip' : '' }}">
          {{ $t->ticketType?->name ?? 'Standard' }}
        </span>
      </td>
      <td class="col-code">{{ strtoupper($t->short_code ?? '—') }}</td>
      @if($mode === 'live')
        <td class="col-time">{{ $t->used_at?->format('H:i') ?? '—' }}</td>
      @else
        <td class="col-check">☐</td>
      @endif
    </tr>
    @endforeach
  </tbody>
</table>
@endif

{{-- ═══════════════════════ FOOTER (répété chaque page) ═══════════════════════ --}}
<div class="footer">
  <table class="footer-table">
    <tr>
      <td class="footer-left">© New Wine Church · Abidjan</td>
      <td class="footer-center">Liste de présence — {{ mb_strimwidth($event->title, 0, 42, '…') }}</td>
      <td class="footer-right"><span class="page-num"></span></td>
    </tr>
  </table>
</div>

</body>
</html>
