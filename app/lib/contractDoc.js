// Generatore Contratto di Ormeggio (Word editabile)
// Template basato sul contratto Marlin Sub - precompilato con dati del contratto registrato

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('it-IT') : '';
const fmtDateLong = (d) => {
  if (!d) return { day: '___', month: '________', year: '____' };
  const dt = new Date(d);
  const months = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  return {
    day: String(dt.getDate()).padStart(2, '0'),
    month: months[dt.getMonth()],
    year: String(dt.getFullYear()),
  };
};
const fmtEur = (n) => (Number(n) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const detectImageType = (url) => {
  if (!url) return 'png';
  const u = url.toLowerCase();
  if (u.includes('.jpg') || u.includes('.jpeg')) return 'jpg';
  if (u.includes('.gif')) return 'gif';
  if (u.includes('.bmp')) return 'bmp';
  return 'png';
};

const fetchAsBuffer = async (url) => {
  try { const r = await fetch(url); return await r.arrayBuffer(); } catch { return null; }
};

// Type label per imbarcazione
const boatTypeLabel = (t) => {
  if (t === 'motor') return 'motore';
  if (t === 'sail') return 'vela';
  if (t === 'catamaran') return 'catamarano';
  return t || 'motore';
};

export async function downloadContractDOCX(contract, company, marina = null) {
  const { saveAs } = await import('file-saver');
  const docx = await import('docx');
  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, WidthType, ImageRun, BorderStyle, HeadingLevel,
  } = docx;

  const today = new Date();
  const td = fmtDateLong(today);

  const cust = contract.customer || {};
  const custExtras = contract.customer_extras || {};
  const boat = contract.boat || {};
  const boatExtras = contract.boat_extras || {};
  const isCompany = custExtras.is_company || !!cust.tax_code && cust.tax_code.length === 11; // P.IVA = 11 cifre

  // Parsing posto barca: P1-SX-02 → pontile 1, lato SX, posto 02
  const berthLabel = contract.berth_label || '';
  const berthMatch = berthLabel.match(/P(\d+)-(SX|DX)-(\d+)/i);
  const berthPontile = berthMatch?.[1] || '___';
  const berthLato = berthMatch?.[2] === 'SX' ? 'sinistro' : (berthMatch?.[2] === 'DX' ? 'destro' : '________');
  const berthNum = berthMatch?.[3] || '___';

  // Boat class: natante o diporto
  const boatClass = contract.boat_class || (boat.length && Number(boat.length) >= 10 ? 'diporto' : 'natante');

  const companyLogoBuf = company?.logo_url ? await fetchAsBuffer(company.logo_url) : null;
  const companyLogoType = detectImageType(company?.logo_url);

  // ====================== HELPERS ======================
  const noBorders = () => {
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    return { top: none, bottom: none, left: none, right: none };
  };

  const para = (text, opts = {}) => new Paragraph({
    spacing: { after: 80, line: 280 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [new TextRun({ text: String(text), size: 20, ...opts })],
  });

  const articolo = (n, title, body) => {
    const arr = [
      new Paragraph({
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({ text: `${n}. ${title}`, bold: true, size: 20 }),
        ],
      }),
    ];
    if (body) {
      arr.push(new Paragraph({
        spacing: { after: 80, line: 280 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: body, size: 20 })],
      }));
    }
    return arr;
  };

  const titleBlock = () => {
    const cells = [];
    if (companyLogoBuf) {
      cells.push(new TableCell({
        width: { size: 25, type: WidthType.PERCENTAGE },
        borders: noBorders(),
        children: [new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [new ImageRun({ data: companyLogoBuf, transformation: { width: 90, height: 70 }, type: companyLogoType })],
        })],
      }));
    }
    cells.push(new TableCell({
      width: { size: companyLogoBuf ? 75 : 100, type: WidthType.PERCENTAGE },
      borders: noBorders(),
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'CONTRATTO DI SERVIZI DI ORMEGGIO', bold: true, size: 28, color: '14509F' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: `IN ${(marina?.name || 'MARINA RESORT IL PORTICCIOLO DI BOSA MARINA').toUpperCase()}`, bold: true, size: 22, color: '14509F' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: `LOCALITA' ${(marina?.location || 'BOSA MARINA').toUpperCase()} VIA ${(marina?.address || 'Muraglione Caduti di Cefalonia').toUpperCase()}`, size: 18, color: '666666' })],
        }),
      ],
    }));
    return new Table({
      rows: [new TableRow({ children: cells })],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });
  };

  // ====================== INTESTAZIONE ======================
  // L'anno..., addi..., del mese di..., fra le parti
  const intestazioneBlock = [
    new Paragraph({
      spacing: { before: 240, after: 80, line: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: `L'anno `, size: 20 }),
        new TextRun({ text: td.year, bold: true, size: 20, underline: {} }),
        new TextRun({ text: `, addì `, size: 20 }),
        new TextRun({ text: td.day, bold: true, size: 20, underline: {} }),
        new TextRun({ text: `, del mese di `, size: 20 }),
        new TextRun({ text: td.month, bold: true, size: 20, underline: {} }),
        new TextRun({ text: `, fra le parti `, size: 20 }),
        new TextRun({
          text: `${company?.name || 'Marlin Sub di Coronas Giovanna e Putzu Emanuel & C. s.n.c.'}`,
          bold: true, size: 20,
        }),
        new TextRun({
          text: `, con sede in ${company?.address || 'Siniscola Loc. "Janna & Flores"'}, ${company?.city || '08029 Siniscola NU'}, P.IVA ${company?.vat_number || '01216190919'}, in persona del legale rappresentante pro tempore;`,
          size: 20,
        }),
      ],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 }, children: [new TextRun({ text: 'E', bold: true, size: 22 })] }),
  ];

  // ====================== DATI CLIENTE (persona fisica vs giuridica) ======================
  const clienteFisicaBlock = () => new Paragraph({
    spacing: { after: 100, line: 280 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: '(persona fisica) il/la sig./sig.ra ', size: 20 }),
      new TextRun({ text: `${cust.name || ''} ${cust.surname || ''}`.trim() || '________________', bold: true, size: 20 }),
      new TextRun({ text: ` nato/a a `, size: 20 }),
      new TextRun({ text: custExtras.birth_place || '________________', bold: !!custExtras.birth_place, size: 20 }),
      new TextRun({ text: ` il `, size: 20 }),
      new TextRun({ text: custExtras.birth_date ? fmtDate(custExtras.birth_date) : '__________', bold: !!custExtras.birth_date, size: 20 }),
      new TextRun({ text: ` residente in `, size: 20 }),
      new TextRun({ text: `${cust.address || ''}${cust.city ? ', ' + cust.city : ''}${cust.zip ? ' ' + cust.zip : ''}` || '________________', bold: !!(cust.address || cust.city), size: 20 }),
      new TextRun({ text: `, email `, size: 20 }),
      new TextRun({ text: cust.email || '________________', bold: !!cust.email, size: 20 }),
      new TextRun({ text: `, codice fiscale `, size: 20 }),
      new TextRun({ text: cust.tax_code || '________________', bold: !!cust.tax_code, size: 20 }),
    ],
  });

  const clienteGiuridicaBlock = () => new Paragraph({
    spacing: { after: 100, line: 280 },
    alignment: AlignmentType.JUSTIFIED,
    children: [
      new TextRun({ text: '(persona giuridica) la ', size: 20 }),
      new TextRun({ text: `${cust.name || ''} ${cust.surname || ''}`.trim() || '________________', bold: true, size: 20 }),
      new TextRun({ text: ` con sede legale in `, size: 20 }),
      new TextRun({ text: custExtras.company_legal_seat || cust.address || '________________', bold: true, size: 20 }),
      new TextRun({ text: ` P.IVA `, size: 20 }),
      new TextRun({ text: cust.tax_code || '________________', bold: true, size: 20 }),
      new TextRun({ text: ` iscritta al n° `, size: 20 }),
      new TextRun({ text: custExtras.camera_iscrizione || '________________', bold: !!custExtras.camera_iscrizione, size: 20 }),
      new TextRun({ text: ` della Camera di Commercio di `, size: 20 }),
      new TextRun({ text: custExtras.camera_citta || cust.city || '________________', bold: !!(custExtras.camera_citta || cust.city), size: 20 }),
      new TextRun({ text: `, in persona del legale rappresentante pro tempore, sig./sig.ra `, size: 20 }),
      new TextRun({ text: custExtras.legal_rep_name || '________________', bold: !!custExtras.legal_rep_name, size: 20 }),
      new TextRun({ text: ` nato/a a `, size: 20 }),
      new TextRun({ text: custExtras.legal_rep_birth_place || '________________', bold: !!custExtras.legal_rep_birth_place, size: 20 }),
      new TextRun({ text: ` il `, size: 20 }),
      new TextRun({ text: custExtras.legal_rep_birth_date ? fmtDate(custExtras.legal_rep_birth_date) : '__________', bold: !!custExtras.legal_rep_birth_date, size: 20 }),
      new TextRun({ text: ` C.F. `, size: 20 }),
      new TextRun({ text: custExtras.legal_rep_cf || '________________', bold: !!custExtras.legal_rep_cf, size: 20 }),
      new TextRun({ text: ` domiciliato per la carica presso la sede della società.`, size: 20 }),
    ],
  });

  // ====================== PREMESSO ======================
  const premessoBlock = [
    new Paragraph({ spacing: { before: 200, after: 100 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'premesso', italics: true, bold: true, size: 22 })] }),
    para(`- che la Società "${company?.name || 'Marlin Sub & C. s.n.c.'}" è concessionaria dell'area demaniale marittima in comune di ${marina?.location_city || 'Bosa'} in forza di contratto di gestore a seguito di affitto di ramo d'azienda;`),
    para(`- che il predetto Marina Resort ${marina?.name || 'Il Porticciolo di Bosa Marina'} è dotato di pontile destinato all'ormeggio di natanti ed imbarcazioni da diporto, che vengono assegnati sulla base di rapporti contrattuali individuali nel rispetto delle condizioni generali e con le prescrizioni di cui al Regolamento contenente le norme relative all'esercizio ed all'uso dell'approdo turistico;`),
    para(`- che il Signor proprietario/utilizzatore dell'imbarcazione da:`),
  ];

  // ====================== CHECKBOX NATANTE / DIPORTO ======================
  const isNatante = boatClass === 'natante';
  const isDiporto = boatClass === 'diporto';

  const natanteBlock = () => new Paragraph({
    spacing: { after: 100, line: 280 },
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 360 },
    children: [
      new TextRun({ text: isNatante ? '☒ ' : '☐ ', bold: true, size: 22 }),
      new TextRun({ text: 'Natante di mt. ', size: 20 }),
      new TextRun({ text: boat.length ? String(boat.length) : '___', bold: !!boat.length, size: 20 }),
      new TextRun({ text: ' lunghezza Massima e Larghezza di mt ', size: 20 }),
      new TextRun({ text: boat.beam ? String(boat.beam) : '_____', bold: !!boat.beam, size: 20 }),
      new TextRun({ text: ' con Motore tipo ', size: 20 }),
      new TextRun({ text: boatExtras.engine_type || '_________', bold: !!boatExtras.engine_type, size: 20 }),
      new TextRun({ text: ' marca ', size: 20 }),
      new TextRun({ text: boatExtras.engine_brand || '_________', bold: !!boatExtras.engine_brand, size: 20 }),
      new TextRun({ text: ' HP ', size: 20 }),
      new TextRun({ text: boatExtras.engine_hp ? String(boatExtras.engine_hp) : '_______', bold: !!boatExtras.engine_hp, size: 20 }),
      new TextRun({ text: '. Colore scafo ', size: 20 }),
      new TextRun({ text: boatExtras.hull_color || '_________', bold: !!boatExtras.hull_color, size: 20 }),
      new TextRun({ text: '. Note sovrastruttura ', size: 20 }),
      new TextRun({ text: boatExtras.superstructure_notes || '___________________', bold: !!boatExtras.superstructure_notes, size: 20 }),
      new TextRun({ text: '.', size: 20 }),
    ],
  });

  const diportoBlock = () => new Paragraph({
    spacing: { after: 100, line: 280 },
    alignment: AlignmentType.JUSTIFIED,
    indent: { left: 360 },
    children: [
      new TextRun({ text: isDiporto ? '☒ ' : '☐ ', bold: true, size: 22 }),
      new TextRun({ text: 'diporto a ', size: 20 }),
      new TextRun({ text: boatTypeLabel(boat.type), bold: true, size: 20 }),
      new TextRun({ text: ' denominata ', size: 20 }),
      new TextRun({ text: boat.name || '........................', bold: !!boat.name, size: 20 }),
      new TextRun({ text: ' modello ', size: 20 }),
      new TextRun({ text: boatExtras.model || '.......................', bold: !!boatExtras.model, size: 20 }),
      new TextRun({ text: ' iscritta al n. ', size: 20 }),
      new TextRun({ text: boatExtras.registration_number || boat.registration || '....................', bold: !!(boatExtras.registration_number || boat.registration), size: 20 }),
      new TextRun({ text: ', dei R.I.D. di ', size: 20 }),
      new TextRun({ text: boatExtras.registration_office || '........................', bold: !!boatExtras.registration_office, size: 20 }),
      new TextRun({ text: ', tipo ', size: 20 }),
      new TextRun({ text: boatExtras.engine_type || '....................', bold: !!boatExtras.engine_type, size: 20 }),
      new TextRun({ text: ', Potenza ', size: 20 }),
      new TextRun({ text: boatExtras.engine_power || '....................', bold: !!boatExtras.engine_power, size: 20 }),
      new TextRun({ text: ', Dimensioni: Lunghezza Massima ', size: 20 }),
      new TextRun({ text: boat.length ? String(boat.length) + ' m' : '....................', bold: !!boat.length, size: 20 }),
      new TextRun({ text: ', Larghezza Massima ', size: 20 }),
      new TextRun({ text: boat.beam ? String(boat.beam) + ' m' : '....................', bold: !!boat.beam, size: 20 }),
      new TextRun({ text: ', colore scafo ', size: 20 }),
      new TextRun({ text: boatExtras.hull_color || '....................', bold: !!boatExtras.hull_color, size: 20 }),
      new TextRun({ text: ', colore sovrastruttura ', size: 20 }),
      new TextRun({ text: boatExtras.superstructure_color || '....................', bold: !!boatExtras.superstructure_color, size: 20 }),
      new TextRun({ text: '.', size: 20 }),
    ],
  });

  // ====================== CONVENUTO ======================
  const convenutoBlock = [
    para(`ha richiesto l'assegnazione di un posto barca per la predetta imbarcazione;`),
    new Paragraph({ spacing: { before: 200, after: 100 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'tutto ciò premesso, si conviene e stipula quanto segue:', italics: true, bold: true, size: 22 })] }),
  ];

  // ====================== ARTICOLI ======================
  const userFullName = `${cust.name || ''} ${cust.surname || ''}`.trim() || '________________';
  const corrispettivoFmt = fmtEur(contract.grand_total);

  const articoliBlock = [
    ...articolo(1, 'La premessa costituisce parte integrante e sostanziale del presente atto.'),
    ...articolo(2, "L'utente dichiara di aver letto il Regolamento per l'esercizio e l'uso dell'approdo che, allegato al presente contratto come allegato 1), ne costituisce parte integrante e sostanziale, e di accettarlo in tutte le sue parti, senza nessuna esclusione e senza nessuna condizione."),
    new Paragraph({
      spacing: { before: 160, after: 80, line: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: '3. ', bold: true, size: 20 }),
        new TextRun({
          text: `La Società ${company?.name || 'Marlin Sub & C. s.n.c.'} (di seguito "Società") concede in godimento al Signor `,
          size: 20,
        }),
        new TextRun({ text: userFullName, bold: true, size: 20 }),
        new TextRun({ text: ' (di seguito "Utente") il posto barca di Categoria fino a Metri ', size: 20 }),
        new TextRun({ text: boat.length ? String(Math.ceil(Number(boat.length))) : '___', bold: true, size: 20 }),
        new TextRun({ text: ' distinto con il N° ', size: 20 }),
        new TextRun({ text: berthNum, bold: true, size: 20 }),
        new TextRun({ text: ' pontile lato ', size: 20 }),
        new TextRun({ text: berthLato, bold: true, size: 20 }),
        new TextRun({ text: '.', size: 20 }),
      ],
    }),
    ...articolo(4, "L'utente dichiara di aver preso visione del suddetto posto barca e di accettarlo in ogni sua caratteristica. L'utente si impegna a rispettare tutte le norme marinaresche in materia di ormeggio con particolare riguardo all'impiego di adeguati parabordi e molloni nonché cime adeguate."),
    new Paragraph({
      spacing: { before: 160, after: 80, line: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: '5. ', bold: true, size: 20 }),
        new TextRun({ text: 'Il contratto avrà la durata dal ', size: 20 }),
        new TextRun({ text: contract.start_date ? fmtDate(contract.start_date) : '............................', bold: !!contract.start_date, size: 20 }),
        new TextRun({ text: ' al ', size: 20 }),
        new TextRun({ text: contract.end_date ? fmtDate(contract.end_date) : '...........................', bold: !!contract.end_date, size: 20 }),
        new TextRun({ text: '. Per i nuovi utenti o nuove imbarcazioni il contratto avrà validità dal giorno della sottoscrizione al ', size: 20 }),
        new TextRun({ text: contract.end_date ? fmtDate(contract.end_date) : '________________', bold: !!contract.end_date, size: 20 }),
        new TextRun({ text: '.', size: 20 }),
      ],
    }),
    para('5.1 Il rinnovo del presente contratto dovrà essere chiesto per iscritto. La richiesta deve pervenire alla Concessionaria almeno trenta giorni prima della data di scadenza (in caso di assegnazione originaria superiore a mesi cinque), ovvero di quindici giorni prima della data di scadenza (per periodi inferiori di assegnazione).'),
    para("5.2 L'eventuale rinnovo del contratto comporterà l'automatico adeguamento del corrispettivo alle nuove tariffe stabilite dalla Concessionaria, risultanti dai listini vigenti."),
    para("5.3 In caso di mancato rinnovo l'Utilizzatore dovrà immediatamente restituire il posto barca alla concessionaria, libero e sgombero da persone e/o cose. In difetto la Concessionaria, per ogni giorno di ritardo nella riconsegna dell'ormeggio, applicherà la tariffa giornaliera c.d. \"di transito\" prevista per le imbarcazioni equivalenti."),
    para("5.4 L'Utilizzatore autorizza sin d'ora la Concessionaria a spostare eventualmente l'imbarcazione in altro luogo. L'Utilizzatore autorizza altresì lo spostamento dell'imbarcazione anche a terra e fuori dall'area demaniale portuale, con relativo addebito delle operazioni di movimentazione e di sosta."),
    para("5.5 Il presente contratto è in vigore sino alla scadenza della concessione demaniale di cui in premessa. La validità e l'efficacia del contratto è funzionalmente e direttamente dipendente dall'atto di concessione demaniale."),
    para("5.6 Qualora l'Ente concedente o altra Amministrazione competente, ai sensi e per gli effetti di cui all'art. 42, 2° comma, cod. nav., per necessità inderogabili per l'uso del mare o per altre ragioni di pubblico interesse (non derivanti dall'inadempimento della Concessionaria) revochi la concessione, il contratto sarà automaticamente risolto e l'utilizzatore non avrà diritto ad esercitare alcuna pretesa nei confronti della concessionaria per ottenere, a qualsiasi titolo o ragione, rimborsi o risarcimenti."),
    ...articolo(6, "L'utente dovrà effettuare il pagamento della tariffa fissata dalla Società; l'utente non interessato al rinnovo stagionale o mensile potrà rinunciare dando comunicazione scritta alla Società entro il 15 Ottobre dell'anno precedente a quello di riferimento. In mancanza di rinnovo entro il termine indicato, il posto di ormeggio si considererà libero e pertanto la Società potrà impegnarlo e concederlo a terzi."),
    ...articolo(7, "In caso di scadenza del contratto o di mancato rinnovo entro il termine sopra indicato, l'utente dovrà immediatamente asportare l'imbarcazione, con facoltà della concessionaria di procedere, con oneri a carico dell'utente, alla liberazione del posto barca mediante spostamento e/o alaggio dell'imbarcazione, ferma l'esclusione di qualsivoglia obbligo di custodia, analogamente potrà procedersi per l'ipotesi di permanenza nel posto barca successivamente alla scadenza naturale del contratto."),
    ...articolo(8, "Nel caso di permanenza dell'imbarcazione nel posto barca successivamente alla scadenza del contratto ed in caso di mancato pagamento del canone di ormeggio di cui all'art. 10, l'utente è obbligato a corrispondere alla Società la tariffa giornaliera, come prevista dal tariffario vigente, per l'effettivo periodo di permanenza illegittima e fino all'effettivo allontanamento dell'imbarcazione dall'area portuale in concessione."),
    new Paragraph({
      spacing: { before: 160, after: 80, line: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [
        new TextRun({ text: '9. ', bold: true, size: 20 }),
        new TextRun({ text: 'Il corrispettivo è stabilito in € ', size: 20 }),
        new TextRun({ text: corrispettivoFmt, bold: true, size: 20 }),
        new TextRun({ text: ' da corrispondersi:', size: 20 }),
      ],
    }),
    para('☐ contestualmente alla firma del presente contratto. In questo caso verrà applicato uno sconto del 5%.'),
    para('☐ in due rate uguali (senza sconto): l\'acconto alla sottoscrizione del contratto e il saldo entro il ____________.'),
    ...articolo(10, 'In caso di ritardo nel pagamento del canone, si applicheranno gli interessi del 5% senza necessità di costituzione in mora.'),
    ...articolo(11, "Il mancato pagamento del canone e della seconda rata decorsi 15 giorni dalla richiesta formale produrranno la risoluzione di diritto del contratto fermo l'esercizio da parte della Società ad agire giudizialmente per il recupero coattivo del credito, per l'eventuale risarcimento danni, per il rilascio del posto barca qualora ciò non avvenisse spontaneamente e in genere per la tutela dei propri interessi."),
    ...articolo(12, "L'Utente si obbliga a stipulare, presso primaria Compagnia, apposita assicurazione per la responsabilità civile verso terzi per i danni eventualmente cagionati a terzi durante il corso del rapporto ivi compresi i danni ad altre imbarcazioni ed alle persone alle medesime addette e/o sulle medesime trasportate per fatti verificatisi all'interno dell'area portuale, nonché i danni alle attrezzature, agli impianti ed al personale anche non dipendente impiegato nell'approdo a qualsivoglia titolo, per un massimale non inferiore ai minimi di legge per sinistro; copia della polizza dovrà essere consegnata alla Società contestualmente alla stipula del contratto, nonché in occasione di ogni rinnovo o modifica della stessa polizza."),
    new Paragraph({
      spacing: { before: 160, after: 80, line: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({ text: '13. La risoluzione di diritto del contratto si verificherà nei seguenti casi:', bold: true, size: 20 })],
    }),
    para('a. Mancato pagamento del canone e della seconda rata (in caso di opzione per il pagamento frazionato del canone) di cui all\'art. 10;'),
    para('b. Subaffitto o cessione in godimento a terzi, anche temporanea, del posto barca;'),
    para('c. False dichiarazioni relative alle dimensioni fuori tutto dell\'imbarcazione;'),
    para('d. Revoca per qualsiasi evento della concessione demaniale;'),
    para('e. Mancata copertura assicurativa di cui all\'art. 12;'),
    para('f. Violazioni del Regolamento dell\'approdo Turistico.'),
    ...articolo(15, "In ogni ipotesi di recesso, di disdetta e di risoluzione di diritto del presente contratto ad eccezione dell'ipotesi di revoca della concessione, la Società resta fin d'ora autorizzata, senza necessità di alcuna formalità salvo il preavviso di giorni 15 a mezzo lettera raccomandata/PEC, termine da ritenersi validamente effettuato mediante invio al domicilio eletto, anche in via succedanea, di cui al successivo art. 18, a procedere, con oneri a carico dell'utente, alla liberazione del posto barca mediante spostamento e/o alaggio dell'imbarcazione, ferma l'esclusione di qualsivoglia obbligo di custodia."),
    ...articolo(16, "Resta espressamente esclusa qualsivoglia responsabilità della Società per danni che dovessero essere cagionati da terzi all'Utente, all'imbarcazione e/o alle persone che se ne servono, così come resta esclusa qualsivoglia responsabilità da custodia a carico della Società. Le parti si danno reciprocamente atto che il servizio di vigilanza quale previsto nel Regolamento concerne esclusivamente la vigilanza generica sulle strutture portuali e sul rispetto delle norme di comportamento da parte degli Utenti, senza alcun obbligo di vigilanza specifica sulle imbarcazioni e sulle persone che se ne servono. La Società, pertanto, pur attuando un servizio di vigilanza nel Porto, non risponde per danni, furti, perdite di beni essendo esclusa la presa in consegna ovvero custodia dell'imbarcazione, attrezzature, accessori ed oggetti del proprietario."),
    ...articolo(17, "La Società è esonerata da qualsiasi responsabilità per l'ipotesi di indisponibilità temporanea del posto barca per causa alla medesima non imputabile, ivi compresa la caducazione, per qualsivoglia motivo, della concessione demaniale. L'utente potrà recedere dal contratto, con preavviso scritto di giorni dieci, qualora l'impossibilità di utilizzo si protragga per oltre trenta giorni. In questo caso la Società provvederà a rimborsare la parte di canone già corrisposta corrispondente alla minor durata del contratto."),
    ...articolo(18, "Ai fini dell'esecuzione del presente contratto, ivi compresa la notifica di atti giudiziari, la Società elegge domicilio presso la propria sede legale, e l'utente presso l'indirizzo indicato in epigrafe. Ogni comunicazione o notificazione di atti, anche giudiziari, sarà peraltro validamente effettuata, in ogni caso, per l'ipotesi di trasferimento del predetto domicilio, presso la casa comunale del comune nel quale si trova il domicilio eletto, a condizione che l'atto sia contestualmente notificato e/o inviato anche al domicilio eletto in via principale."),
  ];

  // ====================== FIRME ======================
  const firmeBlock = [
    new Paragraph({ spacing: { before: 400, after: 100 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Letto, confermato e sottoscritto in duplice originale ed un allegato', italics: true, size: 20 })] }),
    new Paragraph({
      spacing: { before: 400 },
      children: [
        new TextRun({ text: `${company?.name || 'Marlin Sub & C. s.n.c.'}`, bold: true, size: 20 }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: 'Il legale rappresentante p.t. _____________________________', size: 20 })] }),
    new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: "L'UTENTE _____________________________", size: 20 })] }),
    new Paragraph({
      spacing: { before: 400, after: 80, line: 280 },
      alignment: AlignmentType.JUSTIFIED,
      children: [new TextRun({
        text: "Ai sensi e per gli effetti degli artt. 1341 e 1342 cod. civile si approvano espressamente le clausole di cui all'art. 2 (accettazione regolamento in tutte le sue parti); art. 10 (interessi di mora); art. 11 (risoluzione di diritto e recupero crediti); art. 12 (obbligo assicurativo); art. 13 (cause di risoluzione di diritto); art. 15 (spostamento/alaggio in caso di recesso); art. 16 e 17 (esclusione responsabilità da vigilanza, custodia e indisponibilità posto barca); art. 18 (elezione domicilio).",
        italics: true, size: 18,
      })],
    }),
    new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: `${marina?.location_city || 'Bosa'}, ${td.day}/${String(today.getMonth() + 1).padStart(2, '0')}/${td.year}`, size: 20 })] }),
    new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "L'UTENTE _____________________________", size: 20 })] }),
  ];

  // Allegati documenti se presenti
  const docs = contract.documents || {};
  const allegatiBlock = [];
  if (docs.libretto_url || docs.assicurazione_url) {
    allegatiBlock.push(
      new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'ALLEGATI:', bold: true, size: 20, color: '14509F' })] }),
    );
    if (docs.libretto_url) {
      allegatiBlock.push(new Paragraph({ children: [
        new TextRun({ text: '• Libretto motore/imbarcazione: ', size: 18 }),
        new TextRun({ text: docs.libretto_filename || 'allegato', size: 18, italics: true, color: '14509F' }),
      ] }));
    }
    if (docs.assicurazione_url) {
      allegatiBlock.push(new Paragraph({ children: [
        new TextRun({ text: '• Certificato di assicurazione obbligatoria: ', size: 18 }),
        new TextRun({ text: docs.assicurazione_filename || 'allegato', size: 18, italics: true, color: '14509F' }),
      ] }));
    }
  }

  // ====================== DOCUMENT ======================
  const children = [
    titleBlock(),
    ...intestazioneBlock,
    isCompany ? clienteGiuridicaBlock() : clienteFisicaBlock(),
    ...premessoBlock,
    natanteBlock(),
    diportoBlock(),
    ...convenutoBlock,
    ...articoliBlock,
    ...firmeBlock,
    ...allegatiBlock,
  ];

  const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } }, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Contratto_${contract.booking_number?.replace('/', '_') || 'ormeggio'}.docx`);
}
