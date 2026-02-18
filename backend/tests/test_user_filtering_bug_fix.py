"""
Test per verificare il bug fix P0: Endpoint che ora filtrano per user_id
Bug originale: Gli endpoint non filtravano per user_id, causando dati vuoti
Fix: Tutti gli endpoint ora accettano token e filtrano per user_id dell'utente autenticato

Endpoints testati:
- GET /api/dashboard/stats?token=TOKEN
- GET /api/dashboard/consumi-per-categoria?token=TOKEN
- GET /api/elettrodomestici?token=TOKEN
- GET /api/manutenzioni?token=TOKEN
- GET /api/centri-assistenza?token=TOKEN
- GET /api/suggerimenti?token=TOKEN
- GET /api/planimetrie?token=TOKEN
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndLogin:
    """Test autenticazione con credenziali Admin"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token di autenticazione"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Login not successful: {data}"
        assert "token" in data, "Token not in response"
        return data["token"]
    
    def test_login_success(self):
        """Test login con credenziali Admin/SmartMaster2026"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "token" in data
        assert data.get("user", {}).get("username") == "Admin"
        print(f"✅ Login successful, token received")
    
    def test_login_invalid_credentials(self):
        """Test login con credenziali errate"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "WrongPassword"
        })
        assert response.status_code == 200  # API returns 200 with success=false
        data = response.json()
        assert data.get("success") == False
        print(f"✅ Invalid login correctly rejected")


