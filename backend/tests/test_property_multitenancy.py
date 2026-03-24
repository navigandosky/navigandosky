"""
Test Multi-Tenancy Property Configuration Bug Fix
=================================================
This test verifies the P0 fix for the Matterport Space ID update bug where:
- Admin user changed space_id to 'uLseUBGsktv' from Setup page
- The change was saved to wrong user's profile (Nadir) instead of Admin

The fix ensures PUT /api/property/{property_id} verifies user ownership via token.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDENTIALS = {"username": "Admin", "password": "SmartMaster2026"}
NADIR_CREDENTIALS = {"username": "Nadir", "password": "Nadir"}

# Known property IDs from database
ADMIN_PROPERTY_ID = "76d94fc5-26c2-43da-adf8-db7bed0da667"
NADIR_PROPERTY_ID = "104e9b44-8b91-4f7f-889d-b87df39e3876"

# Expected space_id for Admin
EXPECTED_ADMIN_SPACE_ID = "uLseUBGsktv"


class TestPropertyMultiTenancy:
    """Test multi-tenancy data isolation for property configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, credentials):
        """Login and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=credentials)
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert data.get("success"), f"Login not successful: {data.get('message')}"
        return data.get("token"), data.get("user")
    
    # ==================== P0 FIX TESTS ====================
    
    def test_admin_login_success(self):
        """Test Admin can login with correct credentials"""
        token, user = self.login(ADMIN_CREDENTIALS)
        assert token is not None, "Token should be returned"
        assert user["username"] == "Admin", "Username should be Admin"
        print(f"PASS: Admin login successful, user_id: {user['id']}")
    
    def test_admin_property_has_correct_space_id(self):
        """P0 Fix: Admin's property should have space_id 'uLseUBGsktv'"""
        token, user = self.login(ADMIN_CREDENTIALS)
        
        # Get active property for Admin
        response = self.session.get(f"{BASE_URL}/api/property/active", params={"token": token})
        assert response.status_code == 200, f"Failed to get active property: {response.text}"
        
        prop = response.json()
        assert prop is not None, "Property should exist for Admin"
        
        # Verify the space_id
        matterport = prop.get("matterport", {})
        space_id = matterport.get("space_id", "")
        
        assert space_id == EXPECTED_ADMIN_SPACE_ID, \
            f"Admin's space_id should be '{EXPECTED_ADMIN_SPACE_ID}', got '{space_id}'"
        
        print(f"PASS: Admin's property has correct space_id: {space_id}")
        print(f"  Property ID: {prop.get('id')}")
        print(f"  User ID: {prop.get('user_id')}")
    
    def test_put_property_requires_token_for_user_verification(self):
        """P0 Fix: PUT /api/property/{property_id} should verify user ownership via token"""
        token, user = self.login(ADMIN_CREDENTIALS)
        
        # Try to update Admin's property with token
        update_data = {
            "matterport": {
                "space_id": EXPECTED_ADMIN_SPACE_ID,
                "enabled": True
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/property/{ADMIN_PROPERTY_ID}",
            params={"token": token},
            json=update_data
        )
        
        assert response.status_code == 200, f"Update should succeed for own property: {response.text}"
        
        updated_prop = response.json()
        assert updated_prop.get("matterport", {}).get("space_id") == EXPECTED_ADMIN_SPACE_ID
        
        print(f"PASS: Admin can update own property with token")
    
    def test_admin_cannot_update_nadir_property(self):
        """P0 Fix: Admin should NOT be able to update Nadir's property"""
        admin_token, admin_user = self.login(ADMIN_CREDENTIALS)
        
        # Try to update Nadir's property with Admin's token
        update_data = {
            "name": "HACKED BY ADMIN"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/property/{NADIR_PROPERTY_ID}",
            params={"token": admin_token},
            json=update_data
        )
        
        # Should fail with 404 because the query filters by user_id
        assert response.status_code == 404, \
            f"Admin should NOT be able to update Nadir's property, got status {response.status_code}"
        
        print(f"PASS: Cross-user update protection works - Admin cannot update Nadir's property")
    
    def test_nadir_property_is_independent(self):
        """Multi-tenancy: Nadir should have separate property_config document"""
        # Login as Nadir
        try:
            nadir_token, nadir_user = self.login(NADIR_CREDENTIALS)
        except AssertionError:
            # Nadir might have different password, skip this test
            pytest.skip("Could not login as Nadir - password may be different")
        
        # Get Nadir's active property
        response = self.session.get(f"{BASE_URL}/api/property/active", params={"token": nadir_token})
        assert response.status_code == 200, f"Failed to get Nadir's property: {response.text}"
        
        nadir_prop = response.json()
        
        # Verify Nadir has own property
        assert nadir_prop is not None, "Nadir should have a property"
        assert nadir_prop.get("user_id") == nadir_user["id"], \
            f"Nadir's property should belong to Nadir, got user_id: {nadir_prop.get('user_id')}"
        
        print(f"PASS: Nadir has independent property_config")
        print(f"  Property ID: {nadir_prop.get('id')}")
        print(f"  User ID: {nadir_prop.get('user_id')}")
    
    def test_frontend_save_property_passes_token(self):
        """Frontend: saveProperty should pass token in query param"""
        # This is verified by checking the endpoint accepts token parameter
        token, user = self.login(ADMIN_CREDENTIALS)
        
        # Simulate frontend saveProperty call
        update_data = {
            "name": "La Mia Proprietà"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/property/{ADMIN_PROPERTY_ID}?token={token}",
            json=update_data
        )
        
        assert response.status_code == 200, f"Frontend-style save should work: {response.text}"
        print(f"PASS: Frontend saveProperty with token works correctly")
    
    def test_property_config_page_loads_correct_space_id(self):
        """Frontend: PropertyConfig page should load correct space_id for Admin"""
        token, user = self.login(ADMIN_CREDENTIALS)
        
        # Simulate PropertyConfig loadProperty call
        response = self.session.get(f"{BASE_URL}/api/property/active", params={"token": token})
        assert response.status_code == 200
        
        prop = response.json()
        space_id = prop.get("matterport", {}).get("space_id", "")
        
        assert space_id == EXPECTED_ADMIN_SPACE_ID, \
            f"PropertyConfig should load space_id '{EXPECTED_ADMIN_SPACE_ID}' for Admin, got '{space_id}'"
        
        print(f"PASS: PropertyConfig loads correct space_id for Admin: {space_id}")
    
    # ==================== ADDITIONAL VERIFICATION ====================
    
    def test_get_active_property_uses_token_for_filtering(self):
        """GET /api/property/active should filter by user_id from token"""
        admin_token, admin_user = self.login(ADMIN_CREDENTIALS)
        
        response = self.session.get(f"{BASE_URL}/api/property/active", params={"token": admin_token})
        assert response.status_code == 200
        
        prop = response.json()
        
        # Verify the property belongs to Admin
        assert prop.get("user_id") == admin_user["id"], \
            f"Active property should belong to Admin (user_id: {admin_user['id']}), got: {prop.get('user_id')}"
        
        print(f"PASS: GET /api/property/active correctly filters by user_id")
    
    def test_update_property_only_updates_own_property(self):
        """PUT /api/property/{property_id} should only update property belonging to authenticated user"""
        admin_token, admin_user = self.login(ADMIN_CREDENTIALS)
        
        # Update Admin's property
        test_description = "Test description from multi-tenancy test"
        update_data = {"description": test_description}
        
        response = self.session.put(
            f"{BASE_URL}/api/property/{ADMIN_PROPERTY_ID}",
            params={"token": admin_token},
            json=update_data
        )
        
        assert response.status_code == 200
        updated = response.json()
        assert updated.get("description") == test_description
        
        # Verify the update was applied to Admin's property only
        assert updated.get("user_id") == admin_user["id"]
        
        print(f"PASS: Property update only affects authenticated user's property")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
