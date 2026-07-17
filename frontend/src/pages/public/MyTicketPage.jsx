/** Page publique /mon-ticket/{token} — détails du ticket + QR. */
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Calendar, MapPin, Clock, Ticket, ArrowLeft, CheckCircle2, XCircle,
  Mail, Phone, Download, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

import Spinner from '@/components/ui/Spinner.jsx'
import { publicTickets } from '@/api/public'

export default function MyTicketPage() {
  const { token } = useParams()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['public', 'tickets', 'my', token],
    queryFn: () => publicTickets.myTicket(token),
    retry: 1,
  })

  const cancelMutation = useMutation({
    mutationFn: () => publicTickets.cancel(token),
    onSuccess: () => {
      toast.success('Ticket annulé.')
      refetch()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Annulation impossible.'),
  })

  if (isLoading) {
    return <div className="min-h-screen bg-public-bone flex items-center justify-center"><Spinner size={32}/></div>
  }

  const ticket = data?.ticket
  if (!ticket) {
    return (
      <div className="min-h-screen bg-public-bone flex flex-col items-center justify-center px-4">
        <p className="font-display uppercase text-3xl text-public-ink">Ticket introuvable</p>
        <p className="mt-2 text-public-ink/60">Le lien est peut-être expiré ou invalide.</p>
        <Link to="/billetterie" className="mt-6 inline-flex items-center gap-2 text-public-flame underline">
          <ArrowLeft size={16}/> Retour à la billetterie
        </Link>
      </div>
    )
  }

  const event = ticket.event
  const startDate = event?.starts_at ? new Date(event.starts_at) : null
  const isUsed = ticket.status === 'used'
  const isCancelled = ticket.status === 'cancelled'
  const isRefunded = ticket.payment_status === 'refunded'

  return (
    <div className="min-h-screen bg-public-bone py-12 lg:py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/billetterie" className="inline-flex items-center gap-2 tag-mono text-public-ink/60 hover:text-public-flame mb-6">
          <ArrowLeft size={12}/> Retour billetterie
        </Link>

        {/* Status badge */}
        {isUsed && (
          <div className="mb-4 p-4 bg-green-50 border-2 border-green-500 flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={24}/>
            <div>
              <p className="font-bold text-green-800">Ticket déjà utilisé</p>
              {ticket.used_at && (
                <p className="text-sm text-green-700">
                  Scanné le {format(new Date(ticket.used_at), "d MMM 'à' HH:mm", { locale: fr })}
                </p>
              )}
            </div>
          </div>
        )}
        {isCancelled && !isRefunded && (
          <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 flex items-center gap-3">
            <XCircle className="text-red-600" size={24}/>
            <p className="font-bold text-red-800">Ce ticket a été annulé.</p>
          </div>
        )}
        {isRefunded && (
          <div className="mb-4 p-4 bg-purple-50 border-2 border-purple-500">
            <div className="flex items-center gap-3">
              <XCircle className="text-purple-600" size={24}/>
              <div>
                <p className="font-bold text-purple-900">Ticket remboursé</p>
                {ticket.refund_amount_fcfa > 0 && (
                  <p className="text-sm text-purple-800">
                    {new Intl.NumberFormat('fr-FR').format(ticket.refund_amount_fcfa)} FCFA renvoyés sur ton numéro Mobile Money.
                  </p>
                )}
                {ticket.refund_reason && (
                  <p className="text-xs mt-1 text-purple-700">Raison : {ticket.refund_reason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ticket card */}
        <div className="bg-white border-2 border-public-ink shadow-2xl">
          {/* Header noir */}
          <div className="bg-public-ink text-public-bone p-6 sm:p-8">
            <p className="tag-mono text-public-flame mb-2">New Wine Church</p>
            <h1 className="heading-anton text-3xl sm:text-5xl leading-tight">{event?.title}</h1>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              {startDate && (
                <span className="inline-flex items-center gap-1.5"><Calendar size={14}/> {format(startDate, "d MMM yyyy", { locale: fr })}</span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-1.5"><Clock size={14}/> {format(startDate, "HH'h'mm", { locale: fr })}</span>
              )}
              {event?.location && (
                <span className="inline-flex items-center gap-1.5"><MapPin size={14}/> {event.location}</span>
              )}
            </div>
          </div>

          {/* QR + short code */}
          <div className="p-6 sm:p-8 text-center border-b-2 border-dashed border-public-ink/20">
            {ticket.qr_payload && (
              <div className="inline-block bg-white p-4 border-2 border-public-ink/10">
                <img
                  src={`${(import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')}/tickets/qr/${token}`}
                  alt="QR ticket"
                  className="w-56 h-56"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              </div>
            )}
            <p className="mt-4 tag-mono text-public-ink/60">Code court</p>
            <p className="font-mono text-4xl tracking-[0.3em] text-public-flame font-bold mt-1">
              {ticket.short_code}
            </p>
          </div>

          {/* Détails ticket */}
          <div className="p-6 sm:p-8 space-y-3 text-sm">
            <Row label="Nom" value={ticket.full_name}/>
            <Row label="Email" value={ticket.email} icon={<Mail size={12}/>}/>
            {ticket.phone && <Row label="Téléphone" value={ticket.phone} icon={<Phone size={12}/>}/>}
            <Row label="N° commande" value={ticket.order_code}/>
            <Row label="N° ticket" value={ticket.ticket_number}/>
            <Row label="Type" value={<span className="inline-flex items-center gap-1 text-public-flame font-bold"><Ticket size={11}/> Entrée gratuite</span>}/>
            {ticket.whatsapp_opt_in && ticket.whatsapp_sent_at && (
              <Row label="WhatsApp"
                   value={<span className="inline-flex items-center gap-1 text-green-700">
                     ✓ Notif envoyée
                   </span>}/>
            )}
          </div>

          {/* Actions */}
          {!isUsed && !isCancelled && (
            <div className="p-6 sm:p-8 border-t-2 border-public-ink/10 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  if (!confirm('Annuler ce ticket ? Cette action est irréversible.')) return
                  cancelMutation.mutate()
                }}
                disabled={cancelMutation.isPending}
                className="flex-1 px-4 py-3 border-2 border-red-500 text-red-600 font-mono uppercase text-[11px] tracking-widest hover:bg-red-50 transition disabled:opacity-50"
              >
                {cancelMutation.isPending ? <Loader2 size={14} className="inline animate-spin"/> : 'Annuler le ticket'}
              </button>
            </div>
          )}
        </div>

        {event?.support_phone && (
          <p className="mt-6 text-center text-xs text-public-ink/60">
            Besoin d'aide ? Appelle le {event.support_phone}
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, icon }) {
  return (
    <div className="flex justify-between items-center gap-4 py-1.5 border-b border-public-ink/5 last:border-0">
      <dt className="tag-mono text-public-ink/55 inline-flex items-center gap-1.5">{icon}{label}</dt>
      <dd className="text-public-ink font-medium text-right">{value}</dd>
    </div>
  )
}
