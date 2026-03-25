"""
Test suite for SmartDomo sensor types support in POI detail panel.
Tests: Door/Window sensors, Temperature/Humidity sensors, Power meters, Switch devices.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smartdomo-bugfix.preview.emergentagent.com')

# Test POI IDs from the review request
DOOR_SENSOR_POI = "2d1f190b-a3e3-429d-bacf-6e2d679187d1"  # Porta Studio
POWER_METER_POI = "789ce2e0-7e5f-42f9-8220-b2fa4e6fdd4c"  # PC Studio Energia
TEMP_SENSOR_POI = "2c5b55a8-e947-4908-9492-932eea2b192b"  # Sensore Temperatura Esterna
SWITCH_POI = "37a1b701-0c6f-4f8e-b1e6-f9d3d95096c2"       # Luci Pedoni


@pytest.fixture(scope="module")
def admin_token():
    """Login as Admin and get token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"username": "Admin", "password": "SmartMaster2026"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    data = response.json()
    assert data.get("success") is True, f"Login not successful: {data}"
    return data.get("token")


class TestHealthAndAuth:
    """Basic health and authentication tests"""
    
    def test_health_endpoint(self):
        """Test /api/health returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
    
    def test_admin_login(self, admin_token):
        """Test Admin login works"""
        assert admin_token is not None
        assert len(admin_token) > 10


class TestDoorSensor:
    """Tests for Door/Window contact sensor (Porta Studio)"""
    
    def test_door_sensor_returns_contact_state(self, admin_token):
        """Door sensor should return contact state (open/closed)"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{DOOR_SENSOR_POI}/live-sensor",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify has_sensor is true
        assert data.get("has_sensor") is True, "Door sensor should have sensor data"
        
        # Verify sensor data structure
        sensor = data.get("sensor", {})
        assert sensor.get("is_contact_sensor") is True, "Should be identified as contact sensor"
        assert sensor.get("contact") in ["open", "closed"], f"Contact state should be open/closed, got: {sensor.get('contact')}"
    
    def test_door_sensor_has_battery(self, admin_token):
        """Door sensor should report battery percentage"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{DOOR_SENSOR_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        # Battery should be present and valid
        battery = sensor.get("battery")
        assert battery is not None, "Door sensor should report battery"
        assert 0 <= battery <= 100, f"Battery should be 0-100%, got: {battery}"
    
    def test_door_sensor_has_last_trigger(self, admin_token):
        """Door sensor should have last_trigger timestamp"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{DOOR_SENSOR_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        # last_trigger should be present (ISO timestamp)
        last_trigger = sensor.get("last_trigger")
        assert last_trigger is not None, "Door sensor should have last_trigger"
        assert "T" in last_trigger, f"last_trigger should be ISO format, got: {last_trigger}"


class TestPowerMeter:
    """Tests for Power meter sensor (PC Studio Energia)"""
    
    def test_power_meter_returns_power(self, admin_token):
        """Power meter should return power in Watts"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{POWER_METER_POI}/live-sensor",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("has_sensor") is True
        sensor = data.get("sensor", {})
        
        # Power should be present
        power = sensor.get("power")
        assert power is not None, "Power meter should report power"
        assert isinstance(power, (int, float)), f"Power should be numeric, got: {type(power)}"
    
    def test_power_meter_returns_voltage(self, admin_token):
        """Power meter should return voltage in Volts"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{POWER_METER_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        voltage = sensor.get("voltage")
        assert voltage is not None, "Power meter should report voltage"
        # European voltage should be around 220-240V
        assert 200 <= voltage <= 260, f"Voltage should be ~230V, got: {voltage}"
    
    def test_power_meter_returns_current(self, admin_token):
        """Power meter should return current in Amperes"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{POWER_METER_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        current = sensor.get("current")
        assert current is not None, "Power meter should report current"
        assert isinstance(current, (int, float)), f"Current should be numeric, got: {type(current)}"
    
    def test_power_meter_has_switch(self, admin_token):
        """Power meter should have switch capability"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{POWER_METER_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        switch_state = sensor.get("switch_state")
        can_switch = sensor.get("can_switch")
        
        assert switch_state in ["on", "off", None], f"Switch state should be on/off, got: {switch_state}"
        assert can_switch is True, "Power meter should be switchable"


