
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AuthProvider } from '@/contexts/auth-context';
import { TripDataProvider } from '@/contexts/trip-data-context';
import { MobileNavProvider } from '@/contexts/mobile-nav-context'; // Import MobileNavProvider

export const metadata: Metadata = {
  title: 'Bitácora de Viaje',
  description: 'Planifica tu viaje perfecto.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@200..900&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <TripDataProvider>
            <MobileNavProvider> {/* Wrap with MobileNavProvider */}
              <SiteHeader />
              <main className="flex-grow container mx-auto px-4 pt-16 pb-8"> {/* Changed py-8 to pt-16 pb-8 */}
                {children}
              </main>
              <SiteFooter />
              <Toaster />
            </MobileNavProvider>
          </TripDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
