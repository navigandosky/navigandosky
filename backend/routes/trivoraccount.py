"""
Routes per TrivorAccount - Gestione credenziali e account
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import io

import sys
sys.path.insert(0, str(__file__).rsplit('/', 2)[0])

from config import db, GMAIL_USER, GMAIL_APP_PASSWORD, SMTP_SERVER, SMTP_PORT
from auth import verify_trivordoc_credentials

router = APIRouter(prefix="/trivoraccount", tags=["TrivorAccount"])

# =============================================================================
# MODELS
# =============================================================================

class AccountCreate(BaseModel):
    categoria: str
    servizio: str
    link: str = ""
    user: str = ""
    password: str = ""
    otp_attivo: bool = False
    doppia_verifica: bool = False
    tipo_verifica: str = ""  # mail, sms
    dispositivo_verifica: str = ""
    note: str = ""
    user_id: str = ""  # ID utente proprietario

class AccountUpdate(BaseModel):
    categoria: Optional[str] = None
    servizio: Optional[str] = None
    link: Optional[str] = None
    user: Optional[str] = None
    password: Optional[str] = None
    otp_attivo: Optional[bool] = None
    doppia_verifica: Optional[bool] = None
    tipo_verifica: Optional[str] = None
    dispositivo_verifica: Optional[str] = None
    note: Optional[str] = None

class CategoryCreate(BaseModel):
    nome: str

class EmailShareRequest(BaseModel):
    account_ids: List[str]
    recipient_email: str
    subject: Optional[str] = "Credenziali condivise da Trivor"
    message: Optional[str] = ""

# =============================================================================
# HELPERS
# =============================================================================

async def generate_account_id():
    count = await db.trivor_accounts.count_documents({})
    return f"ACC-{str(count + 1).zfill(5)}"

# =============================================================================
# ACCOUNTS CRUD
# =============================================================================

@router.get("/accounts")
async def get_accounts(
    search: Optional[str] = None,
    categoria: Optional[str] = None,
    user_id: Optional[str] = None
):
    """Get all accounts with optional filters (filtered by user_id)"""
    query = {}
    
    # Filter by user_id if provided
    if user_id:
        query["user_id"] = user_id
    
    if search:
        search_query = [
            {"servizio": {"$regex": search, "$options": "i"}},
            {"user": {"$regex": search, "$options": "i"}},
            {"link": {"$regex": search, "$options": "i"}},
            {"note": {"$regex": search, "$options": "i"}},
        ]
        if query:
            query = {"$and": [query, {"$or": search_query}]}
        else:
            query["$or"] = search_query
    
    if categoria and categoria != "all":
        query["categoria"] = categoria
    
    accounts = await db.trivor_accounts.find(query, {"_id": 0}).sort("servizio", 1).to_list(1000)
    return accounts

@router.get("/accounts/{account_id}")
async def get_account(account_id: str, user_id: Optional[str] = None):
    """Get single account"""
    query = {"id": account_id}
    if user_id:
        query["user_id"] = user_id
    account = await db.trivor_accounts.find_one(query, {"_id": 0})
    if not account:
        raise HTTPException(status_code=404, detail="Account non trovato")
    return account

@router.post("/accounts")
async def create_account(account: AccountCreate, username: str = Depends(verify_trivordoc_credentials)):
    """Create new account"""
    account_id = await generate_account_id()
    
    account_data = {
        "id": account_id,
        **account.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.trivor_accounts.insert_one(account_data)
    
    # Add category if new
    if account.categoria:
        await db.trivor_account_categories.update_one(
            {"nome": account.categoria},
            {"$set": {"nome": account.categoria}},
            upsert=True
        )
    
    return {"id": account_id, "message": "Account creato con successo"}

@router.put("/accounts/{account_id}")
async def update_account(account_id: str, account: AccountUpdate, username: str = Depends(verify_trivordoc_credentials)):
    """Update account"""
    update_data = {k: v for k, v in account.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.trivor_accounts.update_one(
        {"id": account_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Account non trovato")
    
    # Add category if new
    if account.categoria:
        await db.trivor_account_categories.update_one(
            {"nome": account.categoria},
            {"$set": {"nome": account.categoria}},
            upsert=True
        )
    
    updated = await db.trivor_accounts.find_one({"id": account_id}, {"_id": 0})
    return updated

@router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, username: str = Depends(verify_trivordoc_credentials)):
    """Delete account"""
    result = await db.trivor_accounts.delete_one({"id": account_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Account non trovato")
    return {"message": "Account eliminato"}

# =============================================================================
# CATEGORIES
# =============================================================================

@router.get("/categories")
async def get_categories(username: str = Depends(verify_trivordoc_credentials)):
    """Get all categories"""
    categories = await db.trivor_account_categories.find({}, {"_id": 0}).sort("nome", 1).to_list(100)
    
    # Add defaults if empty
    defaults = ["Mail", "Servizi Web", "Banca", "Social", "Cloud", "Altro"]
    existing = [c["nome"] for c in categories]
    for d in defaults:
        if d not in existing:
            categories.append({"nome": d})
    
    return sorted(categories, key=lambda x: x["nome"])

@router.post("/categories")
async def create_category(category: CategoryCreate, username: str = Depends(verify_trivordoc_credentials)):
    """Create new category"""
    await db.trivor_account_categories.update_one(
        {"nome": category.nome},
        {"$set": {"nome": category.nome}},
        upsert=True
    )
    return {"message": "Categoria aggiunta"}

@router.delete("/categories/{nome}")
async def delete_category(nome: str, username: str = Depends(verify_trivordoc_credentials)):
    """Delete category"""
    await db.trivor_account_categories.delete_one({"nome": nome})
    return {"message": "Categoria eliminata"}

# =============================================================================
# SHARE VIA EMAIL
# =============================================================================

@router.post("/share/email")
async def share_accounts_email(request: EmailShareRequest, username: str = Depends(verify_trivordoc_credentials)):
    """Share accounts via email"""
    try:
        accounts = await db.trivor_accounts.find(
            {"id": {"$in": request.account_ids}}, 
            {"_id": 0}
        ).to_list(100)
        
        if not accounts:
            raise HTTPException(status_code=404, detail="Nessun account trovato")
        
        msg = MIMEMultipart()
        msg['From'] = GMAIL_USER
        msg['To'] = request.recipient_email
        msg['Subject'] = request.subject
        
        # Build credentials list
        cred_list = []
        for acc in accounts:
            cred_list.append(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 {acc.get('servizio', 'N/A')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏷️ Categoria: {acc.get('categoria', 'N/A')}
🔗 Link: {acc.get('link', 'N/A')}
👤 User: {acc.get('user', 'N/A')}
🔑 Password: {acc.get('password', 'N/A')}
🔐 OTP: {'Sì' if acc.get('otp_attivo') else 'No'}
📱 Doppia Verifica: {'Sì' if acc.get('doppia_verifica') else 'No'}
   Tipo: {acc.get('tipo_verifica', 'N/A')}
   Dispositivo: {acc.get('dispositivo_verifica', 'N/A')}
📝 Note: {acc.get('note', '')}
""")
        
        body = f"""
Gentile Utente,

{request.message if request.message else "Ti sono state condivise le seguenti credenziali:"}

{''.join(cred_list)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ ATTENZIONE: Questo messaggio contiene dati sensibili.
Conservalo in modo sicuro e non condividerlo con altri.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Inviato da TrivorAccount - Trivor SRL
"""
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.send_message(msg)
        
        return {
            "success": True,
            "message": f"Email inviata con successo a {request.recipient_email}",
            "accounts_sent": len(accounts)
        }
        
    except smtplib.SMTPException as e:
        raise HTTPException(status_code=500, detail=f"Errore invio email: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")

