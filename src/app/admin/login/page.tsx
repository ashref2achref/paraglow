'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        router.push('/admin/dashboard')
      } else {
        const data = await res.json()
        setError(data.error || 'Identifiants invalides')
      }
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f6f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-inter, Inter, sans-serif)',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '48px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 4px 32px rgba(42,31,14,0.10)',
        border: '1px solid #ede8de',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{ fontSize: '28px', fontFamily: 'var(--font-cormorant, Cormorant Garamond, serif)', fontWeight: 700, letterSpacing: '0.02em' }}>
            <span style={{ color: '#c9a052' }}>Para</span>
            <span style={{ color: '#1b3a1e' }}>Glow</span>
          </div>
          <div style={{ color: '#6b7d53', fontSize: '13px', marginTop: '4px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Administration
          </div>
        </div>

        <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#2a1f0e', marginBottom: '24px', textAlign: 'center' }}>
          Connexion
        </h1>

        {error && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
            borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#2a1f0e', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@paraglow.tn"
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid #d5cfc0',
                borderRadius: '8px', fontSize: '14px', color: '#2a1f0e',
                background: '#faf8f5', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#2a1f0e', marginBottom: '6px' }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{
                width: '100%', padding: '10px 14px', border: '1px solid #d5cfc0',
                borderRadius: '8px', fontSize: '14px', color: '#2a1f0e',
                background: '#faf8f5', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#d5cfc0' : '#1b3a1e',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
