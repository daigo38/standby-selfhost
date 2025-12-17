export const metadata = {
  title: 'StandBy Audio Receiver',
  description: 'Audio receiver server for StandBy',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
