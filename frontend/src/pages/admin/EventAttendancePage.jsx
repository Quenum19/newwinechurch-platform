/**
 * Liste de présence temps réel — page admin.
 *
 * Fonctionnalités :
 *  - Polling adaptatif (5s actif / 30s inactif) + ETag → charge ultra-légère
 *  - Stats live : présents / attendus / taux / dernière 15 min
 *  - Filtres : recherche (nom/tel/code), type ticket, dernière heure
 *  - Highlight du dernier arrivé (flash 3 s)
 *  - Toggle son + notification browser (opt-in)
 *  - Exports Excel + PDF (design pro NWC)
 *  - Bouton "Backup papier" — PDF vierge à cocher (mode dégradé)
 *  - Vue Kiosque (fullscreen) via bouton dédié
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { fr, enUS } from 'date-fns/locale'
import {
  Search, Download, FileText, Printer, Volume2, VolumeX, Bell, BellOff,
  RefreshCw, Users, TrendingUp, Clock, Filter, MonitorPlay, ChevronDown,
  CheckCircle2, ArrowLeft, MapPin, Calendar,
} from 'lucide-react'

import BackButton from '@/components/admin/BackButton.jsx'
import { useAttendancePolling } from '@/hooks/useAttendancePolling.js'
import {
  exportAttendanceXlsx, exportAttendancePdf, exportAttendanceBackupPdf,
} from '@/api/attendance.js'

const SINCE_FILTERS = [
  { value: 0,   labelKey: 'attendance.filterAll' },
  { value: 60,  labelKey: 'attendance.filter1h' },
  { value: 15,  labelKey: 'attendance.filter15m' },
]

export default function EventAttendancePage() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language?.startsWith('en') ? enUS : fr
  const { id: eventId } = useParams()

  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sinceMinutes, setSince]    = useState(0)
  const [sort, setSort]             = useState('recent') // 'recent' | 'alpha'
  const [soundOn, setSoundOn]       = useState(() => localStorage.getItem('nwc_attend_sound') === '1')
  const [notifOn, setNotifOn]       = useState(() => localStorage.getItem('nwc_attend_notif') === '1')
  const [busy, setBusy]             = useState(false)

  const audioRef = useRef(null)

  useEffect(() => { localStorage.setItem('nwc_attend_sound', soundOn ? '1' : '0') }, [soundOn])
  useEffect(() => { localStorage.setItem('nwc_attend_notif', notifOn ? '1' : '0') }, [notifOn])

  // Prépare l'audio ping (data URI d'un petit bip synth, ~0.15s)
  useEffect(() => {
    audioRef.current = new Audio(PING_DATA_URI)
    audioRef.current.volume = 0.55
  }, [])

  // Demande permission notif au premier toggle ON
  useEffect(() => {
    if (notifOn && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [notifOn])

  const handleNewArrival = (row) => {
    if (soundOn && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    }
    if (notifOn && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(t('attendance.newArrival', 'Nouvelle arrivée'), {
        body: `${row.full_name} · ${row.used_at_hm}`,
        icon: '/logos/logo_newwine.png',
        tag: 'nwc-attendance',
      })
    }
  }

  const { data, isLoading, error, refetch, latestArrivalId } = useAttendancePolling(eventId, {
    sinceMinutes,
    onNewArrival: handleNewArrival,
  })

  // Types de tickets distincts (pour filtre)
  const availableTypes = useMemo(() => {
    if (!data?.rows) return []
    const set = new Set(data.rows.map((r) => r.ticket_type).filter(Boolean))
    return [...set].sort()
  }, [data])

  const filteredRows = useMemo(() => {
    if (!data?.rows) return []
    let rows = data.rows
    if (typeFilter) rows = rows.filter((r) => r.ticket_type === typeFilter)
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      rows = rows.filter((r) =>
        (r.full_name || '').toLowerCase().includes(s) ||
        (r.phone || '').toLowerCase().includes(s) ||
        (r.short_code || '').toLowerCase().includes(s) ||
        (r.email || '').toLowerCase().includes(s)
      )
    }
    if (sort === 'alpha') {
      rows = [...rows].sort((a, b) =>
        (a.last_name || '').localeCompare(b.last_name || '', 'fr', { sensitivity: 'base' })
      )
    }
    return rows
  }, [data, typeFilter, search, sort])

  const doExport = async (fn, label) => {
    setBusy(true)
    try {
      await fn(eventId)
      toast.success(t('attendance.exportDone', 'Export téléchargé ({{label}})', { label }))
    } catch (e) {
      toast.error(e?.response?.data?.message || t('attendance.exportError', "Échec de l'export"))
    } finally {
      setBusy(false)
    }
  }

  const stats = data?.stats ?? {}
  const event = data?.event ?? {}

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl">
      <BackButton to={`/admin/evenements/${eventId}/billetterie`} label={t('attendance.backToTickets', 'Retour billetterie')} />

      {/* ── HEADER : event + actions ── */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="tag-mono text-[10px] uppercase tracking-widest text-[color:var(--adm-accent)]">
              <Users size={12} className="inline mr-1" /> {t('attendance.pageTag', 'Liste de présence')}
            </span>
            {data?.now && (
              <span className="text-[10px] text-zinc-500 font-mono">
                · {t('attendance.lastSync', 'sync {{ago}}', {
                  ago: formatDistanceToNow(new Date(data.now), { locale: dateLocale, addSuffix: false }),
                })}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--adm-text)' }}>
            {event.title || t('attendance.loading', 'Chargement…')}
          </h1>
          {event.starts_at && (
            <p className="mt-1 text-sm text-zinc-500 inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} /> {new Date(event.starts_at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
              {event.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={12} /> {event.location}
                </span>
              )}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToggleButton
            active={soundOn}
            onClick={() => setSoundOn((s) => !s)}
            onIcon={<Volume2 size={14} />}
            offIcon={<VolumeX size={14} />}
            label={soundOn ? t('attendance.soundOn', 'Son ON') : t('attendance.soundOff', 'Son OFF')}
          />
          <ToggleButton
            active={notifOn}
            onClick={() => setNotifOn((n) => !n)}
            onIcon={<Bell size={14} />}
            offIcon={<BellOff size={14} />}
            label={notifOn ? t('attendance.notifOn', 'Notif ON') : t('attendance.notifOff', 'Notif OFF')}
          />
          <button onClick={refetch} className="adm-btn adm-btn-ghost" title={t('attendance.refresh', 'Actualiser')}>
            <RefreshCw size={14} />
          </button>
          <Link
            to={`/admin/evenements/${eventId}/presence/kiosque`}
            className="adm-btn adm-btn-ghost inline-flex items-center gap-1.5"
            title={t('attendance.openKiosk', 'Vue kiosque plein écran')}
          >
            <MonitorPlay size={14} /> {t('attendance.kiosk', 'Kiosque')}
          </Link>
        </div>
      </header>

      {/* ── STATS ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label={t('attendance.stat.present', 'Présents')} value={stats.used ?? '—'} accent />
        <StatCard label={t('attendance.stat.expected', 'Attendus')} value={stats.sold ?? '—'} />
        <StatCard label={t('attendance.stat.rate', 'Taux')} value={`${stats.fill_rate ?? 0}%`} />
        <StatCard label={t('attendance.stat.last15', 'Dernière 15 min')} value={stats.last_15_min ?? 0} icon={<TrendingUp size={14} />} />
      </section>

      {/* ── ACTIONS EXPORT ── */}
      <section className="adm-card p-3 sm:p-4 flex flex-wrap items-center gap-2">
        <button onClick={() => doExport(exportAttendanceXlsx, 'Excel')} disabled={busy} className="adm-btn adm-btn-primary">
          <Download size={14} /> {t('attendance.exportExcel', 'Excel')}
        </button>
        <button onClick={() => doExport(exportAttendancePdf, 'PDF')} disabled={busy} className="adm-btn adm-btn-primary">
          <FileText size={14} /> {t('attendance.exportPdf', 'PDF')}
        </button>
        <button onClick={() => doExport(exportAttendanceBackupPdf, 'PDF backup')} disabled={busy} className="adm-btn adm-btn-ghost" title={t('attendance.backupHint', 'Liste vierge à cocher — mode dégradé')}>
          <Printer size={14} /> {t('attendance.backupPdf', 'Papier backup')}
        </button>
        <span className="ml-auto text-xs text-zinc-500">
          {t('attendance.total', '{{n}} personne(s) affichée(s)', { n: filteredRows.length })}
        </span>
      </section>

      {/* ── FILTRES ── */}
      <section className="adm-card p-3 sm:p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('attendance.searchPlaceholder', 'Nom, téléphone, code…')}
            className="adm-input pl-9 w-full"
          />
        </div>
        {availableTypes.length > 1 && (
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="adm-select">
            <option value="">{t('attendance.allTypes', 'Tous les types')}</option>
            {availableTypes.map((tt) => <option key={tt} value={tt}>{tt}</option>)}
          </select>
        )}
        <select value={sinceMinutes} onChange={(e) => setSince(+e.target.value)} className="adm-select">
          {SINCE_FILTERS.map((f) => <option key={f.value} value={f.value}>{t(f.labelKey)}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="adm-select">
          <option value="recent">{t('attendance.sortRecent', 'Ordre d\'arrivée')}</option>
          <option value="alpha">{t('attendance.sortAlpha', 'Alphabétique')}</option>
        </select>
      </section>

      {/* ── LISTE ── */}
      {isLoading && !data ? (
        <div className="adm-card p-16 text-center text-zinc-500">{t('attendance.loading', 'Chargement…')}</div>
      ) : error ? (
        <div className="adm-card p-8 text-center text-red-600">{error}</div>
      ) : filteredRows.length === 0 ? (
        <div className="adm-card p-12 text-center text-zinc-500">
          <Users size={40} className="mx-auto mb-4 opacity-40" />
          <p className="text-base">{t('attendance.emptyTitle', 'Aucune personne pour le moment.')}</p>
          <p className="text-xs mt-1">{t('attendance.emptyHint', 'La liste se met à jour automatiquement à chaque scan.')}</p>
        </div>
      ) : (
        <div className="adm-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[color:var(--adm-accent)]/5 border-b" style={{ borderColor: 'var(--adm-border)' }}>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)]">#</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)]">{t('attendance.col.name', 'Nom')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] hidden sm:table-cell">{t('attendance.col.phone', 'Téléphone')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] hidden md:table-cell">{t('attendance.col.type', 'Type')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] hidden md:table-cell">{t('attendance.col.code', 'Code')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)]">{t('attendance.col.time', 'Arrivée')}</th>
                  <th className="p-3 text-left text-[11px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] hidden lg:table-cell">{t('attendance.col.by', 'Scanné par')}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => {
                  const isLatest = row.id === latestArrivalId
                  return (
                    <tr
                      key={row.id}
                      className={`border-b transition-colors ${isLatest ? 'bg-yellow-100/60 animate-flash' : (i % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50')}`}
                      style={{ borderColor: 'var(--adm-border)' }}
                    >
                      <td className="p-3 text-center font-bold text-[color:var(--adm-accent)] tabular-nums">{i + 1}</td>
                      <td className="p-3">
                        <div className="font-semibold" style={{ color: 'var(--adm-text)' }}>
                          {row.full_name}
                          {isLatest && (
                            <span className="ml-2 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-yellow-400 text-yellow-900 font-mono uppercase">
                              <CheckCircle2 size={10}/> {t('attendance.justArrived', 'nouveau')}
                            </span>
                          )}
                        </div>
                        {row.email && <div className="text-[11px] text-zinc-500 sm:hidden">{row.phone}</div>}
                      </td>
                      <td className="p-3 hidden sm:table-cell text-zinc-700">{row.phone || '—'}</td>
                      <td className="p-3 hidden md:table-cell">
                        {row.ticket_type && (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
                            {row.ticket_type}
                          </span>
                        )}
                      </td>
                      <td className="p-3 hidden md:table-cell font-mono text-xs font-bold">{row.short_code?.toUpperCase() || '—'}</td>
                      <td className="p-3 font-bold text-[color:var(--adm-accent)] tabular-nums">
                        <Clock size={10} className="inline mr-1 opacity-50" />{row.used_at_hm || '—'}
                      </td>
                      <td className="p-3 hidden lg:table-cell text-xs text-zinc-600">{row.used_by || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes flash-bg {
          0%, 100% { background-color: rgba(251, 191, 36, 0.6); }
          50% { background-color: rgba(251, 191, 36, 0.3); }
        }
        .animate-flash { animation: flash-bg 1.5s ease-in-out 2; }
      `}</style>
    </div>
  )
}

// ─── Sous-composants ───

function StatCard({ label, value, icon = null, accent = false }) {
  return (
    <div className={`adm-card p-3 sm:p-4 ${accent ? 'ring-2 ring-[color:var(--adm-accent)]/30' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--adm-accent)] mb-1 inline-flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-bold tabular-nums leading-none ${accent ? 'text-[color:var(--adm-accent)]' : ''}`} style={{ color: accent ? undefined : 'var(--adm-text)' }}>
        {value}
      </p>
    </div>
  )
}

function ToggleButton({ active, onClick, onIcon, offIcon, label }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11px] font-mono uppercase tracking-wider transition border
        ${active
          ? 'bg-[color:var(--adm-accent)] text-white border-[color:var(--adm-accent)]'
          : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'}`}
      title={label}
    >
      {active ? onIcon : offIcon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

// Petit bip synth (base64) — <2 KB, joué à chaque nouveau scan.
// Wave 880 Hz ~150 ms via un WAV inline minimal.
const PING_DATA_URI = 'data:audio/wav;base64,UklGRl4EAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YToEAACAg4WHioyOkZOWmJqcnp+goqOjpKSkpKOjoqCfnZuZl5SRj4yJhoOAf3x5dnRxb2xqZ2VjYV9dW1lYVlVUUlFQT05NTUxLSktKSktKSkpLTExNTk9QUVJUVVdYWlxdX2FjZWZoamtsbW5vcHFxcnJyc3NzcnJycXBwbm1sa2lnZmRiYF5cWlhWVFJRT01LSklHRURDQkFAPz4+PT08PDw8PDw9PT0+P0BAQUJDREVGSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFhYmNjZGRlZWZmZmdnaGhoaGhoaGhoaGhnZ2dnZmZmZWVlZGRkY2NjYmJiYWFhYWBgYGBfX19fX19fX19fX2BgYGBgYWFhYmJiY2NjZGRkZWVlZmZmZmdnZ2doaGhoaWlpaWpqamprampqampqamlpaWlpaGhoaGdnZ2dmZmZlZWVkZGRjY2NiYmJhYWFgYGBfX19eXl5dXV1cXFxbW1taWlpZWVlYWFhXV1dWVlZVVVVUVFRTU1NSUlJRUVFRUFBQUFBQUFBQUFBRUVFRUlJSU1NTVFRUVVVVVlZWV1dXWFhYWVlZWlpaW1tbXFxcXV1dXV5eXl9fX2BgYGFhYWJiYmNjY2RkZGVlZWZmZmdnZ2hoaGlpaWpqamtra2xsbG1tbW5ubm9vb3BwcHFxcXJycnNzc3R0dHV1dXZ2dnd3d3h4eHl5eXp6ent7e3x8fH19fX5+fn9/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/'
