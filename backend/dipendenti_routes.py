"""
Dipendenti module - HR management
- Anagrafica dipendenti + documenti
- Assunzioni (contratti)
- Stipendi e pagamenti
- PDF export + Resend email

All endpoints scoped to the authenticated user (multi-tenant via user_id).
"""

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import io
import os
import asyncio
import logging
import base64

import resend
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

logger = logging.getLogger(__name__)

dipendenti_router = APIRouter(prefix="/dipendenti", tags=["dipendenti"])

# Will be injected from server.py
_db = None
_get_user_from_token = None
_default_user_id = "default-user"


def init_dipendenti_router(db, get_user_from_token, default_user_id="default-user"):
    """Inject dependencies from main server module."""
    global _db, _get_user_from_token, _default_user_id
    _db = db
    _get_user_from_token = get_user_from_token
    _default_user_id = default_user_id
    # Configure Resend
    resend.api_key = os.environ.get("RESEND_API_KEY", "")


# ============ MODELS ============

class DocumentoAllegato(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nome_file: str
    descrizione: str = ""
    content_base64: str  # data URL
    uploaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Dipendente(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    # Anagrafica
    nome: str
    cognome: str
    codice_fiscale: str = ""
    data_nascita: str = ""
    luogo_nascita: str = ""
    indirizzo: str = ""
    citta: str = ""
    cap: str = ""
    # Contatti
    email: str = ""
    telefono: str = ""
    # Professionali
    titolo_studio: str = ""
    ruolo: str = ""
    mansione: str = ""
    sede: str = ""
    stato: str = "libero"  # disoccupato, inoccupato, altro, libero, assunto
    note: str = ""
    documenti: List[DocumentoAllegato] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class BonusExtra(BaseModel):
    tipo: str
    importo: float


class Assunzione(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    dipendente_id: str
    tipo_contratto: str = ""
    data_inizio: str = ""
    data_termine: str = ""  # vuoto = indeterminato
    ore_settimanali: float = 0
    tariffa_oraria: float = 0
    netto_mensile: float = 0
    bonus: List[BonusExtra] = []
    contratto_allegato: Optional[DocumentoAllegato] = None
    sede_lavoro: str = ""
    orario: str = ""  # es. "9:00-18:00"
    giorni_lavorativi: str = ""  # es. "lun-ven"
    note: str = ""
    stato: str = "attivo"  # attivo, cessato
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PagamentoAcconto(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    data: str
    importo: float
    note: str = ""


class BustaPaga(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    dipendente_id: str
    assunzione_id: str = ""
    anno: int
    mese: int  # 1-12
    data_emissione: str = ""
    importo_netto: float = 0
    busta_pdf: Optional[DocumentoAllegato] = None
    pagamenti: List[PagamentoAcconto] = []
    note: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ============ HELPERS ============

async def _user_id_from_token(token: Optional[str]) -> str:
    user = await _get_user_from_token(token)
    return user.get("id", _default_user_id)


def _serialize(doc):
    if doc and "_id" in doc:
        del doc["_id"]
    return doc


# ============ SEDI (lookup) ============

@dipendenti_router.get("/sedi")
async def list_sedi(token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    sedi = await _db.dipendenti_sedi.find({"user_id": user_id}, {"_id": 0}).sort("nome", 1).to_list(500)
    return sedi


@dipendenti_router.post("/sedi")
async def create_sede(data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    nome = (data.get("nome") or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Nome sede obbligatorio")
    existing = await _db.dipendenti_sedi.find_one({"user_id": user_id, "nome": nome})
    if existing:
        return _serialize(existing)
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nome": nome,
        "indirizzo": data.get("indirizzo", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.dipendenti_sedi.insert_one(record)
    return _serialize(record)


@dipendenti_router.delete("/sedi/{sede_id}")
async def delete_sede(sede_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    await _db.dipendenti_sedi.delete_one({"id": sede_id, "user_id": user_id})
    return {"success": True}


# ============ TIPI CONTRATTO (lookup) ============

@dipendenti_router.get("/tipi-contratto")
async def list_tipi_contratto(token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    items = await _db.dipendenti_tipi_contratto.find({"user_id": user_id}, {"_id": 0}).sort("nome", 1).to_list(500)
    return items


@dipendenti_router.post("/tipi-contratto")
async def create_tipo_contratto(data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    nome = (data.get("nome") or "").strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Nome obbligatorio")
    existing = await _db.dipendenti_tipi_contratto.find_one({"user_id": user_id, "nome": nome})
    if existing:
        return _serialize(existing)
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "nome": nome,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.dipendenti_tipi_contratto.insert_one(record)
    return _serialize(record)


@dipendenti_router.delete("/tipi-contratto/{item_id}")
async def delete_tipo_contratto(item_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    await _db.dipendenti_tipi_contratto.delete_one({"id": item_id, "user_id": user_id})
    return {"success": True}


# ============ DIPENDENTI (CRUD) ============

@dipendenti_router.get("")
async def list_dipendenti(
    token: Optional[str] = Query(None),
    sede: Optional[str] = Query(None),
    mansione: Optional[str] = Query(None),
    stato: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
):
    user_id = await _user_id_from_token(token)
    query = {"user_id": user_id}
    if sede:
        query["sede"] = sede
    if mansione:
        query["mansione"] = mansione
    if stato:
        query["stato"] = stato
    if q:
        regex = {"$regex": q, "$options": "i"}
        query["$or"] = [
            {"nome": regex}, {"cognome": regex}, {"codice_fiscale": regex},
            {"email": regex}, {"telefono": regex}, {"ruolo": regex}
        ]
    rows = await _db.dipendenti.find(query, {"_id": 0}).sort("cognome", 1).to_list(1000)
    return rows


@dipendenti_router.get("/{dipendente_id}")
async def get_dipendente(dipendente_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    row = await _db.dipendenti.find_one({"id": dipendente_id, "user_id": user_id}, {"_id": 0})
    if not row:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    return row


@dipendenti_router.post("")
async def create_dipendente(data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    payload = dict(data)
    payload["user_id"] = user_id
    payload.setdefault("stato", "libero")
    payload.setdefault("documenti", [])
    dip = Dipendente(**payload)
    await _db.dipendenti.insert_one(dip.model_dump())
    return dip.model_dump()


@dipendenti_router.put("/{dipendente_id}")
async def update_dipendente(dipendente_id: str, data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    updates = {k: v for k, v in data.items() if k not in ("id", "user_id", "created_at")}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await _db.dipendenti.update_one(
        {"id": dipendente_id, "user_id": user_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    row = await _db.dipendenti.find_one({"id": dipendente_id}, {"_id": 0})
    return row


@dipendenti_router.delete("/{dipendente_id}")
async def delete_dipendente(dipendente_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    await _db.dipendenti.delete_one({"id": dipendente_id, "user_id": user_id})
    # Also delete related assunzioni and buste paga
    await _db.dipendenti_assunzioni.delete_many({"dipendente_id": dipendente_id, "user_id": user_id})
    await _db.dipendenti_buste_paga.delete_many({"dipendente_id": dipendente_id, "user_id": user_id})
    return {"success": True}


@dipendenti_router.post("/{dipendente_id}/documenti")
async def add_documento_dipendente(dipendente_id: str, data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    doc = DocumentoAllegato(
        nome_file=data.get("nome_file", "documento"),
        descrizione=data.get("descrizione", ""),
        content_base64=data.get("content_base64", ""),
    )
    result = await _db.dipendenti.update_one(
        {"id": dipendente_id, "user_id": user_id},
        {"$push": {"documenti": doc.model_dump()}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    return doc.model_dump()


@dipendenti_router.delete("/{dipendente_id}/documenti/{doc_id}")
async def delete_documento_dipendente(dipendente_id: str, doc_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    await _db.dipendenti.update_one(
        {"id": dipendente_id, "user_id": user_id},
        {"$pull": {"documenti": {"id": doc_id}}}
    )
    return {"success": True}


# ============ ASSUNZIONI ============

@dipendenti_router.get("/assunzioni/list")
async def list_assunzioni(token: Optional[str] = Query(None), dipendente_id: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    query = {"user_id": user_id}
    if dipendente_id:
        query["dipendente_id"] = dipendente_id
    rows = await _db.dipendenti_assunzioni.find(query, {"_id": 0}).sort("data_inizio", -1).to_list(2000)
    return rows


@dipendenti_router.post("/assunzioni")
async def create_assunzione(data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    payload = dict(data)
    payload["user_id"] = user_id
    ass = Assunzione(**payload)
    await _db.dipendenti_assunzioni.insert_one(ass.model_dump())
    # Update dipendente stato to "assunto" if active
    if ass.stato == "attivo":
        await _db.dipendenti.update_one(
            {"id": ass.dipendente_id, "user_id": user_id},
            {"$set": {"stato": "assunto", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    return ass.model_dump()


@dipendenti_router.put("/assunzioni/{ass_id}")
async def update_assunzione(ass_id: str, data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    updates = {k: v for k, v in data.items() if k not in ("id", "user_id", "created_at")}
    result = await _db.dipendenti_assunzioni.update_one(
        {"id": ass_id, "user_id": user_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Assunzione non trovata")
    return await _db.dipendenti_assunzioni.find_one({"id": ass_id}, {"_id": 0})


@dipendenti_router.delete("/assunzioni/{ass_id}")
async def delete_assunzione(ass_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    await _db.dipendenti_assunzioni.delete_one({"id": ass_id, "user_id": user_id})
    return {"success": True}


# ============ BUSTE PAGA & PAGAMENTI ============

@dipendenti_router.get("/buste-paga/list")
async def list_buste_paga(token: Optional[str] = Query(None), dipendente_id: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    query = {"user_id": user_id}
    if dipendente_id:
        query["dipendente_id"] = dipendente_id
    rows = await _db.dipendenti_buste_paga.find(query, {"_id": 0}).sort([("anno", -1), ("mese", -1)]).to_list(2000)
    return rows


@dipendenti_router.post("/buste-paga")
async def create_busta_paga(data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    payload = dict(data)
    payload["user_id"] = user_id
    payload.setdefault("pagamenti", [])
    busta = BustaPaga(**payload)
    await _db.dipendenti_buste_paga.insert_one(busta.model_dump())
    return busta.model_dump()


@dipendenti_router.put("/buste-paga/{busta_id}")
async def update_busta_paga(busta_id: str, data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    updates = {k: v for k, v in data.items() if k not in ("id", "user_id", "created_at")}
    result = await _db.dipendenti_buste_paga.update_one(
        {"id": busta_id, "user_id": user_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Busta paga non trovata")
    return await _db.dipendenti_buste_paga.find_one({"id": busta_id}, {"_id": 0})


@dipendenti_router.delete("/buste-paga/{busta_id}")
async def delete_busta_paga(busta_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    await _db.dipendenti_buste_paga.delete_one({"id": busta_id, "user_id": user_id})
    return {"success": True}


@dipendenti_router.post("/buste-paga/{busta_id}/pagamenti")
async def add_pagamento(busta_id: str, data: dict = Body(...), token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    pag = PagamentoAcconto(
        data=data.get("data", datetime.now(timezone.utc).date().isoformat()),
        importo=float(data.get("importo") or 0),
        note=data.get("note", ""),
    )
    result = await _db.dipendenti_buste_paga.update_one(
        {"id": busta_id, "user_id": user_id},
        {"$push": {"pagamenti": pag.model_dump()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Busta paga non trovata")
    return pag.model_dump()


@dipendenti_router.delete("/buste-paga/{busta_id}/pagamenti/{pag_id}")
async def delete_pagamento(busta_id: str, pag_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    await _db.dipendenti_buste_paga.update_one(
        {"id": busta_id, "user_id": user_id},
        {"$pull": {"pagamenti": {"id": pag_id}}}
    )
    return {"success": True}


# ============ PDF GENERATION ============

def _build_pdf_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="H1Custom", parent=styles["Heading1"], fontSize=18, textColor=colors.HexColor("#1e40af"), spaceAfter=12))
    styles.add(ParagraphStyle(name="H2Custom", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#374151"), spaceAfter=8))
    styles.add(ParagraphStyle(name="MetaCustom", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#6b7280")))
    return styles


def _pdf_lista_dipendenti(dipendenti: list, titolo: str = "Elenco Dipendenti") -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = _build_pdf_styles()
    story = []
    story.append(Paragraph(titolo, styles["H1Custom"]))
    story.append(Paragraph(f"Generato il {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles["MetaCustom"]))
    story.append(Spacer(1, 0.4*cm))

    data = [["Cognome", "Nome", "Mansione", "Sede", "Stato", "Email", "Telefono"]]
    for d in dipendenti:
        data.append([
            d.get("cognome", ""), d.get("nome", ""), d.get("mansione", ""),
            d.get("sede", ""), d.get("stato", ""), d.get("email", ""), d.get("telefono", "")
        ])

    t = Table(data, repeatRows=1, colWidths=[2.5*cm, 2.5*cm, 3*cm, 2.5*cm, 2*cm, 4*cm, 2.5*cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1e40af")),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 8),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f3f4f6")]),
        ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#d1d5db")),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 4),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.4*cm))
    story.append(Paragraph(f"Totale: {len(dipendenti)} dipendenti", styles["MetaCustom"]))

    doc.build(story)
    return buf.getvalue()


def _pdf_scheda_dipendente(dip: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = _build_pdf_styles()
    story = []
    story.append(Paragraph(f"Scheda Dipendente: {dip.get('cognome','')} {dip.get('nome','')}", styles["H1Custom"]))
    story.append(Paragraph(f"Generato il {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles["MetaCustom"]))
    story.append(Spacer(1, 0.5*cm))

    def section(title, rows):
        story.append(Paragraph(title, styles["H2Custom"]))
        data = [[k, v if v else "-"] for k, v in rows]
        t = Table(data, colWidths=[5*cm, 12*cm])
        t.setStyle(TableStyle([
            ("FONTSIZE", (0,0), (-1,-1), 9),
            ("BACKGROUND", (0,0), (0,-1), colors.HexColor("#f3f4f6")),
            ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
            ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#e5e7eb")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
            ("LEFTPADDING", (0,0), (-1,-1), 6),
            ("RIGHTPADDING", (0,0), (-1,-1), 6),
            ("TOPPADDING", (0,0), (-1,-1), 4),
            ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.4*cm))

    section("Anagrafica", [
        ("Cognome", dip.get("cognome", "")),
        ("Nome", dip.get("nome", "")),
        ("Codice Fiscale", dip.get("codice_fiscale", "")),
        ("Data nascita", dip.get("data_nascita", "")),
        ("Luogo nascita", dip.get("luogo_nascita", "")),
        ("Indirizzo", dip.get("indirizzo", "")),
        ("Città", dip.get("citta", "")),
        ("CAP", dip.get("cap", "")),
    ])
    section("Contatti", [
        ("Email", dip.get("email", "")),
        ("Telefono", dip.get("telefono", "")),
    ])
    section("Profilo Professionale", [
        ("Titolo di studio", dip.get("titolo_studio", "")),
        ("Ruolo", dip.get("ruolo", "")),
        ("Mansione", dip.get("mansione", "")),
        ("Sede", dip.get("sede", "")),
        ("Stato", dip.get("stato", "")),
    ])
    if dip.get("note"):
        story.append(Paragraph("Note", styles["H2Custom"]))
        story.append(Paragraph(dip["note"].replace("\n", "<br/>"), styles["Normal"]))
        story.append(Spacer(1, 0.4*cm))

    docs = dip.get("documenti", [])
    if docs:
        story.append(Paragraph(f"Documenti allegati ({len(docs)})", styles["H2Custom"]))
        data = [["Nome file", "Descrizione"]] + [[d.get("nome_file",""), d.get("descrizione","")] for d in docs]
        t = Table(data, repeatRows=1, colWidths=[7*cm, 10*cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#374151")),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0), (-1,-1), 9),
            ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#d1d5db")),
            ("VALIGN", (0,0), (-1,-1), "TOP"),
        ]))
        story.append(t)

    doc.build(story)
    return buf.getvalue()


def _pdf_busta_paga(dip: dict, busta: dict) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=1.5*cm, rightMargin=1.5*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
    styles = _build_pdf_styles()
    story = []
    mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]
    mese_label = mesi[(busta.get("mese", 1) - 1) % 12]
    story.append(Paragraph(f"Busta Paga - {mese_label} {busta.get('anno','')}", styles["H1Custom"]))
    story.append(Paragraph(f"{dip.get('cognome','')} {dip.get('nome','')} - {dip.get('mansione','')}", styles["H2Custom"]))
    story.append(Paragraph(f"Generato il {datetime.now().strftime('%d/%m/%Y %H:%M')}", styles["MetaCustom"]))
    story.append(Spacer(1, 0.4*cm))

    importo = float(busta.get("importo_netto") or 0)
    pagamenti = busta.get("pagamenti", []) or []
    pagato = sum(float(p.get("importo") or 0) for p in pagamenti)
    residuo = importo - pagato

    info = [
        ["Importo netto busta:", f"€ {importo:,.2f}"],
        ["Totale pagato:", f"€ {pagato:,.2f}"],
        ["Residuo:", f"€ {residuo:,.2f}"],
    ]
    t = Table(info, colWidths=[5*cm, 5*cm])
    t.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 11),
        ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("BACKGROUND", (1,2), (1,2), colors.HexColor("#fef3c7") if residuo > 0.01 else colors.HexColor("#d1fae5")),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 0.5*cm))

    if pagamenti:
        story.append(Paragraph("Pagamenti effettuati", styles["H2Custom"]))
        data = [["Data", "Importo (€)", "Note"]]
        for p in pagamenti:
            data.append([p.get("data",""), f"{float(p.get('importo') or 0):,.2f}", p.get("note","")])
        tp = Table(data, repeatRows=1, colWidths=[3.5*cm, 3.5*cm, 10*cm])
        tp.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1e40af")),
            ("TEXTCOLOR", (0,0), (-1,0), colors.white),
            ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE", (0,0), (-1,-1), 9),
            ("GRID", (0,0), (-1,-1), 0.25, colors.HexColor("#d1d5db")),
        ]))
        story.append(tp)
    else:
        story.append(Paragraph("Nessun pagamento registrato.", styles["MetaCustom"]))

    doc.build(story)
    return buf.getvalue()


# ============ PDF ENDPOINTS ============

from fastapi.responses import StreamingResponse


@dipendenti_router.get("/pdf/lista")
async def pdf_lista(token: Optional[str] = Query(None), sede: Optional[str] = None, mansione: Optional[str] = None, stato: Optional[str] = None, q: Optional[str] = None):
    rows = await list_dipendenti(token=token, sede=sede, mansione=mansione, stato=stato, q=q)
    pdf_bytes = _pdf_lista_dipendenti(rows)
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": "inline; filename=elenco_dipendenti.pdf"})


@dipendenti_router.get("/pdf/scheda/{dipendente_id}")
async def pdf_scheda(dipendente_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    dip = await _db.dipendenti.find_one({"id": dipendente_id, "user_id": user_id}, {"_id": 0})
    if not dip:
        raise HTTPException(status_code=404, detail="Dipendente non trovato")
    pdf_bytes = _pdf_scheda_dipendente(dip)
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=scheda_{dip.get('cognome','')}.pdf"})


@dipendenti_router.get("/pdf/busta/{busta_id}")
async def pdf_busta(busta_id: str, token: Optional[str] = Query(None)):
    user_id = await _user_id_from_token(token)
    busta = await _db.dipendenti_buste_paga.find_one({"id": busta_id, "user_id": user_id}, {"_id": 0})
    if not busta:
        raise HTTPException(status_code=404, detail="Busta paga non trovata")
    dip = await _db.dipendenti.find_one({"id": busta["dipendente_id"], "user_id": user_id}, {"_id": 0}) or {}
    pdf_bytes = _pdf_busta_paga(dip, busta)
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=busta_{busta.get('anno','')}_{busta.get('mese','')}.pdf"})


# ============ EMAIL VIA RESEND ============

class EmailRequest(BaseModel):
    recipients: List[str]
    subject: str
    body_html: str = ""
    pdf_kind: str  # 'lista' | 'scheda' | 'busta'
    pdf_id: Optional[str] = None  # dipendente_id or busta_id (depending on kind)
    filters: Optional[dict] = None  # for 'lista'


@dipendenti_router.post("/email/send")
async def send_email_with_pdf(req: EmailRequest, token: Optional[str] = Query(None)):
    if not os.environ.get("RESEND_API_KEY"):
        raise HTTPException(status_code=500, detail="Resend API key non configurata")
    if not req.recipients:
        raise HTTPException(status_code=400, detail="Nessun destinatario specificato")

    user_id = await _user_id_from_token(token)

    # Build the PDF based on kind
    if req.pdf_kind == "lista":
        filters = req.filters or {}
        rows = await list_dipendenti(token=token, sede=filters.get("sede"), mansione=filters.get("mansione"), stato=filters.get("stato"), q=filters.get("q"))
        pdf_bytes = _pdf_lista_dipendenti(rows)
        filename = "elenco_dipendenti.pdf"
    elif req.pdf_kind == "scheda":
        dip = await _db.dipendenti.find_one({"id": req.pdf_id, "user_id": user_id}, {"_id": 0})
        if not dip:
            raise HTTPException(status_code=404, detail="Dipendente non trovato")
        pdf_bytes = _pdf_scheda_dipendente(dip)
        filename = f"scheda_{dip.get('cognome','')}_{dip.get('nome','')}.pdf"
    elif req.pdf_kind == "busta":
        busta = await _db.dipendenti_buste_paga.find_one({"id": req.pdf_id, "user_id": user_id}, {"_id": 0})
        if not busta:
            raise HTTPException(status_code=404, detail="Busta paga non trovata")
        dip = await _db.dipendenti.find_one({"id": busta["dipendente_id"], "user_id": user_id}, {"_id": 0}) or {}
        pdf_bytes = _pdf_busta_paga(dip, busta)
        filename = f"busta_{dip.get('cognome','')}_{busta.get('anno','')}_{busta.get('mese','')}.pdf"
    else:
        raise HTTPException(status_code=400, detail="Tipo PDF non valido")

    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")

    sender = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
    params = {
        "from": sender,
        "to": req.recipients,
        "subject": req.subject or "Documento dipendenti",
        "html": req.body_html or f"<p>In allegato il documento richiesto.</p>",
        "attachments": [
            {"filename": filename, "content": pdf_b64}
        ],
    }
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"success": True, "email_id": email.get("id"), "recipients": req.recipients}
    except Exception as e:
        logger.error(f"Resend send failed: {e}")
        raise HTTPException(status_code=500, detail=f"Errore invio email: {str(e)}")
