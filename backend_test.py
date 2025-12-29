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
        success, pois = self.run_test("Get All POIs", "GET", "pois", 200)
        
        # Create a test space first for POI testing
        test_space_data = {
            "model_id": "test_poi_space",
            "name": {"it": "Spazio per POI Test", "en": "POI Test Space", "fr": "Espace Test POI", "de": "POI Test Raum"},
            "description": {"it": "Test", "en": "Test", "fr": "Test", "de": "Test"},
            "is_active": True
        }
        
        success_space, created_space = self.run_test(
            "Create Space for POI Test",
            "POST",
            "spaces",
            201,
            data=test_space_data
        )
        
        if success_space and 'id' in created_space:
            space_id = created_space['id']
            
            # Create a test POI
            test_poi_data = {
                "space_id": space_id,
                "matterport_tag_id": "test_tag_123",
                "name": {
                    "it": "POI Test",
                    "en": "Test POI",
                    "fr": "POI Test",
                    "de": "Test POI"
                },
                "description": {
                    "it": "Descrizione POI per test audio",
                    "en": "POI description for audio test",
                    "fr": "Description POI pour test audio",
                    "de": "POI Beschreibung für Audio Test"
                },
                "audio_url": {
                    "it": "/api/audio/test_it.mp3",
                    "en": "/api/audio/test_en.mp3"
                }
            }
            
            success_poi, created_poi = self.run_test(
                "Create POI with audio_url",
                "POST",
                "pois",
                201,
                data=test_poi_data
            )
            
            if success_poi and 'id' in created_poi:
                poi_id = created_poi['id']
                
                # Verify audio_url is returned correctly
                if 'audio_url' in created_poi and created_poi['audio_url'].get('it') == "/api/audio/test_it.mp3":
                    print("✅ POI audio_url field correctly saved")
                    self.passed_tests.append("POI audio_url creation verification")
                else:
                    self.failed_tests.append({
                        "test": "POI audio_url creation verification",
                        "error": f"audio_url not found or incorrect: {created_poi.get('audio_url')}"
                    })
                
                # Update POI with new audio URLs
                updated_poi_data = test_poi_data.copy()
                updated_poi_data['audio_url'] = {
                    "it": "/api/audio/updated_it.mp3",
                    "en": "/api/audio/updated_en.mp3",
                    "fr": "/api/audio/updated_fr.mp3",
                    "de": "/api/audio/updated_de.mp3"
                }
                
                success_update, updated_poi = self.run_test(
                    "Update POI audio_url",
                    "PUT",
                    f"pois/{poi_id}",
                    200,
                    data=updated_poi_data
                )
                
                if success_update and updated_poi.get('audio_url', {}).get('fr') == "/api/audio/updated_fr.mp3":
                    print("✅ POI audio_url field correctly updated")
                    self.passed_tests.append("POI audio_url update verification")
                else:
                    self.failed_tests.append({
                        "test": "POI audio_url update verification",
                        "error": f"audio_url not updated correctly: {updated_poi.get('audio_url')}"
                    })
                
                # Get specific POI to verify persistence
                success_get, poi_data = self.run_test(
                    "Get Specific POI (verify audio_url)",
                    "GET",
                    f"pois/{poi_id}",
                    200
                )
                
                if success_get and poi_data.get('audio_url', {}).get('de') == "/api/audio/updated_de.mp3":
                    print("✅ POI audio_url field correctly persisted")
                    self.passed_tests.append("POI audio_url persistence verification")
                else:
                    self.failed_tests.append({
                        "test": "POI audio_url persistence verification",
                        "error": f"audio_url not persisted correctly: {poi_data.get('audio_url')}"
                    })
                
                # Clean up - delete POI
                self.run_test(
                    "Delete Test POI",
                    "DELETE",
                    f"pois/{poi_id}",
                    200
                )
            
            # Clean up - delete space
            self.run_test(
                "Delete Test Space",
                "DELETE",
                f"spaces/{space_id}",
                200
            )

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
        """Test TTS service with multiple languages"""
        print("\n=== TESTING TTS SERVICE ===")
        
        # Test Italian TTS
        tts_data_it = {
            "text": "Benvenuti alla mostra di costumi storici di Galaveras",
            "lang": "it"
        }
        
        success_it, response_it = self.run_test(
            "TTS Service (Italian)",
            "POST",
            "tts",
            200,
            data=tts_data_it
        )
        
        if success_it and 'audio_url' in response_it:
            print(f"✅ Italian TTS generated audio: {response_it['audio_url']}")
            self.passed_tests.append("TTS Italian audio generation")
        else:
            self.failed_tests.append({
                "test": "TTS Italian audio generation",
                "error": f"No audio_url in response: {response_it}"
            })
        
        # Test English TTS
        tts_data_en = {
            "text": "Welcome to the historic costume exhibition of Galaveras",
            "lang": "en"
        }
        
        success_en, response_en = self.run_test(
            "TTS Service (English)",
            "POST",
            "tts",
            200,
            data=tts_data_en
        )
        
        if success_en and 'audio_url' in response_en:
            print(f"✅ English TTS generated audio: {response_en['audio_url']}")
            self.passed_tests.append("TTS English audio generation")
        else:
            self.failed_tests.append({
                "test": "TTS English audio generation",
                "error": f"No audio_url in response: {response_en}"
            })
        
        # Test French TTS
        tts_data_fr = {
            "text": "Bienvenue à l'exposition de costumes historiques de Galaveras",
            "lang": "fr"
        }
        
        success_fr, response_fr = self.run_test(
            "TTS Service (French)",
            "POST",
            "tts",
            200,
            data=tts_data_fr
        )
        
        if success_fr and 'audio_url' in response_fr:
            print(f"✅ French TTS generated audio: {response_fr['audio_url']}")
            self.passed_tests.append("TTS French audio generation")
        else:
            self.failed_tests.append({
                "test": "TTS French audio generation",
                "error": f"No audio_url in response: {response_fr}"
            })
        
        # Test German TTS
        tts_data_de = {
            "text": "Willkommen zur historischen Kostümausstellung von Galaveras",
            "lang": "de"
        }
        
        success_de, response_de = self.run_test(
            "TTS Service (German)",
            "POST",
            "tts",
            200,
            data=tts_data_de
        )
        
        if success_de and 'audio_url' in response_de:
            print(f"✅ German TTS generated audio: {response_de['audio_url']}")
            self.passed_tests.append("TTS German audio generation")
        else:
            self.failed_tests.append({
                "test": "TTS German audio generation",
                "error": f"No audio_url in response: {response_de}"
            })

    def test_new_features(self):
        """Test the newly implemented features: mpskin_url and TTS integration"""
        print("\n=== TESTING NEW FEATURES (MPSKIN_URL & TTS INTEGRATION) ===")
        
        # Test 1: Create space without mpskin_url (should work)
        space_without_mpskin = {
            "model_id": "test_no_mpskin",
            "name": {"it": "Spazio Senza Mpskin", "en": "Space Without Mpskin", "fr": "Espace Sans Mpskin", "de": "Raum Ohne Mpskin"},
            "description": {"it": "Test", "en": "Test", "fr": "Test", "de": "Test"},
            "is_active": True
        }
        
        success1, space1 = self.run_test(
            "Create Space WITHOUT mpskin_url",
            "POST",
            "spaces",
            201,
            data=space_without_mpskin
        )
        
        if success1 and space1.get('mpskin_url') is None:
            print("✅ Space created successfully without mpskin_url")
            self.passed_tests.append("Space creation without mpskin_url")
        else:
            self.failed_tests.append({
                "test": "Space creation without mpskin_url",
                "error": f"Unexpected mpskin_url value: {space1.get('mpskin_url')}"
            })
        
        # Test 2: Create space with mpskin_url
        space_with_mpskin = {
            "model_id": "test_with_mpskin",
            "name": {"it": "Spazio Con Mpskin", "en": "Space With Mpskin", "fr": "Espace Avec Mpskin", "de": "Raum Mit Mpskin"},
            "description": {"it": "Test", "en": "Test", "fr": "Test", "de": "Test"},
            "is_active": True,
            "mpskin_url": "https://mpskin.example.com/overlay/12345"
        }
        
        success2, space2 = self.run_test(
            "Create Space WITH mpskin_url",
            "POST",
            "spaces",
            201,
            data=space_with_mpskin
        )
        
        if success2 and space2.get('mpskin_url') == "https://mpskin.example.com/overlay/12345":
            print("✅ Space created successfully with mpskin_url")
            self.passed_tests.append("Space creation with mpskin_url")
        else:
            self.failed_tests.append({
                "test": "Space creation with mpskin_url",
                "error": f"mpskin_url not saved correctly: {space2.get('mpskin_url')}"
            })
        
        # Test 3: TTS + POI Integration Test
        if success2 and 'id' in space2:
            space_id = space2['id']
            
            # Create POI for TTS testing
            poi_for_tts = {
                "space_id": space_id,
                "name": {"it": "POI per TTS", "en": "POI for TTS", "fr": "POI pour TTS", "de": "POI für TTS"},
                "description": {"it": "Questo è un punto di interesse per testare la generazione audio TTS", "en": "This is a point of interest for testing TTS audio generation", "fr": "Ceci est un point d'intérêt pour tester la génération audio TTS", "de": "Dies ist ein Interessenspunkt zum Testen der TTS-Audiogenerierung"}
            }
            
            success_poi, created_poi = self.run_test(
                "Create POI for TTS Integration Test",
                "POST",
                "pois",
                201,
                data=poi_for_tts
            )
            
            if success_poi and 'id' in created_poi:
                poi_id = created_poi['id']
                
                # Generate TTS for Italian description
                tts_request = {
                    "text": created_poi['description']['it'],
                    "lang": "it"
                }
                
                success_tts, tts_response = self.run_test(
                    "Generate TTS for POI Description",
                    "POST",
                    "tts",
                    200,
                    data=tts_request
                )
                
                if success_tts and 'audio_url' in tts_response:
                    # Update POI with generated audio URL
                    updated_poi = poi_for_tts.copy()
                    updated_poi['audio_url'] = {"it": tts_response['audio_url']}
                    
                    success_update, updated_poi_response = self.run_test(
                        "Update POI with TTS Audio URL",
                        "PUT",
                        f"pois/{poi_id}",
                        200,
                        data=updated_poi
                    )
                    
                    if success_update and updated_poi_response.get('audio_url', {}).get('it') == tts_response['audio_url']:
                        print("✅ TTS + POI Integration successful")
                        self.passed_tests.append("TTS + POI Integration")
                    else:
                        self.failed_tests.append({
                            "test": "TTS + POI Integration",
                            "error": f"POI audio_url not updated with TTS result: {updated_poi_response.get('audio_url')}"
                        })
                
                # Clean up POI
                self.run_test("Delete TTS Test POI", "DELETE", f"pois/{poi_id}", 200)
        
        # Clean up spaces
        if success1 and 'id' in space1:
            self.run_test("Delete Test Space 1", "DELETE", f"spaces/{space1['id']}", 200)
        if success2 and 'id' in space2:
            self.run_test("Delete Test Space 2", "DELETE", f"spaces/{space2['id']}", 200)

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