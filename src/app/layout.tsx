import type { Metadata, Viewport } from "next";
import { Fredoka, Rubik } from "next/font/google";
import "./globals.css";

// Fredoka: rounded display face for headings, buttons and numbers. Rubik: body text.
const fredoka = Fredoka({ variable: "--font-fredoka", subsets: ["hebrew", "latin"] });
const rubik = Rubik({ variable: "--font-rubik", subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "Lingo AI",
  description: "לומדים ספרדית בשיחה אמיתית עם מורה וירטואלית",
};

export const viewport: Viewport = {
  themeColor: "#0b0b14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${fredoka.variable} ${rubik.variable} min-h-dvh`}>
        <div aria-hidden className="bg-glow" />
        <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
