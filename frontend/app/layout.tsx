import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "STAX | Real Estate Intelligence",
  description: "Commercial real estate stacking plan dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return children
}
