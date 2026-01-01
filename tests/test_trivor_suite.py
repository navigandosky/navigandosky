"""
Trivor Suite Backend API Tests
Tests for: Contacts API, Groups API, and basic health checks
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://appportal-2.preview.emergentagent.com')

# Test credentials for TrivorSuite
TEST_USERNAME = "Trivor_doc"
TEST_PASSWORD = "Doc_trivor$"

@pytest.fixture
def auth_header():
    """Get authentication header for API calls"""
    import base64
    credentials = base64.b64encode(f"{TEST_USERNAME}:{TEST_PASSWORD}".encode()).decode()
    return {"Authorization": f"Basic {credentials}"}

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestHealthEndpoints:
    """Basic health check tests"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "message" in data
        print(f"✓ API root: {data}")
    
    def test_health_check(self, api_client):
        """Test health endpoint"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check: {data}")


class TestTrivorDocLogin:
    """Test TrivorDoc/Suite authentication"""
    
    def test_login_success(self, api_client, auth_header):
        """Test successful login"""
        response = api_client.post(f"{BASE_URL}/api/trivordoc/login", headers=auth_header)
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Login successful: {data}")
    
    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        import base64
        bad_creds = base64.b64encode(b"wrong:wrong").decode()
        response = api_client.post(
            f"{BASE_URL}/api/trivordoc/login", 
            headers={"Authorization": f"Basic {bad_creds}"}
        )
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")


class TestContactsAPI:
    """Test Contacts CRUD operations"""
    
    def test_get_contacts_list(self, api_client, auth_header):
        """Test getting contacts list"""
        response = api_client.get(f"{BASE_URL}/api/contacts", headers=auth_header)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get contacts: {len(data)} contacts found")
    
    def test_create_contact(self, api_client, auth_header):
        """Test creating a new contact"""
        contact_data = {
            "nome": "TEST_Mario",
            "cognome": "Rossi",
            "email": "test_mario.rossi@example.com",
            "telefono": "+39 333 1234567",
            "whatsapp": "+39 333 1234567",
            "azienda": "Test Company SRL",
            "ruolo": "Developer",
            "note": "Test contact created by automated tests",
            "gruppi": [],
            "preferito": False
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_header,
            json=contact_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("message") == "Contatto creato con successo"
        print(f"✓ Contact created: {data['id']}")
        
        # Store ID for cleanup
        return data["id"]
    
    def test_create_and_get_contact(self, api_client, auth_header):
        """Test creating a contact and verifying it persists"""
        # Create contact
        contact_data = {
            "nome": "TEST_Luigi",
            "cognome": "Verdi",
            "email": "test_luigi.verdi@example.com",
            "telefono": "+39 333 9876543",
            "azienda": "Verdi Corp",
            "preferito": True
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_header,
            json=contact_data
        )
        assert create_response.status_code == 200
        contact_id = create_response.json()["id"]
        
        # Verify by GET
        get_response = api_client.get(
            f"{BASE_URL}/api/contacts/{contact_id}",
            headers=auth_header
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["nome"] == "TEST_Luigi"
        assert fetched["cognome"] == "Verdi"
        assert fetched["email"] == "test_luigi.verdi@example.com"
        assert fetched["preferito"] == True
        print(f"✓ Contact created and verified: {contact_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=auth_header)
    
    def test_update_contact(self, api_client, auth_header):
        """Test updating a contact"""
        # First create a contact
        contact_data = {
            "nome": "TEST_Update",
            "cognome": "Test",
            "email": "test_update@example.com"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_header,
            json=contact_data
        )
        contact_id = create_response.json()["id"]
        
        # Update the contact
        update_data = {
            "cognome": "Updated",
            "azienda": "New Company"
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/contacts/{contact_id}",
            headers=auth_header,
            json=update_data
        )
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["cognome"] == "Updated"
        assert updated["azienda"] == "New Company"
        print(f"✓ Contact updated: {contact_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=auth_header)
    
    def test_toggle_preferito(self, api_client, auth_header):
        """Test toggling contact as favorite"""
        # Create contact
        contact_data = {
            "nome": "TEST_Preferito",
            "cognome": "Test",
            "preferito": False
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_header,
            json=contact_data
        )
        contact_id = create_response.json()["id"]
        
        # Toggle preferito
        toggle_response = api_client.post(
            f"{BASE_URL}/api/contacts/{contact_id}/toggle-preferito",
            headers=auth_header
        )
        assert toggle_response.status_code == 200
        data = toggle_response.json()
        assert data["preferito"] == True
        print(f"✓ Contact preferito toggled: {contact_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/contacts/{contact_id}", headers=auth_header)
    
    def test_delete_contact(self, api_client, auth_header):
        """Test deleting a contact"""
        # Create contact
        contact_data = {
            "nome": "TEST_Delete",
            "cognome": "Me"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/contacts",
            headers=auth_header,
            json=contact_data
        )
        contact_id = create_response.json()["id"]
        
        # Delete
        delete_response = api_client.delete(
            f"{BASE_URL}/api/contacts/{contact_id}",
            headers=auth_header
        )
        assert delete_response.status_code == 200
        
        # Verify deleted
        get_response = api_client.get(
            f"{BASE_URL}/api/contacts/{contact_id}",
            headers=auth_header
        )
        assert get_response.status_code == 404
        print(f"✓ Contact deleted and verified: {contact_id}")


class TestGroupsAPI:
    """Test Contact Groups CRUD operations"""
    
    def test_get_groups_list(self, api_client, auth_header):
        """Test getting groups list"""
        response = api_client.get(f"{BASE_URL}/api/contacts/groups/list", headers=auth_header)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get groups: {len(data)} groups found")
    
    def test_create_group(self, api_client, auth_header):
        """Test creating a new group"""
        group_data = {
            "nome": "TEST_Clienti",
            "descrizione": "Test group for clients",
            "colore": "#EF4444"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/contacts/groups",
            headers=auth_header,
            json=group_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        print(f"✓ Group created: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/contacts/groups/{data['id']}", headers=auth_header)
    
    def test_update_group(self, api_client, auth_header):
        """Test updating a group"""
        # Create group
        group_data = {
            "nome": "TEST_UpdateGroup",
            "colore": "#3B82F6"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/contacts/groups",
            headers=auth_header,
            json=group_data
        )
        group_id = create_response.json()["id"]
        
        # Update
        update_data = {
            "nome": "TEST_UpdatedGroup",
            "colore": "#22C55E"
        }
        
        update_response = api_client.put(
            f"{BASE_URL}/api/contacts/groups/{group_id}",
            headers=auth_header,
            json=update_data
        )
        assert update_response.status_code == 200
        # API returns message, not the updated object
        updated = update_response.json()
        assert "message" in updated or "Gruppo" in str(updated)
        print(f"✓ Group updated: {group_id}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/contacts/groups/{group_id}", headers=auth_header)


class TestContactsStats:
    """Test contacts statistics endpoint"""
    
    def test_get_stats(self, api_client, auth_header):
        """Test getting contacts statistics"""
        response = api_client.get(f"{BASE_URL}/api/contacts/stats/summary", headers=auth_header)
        assert response.status_code == 200
        data = response.json()
        assert "totale_contatti" in data
        assert "preferiti" in data
        assert "gruppi" in data
        print(f"✓ Stats: {data}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_contacts(self, api_client, auth_header):
        """Remove all TEST_ prefixed contacts"""
        # Get all contacts
        response = api_client.get(f"{BASE_URL}/api/contacts", headers=auth_header)
        contacts = response.json()
        
        deleted_count = 0
        for contact in contacts:
            if contact.get("nome", "").startswith("TEST_"):
                api_client.delete(
                    f"{BASE_URL}/api/contacts/{contact['id']}",
                    headers=auth_header
                )
                deleted_count += 1
        
        print(f"✓ Cleanup: {deleted_count} test contacts deleted")
    
    def test_cleanup_test_groups(self, api_client, auth_header):
        """Remove all TEST_ prefixed groups"""
        response = api_client.get(f"{BASE_URL}/api/contacts/groups/list", headers=auth_header)
        groups = response.json()
        
        deleted_count = 0
        for group in groups:
            if group.get("nome", "").startswith("TEST_"):
                api_client.delete(
                    f"{BASE_URL}/api/contacts/groups/{group['id']}",
                    headers=auth_header
                )
                deleted_count += 1
        
        print(f"✓ Cleanup: {deleted_count} test groups deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
