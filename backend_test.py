import requests
import sys
import json
from datetime import datetime

class SpokeGalaverasAPITester:
    def __init__(self, base_url="https://spoke-tours.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if headers:
            test_headers.update(headers)
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.passed_tests.append(name)
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:500]
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            return success, response.json() if success and response.text else {}

        except Exception as e:
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_endpoints(self):
        """Test basic health endpoints"""
        print("\n=== TESTING HEALTH ENDPOINTS ===")
        self.run_test("API Root", "GET", "", 200)
        self.run_test("Health Check", "GET", "health", 200)

    def test_admin_login(self):
        """Test admin login functionality"""
        print("\n=== TESTING ADMIN LOGIN ===")
        
        # Test with correct credentials
        success, response = self.run_test(
            "Admin Login (Valid)",
            "POST",
            "admin/login",
            200,
            data={"username": "Galaveras2025", "password": "Gala2025$"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token}")
        
        # Test with invalid credentials
        self.run_test(
            "Admin Login (Invalid)",
            "POST", 
            "admin/login",
            401,
            data={"username": "wrong", "password": "wrong"}
        )

    def test_spaces_endpoints(self):
        """Test spaces CRUD operations"""
        print("\n=== TESTING SPACES ENDPOINTS ===")
        
        # Get all spaces
        success, spaces = self.run_test("Get All Spaces", "GET", "spaces", 200)
        
        # Create a test space with mpskin_url
        test_space_data = {
            "model_id": "test_model_123",
            "name": {
                "it": "Spazio Test",
                "en": "Test Space",
                "fr": "Espace Test",
                "de": "Test Raum"
            },
            "description": {
                "it": "Descrizione test",
                "en": "Test description",
                "fr": "Description test",
                "de": "Test Beschreibung"
            },
            "is_active": True,
            "mpskin_url": "https://example.com/mpskin-overlay"
        }
        
        success, created_space = self.run_test(
            "Create Space with mpskin_url",
            "POST",
            "spaces",
            201,
            data=test_space_data
        )
        
        if success and 'id' in created_space:
            space_id = created_space['id']
            
            # Verify mpskin_url is returned in response
            if 'mpskin_url' in created_space and created_space['mpskin_url'] == "https://example.com/mpskin-overlay":
                print("✅ mpskin_url field correctly saved and returned")
                self.passed_tests.append("mpskin_url field verification")
            else:
                self.failed_tests.append({
                    "test": "mpskin_url field verification",
                    "error": f"mpskin_url not found or incorrect in response: {created_space.get('mpskin_url')}"
                })
            
            # Get specific space and verify mpskin_url
            success_get, space_data = self.run_test(
                "Get Specific Space (verify mpskin_url)",
                "GET",
                f"spaces/{space_id}",
                200
            )
            
            if success_get and space_data.get('mpskin_url') == "https://example.com/mpskin-overlay":
                print("✅ mpskin_url field correctly retrieved")
                self.passed_tests.append("mpskin_url GET verification")
            else:
                self.failed_tests.append({
                    "test": "mpskin_url GET verification",
                    "error": f"mpskin_url not found or incorrect in GET response: {space_data.get('mpskin_url')}"
                })
            
            # Update space with different mpskin_url
            updated_data = test_space_data.copy()
            updated_data['name']['it'] = "Spazio Aggiornato"
            updated_data['mpskin_url'] = "https://example.com/updated-mpskin"
            success_update, updated_space = self.run_test(
                "Update Space (with mpskin_url)",
                "PUT",
                f"spaces/{space_id}",
                200,
                data=updated_data
            )
            
            if success_update and updated_space.get('mpskin_url') == "https://example.com/updated-mpskin":
                print("✅ mpskin_url field correctly updated")
                self.passed_tests.append("mpskin_url PUT verification")
            else:
                self.failed_tests.append({
                    "test": "mpskin_url PUT verification", 
                    "error": f"mpskin_url not updated correctly: {updated_space.get('mpskin_url')}"
                })
            
            # Delete space
            self.run_test(
                "Delete Space",
                "DELETE",
                f"spaces/{space_id}",
                200
            )

    def test_costumes_endpoints(self):
        """Test costumes endpoints"""
        print("\n=== TESTING COSTUMES ENDPOINTS ===")
        
        # Get all costumes
        self.run_test("Get All Costumes", "GET", "costumes", 200)
        
        # Test with search parameter
        self.run_test("Search Costumes", "GET", "costumes?search=test", 200)

    def test_pois_endpoints(self):
        """Test POIs endpoints"""
        print("\n=== TESTING POIS ENDPOINTS ===")
        
        # Get all POIs
        self.run_test("Get All POIs", "GET", "pois", 200)

    def test_project_endpoints(self):
        """Test project content endpoints"""
        print("\n=== TESTING PROJECT ENDPOINTS ===")
        
        # Get project content
        self.run_test("Get Project Content", "GET", "project", 200)

    def test_translation_service(self):
        """Test translation service"""
        print("\n=== TESTING TRANSLATION SERVICE ===")
        
        translation_data = {
            "text": "Ciao mondo",
            "source_lang": "it",
            "target_langs": ["en", "fr"]
        }
        
        self.run_test(
            "Translation Service",
            "POST",
            "translate",
            200,
            data=translation_data
        )

    def test_tts_service(self):
        """Test TTS service"""
        print("\n=== TESTING TTS SERVICE ===")
        
        tts_data = {
            "text": "Ciao, questo è un test",
            "lang": "it"
        }
        
        self.run_test(
            "TTS Service",
            "POST",
            "tts",
            200,
            data=tts_data
        )

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*50}")
        print(f"📊 TEST SUMMARY")
        print(f"{'='*50}")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"   - {failure.get('test', 'Unknown')}")
                if 'error' in failure:
                    print(f"     Error: {failure['error']}")
                elif 'expected' in failure:
                    print(f"     Expected: {failure['expected']}, Got: {failure['actual']}")
        
        if self.passed_tests:
            print(f"\n✅ PASSED TESTS:")
            for test in self.passed_tests:
                print(f"   - {test}")

def main():
    print("🚀 Starting Spoke Galaveras API Tests")
    print("="*50)
    
    tester = SpokeGalaverasAPITester()
    
    # Run all tests
    tester.test_health_endpoints()
    tester.test_admin_login()
    tester.test_spaces_endpoints()
    tester.test_costumes_endpoints()
    tester.test_pois_endpoints()
    tester.test_project_endpoints()
    tester.test_translation_service()
    tester.test_tts_service()
    
    # Print summary
    tester.print_summary()
    
    # Return appropriate exit code
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())