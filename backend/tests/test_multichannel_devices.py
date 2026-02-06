"""
Test suite for SmartDomo Multi-Channel Device Support
Tests eWeLink multi-channel devices (SonOff 4-channel) expansion and control
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://smarthome3d.preview.emergentagent.com').rstrip('/')


class TestEwelinkDevicesAPI:
    """Test eWeLink devices API with multi-channel expansion"""
    
    def test_ewelink_devices_returns_expanded_channels(self):
        """Test that /api/ewelink/devices returns expanded multi-channel devices"""
        response = requests.get(f"{BASE_URL}/api/ewelink/devices")
        assert response.status_code == 200
        
        data = response.json()
        assert "devices" in data
        assert data.get("source") == "ewelink"
        
        devices = data["devices"]
        # Should have more than 26 devices due to channel expansion
        assert len(devices) > 26, f"Expected more than 26 devices, got {len(devices)}"
        
        # Check for multi-channel devices
        channel_devices = [d for d in devices if d.get("is_channel") == True]
        assert len(channel_devices) > 0, "No channel devices found"
        
        # Check for parent devices with has_channels flag
        parent_devices = [d for d in devices if d.get("has_channels") == True]
        assert len(parent_devices) > 0, "No parent multi-channel devices found"
    
    def test_irrigazione_prato_has_4_channels(self):
        """Test that Irrigazione prato device is expanded into 4 channels"""
        response = requests.get(f"{BASE_URL}/api/ewelink/devices")
        assert response.status_code == 200
        
        devices = response.json()["devices"]
        
        # Find Irrigazione prato channels
        irrigazione_channels = [d for d in devices if "Irrigazione prato" in d.get("name", "") and d.get("is_channel")]
        assert len(irrigazione_channels) == 4, f"Expected 4 Irrigazione prato channels, got {len(irrigazione_channels)}"
        
        # Verify channel IDs
        expected_ids = ["1000bab658_ch0", "1000bab658_ch1", "1000bab658_ch2", "1000bab658_ch3"]
        actual_ids = [d["id"] for d in irrigazione_channels]
        for expected_id in expected_ids:
            assert expected_id in actual_ids, f"Missing channel ID: {expected_id}"
        
        # Verify channel names
        for i, channel in enumerate(sorted(irrigazione_channels, key=lambda x: x["id"])):
            assert f"CH{i+1}" in channel["name"], f"Channel {i} missing CH badge in name"
    
    def test_serv_cancello_has_4_channels(self):
        """Test that Serv cancello device is expanded into 4 channels"""
        response = requests.get(f"{BASE_URL}/api/ewelink/devices")
        assert response.status_code == 200
        
        devices = response.json()["devices"]
        
        # Find Serv cancello channels
        cancello_channels = [d for d in devices if "Serv cancello" in d.get("name", "") and d.get("is_channel")]
        assert len(cancello_channels) == 4, f"Expected 4 Serv cancello channels, got {len(cancello_channels)}"
        
        # Verify channel IDs
        expected_ids = ["10017b82bf_ch0", "10017b82bf_ch1", "10017b82bf_ch2", "10017b82bf_ch3"]
        actual_ids = [d["id"] for d in cancello_channels]
        for expected_id in expected_ids:
            assert expected_id in actual_ids, f"Missing channel ID: {expected_id}"


class TestSmartThingsDevicesWithSensorsAPI:
    """Test SmartThings devices-with-sensors API with eWeLink fallback"""
    
    def test_devices_with_sensors_returns_expanded_channels(self):
        """Test that /api/smartthings/devices-with-sensors returns expanded channels via eWeLink fallback"""
        response = requests.get(f"{BASE_URL}/api/smartthings/devices-with-sensors")
        assert response.status_code == 200
        
        data = response.json()
        assert "devices" in data
        
        # Should be using eWeLink fallback (SmartThings token expired)
        assert data.get("source") == "ewelink", "Expected eWeLink fallback"
        
        devices = data["devices"]
        # Should have expanded channels
        assert len(devices) > 26, f"Expected more than 26 devices, got {len(devices)}"
        
        # Check for is_channel flag
        channel_devices = [d for d in devices if d.get("is_channel") == True]
        assert len(channel_devices) > 0, "No channel devices found in devices-with-sensors"
    
    def test_channel_devices_have_switch_state(self):
        """Test that channel devices have switch state"""
        response = requests.get(f"{BASE_URL}/api/smartthings/devices-with-sensors")
        assert response.status_code == 200
        
        devices = response.json()["devices"]
        channel_devices = [d for d in devices if d.get("is_channel") == True]
        
        for device in channel_devices:
            # Channel devices should have switch state
            assert "switch" in device or "switchState" in device, f"Channel device {device['id']} missing switch state"
            # Channel devices should be switchable
            assert device.get("canSwitch") == True, f"Channel device {device['id']} should be switchable"


class TestChannelToggleAPI:
    """Test toggle functionality for multi-channel devices"""
    
    def test_toggle_channel_on(self):
        """Test turning on a specific channel"""
        # Use Irrigazione prato CH1
        device_id = "1000bab658_ch0"
        
        response = requests.post(f"{BASE_URL}/api/ewelink/device/{device_id}/switch/on")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("device_id") == device_id
        assert data.get("action") == "on"
    
    def test_toggle_channel_off(self):
        """Test turning off a specific channel"""
        # Use Irrigazione prato CH1
        device_id = "1000bab658_ch0"
        
        response = requests.post(f"{BASE_URL}/api/ewelink/device/{device_id}/switch/off")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("device_id") == device_id
        assert data.get("action") == "off"
    
    def test_toggle_invalid_action_returns_400(self):
        """Test that invalid action returns 400"""
        device_id = "1000bab658_ch0"
        
        response = requests.post(f"{BASE_URL}/api/ewelink/device/{device_id}/switch/invalid")
        assert response.status_code == 400


class TestAuthenticationAPI:
    """Test authentication endpoints"""
    
    def test_admin_login_success(self):
        """Test Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "SmartMaster2026"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("token") is not None
        assert data.get("user", {}).get("username") == "Admin"
        assert data.get("user", {}).get("role") == "admin"
    
    def test_login_wrong_password_fails(self):
        """Test login with wrong password fails"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "username": "Admin",
            "password": "wrongpassword"
        })
        assert response.status_code == 200  # Returns 200 with success=False
        
        data = response.json()
        assert data.get("success") == False


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
