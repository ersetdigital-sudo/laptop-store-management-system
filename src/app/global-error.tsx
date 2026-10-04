'use client'

export const dynamic = 'force-dynamic'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="id">
      <body style={{ fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, padding: '2rem', background: '#f8fafc', color: '#111827' }}>
        <div style={{ maxWidth: '400px', margin: '4rem auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Terjadi Kesalahan
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            {error.message || 'Mohon coba lagi nanti.'}
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.6rem 1.5rem',
              borderRadius: '0.5rem',
              background: '#04123F',
              color: 'white',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Kembali ke Beranda
          </a>
        </div>
      </body>
    </html>
  )
}
