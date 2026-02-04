import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ZENYX Game Server",
  description: "Iframe UI for ZENYX provider games"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, Arial", margin: 0, background: "#0b0f19", color: "white" }}>
        {children}
      </body>
    </html>
  );
}
