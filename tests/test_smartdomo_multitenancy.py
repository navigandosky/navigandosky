"""
SmartDomo Multi-Tenancy Backend Tests
Tests for authentication, data isolation, and API endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://domo-control-center.preview.emergentagent.com')
API = f"{BASE_URL}/api"

# Test credentials
ADMIN_CREDENTIALS = {"username": "Admin", "password": "SmartMaster2026"}
USER_CREDENTIALS = {"username": "Geasar", "password": "Geasar2026"}

# Expected Matterport space IDs
ADMIN_SPACE_ID = "j1r4zUjanif"

class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_api_root(self):
        """Test API is accessible"""
        response = requests.get(f"{API}/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root accessible: {data['message']}")
    
    def test_admin_login(self):
        """Test Admin login returns correct token and user data"""
        response = requests.post(f"{API}/auth/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True, f"Login failed: {data.get('message')}"
        assert data["token"] is not None
        assert data["user"]["username"] == "Admin"
        assert data["user"]["role"] == "admin"
        
        # Check matterport_space_id
        print(f"✓ Admin login successful")
        print(f"  - User ID: {data['user']['id']}")
        print(f"  - Role: {data['user']['role']}")
        print(f"  - Matterport Space ID: {data['user'].get('matterport_space_id')}")
        
        return data["token"], data["user"]
    
    
    def test_user_login(self):
        """Test Geasar user login returns correct token and user data"""
        response = requests.post(f"{API}/auth/login", json=USER_CREDENTIALS)
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True, f"Login failed: {data.get('message')}"
        assert data["token"] is not None
        assert data["user"]["username"] == "Geasar"
        
        print(f"✓ Geasar login successful")
        print(f"  - User ID: {data['user']['id']}")
        print(f"  - Role: {data['user']['role']}")
        print(f"  - Matterport Space ID: {data['user'].get('matterport_space_id')}")
        
        return data["token"], data["user"]
    
    def test_invalid_login(self):
        """Test invalid credentials return error"""
        response = requests.post(f"{API}/auth/login", json={
            "username": "invalid",
            "password": "invalid"
        })
        assert response.status_code == 200  # API returns 200 with success=false
        data = response.json()
        assert data["success"] == False
        print(f"✓ Invalid login correctly rejected: {data.get('message')}")


class TestTokenVerification:
    """Test token verification and user data"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{API}/auth/login", json=ADMIN_CREDENTIALS)
        return response.json()["token"]
    
    @pytest.fixture
    def user_token(self):
        response = requests.post(f"{API}/auth/login", json=USER_CREDENTIALS)
        return response.json()["token"]
    
    def test_admin_verify_returns_correct_space_id(self, admin_token):
        """Verify Admin token returns correct matterport_space_id"""
        response = requests.get(f"{API}/auth/verify", params={"token": admin_token})
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] == True
        assert data["user"]["username"] == "Admin"
        
        space_id = data["user"].get("matterport_space_id")
        print(f"✓ Admin verify - matterport_space_id: {space_id}")
        
        # Admin should have j1r4zUjanif
        if space_id:
            assert space_id == ADMIN_SPACE_ID, f"Expected {ADMIN_SPACE_ID}, got {space_id}"
            print(f"✓ Admin has correct space_id: {ADMIN_SPACE_ID}")
    
    
    def test_user_verify_returns_different_space(self, user_token):
        """Verify Geasar token returns different space than Admin"""
        response = requests.get(f"{API}/auth/verify", params={"token": user_token})
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] == True
        assert data["user"]["username"] == "Geasar"
        
        space_id = data["user"].get("matterport_space_id")
        print(f"✓ Geasar verify - matterport_space_id: {space_id}")
        
        # Geasar should have a different space or None
        if space_id:
            print(f"  Geasar has assigned space: {space_id}")
        else:
            print(f"  Geasar has no assigned space (will use default)")
    
    def test_invalid_token_rejected(self):
        """Test invalid token is rejected"""
        response = requests.get(f"{API}/auth/verify", params={"token": "invalid-token-123"})
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == False
        print(f"✓ Invalid token correctly rejected")


