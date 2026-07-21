/**
 * ==============================================================
 *  BalLiveScreen — Page fullscreen affichée sur l'écran de la salle.
 *
 *  Utilisation :
 *   1. Ouvrir /live/bal/{eventId} dans Chrome sur l'ordi dédié
 *   2. F11 pour passer en plein écran
 *   3. La régie (/admin/bal/{eventId}/regie) contrôle quelle slide s'affiche
 *
 *  Poll toutes les 2s le backend pour la slide active. Résistant aux
 *  coupures réseau : garde le dernier state connu, jamais d'écran d'erreur.
 * ==============================================================
 */
import { useParams } from 'react-router-dom'
import { useMemo } from 'react'

import { useBalState } from './hooks/useBalState.js'
import SlideTransition from './components/SlideTransition.jsx'

// Slides
import DefaultSlide      from './slides/DefaultSlide.jsx'
import ArriveeSlide      from './slides/ArriveeSlide.jsx'
import MurStarsSlide     from './slides/MurStarsSlide.jsx'
import InstallationSlide from './slides/InstallationSlide.jsx'
import DancingStarsSlide from './slides/DancingStarsSlide.jsx'
import BienvenueSlide    from './slides/BienvenueSlide.jsx'
import BonAppetitSlide   from './slides/BonAppetitSlide.jsx'
import ProgrammeSlide    from './slides/ProgrammeSlide.jsx'
import DefileSlide       from './slides/DefileSlide.jsx'
import RappeursSlide     from './slides/RappeursSlide.jsx'
import DjSlide           from './slides/DjSlide.jsx'
import VoteSlide         from './slides/VoteSlide.jsx'
import ProclamationSlide from './slides/ProclamationSlide.jsx'
import OuvertureBalSlide from './slides/OuvertureBalSlide.jsx'
import FinSlide          from './slides/FinSlide.jsx'
import NoirSlide         from './slides/NoirSlide.jsx'
import PhotosAmbianceSlide from './slides/PhotosAmbianceSlide.jsx'

// Table de correspondance slide → composant
const SLIDES = {
  default:        DefaultSlide,
  arrivee:        ArriveeSlide,
  'mur-stars':    MurStarsSlide,
  installation:   InstallationSlide,
  'dancing-stars':DancingStarsSlide,
  bienvenue:      BienvenueSlide,
  'bon-appetit':  BonAppetitSlide,
  programme:      ProgrammeSlide,
  defile:         DefileSlide,
  rappeurs:       RappeursSlide,
  dj:             DjSlide,
  vote:           VoteSlide,
  proclamation:   ProclamationSlide,
  'ouverture-bal':OuvertureBalSlide,
  fin:            FinSlide,
  noir:           NoirSlide,
  'photos-ambiance': PhotosAmbianceSlide,
}

export default function BalLiveScreen() {
  const { eventId } = useParams()
  const { state, isOnline } = useBalState(eventId)

  const slideKey = state?.current_slide ?? 'default'
  const SlideComponent = SLIDES[slideKey] || DefaultSlide

  // Debug : indicateur discret hors ligne (bottom-left, très petit, gris)
  const showOfflineDot = !isOnline

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: '#0A0A0A',
      color: '#F5E6C8',
      // Charge la font Playfair via CSS import inline (fallback système)
      fontFamily: '"Playfair Display", "Georgia", serif',
    }}>
      {/* Chargement Google Fonts Playfair + Anton */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Anton&family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&display=swap"
      />

      <SlideTransition slideKey={slideKey}>
        <SlideComponent state={state} />
      </SlideTransition>

      {showOfflineDot && (
        <div style={{
          position: 'absolute',
          bottom: '1vh',
          left: '1vw',
          zIndex: 10,
          fontSize: '0.7rem',
          color: '#8B7960',
          opacity: 0.5,
        }}>
          ● hors ligne — reconnexion…
        </div>
      )}
    </div>
  )
}
