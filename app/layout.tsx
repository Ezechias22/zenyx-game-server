export const metadata = {
  title: "ZENYX Casino",
  description: "Production Game Server"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "Arial",
          background: "#0f172a",
          color: "white"
        }}
      >
        {children}
      </body>
    </html>
  )
}
