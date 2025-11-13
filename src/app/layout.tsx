import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { ConvexClientProvider } from "./components/convex-client-provider";
import JudgingStatus from "./components/judging-status";
import Nav from "./components/nav/nav";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/sonner";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dmsans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DA Hacks 4.0 Judging",
  description: "See judging for De Anza Hacks 4.0 in real time!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="en"
        className={`${dmSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <ConvexClientProvider>
          <body className="min-h-screen flex flex-col">
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <Nav />
              {children}
              <Toaster />
              <JudgingStatus />
              <Analytics />
            </ThemeProvider>
          </body>
        </ConvexClientProvider>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