# =============================================================================
# EXPORT EXCEL
# =============================================================================

@router.get("/export")
async def export_accounts(
    search: Optional[str] = None,
    categoria: Optional[str] = None,
    username: str = Depends(verify_trivordoc_credentials)
):
    """Export accounts to Excel"""
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    except ImportError:
        raise HTTPException(status_code=500, detail="Libreria openpyxl non installata")
    
    # Get accounts with filters
    query = {}
    if search:
        query["$or"] = [
            {"servizio": {"$regex": search, "$options": "i"}},
            {"user": {"$regex": search, "$options": "i"}},
            {"link": {"$regex": search, "$options": "i"}},
            {"note": {"$regex": search, "$options": "i"}},
        ]
    if categoria and categoria != "all":
        query["categoria"] = categoria
    
    accounts = await db.trivor_accounts.find(query, {"_id": 0}).sort("servizio", 1).to_list(1000)
    
    # Create workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Account"
    
    # Header style
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["ID", "Categoria", "Servizio", "Link", "User", "Password", "OTP", "Doppia Verifica", "Tipo Verifica", "Dispositivo", "Note"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')
        cell.border = thin_border
    
    # Data
    for row, acc in enumerate(accounts, 2):
        ws.cell(row=row, column=1, value=acc.get('id', '')).border = thin_border
        ws.cell(row=row, column=2, value=acc.get('categoria', '')).border = thin_border
        ws.cell(row=row, column=3, value=acc.get('servizio', '')).border = thin_border
        ws.cell(row=row, column=4, value=acc.get('link', '')).border = thin_border
        ws.cell(row=row, column=5, value=acc.get('user', '')).border = thin_border
        ws.cell(row=row, column=6, value=acc.get('password', '')).border = thin_border
        ws.cell(row=row, column=7, value='Sì' if acc.get('otp_attivo') else 'No').border = thin_border
        ws.cell(row=row, column=8, value='Sì' if acc.get('doppia_verifica') else 'No').border = thin_border
        ws.cell(row=row, column=9, value=acc.get('tipo_verifica', '')).border = thin_border
        ws.cell(row=row, column=10, value=acc.get('dispositivo_verifica', '')).border = thin_border
        ws.cell(row=row, column=11, value=acc.get('note', '')).border = thin_border
    
    # Column widths
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 15
    ws.column_dimensions['C'].width = 25
    ws.column_dimensions['D'].width = 35
    ws.column_dimensions['E'].width = 20
    ws.column_dimensions['F'].width = 20
    ws.column_dimensions['G'].width = 8
    ws.column_dimensions['H'].width = 15
    ws.column_dimensions['I'].width = 12
    ws.column_dimensions['J'].width = 20
    ws.column_dimensions['K'].width = 30
    
    # Save to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    filename = f"trivor_accounts_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# =============================================================================
# STATS
# =============================================================================

@router.get("/stats")
async def get_stats(username: str = Depends(verify_trivordoc_credentials)):
    """Get account statistics"""
    total = await db.trivor_accounts.count_documents({})
    
    pipeline = [
        {"$group": {"_id": "$categoria", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    by_category = await db.trivor_accounts.aggregate(pipeline).to_list(20)
    
    with_otp = await db.trivor_accounts.count_documents({"otp_attivo": True})
    with_2fa = await db.trivor_accounts.count_documents({"doppia_verifica": True})
    
    return {
        "total": total,
        "by_category": by_category,
        "with_otp": with_otp,
        "with_2fa": with_2fa
    }
