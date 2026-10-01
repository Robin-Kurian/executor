import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import { AuthGate } from "@/components/AuthGate";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PwaBootstrap } from "@/components/pwa/PwaBootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Executor", template: "%s · Executor" },
  description: "Personal plans and daily execution",
  robots: { index: false, follow: false },
  applicationName: "Executor",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [{ url: "/icons/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, title: "Executor", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { themeColor: "#0a0a0f", colorScheme: "dark light" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-theme="dark" suppressHydrationWarning><body><ThemeProvider><PwaBootstrap /><AuthGate>{children}</AuthGate><Toaster position="bottom-center" toastOptions={{ className: "executor-toast" }} /></ThemeProvider></body></html>;
}
