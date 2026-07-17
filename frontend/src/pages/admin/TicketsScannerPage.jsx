/**
 * Scanner /scan — accessible aux rôles `controleur`, `admin`, `admin-site`, `superadmin`.
 *
 * UX :
 *  - Caméra plein écran (html5-qrcode)
 *  - Feedback couleur instant : vert OK / rouge déjà utilisé / orange annulé / gris invalide
 *  - Mode "code manuel" en fallback
 *  - Bouton "annuler dernier scan" (unscan)
 */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Html5Qrcode } from 'html5-qrcode'
import {
  CheckCircle2, XCircle, AlertTriangle, Camera, Type, Loader2, RotateCcw, Calendar,
  Users, Search, X, ListChecks, Circle, Ban,
} from 'lucide-react'
import { toast } from 'react-hot-toast'

import { events as eventsApi } from '@/api/admin'

const READER_ID = 'nwc-ticket-scanner-reader'

export default function TicketsScannerPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState('camera') // 'camera' | 'manual'
  const [manualCode, setManualCode] = useState('')
  // Pré-sélection event si ?event={id} dans l'URL (bouton Scanner depuis dashboard event)
  // Verrouillage : si l'URL fournit event={id}, on ne montre PAS le sélecteur —
  // typique des scanners scopés (interne ou invité magic-link) qui n'accèdent qu'à 1 event.
  const lockedEventFromUrl = searchParams.get('event') || null
  const [eventId, setEventId] = useState(() => lockedEventFromUrl)
  const [lastResult, setLastResult] = useState(null)
  const [attendeesOpen, setAttendeesOpen] = useState(false)
  const scannerRef = useRef(null)
  const lockRef = useRef(false) // anti rebond — un seul scan à la fois

  // Liste des events avec billetterie — retournée seulement si le user a la permission
  // globale (contrôleur, admin). Un guest scanner obtient 403 : on ignore l'erreur.
  const { data: eventsData = [] } = useQuery({
    queryKey: ['admin', 'tickets-scanner', 'events'],
    queryFn: async () => {
      try {
        const res = await eventsApi.list({ ticketing_enabled: 1, per_page: 50 })
        return res?.data ?? res ?? []
      } catch { return [] }
    },
    staleTime: 60_000,
    enabled: ! lockedEventFromUrl, // pas besoin si event verrouillé
  })

  // Étape D — Compteur temps réel (rafraîchi toutes les 15s).
  const { data: liveStats } = useQuery({
    queryKey: ['admin', 'tickets-scanner', 'stats', eventId],
    queryFn: () => eventsApi.ticketsStats(eventId),
    enabled: !! eventId,
    refetchInterval: 15_000,
    staleTime: 10_000,
  })

  const scanMutation = useMutation({
    mutationFn: (code) => eventsApi.ticketScan(code, eventId),
    onMutate: () => { lockRef.current = true },
    onSuccess: (res) => {
      setLastResult(res)
      const map = {
        ok:           { variant: 'success', label: 'ENTRÉE VALIDÉE' },
        already_used: { variant: 'warn',    label: 'DÉJÀ UTILISÉ' },
        cancelled:    { variant: 'error',   label: 'TICKET ANNULÉ' },
        wrong_event:  { variant: 'warn',    label: 'MAUVAIS ÉVÉNEMENT' },
        invalid:      { variant: 'error',   label: 'CODE INVALIDE' },
      }
      const m = map[res.result] || { variant: 'error', label: 'ERREUR' }
      toast[m.variant === 'success' ? 'success' : 'error'](m.label)
      navigator.vibrate?.(m.variant === 'success' ? 60 : [80, 40, 80])
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || 'Erreur scan.')
      setLastResult({ result: 'invalid', message: err?.response?.data?.message })
    },
    onSettled: () => { setTimeout(() => { lockRef.current = false }, 1200) },
  })

  const unscanMutation = useMutation({
    mutationFn: (ticketId) => eventsApi.ticketUnscan(ticketId),
    onSuccess: () => {
      toast.success('Scan annulé.')
      setLastResult(null)
    },
    onError: () => toast.error('Annulation impossible.'),
  })

  // Stable via ref pour éviter que le useEffect caméra ne se restart en boucle
  // (scanMutation change à chaque render → handleScan aussi si en dep, → useEffect
  // cleanup+start infini → écran noir clignotant).
  const scanMutationRef = useRef(scanMutation)
  useEffect(() => { scanMutationRef.current = scanMutation }, [scanMutation])

  const handleScan = useCallback((text) => {
    if (lockRef.current || !text) return
    scanMutationRef.current.mutate(text)
  }, [])

  // === Caméra ===
  useEffect(() => {
    if (mode !== 'camera') return

    let cancelled = false
    let scanner = null
    let started = false

    const startCamera = async () => {
      // Attend le prochain tick pour que le div DOM soit prêt
      await new Promise((r) => setTimeout(r, 0))
      if (cancelled) return

      const el = document.getElementById(READER_ID)
      if (! el) return // le div n'est pas rendu (mode a changé)

      scanner = new Html5Qrcode(READER_ID, { verbose: false })
      scannerRef.current = scanner

      const config = { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 }

      // Cascade de stratégies caméra
      const attempts = [
        () => scanner.start({ facingMode: 'environment' }, config, (t) => handleScan(t), () => {}),
        () => scanner.start({ facingMode: 'user' }, config, (t) => handleScan(t), () => {}),
        async () => {
          const cams = await Html5Qrcode.getCameras()
          if (! cams?.length) throw new Error('Aucune caméra')
          return scanner.start(cams[0].id, config, (t) => handleScan(t), () => {})
        },
      ]
      for (const attempt of attempts) {
        if (cancelled) return
        try {
          await attempt()
          started = true
          return
        } catch (e) {
          console.warn('Camera attempt failed', e)
        }
      }
      if (! cancelled) {
        toast.error("Impossible d'accéder à la caméra. Passe en saisie manuelle.")
        setMode('manual')
      }
    }
    startCamera()

    return () => {
      cancelled = true
      const s = scanner
      scannerRef.current = null
      if (! s) return
      // Cleanup ASYNC safe : n'appelle clear() QUE si stop() résout OU si started=false
      if (started) {
        s.stop().then(() => {
          try { s.clear() } catch {}
        }).catch(() => {})
      } else {
        // Pas encore started → juste clear (safe)
        try { s.clear() } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const onManualSubmit = (e) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleScan(manualCode.trim())
    setManualCode('')
  }

  return (
    <div className="min-h-screen bg-public-ink text-public-bone flex flex-col">
      {/* Top bar */}
      <header className="px-4 py-3 border-b border-public-bone/10 flex items-center gap-3">
        <h1 className="font-display text-2xl uppercase">Contrôle d'entrée</h1>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setMode('camera')}
                  className={`p-2 ${mode === 'camera' ? 'bg-public-flame' : 'bg-public-bone/10'}`}>
            <Camera size={18}/>
          </button>
          <button onClick={() => setMode('manual')}
                  className={`p-2 ${mode === 'manual' ? 'bg-public-flame' : 'bg-public-bone/10'}`}>
            <Type size={18}/>
          </button>
        </div>
      </header>

      {/* Event filter — masqué si eventId verrouillé par URL (scanners scopés) */}
      {! lockedEventFromUrl && (
        <div className="px-4 py-3 bg-public-bone/5 border-b border-public-bone/10">
          <label className="tag-mono text-public-bone/50 block mb-1">
            <Calendar size={11} className="inline mr-1"/> Restreindre à un événement
          </label>
          <select value={eventId ?? ''} onChange={(e) => setEventId(e.target.value || null)}
                  className="w-full bg-public-bone/10 border border-public-bone/15 px-2 py-1.5 text-public-bone text-sm [&>option]:bg-public-ink [&>option]:text-public-bone">
            <option value="">Tous les événements</option>
            {eventsData.map((e) => (
              <option key={e.id} value={e.id}>{e.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Étape D — Compteur temps réel (visible dès qu'un event est ciblé) */}
      {eventId && liveStats && (
        <LiveStatsBar stats={liveStats} onOpenAttendees={() => setAttendeesOpen(true)}/>
      )}

      {/* Scan area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {mode === 'camera' ? (
          <div id={READER_ID} className="w-full max-w-md min-h-[300px] bg-black rounded overflow-hidden"></div>
        ) : (
          <form onSubmit={onManualSubmit} className="w-full max-w-md bg-public-bone text-public-ink p-6 rounded-lg space-y-4 shadow-2xl">
            <div>
              <p className="tag-mono text-public-flame mb-1">Saisie manuelle</p>
              <p className="text-xs text-public-ink/60">Code court (NWC-XXXX) ou numéro de ticket</p>
            </div>
            <input
              autoFocus value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="NWC-XXXX"
              className="w-full bg-white border-2 border-public-ink/20 px-4 py-4 text-public-ink font-mono uppercase tracking-widest text-lg focus:border-public-flame focus:outline-none rounded"
            />
            <button type="submit" disabled={scanMutation.isPending || !manualCode.trim()}
                    className="w-full px-4 py-4 bg-public-flame text-white font-mono uppercase text-sm tracking-widest hover:bg-public-ink transition disabled:opacity-50 rounded">
              {scanMutation.isPending ? <><Loader2 size={16} className="inline animate-spin mr-2"/>Vérification…</> : 'Valider le ticket'}
            </button>
          </form>
        )}

        {/* Result feedback */}
        {lastResult && <ResultPanel result={lastResult} onUnscan={(id) => unscanMutation.mutate(id)} unscanning={unscanMutation.isPending}/>}
      </main>

      {/* Étape D — Drawer liste des inscrits en temps réel */}
      {eventId && (
        <AttendeesDrawer
          open={attendeesOpen}
          onClose={() => setAttendeesOpen(false)}
          eventId={eventId}
          lastScanResult={lastResult}
        />
      )}
    </div>
  )
}

function ResultPanel({ result, onUnscan, unscanning }) {
  const palette = {
    ok:           { bg: 'bg-green-600',  Icon: CheckCircle2,   title: 'ENTRÉE VALIDÉE' },
    already_used: { bg: 'bg-orange-500', Icon: AlertTriangle,  title: 'DÉJÀ UTILISÉ' },
    cancelled:    { bg: 'bg-red-600',    Icon: XCircle,        title: 'TICKET ANNULÉ' },
    wrong_event:  { bg: 'bg-yellow-600', Icon: AlertTriangle,  title: 'MAUVAIS ÉVÉNEMENT' },
    invalid:      { bg: 'bg-public-bone/20', Icon: XCircle,    title: 'CODE INVALIDE' },
  }[result.result] || { bg: 'bg-public-bone/20', Icon: XCircle, title: 'ERREUR' }

  const Icon = palette.Icon

  return (
    <div className={`mt-6 w-full max-w-md ${palette.bg} text-white p-6 border-2 border-white/20`}>
      <div className="flex items-center gap-3">
        <Icon size={32}/>
        <h2 className="font-display uppercase text-2xl leading-none">{palette.title}</h2>
      </div>
      {result.ticket && (
        <div className="mt-4 space-y-1 text-sm">
          <p><strong>{result.ticket.full_name}</strong></p>
          <p className="opacity-80">{result.ticket.email}</p>
          <p className="font-mono text-xs opacity-70">{result.ticket.short_code} · {result.ticket.ticket_number}</p>
          {result.ticket.event_title && <p className="opacity-80">→ {result.ticket.event_title}</p>}
          {result.ticket.used_at && (
            <p className="text-xs opacity-80">Scanné à {new Date(result.ticket.used_at).toLocaleTimeString('fr-FR')}</p>
          )}
        </div>
      )}
      {result.message && <p className="mt-3 text-sm opacity-90">{result.message}</p>}
      {result.result === 'ok' && result.ticket?.id && (
        <button onClick={() => onUnscan(result.ticket.id)} disabled={unscanning}
                className="mt-4 inline-flex items-center gap-2 px-3 py-2 bg-black/30 border border-white/30 text-xs font-mono uppercase tracking-widest disabled:opacity-50">
          <RotateCcw size={12}/> {unscanning ? '...' : 'Annuler ce scan'}
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
//  LiveStatsBar — Étape D : compteur temps réel visible pendant les scans
// ---------------------------------------------------------------------------
function LiveStatsBar({ stats, onOpenAttendees }) {
  const scanned = stats.used ?? 0
  const sold    = stats.sold ?? 0
  const remaining = Math.max(0, sold - scanned)
  const scanRate  = sold > 0 ? Math.round((scanned / sold) * 100) : 0

  return (
    <div className="px-4 py-2.5 bg-public-flame/15 border-b border-public-flame/25">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="font-display text-2xl leading-none tabular-nums">
              {scanned}<span className="text-public-bone/50 text-lg mx-1">/</span>{sold}
            </span>
            <span className="tag-mono text-public-bone/70">SCANNÉS</span>
            <span className="tag-mono text-public-bone/60 ml-auto">
              {remaining} restant{remaining > 1 ? 's' : ''}
            </span>
          </div>
          {sold > 0 && (
            <div className="mt-1.5 h-1.5 bg-public-bone/10 rounded-full overflow-hidden">
              <div className="h-full bg-public-flame transition-all"
                   style={{ width: `${Math.min(100, scanRate)}%` }}/>
            </div>
          )}
        </div>
        <button
          onClick={onOpenAttendees}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-public-bone text-public-ink text-xs uppercase tracking-wider font-mono hover:bg-white transition rounded"
        >
          <ListChecks size={13}/> Liste
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
//  AttendeesDrawer — Étape D : liste temps réel avec recherche + statut
// ---------------------------------------------------------------------------
function AttendeesDrawer({ open, onClose, eventId, lastScanResult }) {
  const [search, setSearch]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Debounce search 300ms pour économiser les requêtes réseau.
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Rafraîchi toutes les 15s tant que le drawer est ouvert (ou après un scan récent).
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'events', eventId, 'scanner-attendees', debounced, statusFilter],
    queryFn: () => eventsApi.ticketsList(eventId, {
      search: debounced || undefined,
      status: statusFilter || undefined,
      per_page: 100,
    }),
    enabled: open,
    refetchInterval: open ? 15_000 : false,
    staleTime: 5_000,
  })

  // Rafraîchit immédiatement après chaque scan validé pour refléter la mise à jour.
  useEffect(() => {
    if (open && lastScanResult?.result === 'ok') refetch()
  }, [lastScanResult, open, refetch])

  const attendees = data?.data ?? []
  const meta      = data?.meta ?? {}

  if (! open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-public-bone text-public-ink flex flex-col shadow-2xl">
        {/* Header */}
        <header className="px-4 py-3 border-b border-public-ink/10 flex items-center gap-3">
          <ListChecks size={18} className="text-public-flame"/>
          <div className="flex-1">
            <h2 className="font-display text-lg uppercase leading-tight">Liste des inscrits</h2>
            <p className="text-[11px] text-public-ink/60">
              {attendees.length} affiché{attendees.length > 1 ? 's' : ''}
              {meta.total ? ` · ${meta.total} au total` : ''}
              {' · MAJ auto 15s'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-public-ink/60 hover:text-public-ink">
            <X size={20}/>
          </button>
        </header>

        {/* Search + filter */}
        <div className="p-3 space-y-2 border-b border-public-ink/10 bg-public-bone">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-public-ink/40"/>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher : nom, email, code, n° ticket…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-public-ink/15 rounded focus:outline-none focus:border-public-flame"
            />
          </div>
          <div className="flex gap-1 text-[11px] font-mono uppercase tracking-wider">
            <FilterChip label="Tous" active={statusFilter === ''} onClick={() => setStatusFilter('')}/>
            <FilterChip label="Non scannés" active={statusFilter === 'confirmed'} onClick={() => setStatusFilter('confirmed')}/>
            <FilterChip label="Scannés" active={statusFilter === 'used'} onClick={() => setStatusFilter('used')}/>
            <FilterChip label="Annulés" active={statusFilter === 'cancelled'} onClick={() => setStatusFilter('cancelled')}/>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-public-ink/50">
              <Loader2 size={22} className="mx-auto animate-spin"/>
            </div>
          ) : attendees.length === 0 ? (
            <p className="py-10 px-6 text-center text-sm text-public-ink/50 italic">
              Aucun inscrit ne correspond aux filtres.
            </p>
          ) : (
            <ul className="divide-y divide-public-ink/5">
              {attendees.map((t) => <AttendeeRow key={t.id} ticket={t}/>)}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 border rounded transition ${
        active
          ? 'bg-public-flame text-white border-public-flame'
          : 'bg-transparent text-public-ink/60 border-public-ink/15 hover:border-public-ink/40'
      }`}
    >
      {label}
    </button>
  )
}

function AttendeeRow({ ticket }) {
  const isUsed      = ticket.status === 'used'
  const isCancelled = ticket.status === 'cancelled'
  const isRefunded  = ticket.payment_status === 'refunded'

  const StatusIcon = isRefunded ? Ban
                   : isCancelled ? XCircle
                   : isUsed ? CheckCircle2
                   : Circle
  const statusColor = isRefunded ? 'text-purple-600'
                    : isCancelled ? 'text-red-500'
                    : isUsed ? 'text-green-600'
                    : 'text-public-ink/30'

  return (
    <li className="px-4 py-2.5 flex items-center gap-3">
      <StatusIcon size={18} className={statusColor + ' shrink-0'}/>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-public-ink text-sm truncate">
          {ticket.full_name || `${ticket.first_name} ${ticket.last_name}`}
        </p>
        <p className="text-[11px] text-public-ink/50 truncate font-mono">
          {ticket.short_code}
          {isUsed && ticket.used_at && (
            <> · scanné {new Date(ticket.used_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</>
          )}
        </p>
        {/* Qui a scanné (visible seulement pour tickets déjà utilisés). */}
        {isUsed && ticket.used_by?.name && (
          <p className="text-[10px] text-green-700/80 truncate mt-0.5">
            par {ticket.used_by.name}
          </p>
        )}
      </div>
    </li>
  )
}
