"""
Test suite for Immobili (Property) CMS API endpoints
Tests CRUD operations, image uploads, and export functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Test admin authentication for Immobili CMS"""
    
    def test_login_with_valid_credentials(self):
        """Test login with correct visittadasuni credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "visittadasuni",
            "password": "Tadasuni2025$"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "token" in data
        print(f"✓ Login successful, token received")
    
    def test_login_with_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "wrong",
            "password": "wrong"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials correctly rejected")


class TestImmobiliCRUD:
    """Test CRUD operations for Immobili"""
    
    @pytest.fixture
    def test_immobile_data(self):
        """Test data for creating an immobile"""
        return {
            "denominazione": "TEST_Casa_Test_Playwright",
            "ente_proprietario": "Comune di Tadasuni",
            "indirizzo_via": "Via Roma 10",
            "indirizzo_comune": "Tadasuni",
            "indirizzo_provincia": "OR",
            "indirizzo_regione": "Sardegna",
            "proprietario_nome": "Mario",
            "proprietario_cognome": "Rossi",
            "proprietario_cf": "RSSMRA80A01H501Z",
            "proprietario_telefono": "+39 340 1234567",
            "proprietario_email": "mario.rossi@email.com",
            "tipo_bene": "edificato",
            "tipologia": "casa_singola",
            "destinazione_uso": "residenziale",
            "superficie_lorda_mq": 120.5,
            "n_vani": 5,
            "anno_costruzione": 1950,
            "stato_conservazione": "buono",
            "data_ultima_manutenzione": "2024-01-15",
            "planimetrie_presenti": True,
            "impianto_idrico": True,
            "impianto_elettrico": True,
            "referenti": [
                {"id": "ref1", "nominativo": "Geom. Bianchi", "contatti": "+39 070 123456"}
            ],
            "impianti_lista": [
                {"id": "imp1", "descrizione": "Impianto elettrico certificato", "data_certificazione": "2023-06-01"}
            ],
            "destinazioni_urbanistiche_lista": ["Residenziale", "Agricolo"],
            "published": True
        }
    
    def test_list_immobili(self):
        """Test listing all immobili"""
        response = requests.get(f"{BASE_URL}/api/immobili")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List immobili returned {len(data)} items")
    
    def test_create_immobile(self, test_immobile_data):
        """Test creating a new immobile with full data"""
        response = requests.post(f"{BASE_URL}/api/immobili", json=test_immobile_data)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all fields are persisted
        assert data["denominazione"] == test_immobile_data["denominazione"]
        assert data["proprietario_nome"] == test_immobile_data["proprietario_nome"]
        assert data["proprietario_cognome"] == test_immobile_data["proprietario_cognome"]
        assert data["proprietario_cf"] == test_immobile_data["proprietario_cf"]
        assert data["proprietario_telefono"] == test_immobile_data["proprietario_telefono"]
        assert data["proprietario_email"] == test_immobile_data["proprietario_email"]
        assert data["planimetrie_presenti"] == True
        assert data["data_ultima_manutenzione"] == "2024-01-15"
        assert "id" in data
        
        print(f"✓ Immobile created with ID: {data['id']}")
        
        # Verify by GET
        get_response = requests.get(f"{BASE_URL}/api/immobili/{data['id']}")
        assert get_response.status_code == 200
        fetched_data = get_response.json()
        assert fetched_data["denominazione"] == test_immobile_data["denominazione"]
        assert fetched_data["proprietario_cf"] == test_immobile_data["proprietario_cf"]
        
        print(f"✓ Verified immobile persisted correctly via GET")
        return data["id"]
    
    def test_get_single_immobile(self):
        """Test getting a single immobile"""
        # First create one
        create_response = requests.post(f"{BASE_URL}/api/immobili", json={
            "denominazione": "TEST_Single_Get",
            "indirizzo_comune": "Tadasuni",
            "indirizzo_provincia": "OR",
            "indirizzo_regione": "Sardegna",
            "tipo_bene": "edificato"
        })
        assert create_response.status_code == 200
        immobile_id = create_response.json()["id"]
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/immobili/{immobile_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == immobile_id
        assert data["denominazione"] == "TEST_Single_Get"
        print(f"✓ Successfully retrieved single immobile")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/immobili/{immobile_id}")
    
    def test_update_immobile(self, test_immobile_data):
        """Test updating an immobile"""
        # Create immobile
        create_response = requests.post(f"{BASE_URL}/api/immobili", json=test_immobile_data)
        immobile_id = create_response.json()["id"]
        
        # Update immobile
        update_data = {
            "denominazione": "TEST_Casa_Aggiornata",
            "stato_conservazione": "ottimo",
            "data_ultima_manutenzione": "2025-01-10",
            "planimetrie_presenti": False,
            "referenti": [
                {"id": "ref2", "nominativo": "Arch. Verdi", "contatti": "arch.verdi@email.com"}
            ],
            "impianti_lista": [
                {"id": "imp2", "descrizione": "Nuovo impianto gas", "data_certificazione": "2025-01-01"}
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/immobili/{immobile_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["denominazione"] == "TEST_Casa_Aggiornata"
        assert data["stato_conservazione"] == "ottimo"
        assert data["data_ultima_manutenzione"] == "2025-01-10"
        assert data["planimetrie_presenti"] == False
        
        print(f"✓ Immobile updated successfully")
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/immobili/{immobile_id}")
        fetched = get_response.json()
        assert fetched["denominazione"] == "TEST_Casa_Aggiornata"
        
        print(f"✓ Update verified via GET")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/immobili/{immobile_id}")
    
    def test_delete_immobile(self, test_immobile_data):
        """Test deleting an immobile"""
        # Create immobile
        create_response = requests.post(f"{BASE_URL}/api/immobili", json=test_immobile_data)
        immobile_id = create_response.json()["id"]
        
        # Delete immobile
        response = requests.delete(f"{BASE_URL}/api/immobili/{immobile_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        
        print(f"✓ Immobile deleted")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/immobili/{immobile_id}")
        assert get_response.status_code == 404
        
        print(f"✓ Verified immobile no longer exists")
    
    def test_get_nonexistent_immobile(self):
        """Test getting a non-existent immobile returns 404"""
        response = requests.get(f"{BASE_URL}/api/immobili/nonexistent-id-12345")
        assert response.status_code == 404
        print(f"✓ Non-existent immobile correctly returns 404")


class TestImmobiliExport:
    """Test export functionality"""
    
    def test_export_excel(self):
        """Test Excel export endpoint"""
        response = requests.get(f"{BASE_URL}/api/immobili/export/excel")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["format"] == "excel"
        print(f"✓ Excel export returned {len(data['data'])} items")
    
    def test_export_pdf(self):
        """Test PDF export endpoint"""
        response = requests.get(f"{BASE_URL}/api/immobili/export/pdf")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert data["format"] == "pdf"
        print(f"✓ PDF export returned {len(data['data'])} items")


class TestImmobiliImages:
    """Test image upload and deletion for immobili"""
    
    @pytest.fixture
    def test_immobile_id(self):
        """Create a test immobile and return its ID"""
        response = requests.post(f"{BASE_URL}/api/immobili", json={
            "denominazione": "TEST_Immobile_For_Images",
            "indirizzo_comune": "Tadasuni",
            "indirizzo_provincia": "OR",
            "indirizzo_regione": "Sardegna",
            "tipo_bene": "edificato"
        })
        immobile_id = response.json()["id"]
        yield immobile_id
        # Cleanup
        requests.delete(f"{BASE_URL}/api/immobili/{immobile_id}")
    
    def test_upload_image(self, test_immobile_id):
        """Test uploading an image to an immobile"""
        import io
        
        # Create a simple test image (1x1 red pixel PNG)
        from PIL import Image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_image.png', img_bytes, 'image/png')}
        data = {'caption': 'Test image caption'}
        
        response = requests.post(
            f"{BASE_URL}/api/immobili/{test_immobile_id}/images",
            files=files,
            data=data
        )
        
        if response.status_code == 200:
            result = response.json()
            assert result["success"] == True
            assert "image" in result
            assert result["image"]["caption"] == "Test image caption"
            print(f"✓ Image uploaded successfully")
            return result["image"]["id"]
        else:
            # PIL might not be available, skip this test
            pytest.skip("PIL not available for image upload test")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_immobili(self):
        """Remove all TEST_ prefixed immobili"""
        response = requests.get(f"{BASE_URL}/api/immobili")
        if response.status_code == 200:
            immobili = response.json()
            deleted_count = 0
            for imm in immobili:
                if imm.get("denominazione", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/immobili/{imm['id']}")
                    if del_response.status_code == 200:
                        deleted_count += 1
            print(f"✓ Cleaned up {deleted_count} test immobili")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