class TestTemperatureSensor:
    """Tests for Temperature/Humidity sensor (Sensore Temperatura Esterna)"""
    
    def test_temp_sensor_returns_temperature(self, admin_token):
        """Temperature sensor should return normalized temperature"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{TEMP_SENSOR_POI}/live-sensor",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("has_sensor") is True, "Temperature sensor should have sensor data"
        sensor = data.get("sensor", {})
        
        temperature = sensor.get("temperature")
        assert temperature is not None, "Temperature sensor should report temperature"
        # Temperature should be normalized (not raw value like 850)
        assert -40 <= temperature <= 60, f"Temperature should be reasonable (-40 to 60°C), got: {temperature}"
    
    def test_temp_sensor_returns_humidity(self, admin_token):
        """Temperature sensor should return humidity percentage"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{TEMP_SENSOR_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        humidity = sensor.get("humidity")
        assert humidity is not None, "Temperature sensor should report humidity"
        assert 0 <= humidity <= 100, f"Humidity should be 0-100%, got: {humidity}"
    
    def test_temp_sensor_auto_matched(self, admin_token):
        """Temperature sensor should be auto-matched by POI name"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{TEMP_SENSOR_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        
        # Should have sensor data even without explicit device linkage
        assert data.get("has_sensor") is True
        sensor = data.get("sensor", {})
        assert sensor.get("source") == "ewelink", "Should be from eWeLink"


class TestSwitchDevice:
    """Tests for Switch device (Luci Pedoni)"""
    
    def test_switch_returns_state(self, admin_token):
        """Switch device should return on/off state"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{SWITCH_POI}/live-sensor",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("has_sensor") is True
        sensor = data.get("sensor", {})
        
        switch_state = sensor.get("switch_state")
        assert switch_state in ["on", "off"], f"Switch state should be on/off, got: {switch_state}"
    
    def test_switch_can_be_controlled(self, admin_token):
        """Switch device should be controllable"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{SWITCH_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        can_switch = sensor.get("can_switch")
        assert can_switch is True, "Luci Pedoni should be switchable"


class TestEwelinkIntegration:
    """Tests for eWeLink integration status"""
    
    def test_ewelink_connected(self, admin_token):
        """eWeLink should be connected with devices"""
        response = requests.get(
            f"{BASE_URL}/api/ewelink/status",
            params={"token": admin_token}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("connected") is True, "eWeLink should be connected"
        device_count = data.get("device_count", 0)
        assert device_count > 0, f"Should have devices, got: {device_count}"


class TestNormalizationFunctions:
    """Tests for temperature/humidity normalization"""
    
    def test_temperature_not_raw_value(self, admin_token):
        """Temperature should be normalized, not raw sensor value"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{TEMP_SENSOR_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        temperature = sensor.get("temperature")
        # Raw value would be like 850 (for 8.5°C) - normalized should be 8.5
        assert temperature < 100, f"Temperature should be normalized (not raw), got: {temperature}"
    
    def test_humidity_percentage(self, admin_token):
        """Humidity should be a percentage 0-100"""
        response = requests.get(
            f"{BASE_URL}/api/elettrodomestici/by-poi/{TEMP_SENSOR_POI}/live-sensor",
            params={"token": admin_token}
        )
        data = response.json()
        sensor = data.get("sensor", {})
        
        humidity = sensor.get("humidity")
        # Raw value might be 6500 (for 65%) - normalized should be 65
        assert humidity <= 100, f"Humidity should be percentage (not raw), got: {humidity}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
