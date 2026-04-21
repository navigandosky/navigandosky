import { NextResponse } from 'next/server';

// MyMemory Translation API - Gratuita (5000 caratteri/giorno)
const MYMEMORY_API = 'https://api.mymemory.translated.net/get';

export async function POST(request) {
  try {
    const { text, targetLang, sourceLang = 'it' } = await request.json();
    
    if (!text || !targetLang) {
      return NextResponse.json(
        { error: 'Testo e lingua target sono obbligatori' },
        { status: 400 }
      );
    }
    
    // Se la lingua target è italiana o uguale alla source, ritorna il testo originale
    if (targetLang === 'it' || targetLang === sourceLang) {
      return NextResponse.json({ 
        translatedText: text,
        cached: false 
      });
    }
    
    // Chiamata all'API MyMemory
    const url = `${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    if (!response.ok) {
      throw new Error('Errore API traduzione');
    }
    
    const data = await response.json();
    
    if (data.responseStatus !== 200) {
      throw new Error(data.responseDetails || 'Errore traduzione');
    }
    
    return NextResponse.json({
      translatedText: data.responseData.translatedText,
      match: data.responseData.match,
      cached: false
    });
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // In caso di errore, ritorna il testo originale
    return NextResponse.json({
      translatedText: request.body?.text || '',
      error: error.message,
      cached: false
    });
  }
}

// Cache delle traduzioni per ridurre chiamate API
const translationCache = new Map();

export function getCachedTranslation(text, targetLang) {
  const key = `${text}_${targetLang}`;
  return translationCache.get(key);
}

export function setCachedTranslation(text, targetLang, translation) {
  const key = `${text}_${targetLang}`;
  translationCache.set(key, translation);
  
  // Limita cache a 1000 elementi per evitare memory leak
  if (translationCache.size > 1000) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
}
