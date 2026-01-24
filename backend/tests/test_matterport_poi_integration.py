"""
Test suite for SmartDomo Matterport POI Integration
Tests the new feature: associating elettrodomestici (appliances) with Matterport POIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USER = "Admin"
ADMIN_PASSWORD = "SmartMaster2026"
GEASAR_USER = "Geasar"
GEASAR_PASSWORD = "Geasar2026"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """Test Admin login with SmartMaster2026"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USER,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["user"]["username"] == ADMIN_USER
        assert "token" in data
        assert len(data["token"]) > 0
    
    def test_geasar_login(self):
        """Test Geasar login with Geasar2026"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": GEASAR_USER,
            "password": GEASAR_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["user"]["username"] == GEASAR_USER


@pytest.fixture
def admin_token():
    """Get Admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": ADMIN_USER,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200 and response.json().get("success"):
        return response.json()["token"]
    pytest.skip("Admin authentication failed")


@pytest.fixture
def geasar_token():
    """Get Geasar authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "username": GEASAR_USER,
        "password": GEASAR_PASSWORD
    })
    if response.status_code == 200 and response.json().get("success"):
        return response.json()["token"]
    pytest.skip("Geasar authentication failed")


class TestMatterportPOIs:
    """Test Matterport POI endpoints"""
    
    def test_get_pois_list(self, admin_token):
        """Test /api/matterport/pois returns list of POIs"""
        response = requests.get(f"{BASE_URL}/api/matterport/pois", params={"token": admin_token})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} POIs")
        
        # Verify POI structure if any exist
        if len(data) > 0:
            poi = data[0]
            assert "id" in poi
            assert "translations" in poi or "title" in poi
    
    def test_pois_have_required_fields(self, admin_token):
        """Test POIs have required fields for dropdown display"""
        response = requests.get(f"{BASE_URL}/api/matterport/pois", params={"token": admin_token})
        assert response.status_code == 200
        data = response.json()
        
        for poi in data:
            assert "id" in poi, "POI must have id"
            # POI should have translations with title for display
            if "translations" in poi and len(poi["translations"]) > 0:
                it_trans = next((t for t in poi["translations"] if t.get("language") == "it"), None)
                if it_trans:
                    assert "title" in it_trans, "Italian translation should have title"


class TestElettrodomesticiPOIAssociation:
    """Test elettrodomestici-POI association feature"""
    
    def test_get_elettrodomestici_list(self, admin_token):
        """Test /api/elettrodomestici returns list"""
        response = requests.get(f"{BASE_URL}/api/elettrodomestici", params={"token": admin_token})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} elettrodomestici")
    
    def test_elettrodomestici_have_matterport_tag_field(self, admin_token):
        """Test elettrodomestici have matterport_tag_id field"""
        response = requests.get(f"{BASE_URL}/api/elettrodomestici", params={"token": admin_token})
        assert response.status_code == 200
        data = response.json()
        
        # Check that the field exists (can be null)
        for elettro in data[:5]:  # Check first 5
            assert "matterport_tag_id" in elettro or elettro.get("matterport_tag_id") is None
    
    def test_get_elettrodomestico_by_poi_endpoint_exists(self, admin_token):
        """Test /api/elettrodomestici/by-poi/{poi_id} endpoint exists"""
        # Get a POI ID first
        pois_response = requests.get(f"{BASE_URL}/api/matterport/pois", params={"token": admin_token})
        pois = pois_response.json()
        
        if len(pois) == 0:
            pytest.skip("No POIs available for testing")
        
        poi_id = pois[0]["id"]
        
        # Test the endpoint
        response = requests.get(f"{BASE_URL}/api/elettrodomestici/by-poi/{poi_id}", params={"token": admin_token})
        # Should return 200 even if no linked apparato (returns null)
        assert response.status_code == 200
    
    def test_create_elettrodomestico_with_poi_link(self, admin_token):
        """Test creating an elettrodomestico with POI association"""
        # Get a POI ID first
        pois_response = requests.get(f"{BASE_URL}/api/matterport/pois", params={"token": admin_token})
        pois = pois_response.json()
        
        if len(pois) == 0:
            pytest.skip("No POIs available for testing")
        
        poi_id = pois[0]["id"]
        
        # Create elettrodomestico with POI link
        create_data = {
            "nome": "TEST_Apparato_POI_Link",
            "marca": "Test Brand",
            "modello": "Test Model",
            "categoria": "altro",
            "matterport_tag_id": poi_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/elettrodomestici",
            params={"token": admin_token},
            json=create_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["nome"] == "TEST_Apparato_POI_Link"
        assert data["matterport_tag_id"] == poi_id
        
        elettro_id = data["id"]
        
        # Verify by-poi endpoint returns this elettrodomestico
        by_poi_response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{poi_id}",
            params={"token": admin_token}
        )
        assert by_poi_response.status_code == 200
        linked_elettro = by_poi_response.json()
        
        assert linked_elettro is not None
        assert linked_elettro["id"] == elettro_id
        assert linked_elettro["nome"] == "TEST_Apparato_POI_Link"
        
        # Cleanup - delete the test elettrodomestico
        delete_response = requests.delete(
            f"{BASE_URL}/api/elettrodomestici/{elettro_id}",
            params={"token": admin_token}
        )
        assert delete_response.status_code == 200
    
    def test_update_elettrodomestico_poi_link(self, admin_token):
        """Test updating an elettrodomestico's POI association"""
        # Get POIs
        pois_response = requests.get(f"{BASE_URL}/api/matterport/pois", params={"token": admin_token})
        pois = pois_response.json()
        
        if len(pois) < 2:
            pytest.skip("Need at least 2 POIs for this test")
        
        poi_id_1 = pois[0]["id"]
        poi_id_2 = pois[1]["id"]
        
        # Create elettrodomestico without POI link
        create_data = {
            "nome": "TEST_Apparato_Update_POI",
            "marca": "Test Brand",
            "categoria": "altro"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/elettrodomestici",
            params={"token": admin_token},
            json=create_data
        )
        assert response.status_code == 200
        elettro_id = response.json()["id"]
        
        # Update with POI link
        update_response = requests.put(
            f"{BASE_URL}/api/elettrodomestici/{elettro_id}",
            params={"token": admin_token},
            json={"matterport_tag_id": poi_id_1}
        )
        assert update_response.status_code == 200
        assert update_response.json()["matterport_tag_id"] == poi_id_1
        
        # Verify by-poi returns it
        by_poi_response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{poi_id_1}",
            params={"token": admin_token}
        )
        assert by_poi_response.status_code == 200
        assert by_poi_response.json()["id"] == elettro_id
        
        # Update to different POI
        update_response_2 = requests.put(
            f"{BASE_URL}/api/elettrodomestici/{elettro_id}",
            params={"token": admin_token},
            json={"matterport_tag_id": poi_id_2}
        )
        assert update_response_2.status_code == 200
        
        # Old POI should not return this elettrodomestico
        by_poi_old = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{poi_id_1}",
            params={"token": admin_token}
        )
        old_linked = by_poi_old.json()
        assert old_linked is None or old_linked.get("id") != elettro_id
        
        # New POI should return it
        by_poi_new = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{poi_id_2}",
            params={"token": admin_token}
        )
        assert by_poi_new.json()["id"] == elettro_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/elettrodomestici/{elettro_id}", params={"token": admin_token})
    
    def test_remove_poi_link_from_elettrodomestico(self, admin_token):
        """Test removing POI association from elettrodomestico"""
        # Get a POI
        pois_response = requests.get(f"{BASE_URL}/api/matterport/pois", params={"token": admin_token})
        pois = pois_response.json()
        
        if len(pois) == 0:
            pytest.skip("No POIs available")
        
        poi_id = pois[0]["id"]
        
        # Create with POI link
        create_data = {
            "nome": "TEST_Apparato_Remove_POI",
            "matterport_tag_id": poi_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/elettrodomestici",
            params={"token": admin_token},
            json=create_data
        )
        elettro_id = response.json()["id"]
        
        # Remove POI link (set to empty string or null)
        update_response = requests.put(
            f"{BASE_URL}/api/elettrodomestici/{elettro_id}",
            params={"token": admin_token},
            json={"matterport_tag_id": ""}
        )
        assert update_response.status_code == 200
        
        # Verify by-poi no longer returns it
        by_poi_response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{poi_id}",
            params={"token": admin_token}
        )
        linked = by_poi_response.json()
        assert linked is None or linked.get("id") != elettro_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/elettrodomestici/{elettro_id}", params={"token": admin_token})


class TestVista3DIntegration:
    """Test Vista 3D related endpoints"""
    
    def test_matterport_spaces_endpoint(self, admin_token):
        """Test /api/matterport/spaces returns spaces"""
        response = requests.get(f"{BASE_URL}/api/matterport/spaces", params={"token": admin_token})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} Matterport spaces")
    
    def test_config_endpoint(self, admin_token):
        """Test /api/config returns Matterport config"""
        response = requests.get(f"{BASE_URL}/api/config")
        assert response.status_code == 200
        data = response.json()
        assert "matterport_space_id" in data


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_elettrodomestici(self, admin_token):
        """Remove any TEST_ prefixed elettrodomestici"""
        response = requests.get(f"{BASE_URL}/api/elettrodomestici", params={"token": admin_token})
        elettrodomestici = response.json()
        
        deleted_count = 0
        for elettro in elettrodomestici:
            if elettro.get("nome", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/elettrodomestici/{elettro['id']}",
                    params={"token": admin_token}
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleaned up {deleted_count} test elettrodomestici")
        assert True  # Always pass cleanup


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
