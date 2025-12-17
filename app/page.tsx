export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>StandBy Audio Receiver</h1>
      <p>Audio receiver server is running.</p>
      <h2>Endpoints</h2>
      <ul>
        <li><code>POST /api/audio</code> - Receive audio files</li>
        <li><code>GET /api/audio</code> - Health check</li>
      </ul>
    </main>
  )
}
