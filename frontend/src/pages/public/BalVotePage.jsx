/**
 * BalVotePage — Vote public Roi & Reine (mobile-first).
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Crown, CheckCircle2, Loader2 } from 'lucide-react'
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || '/api'

export default function BalVotePage() {
  const { eventId } = useParams()
  const [data, setData] = useState(null)
  const [selectedRoi, setSelectedRoi] = useState(null)
  const [selectedReine, setSelectedReine] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get(`${baseURL}/public/events/${eventId}/bal/vote`, { withCredentials: true })
      .then((r) => setData(r.data))
      .catch(() => setError('Impossible de charger le vote.'))
  }, [eventId])

  const submit = async () => {
    if (!selectedRoi && !selectedReine) {
      setError('Sélectionne au moins un candidat.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await axios.post(
        `${baseURL}/public/events/${eventId}/bal/vote`,
        { roi_id: selectedRoi, reine_id: selectedReine },
        { withCredentials: true }
      )
      setSuccess(true)
    } catch (err) {
      setError(err?.response?.data?.message || 'Erreur lors du vote.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!data) {
    return <FullPageBg>
      <Loader2 size={40} className="text-[#C9A961] animate-spin"/>
    </FullPageBg>
  }

  if (success || data.already_voted) {
    return <FullPageBg>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <CheckCircle2 size={80} color="#C9A961" style={{ margin: '0 auto 1.5rem' }}/>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.5rem', color: '#F5E6C8', marginBottom: '1rem', fontStyle: 'italic' }}>
          Merci !
        </h1>
        <p style={{ color: '#C9A961', fontSize: '1.1rem' }}>
          {success ? 'Ton vote a été enregistré.' : 'Tu as déjà voté depuis cet appareil.'}
        </p>
        <p style={{ color: '#F5E6C8', opacity: 0.7, marginTop: '2rem', fontSize: '0.9rem' }}>
          Les résultats seront annoncés à 00h40 en salle.
        </p>
      </div>
    </FullPageBg>
  }

  if (data.vote_status !== 'open') {
    return <FullPageBg>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <Crown size={64} color="#C9A961" style={{ margin: '0 auto 1.5rem' }}/>
        <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2rem', color: '#F5E6C8', marginBottom: '1rem', fontStyle: 'italic' }}>
          Le vote est fermé
        </h1>
        <p style={{ color: '#C9A961' }}>
          Le vote sera ouvert à 22h35 en salle. Reviens à ce moment pour choisir ton Roi & ta Reine.
        </p>
      </div>
    </FullPageBg>
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0A0A 0%, #1a0f14 60%, #0A0A0A 100%)',
      color: '#F5E6C8',
      padding: '2rem 1rem',
      fontFamily: '"Playfair Display", serif',
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap"/>

      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Crown size={44} color="#C9A961" style={{ margin: '0 auto 0.5rem' }}/>
          <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '2.4rem', fontWeight: 700, margin: 0, fontStyle: 'italic' }}>
            Roi & Reine 2026
          </h1>
          <p style={{ color: '#C9A961', fontSize: '0.85rem', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
            A Dark Night in Elegance
          </p>
        </div>

        {/* Section Roi */}
        <CandidateList
          title="👑 Roi"
          list={data.rois}
          selected={selectedRoi}
          onSelect={setSelectedRoi}
        />

        {/* Section Reine */}
        <CandidateList
          title="👑 Reine"
          list={data.reines}
          selected={selectedReine}
          onSelect={setSelectedReine}
        />

        {/* Bouton valider */}
        {error && (
          <p style={{ color: '#ef4444', textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem' }}>{error}</p>
        )}
        <button
          onClick={submit}
          disabled={submitting || (!selectedRoi && !selectedReine)}
          style={{
            width: '100%',
            marginTop: '2rem',
            padding: '1.2rem',
            background: 'linear-gradient(135deg, #C9A961 0%, #8B1A2F 100%)',
            color: '#F5E6C8',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.2rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            opacity: (submitting || (!selectedRoi && !selectedReine)) ? 0.5 : 1,
            fontFamily: '"Playfair Display", serif',
          }}
        >
          {submitting ? '...' : 'Valider mon vote'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#8B7960', marginTop: '1rem', fontStyle: 'italic' }}>
          Un vote maximum par téléphone.
        </p>
      </div>
    </div>
  )
}

function CandidateList({ title, list, selected, onSelect }) {
  if (!list || list.length === 0) return null
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{
        fontFamily: '"Playfair Display", serif',
        fontSize: '1.4rem',
        fontWeight: 700,
        marginBottom: '1rem',
        color: '#C9A961',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        textAlign: 'center',
      }}>
        {title}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.8rem' }}>
        {list.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(selected === c.id ? null : c.id)}
            style={{
              background: selected === c.id
                ? 'linear-gradient(135deg, rgba(201,169,97,0.3) 0%, rgba(139,26,47,0.3) 100%)'
                : 'rgba(255,255,255,0.05)',
              border: selected === c.id ? '3px solid #C9A961' : '2px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '1rem 0.5rem',
              color: '#F5E6C8',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              fontFamily: '"Playfair Display", serif',
            }}
          >
            {c.photo_url ? (
              <img
                src={c.photo_url}
                alt={c.first_name}
                style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(201,169,97,0.6)' }}
              />
            ) : (
              <div style={{
                width: '90px', height: '90px', borderRadius: '50%',
                background: '#8B1A2F', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#F5E6C8', fontSize: '2rem', fontWeight: 700, margin: '0 auto',
              }}>
                {c.first_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <p style={{ margin: '0.8rem 0 0', fontWeight: 700, fontSize: '1rem' }}>
              {c.first_name}<br/>{c.last_name}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function FullPageBg({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0A0A0A 0%, #1a0f14 60%, #0A0A0A 100%)',
      color: '#F5E6C8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&display=swap"/>
      {children}
    </div>
  )
}
