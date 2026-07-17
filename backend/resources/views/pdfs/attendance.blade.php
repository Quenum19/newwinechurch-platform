{{--
  Liste de présence PDF — mode "live" (déjà scannés) ou "backup" (à cocher).
  Charte NWC : ivoire chaud + bordeaux + typographie serif discrète.

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
  @page { margin: 60px 40px 50px; }
  * { box-sizing: border-box; }
  body {
    font-family: DejaVu Sans, sans-serif;
    color: #1F1A14;
    font-size: 10.5px;
    background: #FDFBF6;
  }

  /* ─── HEADER ─── */
  .header {
    border-bottom: 3px solid #8B1A2F;
    padding-bottom: 14px;
    margin-bottom: 20px;
  }
  .header-grid {
    width: 100%;
    display: table;
  }
  .header-left, .header-right {
    display: table-cell;
    vertical-align: middle;
  }
  .header-left { width: 22%; }
  .header-right { width: 78%; padding-left: 15px; }
  .logo { max-height: 62px; }
  .brand-title {
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 3px;
    color: #8B1A2F;
    text-transform: uppercase;
    margin: 0;
  }
  .doc-title {
    font-size: 22px;
    font-weight: bold;
    color: #1F1A14;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 2px 0 4px;
    line-height: 1.1;
  }
  .doc-sub {
    font-size: 11px;
    color: #6B5F4E;
    margin: 0;
  }
  .mode-badge {
    display: inline-block;
    padding: 2px 8px;
    font-size: 9px;
    font-weight: bold;
    letter-spacing: 1px;
    text-transform: uppercase;
    border-radius: 2px;
    margin-left: 6px;
    vertical-align: middle;
  }
  .mode-live   { background: #E8F5E9; color: #1B5E20; border: 1px solid #388E3C; }
  .mode-backup { background: #FFF3E0; color: #E65100; border: 1px solid #F57C00; }

  /* ─── MÉTADONNÉES event ─── */
  .meta-block {
    background: #FAF6EE;
    border-left: 3px solid #8B1A2F;
    padding: 12px 15px;
    margin-bottom: 18px;
  }
  .meta-row { margin: 3px 0; }
  .meta-label {
    display: inline-block;
    width: 100px;
    font-size: 9px;
    font-weight: bold;
    color: #8B1A2F;
    text-transform: uppercase;
    letter-spacing: 1.5px;
  }
  .meta-value { color: #1F1A14; font-size: 11px; }

  /* ─── STATS ─── */
  .stats-grid {
    width: 100%;
    display: table;
    border-collapse: separate;
    border-spacing: 8px 0;
    margin-bottom: 18px;
  }
  .stat-cell {
    display: table-cell;
    background: #FFFFFF;
    border: 1px solid #E5E0D0;
    padding: 10px 12px;
    text-align: center;
    width: 33%;
  }
  .stat-label {
    font-size: 8.5px;
    font-weight: bold;
    color: #8B1A2F;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin: 0;
  }
  .stat-value {
    font-size: 22px;
    font-weight: bold;
    color: #1F1A14;
    margin: 4px 0 0;
    line-height: 1;
  }
  .stat-hint {
    font-size: 8px;
    color: #6B5F4E;
    margin-top: 2px;
    font-style: italic;
  }

  /* ─── TABLE ─── */
  table.attendance {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }
  table.attendance thead th {
    background: #8B1A2F;
    color: #FFF;
    padding: 8px 6px;
    text-align: left;
    font-size: 9.5px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    border: 1px solid #6B1422;
  }
  table.attendance tbody td {
    padding: 6px;
    border: 1px solid #E5E0D0;
    vertical-align: middle;
  }
  table.attendance tbody tr:nth-child(even) td { background: #FAF6EE; }
  table.attendance tbody tr:nth-child(odd) td  { background: #FFFFFF; }

  .col-num   { width: 30px; text-align: center; font-weight: bold; color: #8B1A2F; }
  .col-name  { width: auto; font-weight: bold; }
  .col-phone { width: 90px; }
  .col-type  { width: 70px; text-align: center; }
  .col-code  { width: 60px; text-align: center; font-family: DejaVu Sans Mono, monospace; font-weight: bold; }
  .col-time  { width: 55px; text-align: center; font-weight: bold; color: #8B1A2F; }
  .col-check { width: 40px; text-align: center; font-size: 16px; color: #999; }

  .empty {
    text-align: center;
    padding: 40px;
    color: #6B5F4E;
    font-style: italic;
    background: #FAF6EE;
    border: 1px dashed #8B1A2F;
  }

  /* ─── FOOTER ─── */
  .footer {
    position: fixed;
    bottom: -30px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 8.5px;
    color: #999;
    border-top: 1px solid #E5E0D0;
    padding-top: 8px;
    font-style: italic;
  }
  .page-num:after { content: counter(page) " / " counter(pages); }

  .backup-note {
    background: #FFF3E0;
    border: 1px solid #F57C00;
    padding: 8px 12px;
    margin-bottom: 12px;
    font-size: 9.5px;
    color: #E65100;
    border-radius: 2px;
  }
</style>
</head>
<body>

<div class="header">
  <div class="header-grid">
    <div class="header-left">
      @if($logoDataUri)
        <img src="{{ $logoDataUri }}" alt="NWC" class="logo">
      @else
        <div style="font-size: 26px; font-weight: bold; color: #8B1A2F;">NWC</div>
      @endif
    </div>
    <div class="header-right">
      <p class="brand-title">New Wine Church · Abidjan</p>
      <h1 class="doc-title">
        Liste de présence
        <span class="mode-badge mode-{{ $mode }}">
          {{ $mode === 'backup' ? 'À cocher' : 'Temps réel' }}
        </span>
      </h1>
      <p class="doc-sub">
        Document généré le
        {{ $generatedAt->locale('fr')->isoFormat('LL [à] HH:mm') }}
      </p>
    </div>
  </div>
</div>

<div class="meta-block">
  <div class="meta-row">
    <span class="meta-label">Événement</span>
    <span class="meta-value">{{ $event->title }}</span>
  </div>
  @if($event->starts_at)
  <div class="meta-row">
    <span class="meta-label">Date</span>
    <span class="meta-value">{{ $event->starts_at->locale('fr')->isoFormat('dddd LL [·] HH[h]mm') }}</span>
  </div>
  @endif
  @if($event->location)
  <div class="meta-row">
    <span class="meta-label">Lieu</span>
    <span class="meta-value">{{ $event->location }}</span>
  </div>
  @endif
</div>

@if($mode === 'live')
<div class="stats-grid">
  <div class="stat-cell">
    <p class="stat-label">Présents</p>
    <p class="stat-value">{{ $stats['used'] ?? 0 }}</p>
    <p class="stat-hint">personnes scannées</p>
  </div>
  <div class="stat-cell">
    <p class="stat-label">Attendus</p>
    <p class="stat-value">{{ $stats['sold'] ?? 0 }}</p>
    <p class="stat-hint">tickets émis</p>
  </div>
  <div class="stat-cell">
    <p class="stat-label">Taux</p>
    <p class="stat-value">{{ $stats['fill_rate'] ?? 0 }}%</p>
    <p class="stat-hint">de présence</p>
  </div>
</div>
@else
<div class="backup-note">
  <strong>Mode dégradé (backup papier)</strong> — cette liste contient tous les tickets vendus.
  Cocher la case ✓ à l'arrivée. À utiliser uniquement si le scan numérique est indisponible.
</div>
@endif

@if($tickets->isEmpty())
  <div class="empty">
    @if($mode === 'live')
      Aucune personne n'a encore été scannée pour cet événement.
    @else
      Aucun ticket vendu pour cet événement.
    @endif
  </div>
@else
<table class="attendance">
  <thead>
    <tr>
      <th class="col-num">#</th>
      <th class="col-name">Nom & Prénom</th>
      <th class="col-phone">Téléphone</th>
      <th class="col-type">Type</th>
      <th class="col-code">Code</th>
      @if($mode === 'live')
        <th class="col-time">Arrivée</th>
      @else
        <th class="col-check">✓</th>
      @endif
    </tr>
  </thead>
  <tbody>
    @foreach($tickets as $i => $t)
    <tr>
      <td class="col-num">{{ $i + 1 }}</td>
      <td class="col-name">
        {{ strtoupper($t->last_name ?? '') }} {{ $t->first_name }}
      </td>
      <td class="col-phone">{{ $t->phone ?: '—' }}</td>
      <td class="col-type">{{ $t->ticketType?->name ?? 'Standard' }}</td>
      <td class="col-code">{{ strtoupper($t->short_code ?? '') }}</td>
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

<div class="footer">
  © New Wine Church · Liste de présence · {{ $event->title }} · Page <span class="page-num"></span>
</div>

</body>
</html>