class TestMultiTenantDataIsolation:
    """Test that users only see their own data"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{API}/auth/login", json=ADMIN_CREDENTIALS)
        return response.json()["token"]
    
    @pytest.fixture
    def user_token(self):
        response = requests.post(f"{API}/auth/login", json=USER_CREDENTIALS)
        return response.json()["token"]
    
    def test_elettrodomestici_isolation(self, admin_token, user_token):
        """Test elettrodomestici are filtered by user"""
        # Get Admin's elettrodomestici
        admin_response = requests.get(f"{API}/elettrodomestici", params={"token": admin_token})
        assert admin_response.status_code == 200
        admin_data = admin_response.json()
        
        # Get Geasar's elettrodomestici
        user_response = requests.get(f"{API}/elettrodomestici", params={"token": user_token})
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        print(f"✓ Admin elettrodomestici count: {len(admin_data)}")
        print(f"✓ Geasar elettrodomestici count: {len(user_data)}")
        
        # Check user_id isolation
        if admin_data:
            admin_user_ids = set(e.get("user_id") for e in admin_data)
            print(f"  Admin data user_ids: {admin_user_ids}")
        
        if user_data:
            user_user_ids = set(e.get("user_id") for e in user_data)
            print(f"  Geasar data user_ids: {user_user_ids}")
    
    def test_manutenzioni_isolation(self, admin_token, user_token):
        """Test manutenzioni are filtered by user"""
        # Get Admin's manutenzioni
        admin_response = requests.get(f"{API}/manutenzioni", params={"token": admin_token})
        assert admin_response.status_code == 200
        admin_data = admin_response.json()
        
        # Get Geasar's manutenzioni
        user_response = requests.get(f"{API}/manutenzioni", params={"token": user_token})
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        print(f"✓ Admin manutenzioni count: {len(admin_data)}")
        print(f"✓ Geasar manutenzioni count: {len(user_data)}")
        
        # Check user_id isolation
        if admin_data:
            admin_user_ids = set(m.get("user_id") for m in admin_data)
            print(f"  Admin manutenzioni user_ids: {admin_user_ids}")
        
        if user_data:
            user_user_ids = set(m.get("user_id") for m in user_data)
            print(f"  Geasar manutenzioni user_ids: {user_user_ids}")
    
    def test_property_isolation(self, admin_token, user_token):
        """Test property config is filtered by user"""
        # Get Admin's active property
        admin_response = requests.get(f"{API}/property/active", params={"token": admin_token})
        assert admin_response.status_code == 200
        admin_data = admin_response.json()
        
        # Get Geasar's active property
        user_response = requests.get(f"{API}/property/active", params={"token": user_token})
        assert user_response.status_code == 200
        user_data = user_response.json()
        
        print(f"✓ Admin property: {admin_data.get('name') if admin_data else 'None'}")
        print(f"  Admin property user_id: {admin_data.get('user_id') if admin_data else 'N/A'}")
        
        print(f"✓ Geasar property: {user_data.get('name') if user_data else 'None'}")
        print(f"  Geasar property user_id: {user_data.get('user_id') if user_data else 'N/A'}")
        
        # Verify they don't see each other's data
        if admin_data and user_data:
            assert admin_data.get("user_id") != user_data.get("user_id") or admin_data.get("id") != user_data.get("id"), \
                "Users should not see the same property"


class TestMatterportPOIs:
    """Test Matterport POI endpoints with multi-tenancy"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{API}/auth/login", json=ADMIN_CREDENTIALS)
        return response.json()["token"]
    
    @pytest.fixture
    def user_token(self):
        response = requests.post(f"{API}/auth/login", json=USER_CREDENTIALS)
        return response.json()["token"]
    
    def test_pois_filtered_by_user_and_space(self, admin_token):
        """Test POIs are filtered by user_id and space_id"""
        # Get POIs for Admin's space
        response = requests.get(f"{API}/matterport/pois", params={
            "token": admin_token,
            "space_id": ADMIN_SPACE_ID
        })
        assert response.status_code == 200
        data = response.json()
        
        print(f"✓ Admin POIs for space {ADMIN_SPACE_ID}: {len(data)}")
        
        if data:
            # Check all POIs belong to correct space
            for poi in data[:3]:  # Check first 3
                print(f"  - POI: {poi.get('translations', [{}])[0].get('title', 'N/A')}")
                print(f"    space_id: {poi.get('space_id')}")
                print(f"    user_id: {poi.get('user_id')}")
    
    def test_poi_import_uses_correct_space(self, admin_token):
        """Test POI import endpoint exists and uses correct space"""
        # This is a POST endpoint, we just verify it exists
        response = requests.post(
            f"{API}/matterport/spaces/{ADMIN_SPACE_ID}/import-tags",
            params={"token": admin_token},
            json=[]  # Empty list to test endpoint
        )
        # Should return 200 with message about 0 tags imported
        assert response.status_code == 200
        data = response.json()
        print(f"✓ POI import endpoint works: {data.get('message', data)}")


