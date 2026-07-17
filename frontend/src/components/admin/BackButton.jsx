/**
 * Bouton retour intelligent pour l'admin.
 *
 * Comportement :
 *   - navigate(-1) si on a un historique (cas usuel : on vient d'une liste)
 *   - sinon, fallback vers `to` (utile au refresh d'une page directe ou
 *     ouverture nouvel onglet — sinon le bouton ferait revenir hors de l'admin)
 *
 * Détection "a-t-on un historique ?" : on lit history.state.idx exposé par
 * react-router. À l'initial mount d'un onglet, idx vaut 0 → fallback forcé.
 */
import { ArrowLeft } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function BackButton({ to, label = 'Retour', className = '' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const hasHistory = (location.key !== 'default')

  const handleClick = (e) => {
    e.preventDefault()
    if (hasHistory) navigate(-1)
    else if (to) navigate(to)
    else navigate('/admin')
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-1 text-sm transition hover:underline ${className}`}
      style={{ color: 'var(--adm-text-muted)' }}
    >
      <ArrowLeft size={14} /> {label}
    </button>
  )
}