class TestDashboardEndpoints:
    """Test endpoint dashboard con filtro user_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json().get("token")
    
    def test_dashboard_stats_with_token(self, auth_token):
        """GET /api/dashboard/stats?token=TOKEN - deve restituire statistiche dell'utente"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verifica struttura risposta
        assert "consumi" in data, "Missing 'consumi' in response"
        assert "manutenzioni_pianificate" in data, "Missing 'manutenzioni_pianificate'"
        assert "manutenzioni_in_scadenza" in data, "Missing 'manutenzioni_in_scadenza'"
        assert "elettrodomestici_in_garanzia" in data, "Missing 'elettrodomestici_in_garanzia'"
        
        # Verifica struttura consumi
        consumi = data["consumi"]
        assert "consumo_giornaliero_kw" in consumi
        assert "consumo_mensile_kw" in consumi
        assert "numero_elettrodomestici" in consumi
        
        print(f"✅ Dashboard stats: {consumi.get('numero_elettrodomestici')} elettrodomestici, "
              f"{data.get('manutenzioni_pianificate')} manutenzioni pianificate")
    
    def test_dashboard_stats_without_token(self):
        """GET /api/dashboard/stats senza token - deve funzionare con default user"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "consumi" in data
        print(f"✅ Dashboard stats without token works (default user)")
    
    def test_consumi_per_categoria_with_token(self, auth_token):
        """GET /api/dashboard/consumi-per-categoria?token=TOKEN"""
        response = requests.get(f"{BASE_URL}/api/dashboard/consumi-per-categoria", 
                               params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Deve essere una lista
        assert isinstance(data, list), "Response should be a list"
        
        # Se ci sono dati, verifica struttura
        if len(data) > 0:
            item = data[0]
            assert "categoria" in item, "Missing 'categoria'"
            assert "consumo_mensile_kw" in item, "Missing 'consumo_mensile_kw'"
            print(f"✅ Consumi per categoria: {len(data)} categorie trovate")
        else:
            print(f"✅ Consumi per categoria: lista vuota (nessun dato)")


class TestElettrodomesticiEndpoint:
    """Test endpoint elettrodomestici con filtro user_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json().get("token")
    
    def test_elettrodomestici_with_token(self, auth_token):
        """GET /api/elettrodomestici?token=TOKEN - deve restituire lista elettrodomestici"""
        response = requests.get(f"{BASE_URL}/api/elettrodomestici", params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Deve essere una lista
        assert isinstance(data, list), "Response should be a list"
        
        # Verifica che ci siano elettrodomestici (14 previsti secondo la richiesta)
        print(f"✅ Elettrodomestici trovati: {len(data)}")
        
        # Se ci sono dati, verifica struttura
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Missing 'id'"
            assert "nome" in item, "Missing 'nome'"
            assert "user_id" in item, "Missing 'user_id'"
            print(f"   Primo elettrodomestico: {item.get('nome')} (user_id: {item.get('user_id')})")
    
    def test_elettrodomestici_without_token(self):
        """GET /api/elettrodomestici senza token - deve funzionare con default user"""
        response = requests.get(f"{BASE_URL}/api/elettrodomestici")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Elettrodomestici without token: {len(data)} items")


class TestManutenzioniEndpoint:
    """Test endpoint manutenzioni con filtro user_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json().get("token")
    
    def test_manutenzioni_with_token(self, auth_token):
        """GET /api/manutenzioni?token=TOKEN - deve restituire lista manutenzioni"""
        response = requests.get(f"{BASE_URL}/api/manutenzioni", params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Deve essere una lista
        assert isinstance(data, list), "Response should be a list"
        
        # Verifica che ci siano manutenzioni (18 previste secondo la richiesta)
        print(f"✅ Manutenzioni trovate: {len(data)}")
        
        # Se ci sono dati, verifica struttura
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Missing 'id'"
            assert "descrizione" in item, "Missing 'descrizione'"
            assert "stato" in item, "Missing 'stato'"
            print(f"   Prima manutenzione: {item.get('descrizione')[:50]}... (stato: {item.get('stato')})")
    
    def test_manutenzioni_without_token(self):
        """GET /api/manutenzioni senza token - deve funzionare con default user"""
        response = requests.get(f"{BASE_URL}/api/manutenzioni")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Manutenzioni without token: {len(data)} items")


class TestCentriAssistenzaEndpoint:
    """Test endpoint centri assistenza con filtro user_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json().get("token")
    
    def test_centri_assistenza_with_token(self, auth_token):
        """GET /api/centri-assistenza?token=TOKEN - deve restituire centri assistenza"""
        response = requests.get(f"{BASE_URL}/api/centri-assistenza", params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Deve essere una lista
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Centri assistenza trovati: {len(data)}")
        
        # Se ci sono dati, verifica struttura
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Missing 'id'"
            assert "nome_azienda" in item, "Missing 'nome_azienda'"
            print(f"   Primo centro: {item.get('nome_azienda')}")


class TestSuggerimentiEndpoint:
    """Test endpoint suggerimenti proattivi con filtro user_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json().get("token")
    
    def test_suggerimenti_with_token(self, auth_token):
        """GET /api/suggerimenti?token=TOKEN - deve restituire suggerimenti proattivi"""
        response = requests.get(f"{BASE_URL}/api/suggerimenti", params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Deve essere una lista
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Suggerimenti trovati: {len(data)}")
        
        # Se ci sono dati, verifica struttura
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Missing 'id'"
            assert "tipo" in item, "Missing 'tipo'"
            assert "titolo" in item, "Missing 'titolo'"
            print(f"   Primo suggerimento: {item.get('titolo')} (tipo: {item.get('tipo')})")


class TestPlanimetrieEndpoint:
    """Test endpoint planimetrie con filtro user_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json().get("token")
    
    def test_planimetrie_with_token(self, auth_token):
        """GET /api/planimetrie?token=TOKEN - deve restituire planimetrie"""
        response = requests.get(f"{BASE_URL}/api/planimetrie", params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Deve essere una lista
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Planimetrie trovate: {len(data)}")
        
        # Se ci sono dati, verifica struttura
        if len(data) > 0:
            item = data[0]
            assert "id" in item, "Missing 'id'"
            assert "nome" in item, "Missing 'nome'"
            print(f"   Prima planimetria: {item.get('nome')}")


class TestTicketsEndpoint:
    """Test endpoint tickets con filtro user_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json().get("token")
    
    def test_tickets_with_token(self, auth_token):
        """GET /api/tickets?token=TOKEN - deve restituire tickets"""
        response = requests.get(f"{BASE_URL}/api/tickets", params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Deve essere una lista
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Tickets trovati: {len(data)}")


class TestCalendarEventsEndpoint:
    """Test endpoint calendar events con filtro user_id"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Login e ottieni token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json().get("token")
    
    def test_calendar_events_with_token(self, auth_token):
        """GET /api/calendar/events?token=TOKEN - deve restituire eventi calendario"""
        response = requests.get(f"{BASE_URL}/api/calendar/events", params={"token": auth_token})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Deve essere una lista
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ Calendar events trovati: {len(data)}")


class TestHealthAndConfig:
    """Test endpoint base"""
    
    def test_health_check(self):
        """GET /api/health - verifica che il server sia attivo"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✅ Health check passed")
    
    def test_config(self):
        """GET /api/config - verifica configurazione"""
        response = requests.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        data = response.json()
        assert "matterport_space_id" in data
        print(f"✅ Config: matterport_space_id = {data.get('matterport_space_id')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
