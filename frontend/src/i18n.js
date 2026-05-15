/**
 * ==============================================================
 *  Configuration i18next pour bilinguisme FR/EN
 *  - Détection automatique : localStorage > navigator > html lang
 *  - Fallback : français (langue principale de l'église)
 *  - Les fichiers de traduction sont en src/locales/{fr,en}/translation.json
 * ==============================================================
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import frTranslation from './locales/fr/translation.json'
import enTranslation from './locales/en/translation.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en'],
    debug: import.meta.env.DEV,

    // Ressources injectées en dur (pas de chargement asynchrone — bundle léger).
    resources: {
      fr: { translation: frTranslation },
      en: { translation: enTranslation },
    },

    interpolation: {
      escapeValue: false, // React échappe déjà
    },

    // Stratégie de détection : ordre d'importance.
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'nwc-lang',
    },

    react: {
      useSuspense: false, // évite le flash blanc au premier render
    },
  })

export default i18n
