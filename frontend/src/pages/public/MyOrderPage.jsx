/**
 * Phase 2 — Page suivi commande payante.
 *
 *  /ma-commande/{orderCode}
 *
 * Affiche : récap, instructions Mobile Money, form soumission référence,
 *           statut paiement (pending/paid/refused/expired), timer expiration.
 */
import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Calendar, MapPin, Clock, Ticket, ArrowLeft, CheckCircle2, XCircle,
  AlertCircle, Phone, Copy, Loader2, Upload, ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'react-hot-toast'

import Spinner from '@/components/ui/Spinner.jsx'
import { publicTickets } from '@/api/public'

export default function MyOrderPage() {
  const { orderCode } = useParams()
  const navigate = useNavigate()
  const [now, setNow] = useState(Date.now())

  // Refresh timer + data toutes les 30s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['public', 'order', orderCode],
    queryFn: () => publicTickets.order(orderCode),
    // Polling agressif si pending (paiement en cours) — sinon ralenti.
    refetchInterval: (q) => {
      const status = q.state.data?.order_status
      return status === 'pending' ? 8_000 : 60_000
    },
    retry: 1,
  })

  if (isLoading) {
    return <div className="min-h-screen bg-public-bone flex items-center justify-center"><Spinner size={32}/></div>
  }

  if (!data?.order_code) {
    return (
      <div className="min-h-screen bg-public-bone flex flex-col items-center justify-center px-4">
        <p className="font-display uppercase text-3xl text-public-ink">Commande introuvable</p>
        <Link to="/billetterie" className="mt-4 inline-flex items-center gap-2 text-public-flame underline">
          <ArrowLeft size={16}/> Retour à la billetterie
        </Link>
      </div>
    )
  }

  const { event, total_fcfa, tickets = [], payment_methods = [], order_status,
          payment_reference, payment_method, payment_expires_at, payment_refusal_reason } = data
  const expiresIn = payment_expires_at ? new Date(payment_expires_at).getTime() - now : null
  const isExpired  = order_status === 'expired'
  const isPaid     = order_status === 'paid'
  const isRefused  = order_status === 'refused'
  const isPending  = order_status === 'pending'
  const isRefunded = order_status === 'refunded'

  const startDate = event?.starts_at ? new Date(event.starts_at) : null

  return (
    <div className="min-h-screen bg-public-bone py-12 lg:py-20 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/billetterie" className="inline-flex items-center gap-2 tag-mono text-public-ink/60 hover:text-public-flame mb-6">
          <ArrowLeft size={12}/> Retour billetterie
        </Link>

        {/* Status banner */}
        {isPaid && (
          <StatusBanner color="green" Icon={CheckCircle2} title="Paiement validé !"
                        msg="Tes tickets sont prêts — vérifie ta boîte mail."/>
        )}
        {isRefused && (
          <StatusBanner color="red" Icon={XCircle} title="Paiement refusé"
                        msg={payment_refusal_reason || 'Contacte le support pour vérifier.'}/>
        )}
        {isRefunded && (
          <StatusBanner color="orange" Icon={XCircle} title="Commande remboursée"
                        msg="Le montant a été renvoyé sur ton numéro Mobile Money."/>
        )}
        {isExpired && (
          <StatusBanner color="orange" Icon={AlertCircle} title="Commande expirée"
                        msg="Le délai de paiement de 24h est dépassé. Tu peux reprendre une inscription."/>
        )}

        {/* Récap */}
        <div className="bg-white border-2 border-public-ink shadow-xl">
          <div className="bg-public-ink text-public-bone p-6 sm:p-8">
            <p className="tag-mono text-public-flame mb-1">New Wine Church</p>
            <h1 className="heading-anton text-3xl sm:text-5xl leading-tight">{event?.title}</h1>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {startDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14}/> {format(startDate, "d MMM yyyy", { locale: fr })}
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14}/> {format(startDate, "HH'h'mm", { locale: fr })}
                </span>
              )}
              {event?.location && (
                <span className="inline-flex items-center gap-1.5"><MapPin size={14}/> {event.location}</span>
              )}
            </div>
          </div>

          {/* Order details */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="tag-mono text-public-ink/60">N° commande</p>
                <p className="font-mono text-2xl font-bold text-public-flame tracking-[0.2em]">{data.order_code}</p>
              </div>
              <CopyButton value={data.order_code}/>
            </div>

            <div className="border-t border-public-ink/10 pt-4 space-y-2">
              {tickets.map((t) => (
                <div key={t.id} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-public-ink">{t.full_name}</p>
                    {t.type_name && (
                      <p className="text-xs text-public-flame font-mono">{t.type_name}</p>
                    )}
                  </div>
                  <p className="font-mono text-public-ink">
                    {new Intl.NumberFormat('fr-FR').format(t.price_fcfa)} FCFA
                  </p>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-public-ink/10">
                <p className="font-display uppercase text-xl text-public-ink">Total</p>
                <p className="font-display text-3xl text-public-flame">
                  {new Intl.NumberFormat('fr-FR').format(total_fcfa)} <span className="text-base font-mono">FCFA</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Si déjà payé : liens vers tickets individuels */}
        {isPaid && (
          <div className="mt-6 bg-white border-2 border-green-600 p-6">
            <p className="font-display uppercase text-2xl mb-3 text-public-ink">Tes tickets</p>
            <div className="space-y-2">
              {tickets.map((t) => (
                <Link key={t.id} to={`/mon-ticket/${t.access_token}`}
                      className="flex items-center justify-between p-3 border border-public-ink/10 hover:border-public-flame transition">
                  <div>
                    <p className="font-mono font-bold text-public-flame">{t.short_code}</p>
                    <p className="text-sm">{t.full_name}</p>
                  </div>
                  <ChevronRight size={18} className="text-public-flame"/>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Phase 7 — Si event en mode cinetpay : bouton "Payer en ligne" en priorité */}
        {isPending && event?.payment_mode === 'cinetpay' && (
          <OnlinePaymentButton orderCode={data.order_code} totalFcfa={total_fcfa}/>
        )}

        {/* Phase 2 — Si pending en mode déclaratif : instructions Mobile Money + form ref */}
        {isPending && event?.payment_mode !== 'cinetpay' && (
          <PaymentInstructions
            orderCode={data.order_code}
            totalFcfa={total_fcfa}
            methods={payment_methods}
            expiresIn={expiresIn}
            existingMethod={payment_method}
            existingReference={payment_reference}
            onSubmitted={refetch}
          />
        )}

        {/* Si refused ou expired : nouvelle réservation */}
        {(isRefused || isExpired) && event?.slug && (
          <div className="mt-6 text-center">
            <button onClick={() => navigate(`/billetterie/${event.slug}`)}
                    className="px-6 py-3 bg-public-flame text-public-bone font-mono uppercase text-xs tracking-widest hover:bg-public-ink transition">
              Reprendre une inscription
            </button>
          </div>
        )}

        {event?.support_phone && (
          <p className="mt-6 text-center text-xs text-public-ink/60 flex items-center justify-center gap-2">
            <Phone size={12}/> Aide : {event.support_phone}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────── */

function StatusBanner({ color, Icon, title, msg }) {
  const cls = {
    green:  'bg-green-50 border-green-500 text-green-800',
    red:    'bg-red-50 border-red-500 text-red-800',
    orange: 'bg-orange-50 border-orange-500 text-orange-800',
  }[color]
  return (
    <div className={`mb-4 p-4 border-2 flex items-center gap-3 ${cls}`}>
      <Icon size={24}/>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm opacity-90">{msg}</p>
      </div>
    </div>
  )
}

function CopyButton({ value }) {
  const copy = () => {
    navigator.clipboard?.writeText(value)
    toast.success('Copié !')
  }
  return (
    <button onClick={copy} title="Copier"
            className="p-2 hover:bg-public-flame/10 text-public-flame transition">
      <Copy size={16}/>
    </button>
  )
}

function OnlinePaymentButton({ orderCode, totalFcfa }) {
  const initMutation = useMutation({
    mutationFn: () => publicTickets.initiateOnlinePayment(orderCode),
    onSuccess: (r) => {
      if (r.payment_url) {
        toast.success('Redirection vers le paiement…')
        // Redirect dans le même tab — l'inscrit reviendra ici via return_url.
        window.location.href = r.payment_url
      } else {
        toast.error('URL de paiement manquante.')
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Échec init paiement.'),
  })

  return (
    <div className="mt-6 bg-white border-2 border-public-flame p-6 sm:p-8 text-center">
      <p className="font-display uppercase text-2xl text-public-ink mb-1">Paye en ligne</p>
      <p className="text-sm text-public-ink/60 mb-6">
        Mobile Money ou carte. Tes tickets s'envoient automatiquement après paiement.
      </p>
      <p className="font-display text-4xl text-public-flame mb-6">
        {new Intl.NumberFormat('fr-FR').format(totalFcfa)} <span className="text-base font-mono">FCFA</span>
      </p>
      <button onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-4 bg-public-flame text-public-bone font-mono uppercase text-xs tracking-widest hover:bg-public-ink transition disabled:opacity-50">
        {initMutation.isPending
          ? <><Loader2 size={16} className="animate-spin"/> Initialisation…</>
          : <>💳 Payer {new Intl.NumberFormat('fr-FR').format(totalFcfa)} FCFA</>}
      </button>
      <p className="mt-4 text-[10px] text-public-ink/50 uppercase tracking-widest">
        Tu seras redirigé vers la page sécurisée du fournisseur de paiement.
      </p>
    </div>
  )
}

function PaymentInstructions({ orderCode, totalFcfa, methods, expiresIn, existingMethod, existingReference, onSubmitted }) {
  const [method, setMethod] = useState(existingMethod || methods[0]?.code || '')
  const [reference, setReference] = useState(existingReference || '')
  const [proofFile, setProofFile] = useState(null)

  const submit = useMutation({
    mutationFn: () => publicTickets.submitPayment(orderCode, {
      payment_method: method,
      payment_reference: reference,
    }, proofFile),
    onSuccess: () => {
      toast.success('Référence envoyée — on valide au plus vite.')
      onSubmitted?.()
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Erreur — réessaie.'),
  })

  const hoursLeft = expiresIn != null ? Math.max(0, Math.floor(expiresIn / 3_600_000)) : null

  return (
    <div className="mt-6 space-y-6">
      {/* Timer */}
      {expiresIn != null && expiresIn > 0 && (
        <div className="p-3 bg-orange-50 border border-orange-300 text-center">
          <p className="text-sm text-orange-800">
            ⏱ Il te reste <strong>{hoursLeft}h</strong> pour finaliser le paiement.
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-public-flame text-public-bone p-6 sm:p-8">
        <p className="font-mono uppercase text-xs tracking-widest mb-3 opacity-80">Étapes pour payer</p>
        <ol className="space-y-2 text-sm leading-relaxed list-decimal pl-5">
          <li>Envoie <strong>{new Intl.NumberFormat('fr-FR').format(totalFcfa)} FCFA</strong> via Mobile Money à un des numéros ci-dessous.</li>
          <li>En motif/référence du transfert, indique : <strong className="font-mono">{orderCode}</strong></li>
          <li>Reviens ici, colle la référence reçue (SMS de transaction) puis valide.</li>
          <li>L'équipe NWC vérifie et te valide en général en moins de 2 heures.</li>
        </ol>
      </div>

      {/* Méthodes */}
      <div className="bg-white border-2 border-public-ink/10 p-6 sm:p-8">
        <p className="font-display uppercase text-xl mb-4 text-public-ink">Choisis ton mode de paiement</p>
        <div className="space-y-2">
          {methods.map((m) => (
            <label key={m.code} className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition
                                            ${method === m.code ? 'border-public-flame bg-public-flame/5' : 'border-public-ink/10 hover:border-public-flame/40'}`}>
              <input type="radio" name="method" value={m.code} checked={method === m.code}
                     onChange={(e) => setMethod(e.target.value)} className="accent-public-flame"/>
              <div className="flex-1">
                <p className="font-bold text-public-ink">{m.name}</p>
                <p className="text-xs text-public-ink/60">{m.recipient_name || 'NEW WINE CHURCH'}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-public-flame">{m.account_number}</p>
                <CopyButton value={m.account_number}/>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Form référence */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (!reference.trim()) return toast.error('Référence requise.'); submit.mutate() }}
        className="bg-white border-2 border-public-ink/10 p-6 sm:p-8 space-y-4"
      >
        <p className="font-display uppercase text-xl text-public-ink">J'ai payé — voici ma référence</p>
        <div>
          <label className="tag-mono text-public-ink/60 block mb-1">Référence de transaction *</label>
          <input value={reference} onChange={(e) => setReference(e.target.value)}
                 placeholder="ex: MP2406301234567"
                 className="w-full border-2 border-public-ink/15 px-3 py-2.5 font-mono focus:border-public-flame focus:outline-none"/>
          <p className="text-[10px] mt-1 text-public-ink/50">
            Le code que tu reçois par SMS après le transfert Mobile Money.
          </p>
        </div>
        <div>
          <label className="tag-mono text-public-ink/60 block mb-1">Capture du reçu (optionnel)</label>
          <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-public-ink/20 p-3 hover:border-public-flame transition">
            <Upload size={18} className="text-public-flame"/>
            <span className="text-sm text-public-ink/70">{proofFile ? proofFile.name : 'Téléverser une photo'}</span>
            <input type="file" accept="image/*" className="hidden"
                   onChange={(e) => setProofFile(e.target.files?.[0] || null)}/>
          </label>
        </div>
        <button type="submit" disabled={submit.isPending}
                className="w-full px-6 py-4 bg-public-ink text-public-bone font-mono uppercase text-xs tracking-widest hover:bg-public-flame transition disabled:opacity-50">
          {submit.isPending
            ? <><Loader2 size={14} className="inline animate-spin mr-2"/> Envoi…</>
            : existingReference ? 'Mettre à jour ma référence' : 'Valider ma référence'}
        </button>
      </form>
    </div>
  )
}
