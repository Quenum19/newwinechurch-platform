/**
 * Modal — Check-in manuel d'une personne (VIP qui a perdu son QR, contact hors ligne, etc.).
 *
 *  - Champ de recherche live (nom, téléphone, email, short_code)
 *  - Debounce 300 ms puis GET /api/admin/events/{id}/tickets?search=...
 *  - Résultats filtrés : montre le statut, permet "Marquer présent"
 *  - Note optionnelle (raison — ex : "QR non lisible", "Ticket papier")
 *  - Toast succès + callback refresh sur la page parente
 *
 * Palette ivoire chaud (#FAF6EE) via composant Modal partagé.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Search, UserCheck, CheckCircle2, Phone, Mail, Hash } from 'lucide-react'
import toast from 'react-hot-toast'

import Modal from '@/components/ui/Modal.jsx'
import { manualCheckIn, searchTicketsForCheckin } from '@/api/attendance.js'

export default function ManualCheckInModal({ open, onClose, eventId, onDone }) {
  const { t } = useTranslation()

  const [query, setQuery]         = useState('')
  const [results, setResults]     = useState([])
  const [isSearching, setSearching] = useState(false)
  const [note, setNote]           = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [error, setError]         = useState(null)

  const debounceRef = useRef(null)
  const inputRef    = useRef(null)

  // Focus initial + reset à l'ouverture
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setNote('')
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  // Debounce recherche
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const rows = await searchTicketsForCheckin(eventId, query.trim())
        setResults(Array.isArray(rows) ? rows : [])
        setError(null)
      } catch (e) {
        setError(e?.response?.data?.message || t('attendance.manual.searchError', 'Erreur de recherche.'))
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [query, open, eventId, t])

  const handleCheckIn = async (ticket) => {
    setProcessingId(ticket.id)
    try {
      const res = await manualCheckIn(eventId, ticket.id, note || null)
      if (res.already) {
        toast(res.message || t('attendance.manual.already', 'Déjà scanné.'), { icon: 'ℹ' })
      } else {
        toast.success(res.message || t('attendance.manual.done', 'Personne marquée présente.'))
      }
      onDone?.(res.ticket)
      // Retire le ticket check-iné de la liste locale (retour visuel immédiat)
      setResults((prev) => prev.map((r) =>
        r.id === ticket.id ? { ...r, status: 'used', used_at: new Date().toISOString() } : r
      ))
    } catch (e) {
      toast.error(e?.response?.data?.message || t('attendance.manual.error', "Impossible de marquer présent."))
    } finally {
      setProcessingId(null)
    }
  }

  const emptyState = useMemo(() => {
    if (!query.trim()) return t('attendance.manual.hint', 'Tape un nom, un téléphone, un email ou un code.')
    if (isSearching) return null
    return t('attendance.manual.noResult', 'Aucun ticket trouvé pour cette recherche.')
  }, [query, isSearching, t])

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={t('attendance.manual.title', 'Check-in manuel')}
      description={t('attendance.manual.desc', 'Marque une personne comme présente sans scan (QR perdu, ticket papier…).')}
    >
      <div className="space-y-4">
        {/* Champ recherche */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B1A2F]/60" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('attendance.manual.searchPlaceholder', 'Nom, téléphone, email, code…')}
            className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-[#E8DFC9] bg-white text-[14px] text-[#1F1A14] placeholder:text-[#9C8F7B] focus:outline-none focus:border-[#8B1A2F] focus:ring-2 focus:ring-[#8B1A2F]/20 transition"
          />
          {isSearching && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B1A2F] animate-spin" />
          )}
        </div>

        {/* Note optionnelle */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-widest text-[#6B5F4E] mb-1 block">
            {t('attendance.manual.noteLabel', 'Note (optionnelle)')}
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('attendance.manual.notePlaceholder', 'Ex : QR illisible, ticket papier…')}
            className="w-full px-3 py-2 rounded-lg border border-[#E8DFC9] bg-white text-[13px] text-[#1F1A14] placeholder:text-[#9C8F7B] focus:outline-none focus:border-[#8B1A2F] focus:ring-2 focus:ring-[#8B1A2F]/20 transition"
            maxLength={255}
          />
        </div>

        {/* Résultats */}
        <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-[#E8DFC9] bg-white">
          {error && (
            <div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">
              {error}
            </div>
          )}
          {results.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#6B5F4E]">
              {emptyState}
            </div>
          ) : (
            <ul className="divide-y divide-[#E8DFC9]">
              {results.map((ticket) => {
                const isUsed  = ticket.status === 'used'
                const isBusy  = processingId === ticket.id
                const isBlocked =
                  ticket.status === 'cancelled' ||
                  ticket.payment_status === 'refunded'
                return (
                  <li key={ticket.id} className="flex items-center gap-3 p-3 hover:bg-[#FAF6EE] transition">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#1F1A14] truncate">
                        {ticket.full_name || `${ticket.first_name ?? ''} ${ticket.last_name ?? ''}`.trim()}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-[#6B5F4E]">
                        {ticket.phone && <span className="inline-flex items-center gap-1"><Phone size={10}/>{ticket.phone}</span>}
                        {ticket.email && <span className="inline-flex items-center gap-1 truncate max-w-[200px]"><Mail size={10}/>{ticket.email}</span>}
                        {ticket.short_code && <span className="inline-flex items-center gap-1 font-mono"><Hash size={10}/>{ticket.short_code.toUpperCase()}</span>}
                      </div>
                    </div>

                    {isUsed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 size={12}/> {t('attendance.manual.alreadyPresent', 'Présent')}
                      </span>
                    ) : isBlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono uppercase tracking-wider bg-zinc-100 text-zinc-500 border border-zinc-200">
                        {ticket.status === 'cancelled'
                          ? t('attendance.manual.cancelled', 'Annulé')
                          : t('attendance.manual.refunded', 'Remboursé')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleCheckIn(ticket)}
                        disabled={isBusy || processingId !== null}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#8B1A2F] text-white text-[12px] font-mono uppercase tracking-wider font-semibold hover:bg-[#6B1422] disabled:opacity-50 disabled:cursor-not-allowed transition shrink-0"
                      >
                        {isBusy ? <Loader2 size={12} className="animate-spin"/> : <UserCheck size={12}/>}
                        {t('attendance.manual.checkInBtn', 'Marquer présent')}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <Modal.Footer>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-md text-[13px] font-mono uppercase tracking-wider text-[#6B5F4E] hover:bg-[#F0E7D1] transition"
        >
          {t('attendance.manual.close', 'Fermer')}
        </button>
      </Modal.Footer>
    </Modal>
  )
}
