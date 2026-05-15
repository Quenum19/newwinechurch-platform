/** Switch FR / EN — palette public.* cohérente. */
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { useUiStore } from '@/store/uiStore'

export default function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const setLanguage = useUiStore((s) => s.setLanguage)

  const toggle = () => {
    const next = i18n.language?.startsWith('en') ? 'fr' : 'en'
    i18n.changeLanguage(next)
    setLanguage(next)
  }

  const label = (i18n.language || 'fr').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono text-xs uppercase tracking-widest text-public-ink/70 hover:text-public-flame transition"
      aria-label="Switch language"
    >
      <Globe size={12} />
      <span className="font-medium">{label}</span>
    </button>
  )
}
