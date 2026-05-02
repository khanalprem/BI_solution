import type { Metadata } from "next";
import { Providers } from "@/components/Providers";

// Self-hosted fonts via @fontsource — no build-time Google Fonts download.
// Each *.css file loads exactly one weight (matches the previous next/font/google
// weight lists). The resulting `font-family` names ('Inter', 'Plus Jakarta Sans',
// 'JetBrains Mono') are wired through `:root --font-*` in globals.css and consumed
// by Tailwind's font-{sans,display,mono} utilities.
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";

import "./globals.css";

export const metadata: Metadata = {
  title: "BankBI — Nepal Banking Intelligence",
  description: "Business Intelligence platform for Nepal banking sector",
};

// Inline script: read localStorage BEFORE paint → no flash.
// Default theme is light — only user-saved preference in localStorage overrides it.
const themeScript = `(function(){
  var s=localStorage.getItem('bankbi-theme');
  var t=s||'light';
  document.documentElement.dataset.theme=t;
  if(t==='dark')document.documentElement.classList.add('dark');
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