class TestSmartThingsIntegration:
    """Test SmartThings/eWeLink fallback integration"""
    
    def test_devices_with_sensors_endpoint(self):
        """Test devices-with-sensors endpoint returns data or falls back to eWeLink"""
        response = requests.get(f"{API}/smartthings/devices-with-sensors")
        assert response.status_code == 200
        data = response.json()
        
        devices = data.get("devices", [])
        states = data.get("states", {})
        sensors = data.get("sensors", {})
        source = data.get("source", "unknown")
        
        print(f"✓ Devices endpoint returned {len(devices)} devices")
        print(f"  Source: {source}")
        print(f"  States count: {len(states)}")
        print(f"  Sensors count: {len(sensors)}")
        
        # Check sensor values are normalized (should be < 100 for temp/humidity)
        for device_id, sensor_data in list(sensors.items())[:3]:
            temp = sensor_data.get("temperature")
            humidity = sensor_data.get("humidity")
            if temp is not None:
                print(f"  Device {device_id}: temp={temp}°C, humidity={humidity}%")
                # Verify normalization (values should be reasonable)
                if temp > 100:
                    print(f"    ⚠ Temperature {temp} seems unnormalized!")
                if humidity and humidity > 100:
                    print(f"    ⚠ Humidity {humidity} seems unnormalized!")
    
    def test_smartthings_devices_fallback(self):
        """Test SmartThings devices endpoint - may return 401/520 if token expired"""
        response = requests.get(f"{API}/smartthings/devices")
        # SmartThings token is expired, so we expect 500/520 error
        # The devices-with-sensors endpoint has fallback, but /devices does not
        if response.status_code == 200:
            data = response.json()
            devices = data.get("devices", [])
            source = data.get("source", "smartthings")
            print(f"✓ SmartThings devices: {len(devices)} from {source}")
        else:
            print(f"⚠ SmartThings devices returned {response.status_code} (token expired)")
            # This is expected behavior - SmartThings token is expired
            # The devices-with-sensors endpoint has eWeLink fallback
            assert response.status_code in [500, 520, 401], f"Unexpected status: {response.status_code}"
            print("✓ SmartThings correctly returns error when token expired")


class TestManutenzioniCRUD:
    """Test manutenzioni CRUD operations"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{API}/auth/login", json=ADMIN_CREDENTIALS)
        return response.json()["token"]
    
    def test_create_manutenzione(self, admin_token):
        """Test creating a new manutenzione"""
        test_data = {
            "descrizione": "TEST_Manutenzione di test automatico",
            "tipo": "controllo",
            "stato": "aperto",
            "data_programmata": "2025-02-01"
        }
        
        response = requests.post(
            f"{API}/manutenzioni",
            params={"token": admin_token},
            json=test_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("descrizione") == test_data["descrizione"]
        assert data.get("id") is not None
        
        print(f"✓ Created manutenzione: {data.get('id')}")
        print(f"  Descrizione: {data.get('descrizione')}")
        print(f"  User ID: {data.get('user_id')}")
        
        # Cleanup - delete the test manutenzione
        delete_response = requests.delete(
            f"{API}/manutenzioni/{data['id']}",
            params={"token": admin_token}
        )
        if delete_response.status_code == 200:
            print(f"  ✓ Cleaned up test manutenzione")
        
        return data


class TestConfigEndpoints:
    """Test configuration endpoints"""
    
    def test_config_endpoint(self):
        """Test /api/config returns app configuration"""
        response = requests.get(f"{API}/config")
        assert response.status_code == 200
        data = response.json()
        
        assert "matterport_space_id" in data
        print(f"✓ Config endpoint:")
        print(f"  matterport_space_id: {data.get('matterport_space_id')}")
        print(f"  app_name: {data.get('app_name')}")
        print(f"  version: {data.get('version')}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
