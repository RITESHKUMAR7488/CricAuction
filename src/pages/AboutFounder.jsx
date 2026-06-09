import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart } from 'lucide-react'

export default function AboutFounder() {
  const navigate = useNavigate()

  return (
    <div className="page-content" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Back button */}
      <button
        className="btn btn-ghost"
        onClick={() => navigate(-1)}
        style={{ marginBottom: 20, alignSelf: 'flex-start' }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Founder Card */}
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Image Section */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingTop: '100%', // aspect ratio 1:1 for better portrait view
            background: 'var(--bg-secondary)',
            overflow: 'hidden',
          }}
        >
          <img
            src="/ic_founder.jpeg"
            alt="Founder"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '60%',
              background: 'linear-gradient(to top, var(--bg-card) 0%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Content Section */}
        <div style={{ padding: '28px 24px 32px' }}>
          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                color: 'var(--gold)',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              About the Founder
            </div>
            <h1
              style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 28,
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: 1,
                lineHeight: 1.2,
              }}
            >
              Yaman Ondia
            </h1>
            <div
              style={{
                width: 48,
                height: 3,
                background: 'var(--gradient-gold)',
                borderRadius: 2,
                margin: '10px auto 0',
              }}
            />
          </div>

          {/* Quote */}
          <div
            style={{
              position: 'relative',
              padding: '20px 16px',
              background: 'rgba(245,166,35,0.05)',
              borderLeft: '3px solid var(--gold)',
              borderRadius: '0 8px 8px 0',
              marginBottom: 28,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -10,
                left: 16,
                fontSize: 40,
                color: 'var(--gold)',
                opacity: 0.3,
                fontFamily: 'serif',
                lineHeight: 1,
              }}
            >
              &ldquo;
            </span>
            <p
              style={{
                fontSize: 15,
                lineHeight: 1.7,
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                position: 'relative',
                zIndex: 1,
              }}
            >
              Cricket has made me who I am today. With the ever evolving needs of the game, this platform covers all the boring parts of the process of holding a tournament. From spreading a word of the tournament to registering players, holding an auction, registering sponsors, making teams, showing live matches and making sure the entire journey from announcing a tournament to finishing it becomes memorable. CricHeroes covers the game, we cover everything before and after. Inspired by CricHeroes.
            </p>
          </div>

          {/* Divider with heart */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <Heart size={14} color="var(--red)" fill="var(--red)" />
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Footer note */}
          <div
            style={{
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--text-muted)',
              lineHeight: 1.6,
            }}
          >
            Built with passion for cricket and the community that plays it.
            <br />
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>CricAuction</span> — From the ground up.
          </div>
        </div>
      </div>
    </div>
  )
}
