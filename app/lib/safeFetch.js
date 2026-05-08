// Helper per fetch + JSON sicuri.
// Risolve gli errori "Unexpected non-whitespace character after JSON" che appaiono
// quando un endpoint restituisce HTML (es. pagina 404) o testo grezzo invece di JSON.

// Rende user-friendly i messaggi di errore tecnici (SyntaxError, TypeError, ecc.)
export function friendlyError(e) {
  if (!e) return 'Errore sconosciuto';
  const msg = (e?.message || String(e)).trim();
  if (!msg) return 'Errore sconosciuto';
  // Filtra messaggi tecnici di parsing JSON
  if (/JSON|Unexpected (token|non-whitespace|end)|SyntaxError/i.test(msg)) {
    return 'Risposta del server non valida';
  }
  if (/NetworkError|Failed to fetch|fetch failed/i.test(msg)) {
    return 'Errore di rete - controlla la connessione';
  }
  if (/AbortError|aborted/i.test(msg)) {
    return ''; // utente ha cambiato pagina, non mostrare
  }
  return msg;
}

export async function safeFetchJson(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch (e) {
    throw new Error('Errore di rete');
  }
  // Verifica content-type e parsing sicuro
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`Errore ${res.status}`);
    return null;
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Risposta non-JSON (probabile HTML di errore). Restituisce errore leggibile.
    if (!res.ok) throw new Error(`Errore ${res.status}`);
    throw new Error('Risposta server non valida');
  }
  if (!res.ok) {
    const msg = data?.error || data?.message || `Errore ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// JSON.parse sicuro per localStorage/sessionStorage
export function safeParse(raw, fallback = null) {
  if (raw == null || raw === '') return fallback;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

// Read user from localStorage in modo sicuro (rimuove dato corrotto)
export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    try { localStorage.removeItem('user'); } catch (_) {}
    return null;
  }
}
