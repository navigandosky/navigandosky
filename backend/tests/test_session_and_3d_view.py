"""
Test Suite for Session Timeout Fix and 3D View Live Sensor/Switch Features
Tests the bug fixes for:
1. Session timeout issue (removed aggressive auto-reload, using /health endpoint)
2. Live sensor data panel and ON/OFF switch for devices in 3D Matterport view
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Test /api/health endpoint - used for session verification"""
    
    def test_health_endpoint_returns_ok(self):
        """Health endpoint should return status ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data

class TestAuthentication:
    """Test login and session persistence"""
    
    def test_admin_login_success(self):
        """Admin login with SmartMaster2026 should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "token" in data
        assert data["user"]["username"] == "Admin"
        assert data["user"]["role"] == "admin"
        
    def test_token_verification_works(self):
        """Token should be valid for API calls"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        token = login_response.json()["token"]
        
        # Use token for authenticated request
        response = requests.get(f"{BASE_URL}/api/matterport/pois?token={token}")
        assert response.status_code == 200

class TestEweLinkIntegration:
    """Test eWeLink device integration - connected status"""
    
    def test_ewelink_status_connected(self):
        """eWeLink should show connected with devices"""
        response = requests.get(f"{BASE_URL}/api/ewelink/status")
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] == True
        assert data["device_count"] > 0
        assert "online_count" in data

class TestLiveSensorData:
    """Test live sensor data for POI - PC Postazione"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json()["token"]
    
    def test_live_sensor_for_pc_postazione(self, auth_token):
        """GET /api/elettrodomestici/by-poi/{poi_id}/live-sensor should return sensor data"""
        poi_id = "789ce2e0-7e5f-42f9-8220-b2fa4e6fdd4c"  # PC Postazione POI
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{poi_id}/live-sensor?token={auth_token}"
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify has_sensor is true
        assert data["has_sensor"] == True
        
        # Verify sensor data structure
        assert "sensor" in data
        sensor = data["sensor"]
        assert "power" in sensor  # Power in W
        assert "voltage" in sensor  # Voltage in V
        assert "current" in sensor  # Current in A
        assert sensor["can_switch"] == True
        
        # Verify apparato data
        assert "apparato" in data
        assert data["apparato"]["nome"] is not None

class TestDeviceSwitch:
    """Test device ON/OFF switch functionality"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json()["token"]
    
    def test_switch_device_on(self, auth_token):
        """POST /api/ewelink/device/{device_id}/switch/on should succeed"""
        device_id = "1000c1e557"  # Luci Pedoni device
        response = requests.post(
            f"{BASE_URL}/api/ewelink/device/{device_id}/switch/on?token={auth_token}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "on"
    
    def test_switch_device_off(self, auth_token):
        """POST /api/ewelink/device/{device_id}/switch/off should succeed"""
        device_id = "1000c1e557"  # Luci Pedoni device
        response = requests.post(
            f"{BASE_URL}/api/ewelink/device/{device_id}/switch/off?token={auth_token}"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["action"] == "off"

class TestSensorsTab:
    """Test sensors tab data"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        return response.json()["token"]
    
    def test_devices_with_sensors_returns_data(self, auth_token):
        """Should return devices with sensor data"""
        response = requests.get(
            f"{BASE_URL}/api/smartthings/devices-with-sensors"
        )
        assert response.status_code == 200
        data = response.json()
        # Response is a dict with devices list and sensors dict
        assert "devices" in data
        assert "sensors" in data
        assert "count" in data
        # Should have devices (from eWeLink fallback since SmartThings is disconnected)
        assert data["count"] > 0
        assert len(data["devices"]) > 0

class TestMatterportPOIs:
    """Test Matterport POI endpoints"""
    
    def test_get_pois_returns_list(self):
        """GET /api/matterport/pois should return POI list"""
        # Get fresh token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        auth_token = login_response.json()["token"]
        
        response = requests.get(f"{BASE_URL}/api/matterport/pois?token={auth_token}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verify POI structure
        poi = data[0]
        assert "id" in poi
        # POI has translations with title, not direct name field
        assert "translations" in poi or "name" in poi or "nome" in poi
    
    def test_poi_sensors_endpoint(self):
        """GET /api/elettrodomestici/poi-sensors should return POI sensor mappings"""
        # Get fresh token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        auth_token = login_response.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/poi-sensors?token={auth_token}"
        )
        assert response.status_code == 200
        data = response.json()
        # Response is a dict with poi_sensors and count
        assert "poi_sensors" in data
        assert "count" in data
        # Should have 7 sensors as per requirements
        assert data["count"] >= 7

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
