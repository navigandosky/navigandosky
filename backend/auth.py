"""
Funzioni di autenticazione per Trivor
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasicCredentials
import secrets
from config import security, ADMIN_USERNAME, ADMIN_PASSWORD, TRIVORDOC_USERNAME, TRIVORDOC_PASSWORD

def verify_admin_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verifica credenziali admin per CMS pubblico"""
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali non valide",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

def verify_trivordoc_credentials(credentials: HTTPBasicCredentials = Depends(security)):
    """Verifica credenziali per TrivorSuite (TRIVORDOC, TrivorWEB, etc.)"""
    correct_username = secrets.compare_digest(credentials.username, TRIVORDOC_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, TRIVORDOC_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenziali TRIVORDOC non valide",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
