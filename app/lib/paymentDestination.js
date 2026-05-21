/**
 * Payment Destination Resolver
 * --------------------------------
 * Restituisce dove è andato (o andrà) l'incasso per un dato metodo di pagamento.
 * Usa company.payment_config + (opzionalmente) marina.payment_config come fonte dati.
 *
 * Output:
 *  {
 *    label: 'string',          // versione breve per badge/colonna ("Bonifico · BS · ..1509")
 *    detail: 'string',         // versione estesa per PDF ("Bonifico · Banco di Sardegna · IT79..1509 · Marlin sub snc")
 *    iban_masked: 'string',    // IBAN mascherato (opzionale)
 *    account_holder: 'string', // se applicabile
 *  }
 */

const PM_KEY = (m) => {
  if (!m) return 'NONE';
  const u = String(m).toUpperCase();
  if (['CONTANTI', 'CASH', 'CASSA'].includes(u)) return 'CASH';
  if (['BONIFICO', 'BANK_TRANSFER', 'BT'].includes(u)) return 'BANK_TRANSFER';
  if (['CARTA', 'POS', 'SUMUP', 'CARD', 'ONLINE'].includes(u)) return 'SUMUP';
  if (u === 'STRIPE') return 'STRIPE';
  if (['ASSEGNO', 'CHEQUE'].includes(u)) return 'CHEQUE';
  if (['MANUAL', 'MANUALE', 'ALTRO', 'DIRECT'].includes(u)) return 'MANUAL';
  if (['FREE', 'OMAGGIO'].includes(u)) return 'FREE';
  return u;
};

// Abbrevia banca in 2-4 lettere (Banco di Sardegna → BdS; Intesa Sanpaolo → ISP)
function abbrevBank(name) {
  if (!name) return '';
  const w = String(name)
    .replace(/[.,]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !['di', 'del', 'della', 'dello', 'de', 'la', 'il', 'lo', 'spa', 's.p.a', 'sas', 'snc', 'srl'].includes(p.toLowerCase()));
  if (w.length === 0) return name.slice(0, 4).toUpperCase();
  if (w.length === 1) return w[0].slice(0, 4).toUpperCase();
  return w.slice(0, 3).map((p) => p[0]).join('').toUpperCase();
}

function maskIban(iban) {
  if (!iban) return '';
  const clean = String(iban).replace(/\s+/g, '').toUpperCase();
  if (clean.length < 8) return clean;
  return clean.slice(0, 4) + '…' + clean.slice(-4);
}

function shortCompany(name) {
  if (!name) return '';
  // Tronca al primo segmento "umano": prima della prima S.N.C / S.R.L. / di / DI ...
  const s = String(name).replace(/\s+/g, ' ').trim();
  const cut = s.split(/\b(?:S\.?N\.?C\.?|S\.?R\.?L\.?|S\.?P\.?A\.?|DI|di|E |&)\b/i)[0];
  return (cut || s).trim().slice(0, 28);
}

/**
 * Risolve la destinazione di un pagamento.
 * @param {string} paymentMethod
 * @param {object} company - company doc (può essere null/undefined)
 * @param {object} marina  - marina doc (opz., per posto barca: la marina ha il suo payment_config)
 */
export function getPaymentDestination(paymentMethod, company, marina = null) {
  const key = PM_KEY(paymentMethod);
  // Marina ha precedenza se passata (per i posti barca usare le coordinate della marina)
  const src = marina && marina.payment_config ? marina : company;
  const pc = (src && src.payment_config) || {};
  const compName = shortCompany((src && src.name) || (company && company.name) || '');
  const compShort = compName || '—';

  switch (key) {
    case 'SUMUP':
    case 'CARD':
    case 'ONLINE':
    case 'POS': {
      const su = pc.sumup || {};
      const mc = su.merchant_code || '';
      const flat = pc.sumup_merchant_code || '';
      const merchant = mc || flat;
      const label = merchant
        ? `SumUp · ${compShort}`
        : `SumUp · ${compShort}`;
      const detail = merchant
        ? `SumUp · ${compShort} · Merchant ${merchant}`
        : `SumUp · ${compShort}`;
      return { label, detail, merchant_code: merchant, account_holder: compShort };
    }
    case 'STRIPE': {
      return {
        label: `Stripe · ${compShort}`,
        detail: `Stripe · ${compShort}`,
        account_holder: compShort,
      };
    }
    case 'BANK_TRANSFER': {
      const bt = pc.bank_transfer || {};
      const iban = bt.iban || pc.iban || '';
      const bank = bt.bank_name || '';
      const holder = bt.account_holder || compShort;
      const maskedIban = maskIban(iban);
      const bankAbbr = abbrevBank(bank);
      const label = iban
        ? `Bonifico · ${bankAbbr || compShort} · ${maskedIban}`
        : `Bonifico · ${compShort}`;
      const detail = iban
        ? `Bonifico · ${bank || compShort} · ${maskedIban} · ${holder}`
        : `Bonifico · ${compShort}`;
      return { label, detail, iban_masked: maskedIban, bank, account_holder: holder };
    }
    case 'CASH': {
      return {
        label: `Cassa · ${compShort}`,
        detail: `Cassa Aziendale · ${compShort}`,
        account_holder: compShort,
      };
    }
    case 'CHEQUE': {
      return {
        label: `Assegno · ${compShort}`,
        detail: `Assegno · ${compShort}`,
        account_holder: compShort,
      };
    }
    case 'MANUAL':
    case 'DIRECT': {
      return {
        label: `Diretto · ${compShort}`,
        detail: `Pagamento manuale/diretto · ${compShort}`,
        account_holder: compShort,
      };
    }
    case 'FREE': {
      return { label: 'Omaggio', detail: 'Servizio omaggio (nessun incasso)' };
    }
    case 'AGENCY': {
      return {
        label: `Agenzia · ${compShort}`,
        detail: `Trattenuto da agenzia · ${compShort}`,
        account_holder: compShort,
      };
    }
    case 'NONE':
    default:
      return { label: '—', detail: 'Non specificato' };
  }
}

/**
 * Versione "tabella" — solo label sintetica.
 */
export function getPaymentDestinationShort(paymentMethod, company, marina = null) {
  return getPaymentDestination(paymentMethod, company, marina).label;
}
