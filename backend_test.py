#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class SpokeGhivineAPITester:
    def __init__(self, base_url="https://spoke-ghivine-3d.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", expected="", actual=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "expected": expected,
            "actual": actual,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if not success and expected:
            print(f"    Expected: {expected}")
            print(f"    Actual: {actual}")
        print()

    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_keys = ["message", "version"]
                has_keys = all(key in data for key in expected_keys)
                if has_keys:
                    self.log_test("API Root Endpoint", True, f"Response: {data}")
                else:
                    self.log_test("API Root Endpoint", False, "Missing expected keys", str(expected_keys), str(list(data.keys())))
            else:
                self.log_test("API Root Endpoint", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test("API Root Endpoint", False, f"Exception: {str(e)}")

    def test_get_config(self):
        """Test GET /api/config endpoint"""
        try:
            response = requests.get(f"{self.api_url}/config", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_keys = ["matterport_sdk_key", "languages", "language_names"]
                has_keys = all(key in data for key in expected_keys)
                
                if has_keys:
                    # Check if matterport_sdk_key is present
                    sdk_key = data.get("matterport_sdk_key", "")
                    languages = data.get("languages", [])
                    expected_langs = ["it", "en", "fr", "de"]
                    
                    if sdk_key and set(languages) == set(expected_langs):
                        self.log_test("GET /api/config", True, f"SDK Key: {sdk_key[:10]}..., Languages: {languages}")
                    else:
                        self.log_test("GET /api/config", False, "Invalid config data", f"SDK key and {expected_langs}", f"SDK: {sdk_key}, Languages: {languages}")
                else:
                    self.log_test("GET /api/config", False, "Missing expected keys", str(expected_keys), str(list(data.keys())))
            else:
                self.log_test("GET /api/config", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test("GET /api/config", False, f"Exception: {str(e)}")

    def test_seed_data(self):
        """Test seeding initial data"""
        try:
            response = requests.post(f"{self.api_url}/seed", timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.log_test("Seed Data", True, f"Response: {data}")
            else:
                self.log_test("Seed Data", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test("Seed Data", False, f"Exception: {str(e)}")

    def test_get_spaces(self):
        """Test GET /api/spaces endpoint"""
        try:
            response = requests.get(f"{self.api_url}/spaces", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    spaces_count = len(data)
                    if spaces_count >= 3:
                        # Check if we have the expected spaces
                        space_names = [space.get("name", {}).get("it", "") for space in data]
                        expected_space = "Grotta del Bue Marino"
                        has_expected = any(expected_space in name for name in space_names)
                        
                        if has_expected:
                            self.log_test("GET /api/spaces", True, f"Found {spaces_count} spaces including '{expected_space}'")
                            return data  # Return spaces for further testing
                        else:
                            self.log_test("GET /api/spaces", False, f"Missing expected space", expected_space, str(space_names))
                    else:
                        self.log_test("GET /api/spaces", False, f"Expected at least 3 spaces", ">=3", str(spaces_count))
                else:
                    self.log_test("GET /api/spaces", False, "Response not a list", "list", str(type(data)))
            else:
                self.log_test("GET /api/spaces", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test("GET /api/spaces", False, f"Exception: {str(e)}")
        
        return []

    def test_get_single_space(self, space_id):
        """Test GET /api/spaces/{id} endpoint"""
        try:
            response = requests.get(f"{self.api_url}/spaces/{space_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ["id", "name", "description", "matterport_model_id"]
                has_fields = all(field in data for field in required_fields)
                
                if has_fields:
                    self.log_test(f"GET /api/spaces/{space_id}", True, f"Space: {data.get('name', {}).get('it', 'Unknown')}")
                else:
                    self.log_test(f"GET /api/spaces/{space_id}", False, "Missing required fields", str(required_fields), str(list(data.keys())))
            else:
                self.log_test(f"GET /api/spaces/{space_id}", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test(f"GET /api/spaces/{space_id}", False, f"Exception: {str(e)}")

    def test_get_pois(self):
        """Test GET /api/pois endpoint"""
        try:
            response = requests.get(f"{self.api_url}/pois", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET /api/pois", True, f"Found {len(data)} POIs")
                    return data
                else:
                    self.log_test("GET /api/pois", False, "Response not a list", "list", str(type(data)))
            else:
                self.log_test("GET /api/pois", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test("GET /api/pois", False, f"Exception: {str(e)}")
        
        return []

    def test_translation_api(self):
        """Test POST /api/translate endpoint"""
        try:
            test_data = {
                "text": "Benvenuti nella Grotta del Bue Marino",
                "source_lang": "it",
                "target_lang": "en"
            }
            
            response = requests.post(f"{self.api_url}/translate", json=test_data, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if "translation" in data:
                    translation = data["translation"]
                    if translation and len(translation) > 0:
                        self.log_test("Translation API", True, f"IT->EN: '{test_data['text']}' -> '{translation}'")
                    else:
                        self.log_test("Translation API", False, "Empty translation", "non-empty string", "empty")
                else:
                    self.log_test("Translation API", False, "Missing translation field", "translation key", str(list(data.keys())))
            else:
                self.log_test("Translation API", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test("Translation API", False, f"Exception: {str(e)}")

    def test_create_space(self):
        """Test POST /api/spaces endpoint"""
        try:
            test_space = {
                "name": {
                    "it": "Spazio Test",
                    "en": "Test Space",
                    "fr": "Espace Test",
                    "de": "Test Raum"
                },
                "description": {
                    "it": "Descrizione di test",
                    "en": "Test description",
                    "fr": "Description de test",
                    "de": "Test Beschreibung"
                },
                "matterport_model_id": "test123",
                "images": [],
                "is_active": True,
                "order": 99
            }
            
            response = requests.post(f"{self.api_url}/spaces", json=test_space, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if "id" in data:
                    space_id = data["id"]
                    self.log_test("Create Space", True, f"Created space with ID: {space_id}")
                    
                    # Clean up - delete the test space
                    try:
                        requests.delete(f"{self.api_url}/spaces/{space_id}", timeout=10)
                    except:
                        pass
                        
                    return space_id
                else:
                    self.log_test("Create Space", False, "Missing ID in response", "id field", str(list(data.keys())))
            else:
                self.log_test("Create Space", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test("Create Space", False, f"Exception: {str(e)}")
        
        return None

    def test_file_upload(self):
        """Test image upload endpoint"""
        try:
            # Create a small test image data (1x1 pixel PNG)
            import base64
            test_image_data = base64.b64decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAGAWA0drAAAAABJRU5ErkJggg=="
            )
            
            files = {'file': ('test.png', test_image_data, 'image/png')}
            response = requests.post(f"{self.api_url}/upload/image", files=files, timeout=10)
            
            success = response.status_code == 200
            
            if success:
                data = response.json()
                if "url" in data:
                    self.log_test("Image Upload", True, f"Uploaded image: {data['url']}")
                else:
                    self.log_test("Image Upload", False, "Missing URL in response", "url field", str(list(data.keys())))
            else:
                self.log_test("Image Upload", False, f"HTTP {response.status_code}", "200", str(response.status_code))
                
        except Exception as e:
            self.log_test("Image Upload", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Spoke Ghivine Backend API Tests")
        print("=" * 60)
        
        # Test basic connectivity
        self.test_api_root()
        
        # Test configuration
        self.test_get_config()
        
        # Seed data first
        self.test_seed_data()
        
        # Test spaces endpoints
        spaces = self.test_get_spaces()
        if spaces:
            # Test getting a single space (use first space)
            self.test_get_single_space(spaces[0]["id"])
        
        # Test POIs
        self.test_get_pois()
        
        # Test translation API
        self.test_translation_api()
        
        # Test CRUD operations
        self.test_create_space()
        
        # Test file upload
        self.test_file_upload()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = SpokeGhivineAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())