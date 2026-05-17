'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CompanyPage() {
  const params = useParams();
  const slug = params.slug;
  
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;
    
    const fetchCompany = async () => {
      try {
        const res = await fetch(`/api/companies?slug=${slug}`);
        const data = await res.json();
        
        if (data.error) {
          setError('Company non trovata');
          setLoading(false);
          return;
        }
        
        // Se la company e' sospesa (is_active=false), mostra messaggio di sospensione
        if (data.is_active === false) {
          setError('Servizio temporaneamente sospeso. Riprova piu\' tardi o contatta l\'assistenza.');
          setLoading(false);
          return;
        }
        
        setCompany(data);
        
        // Applica branding dinamico
        if (data.primary_color) {
          document.documentElement.style.setProperty('--primary-color', data.primary_color);
        }
        if (data.secondary_color) {
          document.documentElement.style.setProperty('--secondary-color', data.secondary_color);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Errore fetch company:', err);
        setError('Errore durante il caricamento');
        setLoading(false);
      }
    };
    
    fetchCompany();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 mb-4">404</h1>
          <p className="text-xl text-muted-foreground mb-6">{error || 'Company non trovata'}</p>
          <a href="/" className="text-primary hover:underline">Torna alla home</a>
        </div>
      </div>
    );
  }

  // Reindirizza al catalogo principale con filtro company_id
  if (typeof window !== 'undefined') {
    window.location.href = `/?company_id=${company.id}&branded=true`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Reindirizzamento...</p>
      </div>
    </div>
  );
}
