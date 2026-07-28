import "./globals.css";
export const metadata = {
  title: "Orbit Social",
  description: "AI-assisted social media content operations",
  manifest: "/manifest.webmanifest",
  applicationName: "Orbit Social",
  appleWebApp: { capable: true, title: "Orbit Social", statusBarStyle: "default" as const }
};
export const viewport = { themeColor: "#111111", width: "device-width", initialScale: 1, viewportFit: "cover" as const };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
