// Helper SumUp: costruisce description e personal_details in modo consistente
// Garantisce che il nome del cliente sia sempre VISIBILE all'inizio della causale SumUp
// e passato come personal_details per il customer del checkout.

/**
 * Costruisce la "description" del checkout SumUp mettendo il nome cliente IN PRIMA POSIZIONE.
 * Esempio:
 *   buildSumupDescription({ customerName: 'Mario Rossi', prefix: 'Prenotazione', ref: 'BK-2026/123', context: 'Mini Cruise' })
 *   => "Mario Rossi - Prenotazione BK-2026/123 - Mini Cruise"
 * @param {object} opts
 * @param {string} opts.customerName  Nome (e cognome) del cliente
 * @param {string} opts.prefix        Es. "Prenotazione" | "Marina" | "Locazione" | "Integrazione"
 * @param {string} opts.ref           Codice riferimento (booking_ref / booking_number)
 * @param {string} [opts.context]     Contesto aggiuntivo (esperienza, marina, unità, ecc.)
 * @param {string} [opts.paymentType] Es. "deposit" | "balance" | "full" | "custom"
 * @param {number} [opts.maxLen=140]  Lunghezza massima (SumUp tronca dopo ~140 char)
 */
export function buildSumupDescription({ customerName, prefix, ref, context, paymentType, maxLen = 140 }) {
  const parts = [];
  const safeCust = (customerName || '').trim();
  if (safeCust) parts.push(safeCust);
  parts.push(`${prefix} ${ref}`.trim());
  if (context) parts.push(String(context).trim());
  if (paymentType) parts.push(`(${paymentType})`);
  let descr = parts.filter(Boolean).join(' - ');
  if (descr.length > maxLen) descr = descr.slice(0, maxLen - 1) + '…';
  return descr;
}

/**
 * Costruisce l'oggetto customer.personal_details per il checkout SumUp.
 * SumUp accetta first_name, last_name, email all'interno di customer.personal_details.
 * @param {string} fullName  Nome completo (es. "Mario Rossi")
 * @param {string} [email]
 * @param {string} [phone]
 * @returns {object|null}
 */
export function buildSumupCustomer(fullName, email, phone) {
  const name = (fullName || '').trim();
  if (!name && !email) return null;
  let first_name = '';
  let last_name = '';
  if (name) {
    const tokens = name.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) {
      first_name = tokens[0];
    } else {
      first_name = tokens[0];
      last_name = tokens.slice(1).join(' ');
    }
  }
  const pd = {};
  if (first_name) pd.first_name = first_name;
  if (last_name) pd.last_name = last_name;
  if (email) pd.email = email;
  if (phone) pd.phone = phone;
  if (Object.keys(pd).length === 0) return null;
  return { personal_details: pd };
}

/**
 * Estrae nome completo cliente da vari schemi possibili (bookings, marina_bookings, short_rentals).
 */
export function extractCustomerName(booking, fallback = '') {
  if (!booking) return fallback || '';
  if (booking.customer_name) return String(booking.customer_name).trim();
  if (booking.customer) {
    const c = booking.customer;
    const full = `${c.name || c.first_name || ''} ${c.surname || c.last_name || ''}`.trim();
    if (full) return full;
  }
  return fallback || '';
}

export function extractCustomerEmail(booking, fallback = '') {
  if (!booking) return fallback || '';
  if (booking.customer_email) return booking.customer_email;
  if (booking.customer?.email) return booking.customer.email;
  return fallback || '';
}
