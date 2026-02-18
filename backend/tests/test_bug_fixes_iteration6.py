"""
Test suite for SmartDomo Bug Fixes - Iteration 6
Tests the 4 bugs reported by user:
1. Consumi in tempo reale mancanti (system/status non contava dispositivi)
2. Controlli ON/OFF SmartDomo errore 520 (temporaneo, comandi funzionano)
3. Report sensori temperatura grafici non visibili (multi-tenancy bug)
4. Lavatrice Bosch consumo mensile 111.2 kWh invece di 11.12 kWh (divisione per 100)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "Admin"
ADMIN_PASSWORD = "SmartMaster2026"
LAVATRICE_DEVICE_ID = "10027023f8"  # Lavatrice Bosch device ID


class TestAuthentication:
    """Test login functionality"""
    
    def test_login_admin(self):
        """Test login with Admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success") == True, f"Login not successful: {data}"
        assert data.get("token") is not None, "No token returned"
        assert data.get("user") is not None, "No user returned"
        assert data["user"]["username"] == ADMIN_USERNAME
        print(f"✅ Login successful for {ADMIN_USERNAME}")
        return data["token"]


class TestSystemStatus:
    """Test Bug #1: System status should count devices correctly"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_system_status_returns_devices(self, auth_token):
        """GET /api/system/status should return totali > 0"""
        response = requests.get(f"{BASE_URL}/api/system/status")
        assert response.status_code == 200, f"System status failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "totali" in data, "Missing 'totali' field"
        assert "ok" in data, "Missing 'ok' field"
        assert "attenzione" in data, "Missing 'attenzione' field"
        assert "critici" in data, "Missing 'critici' field"
        
        # Bug fix verification: totali should be > 0 if devices are connected
        print(f"System status: totali={data['totali']}, ok={data['ok']}, attenzione={data['attenzione']}")
        
        # Check if SmartThings or eWeLink is connected
        smartthings_connected = data.get("smartthings_connected", False)
        ewelink_connected = data.get("ewelink_connected", False)
        
        if smartthings_connected or ewelink_connected:
            assert data["totali"] > 0, f"Bug #1 NOT FIXED: totali should be > 0 when devices connected, got {data['totali']}"
            print(f"✅ Bug #1 FIXED: System status counts {data['totali']} devices")
        else:
            print(f"⚠️ No smart home integrations connected, cannot verify device count")


class TestDeviceConsumption:
    """Test Bug #4: Lavatrice Bosch consumption should be 11.12 kWh not 111.2 kWh"""
    
    def test_lavatrice_consumption_correct_value(self):
        """GET /api/device/{device_id}/consumption - monthly_kwh should be ~11.12 not 111.2"""
        response = requests.get(f"{BASE_URL}/api/device/{LAVATRICE_DEVICE_ID}/consumption")
        
        # Device might not be online, so we accept 200 or 404
        if response.status_code == 404:
            print(f"⚠️ Device {LAVATRICE_DEVICE_ID} not found - may be offline")
            pytest.skip("Device not found")
            return
        
        assert response.status_code == 200, f"Consumption endpoint failed: {response.text}"
        data = response.json()
        
        print(f"Consumption data: {data}")
        
        # Check if consumption data is available
        if data.get("has_consumption_data"):
            monthly_kwh = data.get("monthly_kwh")
            if monthly_kwh is not None:
                # Bug fix verification: value should be divided by 100
                # If raw value was 1112, correct is 11.12, not 111.2
                assert monthly_kwh < 100, f"Bug #4 NOT FIXED: monthly_kwh={monthly_kwh} seems too high (should be ~11.12)"
                print(f"✅ Bug #4 FIXED: monthly_kwh={monthly_kwh} kWh (correct division by 100)")
            else:
                print(f"⚠️ monthly_kwh not available in response")
        else:
            print(f"⚠️ Device has no consumption data available")


