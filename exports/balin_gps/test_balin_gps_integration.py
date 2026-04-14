"""
Test Balin GPS Integration API Endpoints
Tests for: /api/balin/status, /api/balin/devices, /api/balin/device/{imei}, 
           /api/balin/device/{imei}/history, /api/balin/device/{imei}/trips
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBalinGPSStatus:
    """Test Balin GPS status endpoint - should return 'non configurato' when not configured"""
    
    def test_balin_status_not_configured(self):
        """GET /api/balin/status - returns not configured status"""
        response = requests.get(f"{BASE_URL}/api/balin/status")
        
        # Status code assertion
        assert response.status_code == 200
        
        # Data assertions
        data = response.json()
        assert "connected" in data
        assert data["connected"] == False
        assert "message" in data
        assert data["message"] == "Non configurato"
        assert "email" in data
        assert data["email"] is None
        
    def test_balin_status_response_structure(self):
        """Verify response structure has all required fields"""
        response = requests.get(f"{BASE_URL}/api/balin/status")
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        required_fields = ["connected", "message", "email"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"


class TestBalinGPSDevices:
    """Test Balin GPS devices endpoint - should return 400 when not configured"""
    
    def test_balin_devices_not_configured(self):
        """GET /api/balin/devices - returns 400 error when not configured"""
        response = requests.get(f"{BASE_URL}/api/balin/devices")
        
        # Status code assertion - should be 400 when not configured
        assert response.status_code == 400
        
        # Data assertions
        data = response.json()
        assert "detail" in data
        assert "non configurato" in data["detail"].lower() or "Balin GPS non configurato" in data["detail"]
        
    def test_balin_devices_error_message_contains_setup_instructions(self):
        """Error message should guide user to Setup → Integrazioni"""
        response = requests.get(f"{BASE_URL}/api/balin/devices")
        
        assert response.status_code == 400
        data = response.json()
        
        # Should mention where to configure
        assert "Setup" in data["detail"] or "Integrazioni" in data["detail"]


class TestBalinGPSDeviceByIMEI:
    """Test Balin GPS single device endpoint"""
    
    def test_balin_device_not_configured(self):
        """GET /api/balin/device/{imei} - returns 400 when not configured"""
        test_imei = "123456789012345"
        response = requests.get(f"{BASE_URL}/api/balin/device/{test_imei}")
        
        # Should return 400 when Balin is not configured
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "non configurato" in data["detail"].lower() or "Balin GPS non configurato" in data["detail"]


class TestBalinGPSHistory:
    """Test Balin GPS device history endpoint"""
    
    def test_balin_history_not_configured(self):
        """GET /api/balin/device/{imei}/history - returns 400 when not configured"""
        test_imei = "123456789012345"
        # Timestamps in milliseconds
        start = 1700000000000
        stop = 1700086400000
        
        response = requests.get(
            f"{BASE_URL}/api/balin/device/{test_imei}/history",
            params={"start": start, "stop": stop}
        )
        
        # Should return 400 when Balin is not configured
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data


class TestBalinGPSTrips:
    """Test Balin GPS device trips endpoint"""
    
    def test_balin_trips_not_configured(self):
        """GET /api/balin/device/{imei}/trips - returns 400 when not configured"""
        test_imei = "123456789012345"
        # Timestamps in milliseconds
        start = 1700000000000
        stop = 1700086400000
        
        response = requests.get(
            f"{BASE_URL}/api/balin/device/{test_imei}/trips",
            params={"start": start, "stop": stop}
        )
        
        # Should return 400 when Balin is not configured
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data


class TestBalinGPSWithToken:
    """Test Balin GPS endpoints with authentication token"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for Admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"username": "Admin", "password": "SmartMaster2026"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_balin_status_with_token(self, auth_token):
        """GET /api/balin/status with auth token"""
        response = requests.get(
            f"{BASE_URL}/api/balin/status",
            params={"token": auth_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "connected" in data
        assert data["connected"] == False  # Not configured
        
    def test_balin_devices_with_token(self, auth_token):
        """GET /api/balin/devices with auth token - still 400 when not configured"""
        response = requests.get(
            f"{BASE_URL}/api/balin/devices",
            params={"token": auth_token}
        )
        
        # Should still return 400 because Balin is not configured
        assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
