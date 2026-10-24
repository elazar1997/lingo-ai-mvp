import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew", "latin"] });

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
      <body className={`${heebo.variable} min-h-dvh`}>
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