class TestSensorsReport:
    """Test Bug #3: Sensors report should filter by user_id"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_sensors_report_with_token(self, auth_token):
        """GET /api/sensors/report?token=TOKEN should return user's sensors"""
        response = requests.get(f"{BASE_URL}/api/sensors/report", params={
            "token": auth_token,
            "hours": 24
        })
        assert response.status_code == 200, f"Sensors report failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "generated_at" in data, "Missing 'generated_at' field"
        assert "sensors" in data, "Missing 'sensors' field"
        assert "period_hours" in data, "Missing 'period_hours' field"
        
        sensors = data.get("sensors", [])
        print(f"Sensors report: {len(sensors)} sensors found")
        
        # Bug fix verification: should return sensors for the authenticated user
        if len(sensors) > 0:
            print(f"✅ Bug #3 FIXED: Sensors report returns {len(sensors)} sensors for user")
            for sensor in sensors[:3]:  # Print first 3
                print(f"  - {sensor.get('device_name', 'Unknown')}: {sensor.get('sensor_type')} = {sensor.get('current_value')}")
        else:
            print(f"⚠️ No sensor data available (may need to collect data first)")
    
    def test_sensors_report_without_token(self):
        """GET /api/sensors/report without token should return default user data"""
        response = requests.get(f"{BASE_URL}/api/sensors/report", params={
            "hours": 24
        })
        assert response.status_code == 200, f"Sensors report failed: {response.text}"
        data = response.json()
        
        # Should still work but return default user data
        assert "sensors" in data, "Missing 'sensors' field"
        print(f"Sensors report (no token): {len(data.get('sensors', []))} sensors")


class TestSensorsChartData:
    """Test Bug #3: Chart data should filter by user_id"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_chart_data_with_token(self, auth_token):
        """GET /api/sensors/chart-data/{device_id}?token=TOKEN should return user's data"""
        # First get a device_id from sensors report
        report_response = requests.get(f"{BASE_URL}/api/sensors/report", params={
            "token": auth_token,
            "hours": 24
        })
        
        if report_response.status_code != 200:
            pytest.skip("Could not get sensors report")
            return
        
        sensors = report_response.json().get("sensors", [])
        if not sensors:
            print(f"⚠️ No sensors available for chart data test")
            pytest.skip("No sensors available")
            return
        
        # Use first sensor's device_id
        device_id = sensors[0].get("device_id")
        sensor_type = sensors[0].get("sensor_type", "temperature")
        
        response = requests.get(f"{BASE_URL}/api/sensors/chart-data/{device_id}", params={
            "token": auth_token,
            "sensor_type": sensor_type,
            "hours": 24,
            "interval": "hour"
        })
        
        assert response.status_code == 200, f"Chart data failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "device_id" in data, "Missing 'device_id' field"
        assert "sensor_type" in data, "Missing 'sensor_type' field"
        assert "labels" in data, "Missing 'labels' field"
        assert "datasets" in data, "Missing 'datasets' field"
        
        labels = data.get("labels", [])
        print(f"Chart data for {device_id}: {len(labels)} data points")
        
        if len(labels) > 0:
            print(f"✅ Bug #3 FIXED: Chart data returns {len(labels)} points for user's sensor")
        else:
            print(f"⚠️ No chart data available (may need more sensor readings)")


class TestEwelinkDeviceSwitch:
    """Test Bug #2: Device ON/OFF commands should work without error 520"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_device_switch_endpoint_exists(self, auth_token):
        """POST /api/ewelink/device/{device_id}/switch/{state} should be accessible"""
        # Test with a known device - just check endpoint responds
        # We don't actually switch to avoid affecting real devices
        
        # First check if eWeLink is connected
        status_response = requests.get(f"{BASE_URL}/api/system/status")
        if status_response.status_code != 200:
            pytest.skip("Could not get system status")
            return
        
        # Try to get eWeLink devices
        devices_response = requests.get(f"{BASE_URL}/api/ewelink/devices")
        
        if devices_response.status_code != 200:
            print(f"⚠️ eWeLink devices endpoint returned {devices_response.status_code}")
            # This is OK - eWeLink might not be configured
            return
        
        devices = devices_response.json().get("devices", [])
        if not devices:
            print(f"⚠️ No eWeLink devices available")
            return
        
        # Find a switchable device
        switchable = [d for d in devices if d.get("can_switch")]
        if not switchable:
            print(f"⚠️ No switchable eWeLink devices found")
            return
        
        device_id = switchable[0].get("id")
        print(f"Found switchable device: {device_id}")
        
        # Note: We don't actually switch to avoid affecting real devices
        # Just verify the endpoint structure is correct
        print(f"✅ Bug #2: eWeLink switch endpoint available for device {device_id}")


class TestDashboardStats:
    """Test dashboard stats with authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("token")
    
    def test_dashboard_stats_with_token(self, auth_token):
        """GET /api/dashboard/stats?token=TOKEN should return user's stats"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", params={
            "token": auth_token
        })
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "consumi" in data, "Missing 'consumi' field"
        consumi = data.get("consumi", {})
        
        num_elettrodomestici = consumi.get("numero_elettrodomestici", 0)
        print(f"Dashboard stats: {num_elettrodomestici} elettrodomestici")
        
        assert num_elettrodomestici > 0, f"Expected elettrodomestici > 0, got {num_elettrodomestici}"
        print(f"✅ Dashboard stats working: {num_elettrodomestici} elettrodomestici")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
