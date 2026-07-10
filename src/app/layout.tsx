import type { Metadata, Viewport } from "next";
import { APP_METADATA } from "./app.constants";
import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_METADATA.name,
  description: APP_METADATA.description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_METADATA.shortName
  }
};

export const viewport: Viewport = {
  themeColor: APP_METADATA.themeColor,
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
