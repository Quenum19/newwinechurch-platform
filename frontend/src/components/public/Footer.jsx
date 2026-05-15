/**
 * Footer publique — refonte cohérente Magazine Drop.
 *
 * Choix design :
 *  - Fond ink (sombre intentionnel — un seul moment de noir, signature)
 *  - Headlines Anton uppercase (cohérent avec Home)
 *  - Body Outfit, captions Geist Mono small caps
 *  - Accent flame sur les liens hover et la newsletter
 *  - Layout plus aéré, moins dense que la version précédente
 */
import { Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { MessageCircle, MapPin, Mail, Clock, ArrowUpRight } from 'lucide-react'

import api from '@/api/axios'

// Icônes brand (lucide-react v1.14 a retiré les marques) — SVG inline.
const Facebook = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073"/></svg>
)
const Instagram = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
)
const Youtube = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
)

export default function Footer() {
  const { t } = useTranslation()
  const { data: settings } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: async () => (await api.get('/settings/public')).data,
    staleTime: 5 * 60 * 1000,
  })

  const social = settings?.social ?? {}
  const contact = settings?.contact ?? {}
  const logos = settings?.logo ?? {}
  const church = settings?.church ?? {}

  const year = new Date().getFullYear()

  const [email, setEmail] = useState('')
  const subscribe = useMutation({
    mutationFn: () => api.post('/newsletter/subscribe', { email }),
    onSuccess: () => {
      toast.success(t('footer.newsletterCheck', 'Vérifie ta boîte mail pour confirmer.'), { duration: 5000 })
      setEmail('')
    },
    onError: () => toast.error(t('footer.newsletterError', 'Inscription impossible.')),
  })

  return (
    <footer className="bg-public-ink text-public-bone">
      <div className="container-nwc py-20 lg:py-24">

        {/* === Bandeau slogan + newsletter === */}
        <div className="grid grid-cols-12 gap-8 lg:gap-12 pb-12 lg:pb-16 border-b border-public-bone/15">
          <div className="col-span-12 lg:col-span-7">
            <p className="tag-mono text-public-flame mb-3">{t('footer.newsletterTag', 'Reste connecté')}</p>
            <h2 className="heading-anton text-5xl sm:text-6xl lg:text-8xl text-public-bone leading-[0.92]">
              {t('footer.newsletterTitle1', 'Une newsletter,')}<br/>
              <span className="text-public-flame">{t('footer.newsletterTitle2', 'zéro spam.')}</span>
            </h2>
            <p className="editorial-quote text-xl mt-5 max-w-lg text-public-bone/80">
              {t('footer.newsletterDesc', 'Reçois les nouveaux messages, événements et actus directement, une fois par semaine.')}
            </p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); if (email) subscribe.mutate() }}
            className="col-span-12 lg:col-span-5 flex flex-col justify-end gap-3"
          >
            <label className="tag-mono text-public-bone/60">{t('footer.emailLabel', 'Email')}</label>
            <div className="flex gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('footer.emailPlaceholder', 'vous@email.com')}
                className="flex-1 bg-transparent border-2 border-public-bone/30 px-4 py-3 text-public-bone placeholder-public-bone/40 focus:border-public-flame focus:outline-none transition-colors font-mono text-sm"
              />
              <button
                type="submit"
                disabled={subscribe.isPending}
                className="px-6 py-3 bg-public-flame hover:bg-public-flame-deep text-public-bone font-mono text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                {subscribe.isPending ? '…' : t('footer.subscribeBtn', 'OK')}
              </button>
            </div>
          </form>
        </div>

        {/* === Grille principale === */}
        <div className="grid grid-cols-12 gap-8 lg:gap-12 pt-12 lg:pt-16">

          {/* Brand */}
          <div className="col-span-12 lg:col-span-4 space-y-5">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={logos.nwc || '/logos/logo_newwine.png'}
                alt=""
                className="h-12 w-auto"
              />
              <span className="font-display uppercase text-xl text-public-bone tracking-tight">
                New Wine Church
              </span>
            </Link>
            <p className="editorial-quote text-2xl text-public-flame">
              « {t('brand.slogan')} »
            </p>
            <p className="text-sm text-public-bone/60 max-w-sm leading-relaxed">
              {t('footer.brandDesc', 'Une église de jeunes adultes, en mission pour une génération.')}
            </p>

            <div className="flex gap-2 pt-2">
              <SocialIcon url={social.facebook}  icon={Facebook}/>
              <SocialIcon url={social.instagram} icon={Instagram}/>
              <SocialIcon url={social.youtube}   icon={Youtube}/>
              <SocialIcon url={social.whatsapp}  icon={MessageCircle}/>
            </div>
          </div>

          {/* Navigation */}
          <div className="col-span-6 lg:col-span-3">
            <p className="tag-mono text-public-bone/40 mb-4">{t('footer.colSite', 'Site')}</p>
            <ul className="space-y-2.5">
              <FooterLink to="/messages">{t('nav.messages', 'Messages')}</FooterLink>
              <FooterLink to="/evenements">{t('nav.events', 'Événements')}</FooterLink>
              <FooterLink to="/galerie">{t('nav.gallery', 'Galerie')}</FooterLink>
              <FooterLink to="/communaute">{t('nav.community', 'Communauté')}</FooterLink>
              <FooterLink to="/blog">{t('nav.blog', 'Blog')}</FooterLink>
            </ul>
          </div>

          <div className="col-span-6 lg:col-span-2">
            <p className="tag-mono text-public-bone/40 mb-4">{t('footer.colAct', 'Agir')}</p>
            <ul className="space-y-2.5">
              <FooterLink to="/donner">{t('nav.give', 'Donner')}</FooterLink>
              <FooterLink to="/contact">{t('nav.contact', 'Contact')}</FooterLink>
              <FooterLink to="/rejoindre">{t('footer.linkJoin', 'Rejoindre')}</FooterLink>
              <FooterLink to="/live">{t('nav.live', 'Direct')}</FooterLink>
            </ul>
          </div>

          {/* Coordonnées */}
          <div className="col-span-12 lg:col-span-3">
            <p className="tag-mono text-public-bone/40 mb-4">{t('footer.colFind', 'Nous trouver')}</p>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2.5 text-public-bone/80">
                <MapPin size={14} className="text-public-flame shrink-0 mt-0.5"/>
                <span>{contact.address || 'Cocody-Bonoumin'} · {contact.city || 'Abidjan'}</span>
              </li>
              <li className="flex items-center gap-2.5 text-public-bone/80">
                <Clock size={14} className="text-public-flame shrink-0"/>
                <span>{contact.service_time || 'Dimanche 13h'}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={14} className="text-public-flame shrink-0"/>
                <a
                  href={`mailto:${contact.email || 'contact@newinechurch.org'}`}
                  className="text-public-bone/80 hover:text-public-flame transition-colors"
                >
                  {contact.email || 'contact@newinechurch.org'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* === Bandeau bas === */}
        <div className="mt-16 pt-8 border-t border-public-bone/15 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <span className="tag-mono text-public-bone/40">{t('footer.parentLabel', 'Maison mère')}</span>
            <img
              src={logos.parent || '/logos/logo_md.png'}
              alt={t('footer.parentAlt', 'Église La Maison de la Destinée')}
              className="h-10 w-auto opacity-70 hover:opacity-100 transition"
            />
          </div>
          <p className="tag-mono text-public-bone/40">
            © {year} {church.name || 'New Wine Church'}
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link
        to={to}
        className="group inline-flex items-baseline gap-1 text-public-bone/70 hover:text-public-flame transition-colors text-sm"
      >
        {children}
        <ArrowUpRight size={11} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
      </Link>
    </li>
  )
}

function SocialIcon({ url, icon: Icon }) {
  if (! url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="p-2.5 border border-public-bone/20 text-public-bone/70 hover:border-public-flame hover:text-public-flame transition"
    >
      <Icon className="w-4 h-4"/>
    </a>
  )
}
