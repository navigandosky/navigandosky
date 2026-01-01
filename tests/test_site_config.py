"""
Test suite for Site Configuration module (Configurazione Sito)
Tests GET and PUT endpoints for site configuration data
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for authenticated requests
ADMIN_USERNAME = "Trivor"
ADMIN_PASSWORD = "Trivor2024$"

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def auth_header():
    """Get authentication header for admin requests"""
    credentials = f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded}"}

@pytest.fixture
def authenticated_client(api_client, auth_header):
    """Session with auth header"""
    api_client.headers.update(auth_header)
    return api_client


class TestSiteConfigGET:
    """Test GET /api/site-config endpoint (public)"""
    
    def test_get_site_config_returns_200(self, api_client):
        """GET /api/site-config should return 200"""
        response = api_client.get(f"{BASE_URL}/api/site-config")
        assert response.status_code == 200
        print(f"✓ GET /api/site-config returns 200")
    
    def test_get_site_config_returns_required_fields(self, api_client):
        """GET /api/site-config should return all required fields"""
        response = api_client.get(f"{BASE_URL}/api/site-config")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify company data fields
        assert "nome_azienda" in data
        assert "ragione_sociale" in data
        assert "partita_iva" in data
        assert "slogan" in data
        assert "logo_url" in data
        print(f"✓ Company data fields present: nome_azienda={data.get('nome_azienda')}")
        
        # Verify contact fields
        assert "email" in data
        assert "email_pec" in data
        assert "telefono_1" in data
        assert "whatsapp" in data
        print(f"✓ Contact fields present: email={data.get('email')}")
        
        # Verify address fields
        assert "indirizzo" in data
        assert "citta" in data
        assert "provincia" in data
        assert "cap" in data
        assert "paese" in data
        print(f"✓ Address fields present: paese={data.get('paese')}")
        
        # Verify social media fields
        assert "facebook_url" in data
        assert "instagram_url" in data
        assert "linkedin_url" in data
        print(f"✓ Social media fields present")
        
        # Verify link_progetti
        assert "link_progetti" in data
        assert isinstance(data["link_progetti"], list)
        print(f"✓ link_progetti is a list with {len(data['link_progetti'])} items")
    
    def test_get_site_config_default_values(self, api_client):
        """GET /api/site-config should return sensible default values"""
        response = api_client.get(f"{BASE_URL}/api/site-config")
        data = response.json()
        
        # Check that default values are set
        assert data.get("nome_azienda") is not None
        assert len(data.get("nome_azienda", "")) > 0
        print(f"✓ nome_azienda has value: {data.get('nome_azienda')}")
        
        assert data.get("partita_iva") is not None
        print(f"✓ partita_iva has value: {data.get('partita_iva')}")


class TestSiteConfigPUT:
    """Test PUT /api/site-config endpoint (admin only)"""
    
    def test_put_site_config_without_auth_returns_401(self, api_client):
        """PUT /api/site-config without auth should return 401"""
        response = api_client.put(f"{BASE_URL}/api/site-config", json={
            "nome_azienda": "Test Company"
        })
        assert response.status_code == 401
        print(f"✓ PUT without auth returns 401")
    
    def test_put_site_config_with_auth_returns_200(self, authenticated_client):
        """PUT /api/site-config with auth should return 200"""
        # First get current config
        get_response = authenticated_client.get(f"{BASE_URL}/api/site-config")
        original_data = get_response.json()
        original_slogan = original_data.get("slogan")
        
        # Update with test value
        test_slogan = "TEST_SLOGAN_" + str(os.urandom(4).hex())
        response = authenticated_client.put(f"{BASE_URL}/api/site-config", json={
            "slogan": test_slogan
        })
        assert response.status_code == 200
        
        # Verify response contains updated value
        data = response.json()
        assert data.get("slogan") == test_slogan
        print(f"✓ PUT with auth returns 200 and updates slogan")
        
        # Restore original value
        authenticated_client.put(f"{BASE_URL}/api/site-config", json={
            "slogan": original_slogan
        })
        print(f"✓ Restored original slogan value")
    
    def test_put_site_config_updates_company_data(self, authenticated_client):
        """PUT /api/site-config should update company data fields"""
        # Get original values
        get_response = authenticated_client.get(f"{BASE_URL}/api/site-config")
        original = get_response.json()
        
        # Update company data
        test_data = {
            "nome_azienda": "TEST_Trivor_Company",
            "ragione_sociale": "TEST_Trivor SRL",
            "codice_fiscale": "TEST_CF12345678"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/site-config", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("nome_azienda") == test_data["nome_azienda"]
        assert data.get("ragione_sociale") == test_data["ragione_sociale"]
        assert data.get("codice_fiscale") == test_data["codice_fiscale"]
        print(f"✓ Company data updated successfully")
        
        # Verify persistence with GET
        verify_response = authenticated_client.get(f"{BASE_URL}/api/site-config")
        verify_data = verify_response.json()
        assert verify_data.get("nome_azienda") == test_data["nome_azienda"]
        print(f"✓ Company data persisted in database")
        
        # Restore original values
        authenticated_client.put(f"{BASE_URL}/api/site-config", json={
            "nome_azienda": original.get("nome_azienda"),
            "ragione_sociale": original.get("ragione_sociale"),
            "codice_fiscale": original.get("codice_fiscale")
        })
        print(f"✓ Restored original company data")
    
    def test_put_site_config_updates_contacts(self, authenticated_client):
        """PUT /api/site-config should update contact fields"""
        # Get original values
        get_response = authenticated_client.get(f"{BASE_URL}/api/site-config")
        original = get_response.json()
        
        # Update contacts
        test_data = {
            "email": "test@trivor.it",
            "telefono_1": "+39 123 456 7890",
            "whatsapp": "+39123456789"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/site-config", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("email") == test_data["email"]
        assert data.get("telefono_1") == test_data["telefono_1"]
        assert data.get("whatsapp") == test_data["whatsapp"]
        print(f"✓ Contact data updated successfully")
        
        # Restore original values
        authenticated_client.put(f"{BASE_URL}/api/site-config", json={
            "email": original.get("email"),
            "telefono_1": original.get("telefono_1"),
            "whatsapp": original.get("whatsapp")
        })
        print(f"✓ Restored original contact data")
    
    def test_put_site_config_updates_address(self, authenticated_client):
        """PUT /api/site-config should update address fields"""
        # Get original values
        get_response = authenticated_client.get(f"{BASE_URL}/api/site-config")
        original = get_response.json()
        
        # Update address
        test_data = {
            "indirizzo": "Via Test 123",
            "citta": "Cagliari",
            "provincia": "CA",
            "cap": "09100",
            "paese": "Italia"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/site-config", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("indirizzo") == test_data["indirizzo"]
        assert data.get("citta") == test_data["citta"]
        assert data.get("provincia") == test_data["provincia"]
        assert data.get("cap") == test_data["cap"]
        print(f"✓ Address data updated successfully")
        
        # Restore original values
        authenticated_client.put(f"{BASE_URL}/api/site-config", json={
            "indirizzo": original.get("indirizzo"),
            "citta": original.get("citta"),
            "provincia": original.get("provincia"),
            "cap": original.get("cap"),
            "paese": original.get("paese")
        })
        print(f"✓ Restored original address data")
    
    def test_put_site_config_updates_social_media(self, authenticated_client):
        """PUT /api/site-config should update social media URLs"""
        # Get original values
        get_response = authenticated_client.get(f"{BASE_URL}/api/site-config")
        original = get_response.json()
        
        # Update social media
        test_data = {
            "facebook_url": "https://facebook.com/trivor_test",
            "instagram_url": "https://instagram.com/trivor_test",
            "linkedin_url": "https://linkedin.com/company/trivor_test"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/site-config", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("facebook_url") == test_data["facebook_url"]
        assert data.get("instagram_url") == test_data["instagram_url"]
        assert data.get("linkedin_url") == test_data["linkedin_url"]
        print(f"✓ Social media URLs updated successfully")
        
        # Restore original values
        authenticated_client.put(f"{BASE_URL}/api/site-config", json={
            "facebook_url": original.get("facebook_url"),
            "instagram_url": original.get("instagram_url"),
            "linkedin_url": original.get("linkedin_url")
        })
        print(f"✓ Restored original social media URLs")
    
    def test_put_site_config_updates_link_progetti(self, authenticated_client):
        """PUT /api/site-config should update link_progetti array"""
        # Get original values
        get_response = authenticated_client.get(f"{BASE_URL}/api/site-config")
        original = get_response.json()
        
        # Update link_progetti
        test_data = {
            "link_progetti": [
                {"nome": "Test Project 1", "url": "https://test1.trivor.it"},
                {"nome": "Test Project 2", "url": "https://test2.trivor.it"}
            ]
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/site-config", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert len(data.get("link_progetti", [])) == 2
        assert data["link_progetti"][0]["nome"] == "Test Project 1"
        assert data["link_progetti"][1]["url"] == "https://test2.trivor.it"
        print(f"✓ link_progetti updated successfully with {len(data['link_progetti'])} items")
        
        # Restore original values
        authenticated_client.put(f"{BASE_URL}/api/site-config", json={
            "link_progetti": original.get("link_progetti")
        })
        print(f"✓ Restored original link_progetti")


class TestSiteConfigIntegration:
    """Integration tests for site config with footer"""
    
    def test_site_config_data_available_for_footer(self, api_client):
        """Site config data should be available for footer consumption"""
        response = api_client.get(f"{BASE_URL}/api/site-config")
        assert response.status_code == 200
        
        data = response.json()
        
        # Footer needs these fields
        footer_required_fields = [
            "logo_url", "slogan", "partita_iva", "email", "email_pec",
            "telefono_1", "whatsapp", "citta", "provincia", "paese",
            "ragione_sociale", "link_progetti"
        ]
        
        for field in footer_required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ All footer-required fields are present in site config")
        print(f"  - logo_url: {data.get('logo_url', '')[:50]}...")
        print(f"  - slogan: {data.get('slogan')}")
        print(f"  - email: {data.get('email')}")
        print(f"  - link_progetti count: {len(data.get('link_progetti', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
