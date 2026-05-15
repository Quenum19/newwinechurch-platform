/**
 * Page 404 — affichée pour toute URL non reconnue.
 */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const { t } = useTranslation()
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-ink-950">
      <p className="text-script text-gold-400 text-5xl">{t('notFound.eyebrow', 'Égarés ?')}</p>
      <h1 className="heading-hero mt-4">404</h1>
      <p className="mt-4 max-w-md text-white/70">
        {t('notFound.message', "Cette page n'existe pas (ou plus). Mais le chemin de la maison vous est ouvert.")}
      </p>
      <Link to="/" className="btn-primary mt-8">
        {t('notFound.backHome', "Retour à l'accueil")}
      </Link>
    </main>
  )
}
