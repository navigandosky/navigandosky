"""
Routes per TRIVORDOC - Sistema di gestione documentale
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.security import HTTPBasicCredentials
from datetime import datetime, timezone
from typing import Optional, List
from pathlib import Path
import uuid
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import urllib.parse

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import (
    db, UPLOADS_DIR, security,
    TRIVORDOC_USERNAME, TRIVORDOC_PASSWORD, TRIVORDOC_DELETE_PASSWORD,
    GMAIL_USER, GMAIL_APP_PASSWORD, SMTP_SERVER, SMTP_PORT
)
from auth import verify_trivordoc_credentials
from models import (
    DocumentoCreate, DocumentoUpdate, DeleteRequest,
    EmailShareRequest, WhatsAppShareRequest
)

router = APIRouter(prefix="/trivordoc", tags=["TRIVORDOC"])

# =============================================================================
# HELPERS
# =============================================================================

async def generate_doc_id():
    year = datetime.now().year
    count = await db.trivordoc_documents.count_documents({})
    return f"DOC-{year}-{str(count + 1).zfill(4)}"

# =============================================================================
# AUTH
# =============================================================================

@router.post("/login")
async def trivordoc_login(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify TRIVORDOC login"""
    if credentials.username == TRIVORDOC_USERNAME and credentials.password == TRIVORDOC_PASSWORD:
        return {"success": True, "message": "Login effettuato"}
    raise HTTPException(status_code=401, detail="Credenziali non valide")

# =============================================================================
# DOCUMENTS CRUD
# =============================================================================

@router.get("/documents")
async def get_documents(
    search: Optional[str] = None,
    categoria: Optional[str] = None,
    tipo: Optional[str] = None,
    autore: Optional[str] = None,
    progetto: Optional[str] = None,
    data_da: Optional[str] = None,
    data_a: Optional[str] = None,
    keyword: Optional[str] = None,
    username: str = Depends(verify_trivordoc_credentials)
):
    """Get all documents with advanced filtering"""
    query = {}
    
    if search:
        query["$or"] = [
            {"gruppo": {"$regex": search, "$options": "i"}},
            {"descrizione": {"$regex": search, "$options": "i"}},
            {"autore": {"$regex": search, "$options": "i"}},
            {"keywords": {"$regex": search, "$options": "i"}},
            {"progetto.cliente": {"$regex": search, "$options": "i"}},
            {"progetto.descrizione": {"$regex": search, "$options": "i"}},
            {"allegati.nome": {"$regex": search, "$options": "i"}},
        ]
    
    if categoria and categoria != "all":
        query["categoria"] = categoria
    
    if tipo and tipo != "all":
        query["tipo_documento"] = tipo
    
    if autore:
        query["autore"] = {"$regex": autore, "$options": "i"}
    
    if progetto:
        query["progetto.cliente"] = {"$regex": progetto, "$options": "i"}
    
    if keyword:
        query["keywords"] = {"$in": [keyword]}
    
    if data_da:
        query["data_creazione"] = {"$gte": data_da}
    
    if data_a:
        if "data_creazione" in query:
            query["data_creazione"]["$lte"] = data_a
        else:
            query["data_creazione"] = {"$lte": data_a}
    
    documents = await db.trivordoc_documents.find(query, {"_id": 0}).sort("data_caricamento", -1).to_list(1000)
    return documents

@router.get("/documents/{doc_id}")
async def get_document(doc_id: str, username: str = Depends(verify_trivordoc_credentials)):
    """Get single document by ID"""
    doc = await db.trivordoc_documents.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    return doc

