import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "STAX | Real Estate Intelligence",
  description: "Commercial real estate stacking plan dashboard",
  icons: {
    icon: "/icon.svg",
    apple: "/logo.png",
  },
  openGraph: {
    title: "STAX | Real Estate Intelligence",
    description: "Commercial real estate stacking plan dashboard",
    siteName: "STAX",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "STAX - Stacked blocks logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "STAX | Real Estate Intelligence",
    description: "Commercial real estate stacking plan dashboard",
    images: ["/logo.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
