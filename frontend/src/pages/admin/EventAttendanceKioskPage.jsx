/**
 * Vue KIOSQUE — plein écran, à afficher sur un moniteur du service accueil.
 *
 *  ┌─ NEW WINE CHURCH ─────────────────────────┐
 *  │  BAL 2026                                  │
 *  │                                            │
 *  │      147 / 320   (46%)                     │
 *  │  ─────────────────────                     │
 *  │  DERNIÈRE ARRIVÉE                          │
 *  │  Marie KOFFI  ·  20h12                     │
 *  │                                            │
 *  │  ● Aïcha DIALLO           20h11            │
 *  │  ● Jean-Marc SOMDA        20h10            │
 *  │  ● Fatou ZONGO            20h09            │
 *  │  ● … (10 derniers)                         │
 *  └────────────────────────────────────────────┘
 *
 * Design plein écran, palette ivoire chaud + bordeaux, texte énorme,
 * dernière arrivée en HÉNAURME. Refresh auto via useAttendancePolling.
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Maximize2 } from 'lucide-react'
import { useAttendancePolling } from '@/hooks/useAttendancePolling.js'

export default function EventAttendanceKioskPage() {
  const { t, i18n } = useTranslation()
  const { id: eventId } = useParams()
  const [showLast, setShowLast] = useState(null)

  const { data, latestArrivalId } = useAttendancePolling(eventId, {
    onNewArrival: (row) => {
      setShowLast(row)
      // Reset après 10 s (le "dernier arrivé" reste highlight)
      setTimeout(() => setShowLast(null), 10_000)
    },
  })

  // Init showLast au premier chargement avec le plus récent
  useEffect(() => {
    if (!showLast && data?.rows?.[0]) setShowLast(data.rows[0])
  }, [data, showLast])

  const stats  = data?.stats ?? {}
  const event  = data?.event ?? {}
  const last10 = useMemo(() => (data?.rows ?? []).slice(0, 10), [data])

  const goFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.().catch(() => {})
  }

  return (
    <div className="fixed inset-0 bg-[#FAF6EE] flex flex-col text-[#1F1A14] overflow-hidden z-50">
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-8 py-5 border-b-2 border-[#8B1A2F]">
        <div className="flex items-center gap-4">
          <Link
            to={`/admin/evenements/${eventId}/presence`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-[#6B5F4E] hover:text-[#8B1A2F] transition"
          >
            <ArrowLeft size={14} /> {t('attendance.exitKiosk', 'Quitter kiosque')}
          </Link>
          <span className="text-xs font-mono uppercase tracking-widest text-[#8B1A2F] font-bold">
            NEW WINE CHURCH · {t('attendance.pageTag', 'Liste de présence')}
          </span>
        </div>
        <button
          onClick={goFullscreen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-widest text-[#6B5F4E] hover:text-[#8B1A2F] transition"
          title={t('attendance.fullscreen', 'Plein écran')}
        >
          <Maximize2 size={14} /> {t('attendance.fullscreen', 'Plein écran')}
        </button>
      </header>

      {/* ── BODY ── */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-0 min-h-0">
        {/* Colonne gauche : gros compteur + dernier arrivé */}
        <section className="lg:col-span-3 flex flex-col justify-center items-center p-8 lg:p-16 border-r border-[#E5E0D0]">
          <p className="text-xs sm:text-sm font-mono uppercase tracking-[0.35em] text-[#8B1A2F] mb-4">
            {event.title || '…'}
          </p>

          <div className="text-center leading-none">
            <p className="font-bold tabular-nums text-[10rem] sm:text-[14rem] lg:text-[18rem] text-[#8B1A2F]">
              {stats.used ?? 0}
            </p>
            <p className="mt-2 text-2xl sm:text-3xl text-[#6B5F4E]">
              / <span className="tabular-nums font-bold text-[#1F1A14]">{stats.sold ?? 0}</span>
              <span className="ml-4 text-[#8B1A2F] font-bold">({stats.fill_rate ?? 0}%)</span>
            </p>
          </div>

          {/* Barre de progression */}
          <div className="mt-8 w-full max-w-md h-3 bg-[#E5E0D0] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#8B1A2F] transition-all duration-700"
              style={{ width: `${Math.min(100, stats.fill_rate ?? 0)}%` }}
            />
          </div>
          <p className="mt-3 text-xs font-mono uppercase tracking-widest text-[#6B5F4E]">
            {t('attendance.stat.last15', 'Dernière 15 min')} : <span className="font-bold text-[#8B1A2F]">{stats.last_15_min ?? 0}</span>
          </p>
        </section>

        {/* Colonne droite : dernier arrivé + derniers 10 */}
        <section className="lg:col-span-2 flex flex-col p-6 lg:p-8 bg-white border-l-4 border-[#8B1A2F]/20">
          {/* Dernier arrivé en énorme */}
          {showLast ? (
            <div className={`p-6 bg-gradient-to-br from-[#8B1A2F] to-[#6B1422] text-white rounded-lg mb-5 ${latestArrivalId === showLast.id ? 'ring-4 ring-yellow-400 animate-pulse-slow' : ''}`}>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/70 mb-3">
                {t('attendance.lastArrival', 'Dernière arrivée')}
              </p>
              <p className="text-3xl sm:text-4xl font-bold leading-tight">
                {showLast.full_name}
              </p>
              <div className="flex items-center justify-between mt-3 text-sm font-mono">
                {showLast.ticket_type && (
                  <span className="px-2 py-0.5 bg-white/20 rounded text-xs uppercase tracking-wider">
                    {showLast.ticket_type}
                  </span>
                )}
                <span className="text-2xl font-bold tabular-nums">{showLast.used_at_hm}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-[#FAF6EE] rounded-lg mb-5 text-center border border-dashed border-[#8B1A2F]/30">
              <p className="text-[#6B5F4E] italic">{t('attendance.waitingFirst', "En attente du premier scan…")}</p>
            </div>
          )}

          {/* Derniers 10 */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-[#8B1A2F] mb-3 font-bold">
              {t('attendance.recent10', '10 dernières arrivées')}
            </p>
            <ul className="space-y-2 overflow-y-auto max-h-full">
              {last10.length === 0 && (
                <li className="text-center text-sm text-[#6B5F4E] italic py-8">—</li>
              )}
              {last10.map((row, i) => (
                <li
                  key={row.id}
                  className={`flex items-center justify-between gap-3 p-3 rounded transition-all
                    ${i === 0 ? 'bg-yellow-50 border-l-4 border-yellow-400' : 'bg-[#FAF6EE] border-l-4 border-transparent'}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1F1A14] truncate">{row.full_name}</p>
                    {row.ticket_type && (
                      <p className="text-[10px] font-mono uppercase text-[#8B1A2F] tracking-wider">{row.ticket_type}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold tabular-nums text-[#8B1A2F] font-mono shrink-0">{row.used_at_hm}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="text-center py-3 text-[10px] font-mono uppercase tracking-widest text-[#6B5F4E] border-t border-[#E5E0D0]">
        © New Wine Church · {t('attendance.autoRefresh', 'Mise à jour automatique')} · {data?.now && new Date(data.now).toLocaleTimeString(i18n.language)}
      </footer>

      <style>{`
        @keyframes pulse-slow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .animate-pulse-slow { animation: pulse-slow 1.2s ease-in-out 3; }
      `}</style>
    </div>
  )
}