@router.post("/documents")
async def create_document(documento: DocumentoCreate, username: str = Depends(verify_trivordoc_credentials)):
    """Create a new document"""
    doc_id = await generate_doc_id()
    
    doc_data = {
        "id": doc_id,
        **documento.model_dump(),
        "allegati": [],
        "data_caricamento": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.trivordoc_documents.insert_one(doc_data)
    
    await db.trivordoc_logs.insert_one({
        "action": "CREATE",
        "doc_id": doc_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Documento {doc_id} creato"
    })
    
    if documento.categoria:
        await db.trivordoc_categories.update_one(
            {"name": documento.categoria},
            {"$set": {"name": documento.categoria}},
            upsert=True
        )
    
    return {"id": doc_id, "message": "Documento creato con successo"}

@router.put("/documents/{doc_id}")
async def update_document(doc_id: str, documento: DocumentoUpdate, username: str = Depends(verify_trivordoc_credentials)):
    """Update a document"""
    update_data = {k: v for k, v in documento.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.trivordoc_documents.update_one(
        {"id": doc_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    await db.trivordoc_logs.insert_one({
        "action": "UPDATE",
        "doc_id": doc_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Documento {doc_id} aggiornato"
    })
    
    if documento.categoria:
        await db.trivordoc_categories.update_one(
            {"name": documento.categoria},
            {"$set": {"name": documento.categoria}},
            upsert=True
        )
    
    updated = await db.trivordoc_documents.find_one({"id": doc_id}, {"_id": 0})
    return updated

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, request: DeleteRequest, username: str = Depends(verify_trivordoc_credentials)):
    """Delete a document (requires deletion password)"""
    if request.password != TRIVORDOC_DELETE_PASSWORD:
        raise HTTPException(status_code=403, detail="Password di eliminazione non corretta")
    
    doc = await db.trivordoc_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    for allegato in doc.get("allegati", []):
        file_path = UPLOADS_DIR / allegato["url"].split("/uploads/")[-1]
        if file_path.exists():
            file_path.unlink()
    
    await db.trivordoc_documents.delete_one({"id": doc_id})
    
    await db.trivordoc_logs.insert_one({
        "action": "DELETE",
        "doc_id": doc_id,
        "user": username,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": f"Documento {doc_id} eliminato"
    })
    
    return {"message": "Documento eliminato con successo"}

# =============================================================================
# ATTACHMENTS
# =============================================================================

@router.post("/documents/{doc_id}/upload")
async def upload_attachment(
    doc_id: str,
    file: UploadFile = File(...),
    username: str = Depends(verify_trivordoc_credentials)
):
    """Upload an attachment to a document (max 20)"""
    doc = await db.trivordoc_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    if len(doc.get("allegati", [])) >= 20:
        raise HTTPException(status_code=400, detail="Massimo 20 allegati per documento")
    
    file_ext = Path(file.filename).suffix.lower()
    file_id = str(uuid.uuid4())[:8]
    filename = f"trivordoc_{doc_id}_{file_id}{file_ext}"
    file_path = UPLOADS_DIR / filename
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    tipo_map = {
        ".pdf": "pdf",
        ".doc": "word", ".docx": "word",
        ".xls": "excel", ".xlsx": "excel",
        ".png": "immagine", ".jpg": "immagine", ".jpeg": "immagine", ".gif": "immagine",
        ".txt": "testo",
    }
    tipo = tipo_map.get(file_ext, "altro")
    
    allegato = {
        "nome": file.filename,
        "url": f"/api/uploads/{filename}",
        "tipo": tipo,
        "size": len(content)
    }
    
    await db.trivordoc_documents.update_one(
        {"id": doc_id},
        {
            "$push": {"allegati": allegato},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Allegato caricato", "allegato": allegato}

@router.delete("/documents/{doc_id}/attachments/{filename}")
async def delete_attachment(doc_id: str, filename: str, username: str = Depends(verify_trivordoc_credentials)):
    """Delete an attachment from a document"""
    doc = await db.trivordoc_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Documento non trovato")
    
    await db.trivordoc_documents.update_one(
        {"id": doc_id},
        {
            "$pull": {"allegati": {"nome": filename}},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Allegato rimosso"}

# =============================================================================
# CATEGORIES, KEYWORDS, AUTHORS
# =============================================================================

@router.get("/categories")
async def get_categories(username: str = Depends(verify_trivordoc_credentials)):
    """Get all categories"""
    categories = await db.trivordoc_categories.find({}, {"_id": 0}).to_list(100)
    defaults = ["Lettere", "Preventivi", "Ordini", "Fatture", "Contratti", "Progetti", "Altro"]
    existing = [c["name"] for c in categories]
    for d in defaults:
        if d not in existing:
            categories.append({"name": d})
    return categories

@router.post("/categories")
async def add_category(name: str, username: str = Depends(verify_trivordoc_credentials)):
    """Add a new category"""
    await db.trivordoc_categories.update_one(
        {"name": name},
        {"$set": {"name": name}},
        upsert=True
    )
    return {"message": "Categoria aggiunta"}

@router.get("/keywords")
async def get_keywords(username: str = Depends(verify_trivordoc_credentials)):
    """Get all unique keywords for autocomplete"""
    pipeline = [
        {"$unwind": "$keywords"},
        {"$group": {"_id": "$keywords"}},
        {"$sort": {"_id": 1}}
    ]
    keywords = await db.trivordoc_documents.aggregate(pipeline).to_list(500)
    return [k["_id"] for k in keywords]

@router.get("/authors")
async def get_authors(username: str = Depends(verify_trivordoc_credentials)):
    """Get all unique authors for autocomplete"""
    pipeline = [
        {"$group": {"_id": "$autore"}},
        {"$match": {"_id": {"$ne": None, "$ne": ""}}},
        {"$sort": {"_id": 1}}
    ]
    authors = await db.trivordoc_documents.aggregate(pipeline).to_list(100)
    return [a["_id"] for a in authors]

# =============================================================================
# STATISTICS & LOGS
# =============================================================================

@router.get("/stats")
async def get_stats(username: str = Depends(verify_trivordoc_credentials)):
    """Get dashboard statistics"""
    total_docs = await db.trivordoc_documents.count_documents({})
    
    pipeline_cat = [
        {"$group": {"_id": "$categoria", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_category = await db.trivordoc_documents.aggregate(pipeline_cat).to_list(20)
    
    pipeline_type = [
        {"$group": {"_id": "$tipo_documento", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_type = await db.trivordoc_documents.aggregate(pipeline_type).to_list(20)
    
    pipeline_keywords = [
        {"$unwind": "$keywords"},
        {"$group": {"_id": "$keywords", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20}
    ]
    top_keywords = await db.trivordoc_documents.aggregate(pipeline_keywords).to_list(20)
    
    recent = await db.trivordoc_documents.find({}, {"_id": 0}).sort("data_caricamento", -1).limit(5).to_list(5)
    
    pipeline_clients = [
        {"$match": {"progetto.cliente": {"$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$progetto.cliente", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_clients = await db.trivordoc_documents.aggregate(pipeline_clients).to_list(10)
    
    return {
        "total_documents": total_docs,
        "by_category": by_category,
        "by_type": by_type,
        "top_keywords": top_keywords,
        "recent_documents": recent,
        "top_clients": top_clients
    }

@router.get("/logs")
async def get_logs(limit: int = 50, username: str = Depends(verify_trivordoc_credentials)):
    """Get recent activity logs"""
    logs = await db.trivordoc_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs

# =============================================================================
# SHARING
# =============================================================================

@router.post("/share/email")
async def share_documents_email(request: EmailShareRequest, username: str = Depends(verify_trivordoc_credentials)):
    """Share one or more documents via email"""
    try:
        documents = await db.trivordoc_documents.find(
            {"id": {"$in": request.document_ids}}, 
            {"_id": 0}
        ).to_list(100)
        
        if not documents:
            raise HTTPException(status_code=404, detail="Nessun documento trovato")
        
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = request.recipient_email
        msg['Subject'] = request.subject
        
        doc_list = "\n".join([f"• {d['id']} - {d.get('tipo_documento', 'N/A')} ({d.get('categoria', 'N/A')})" for d in documents])
        body = f"""
Gentile Utente,

{request.message if request.message else "Ti sono stati condivisi i seguenti documenti:"}

{doc_list}

---
Questa email è stata inviata automaticamente da TrivorDOC.
Trivor SRL
"""
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        for doc in documents:
            if doc.get('allegati'):
                for allegato in doc['allegati']:
                    file_url = allegato.get('url', '')
                    if file_url:
                        filename = file_url.split('/')[-1]
                        file_path = UPLOADS_DIR / filename
                        
                        if file_path.exists():
                            with open(file_path, 'rb') as f:
                                part = MIMEBase('application', 'octet-stream')
                                part.set_payload(f.read())
                                encoders.encode_base64(part)
                                part.add_header(
                                    'Content-Disposition',
                                    f'attachment; filename="{allegato.get("nome", filename)}"'
                                )
                                msg.attach(part)
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        
        await db.trivordoc_logs.insert_one({
            "action": "SHARE_EMAIL",
            "document_ids": request.document_ids,
            "recipient": request.recipient_email,
            "user": username,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "message": f"Email inviata con successo a {request.recipient_email}",
            "documents_sent": len(documents)
        }
        
    except smtplib.SMTPException as e:
        raise HTTPException(status_code=500, detail=f"Errore invio email: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")

@router.post("/share/whatsapp")
async def share_documents_whatsapp(request: WhatsAppShareRequest, username: str = Depends(verify_trivordoc_credentials)):
    """Generate WhatsApp share link for documents"""
    try:
        documents = await db.trivordoc_documents.find(
            {"id": {"$in": request.document_ids}}, 
            {"_id": 0}
        ).to_list(100)
        
        if not documents:
            raise HTTPException(status_code=404, detail="Nessun documento trovato")
        
        doc_list = "\n".join([f"📄 {d['id']} - {d.get('tipo_documento', 'N/A')}" for d in documents])
        
        message = f"""
{request.message if request.message else "Ti condivido i seguenti documenti:"}

{doc_list}

---
Inviato da TrivorDOC - Trivor SRL
"""
        
        phone = request.phone_number.replace(" ", "").replace("-", "").replace("+", "")
        if not phone.startswith("39") and len(phone) == 10:
            phone = "39" + phone
        
        whatsapp_url = f"https://wa.me/{phone}?text={urllib.parse.quote(message)}"
        
        await db.trivordoc_logs.insert_one({
            "action": "SHARE_WHATSAPP",
            "document_ids": request.document_ids,
            "phone": request.phone_number,
            "user": username,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "whatsapp_url": whatsapp_url,
            "message": "Link WhatsApp generato con successo"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")

# =============================================================================
# PREVIEW
# =============================================================================

@router.get("/preview/{doc_id}/{attachment_index}")
async def preview_document_attachment(doc_id: str, attachment_index: int, username: str = Depends(verify_trivordoc_credentials)):
    """Get file for preview/download"""
    try:
        document = await db.trivordoc_documents.find_one({"id": doc_id}, {"_id": 0})
        
        if not document:
            raise HTTPException(status_code=404, detail="Documento non trovato")
        
        allegati = document.get('allegati', [])
        if attachment_index < 0 or attachment_index >= len(allegati):
            raise HTTPException(status_code=404, detail="Allegato non trovato")
        
        allegato = allegati[attachment_index]
        file_url = allegato.get('url', '')
        filename = file_url.split('/')[-1]
        file_path = UPLOADS_DIR / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="File non trovato")
        
        extension = file_path.suffix.lower()
        media_types = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.txt': 'text/plain',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
        media_type = media_types.get(extension, 'application/octet-stream')
        
        return FileResponse(
            path=str(file_path),
            media_type=media_type,
            filename=allegato.get('nome', filename)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")
