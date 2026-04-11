import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'Maretrek - Esperienze Marine in Sardegna',
  description: 'Scopri la Sardegna dal mare. Escursioni in barca, visite guidate, noleggio gommoni. Prenota la tua prossima avventura!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
