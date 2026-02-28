#!/usr/bin/env python3
"""
Backend API Testing for Home Tadasuni Real Estate CMS (Immobili)
Tests all immobili-related endpoints and admin functionality
"""

import requests
import json
import os
import tempfile
from pathlib import Path

# Get backend URL from frontend .env file
BACKEND_URL = "https://tadasuni-tourism.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_USERNAME = "visittadasuni"
ADMIN_PASSWORD = "Tadasuni2025$"

class ImmobiliTester:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.test_immobile_id = None
        self.test_image_id = None
        self.test_attachment_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details
        })
    
    def test_admin_login(self):
        """Test admin login functionality"""
        try:
            response = self.session.post(f"{API_BASE}/admin/login", json={
                "username": ADMIN_USERNAME,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("token"):
                    self.admin_token = data["token"]
                    self.log_result("Admin Login", True, "Login successful")
                    return True
                else:
                    self.log_result("Admin Login", False, "Login response missing success/token")
                    return False
            else:
                self.log_result("Admin Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Admin Login", False, f"Exception: {str(e)}")
            return False
    
    def test_google_maps_config(self):
        """Test Google Maps API key endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/config/maps")
            
            if response.status_code == 200:
                data = response.json()
                if "api_key" in data:
                    api_key = data["api_key"]
                    if api_key and len(api_key) > 10:  # Basic validation
                        self.log_result("Google Maps Config", True, f"API key retrieved (length: {len(api_key)})")
                        return True
                    else:
                        self.log_result("Google Maps Config", False, "API key is empty or too short")
                        return False
                else:
                    self.log_result("Google Maps Config", False, "Response missing api_key field")
                    return False
            else:
                self.log_result("Google Maps Config", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Google Maps Config", False, f"Exception: {str(e)}")
            return False
    
    def test_get_immobili_empty(self):
        """Test getting immobili when database might be empty"""
        try:
            response = self.session.get(f"{API_BASE}/immobili")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get Immobili (Empty)", True, f"Retrieved {len(data)} properties")
                    return True
                else:
                    self.log_result("Get Immobili (Empty)", False, "Response is not a list")
                    return False
            else:
                self.log_result("Get Immobili (Empty)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Immobili (Empty)", False, f"Exception: {str(e)}")
            return False
    
    def test_create_immobile(self):
        """Test creating a new property"""
        try:
            immobile_data = {
                "denominazione": "Casa Tradizionale Tadasuni",
                "indirizzo_via": "Via Roma 15",
                "indirizzo_comune": "Tadasuni",
                "indirizzo_provincia": "OR",
                "indirizzo_regione": "Sardegna",
                "tipo_bene": "edificato",
                "destinazione_uso": "residenziale",
                "tipologia": "casa_singola",
                "superficie_lorda_mq": 120.5,
                "n_vani": 4,
                "anno_costruzione": 1950,
                "stato_conservazione": "buono",
                "stato_occupazione": "libero",
                "prezzo_richiesto": 85000.0,
                "prezzo_mq": 708.33,
                "prezzo_pubblico": True,
                "descrizione_narrativa": "Caratteristica casa tradizionale nel centro storico di Tadasuni, con vista panoramica sul lago Omodeo.",
                "punti_forza": "Vista lago, posizione centrale, caratteristiche originali",
                "target_ideale": "famiglie, investitori",
                "potenzialita_uso": "residenza, b&b",
                "impianto_idrico": True,
                "impianto_elettrico": True,
                "published": True
            }
            
            response = self.session.post(f"{API_BASE}/immobili", json=immobile_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") and data.get("denominazione") == immobile_data["denominazione"]:
                    self.test_immobile_id = data["id"]
                    self.log_result("Create Immobile", True, f"Property created with ID: {self.test_immobile_id}")
                    return True
                else:
                    self.log_result("Create Immobile", False, "Response missing id or denominazione mismatch")
                    return False
            else:
                self.log_result("Create Immobile", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Create Immobile", False, f"Exception: {str(e)}")
            return False
    
    def test_get_single_immobile(self):
        """Test getting a single property by ID"""
        if not self.test_immobile_id:
            self.log_result("Get Single Immobile", False, "No test property ID available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/immobili/{self.test_immobile_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.test_immobile_id:
                    self.log_result("Get Single Immobile", True, f"Retrieved property: {data.get('denominazione')}")
                    return True
                else:
                    self.log_result("Get Single Immobile", False, "ID mismatch in response")
                    return False
            else:
                self.log_result("Get Single Immobile", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Single Immobile", False, f"Exception: {str(e)}")
            return False
    
    def test_update_immobile(self):
        """Test updating a property"""
        if not self.test_immobile_id:
            self.log_result("Update Immobile", False, "No test property ID available")
            return False
            
        try:
            update_data = {
                "descrizione_narrativa": "Casa tradizionale completamente ristrutturata con materiali locali e vista mozzafiato sul lago Omodeo",
                "prezzo_richiesto": 90000.0,
                "stato_conservazione": "ottimo",
                "certificato_energetico": True,
                "classe_energetica": "C"
            }
            
            response = self.session.put(f"{API_BASE}/immobili/{self.test_immobile_id}", json=update_data)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("descrizione_narrativa") == update_data["descrizione_narrativa"]:
                    self.log_result("Update Immobile", True, "Property updated successfully")
                    return True
                else:
                    self.log_result("Update Immobile", False, "Update not reflected in response")
                    return False
            else:
                self.log_result("Update Immobile", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Update Immobile", False, f"Exception: {str(e)}")
            return False
    
    def test_get_immobili_with_data(self):
        """Test getting immobili after creating one"""
        try:
            response = self.session.get(f"{API_BASE}/immobili")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    # Check if our test property is in the list
                    found = any(prop.get("id") == self.test_immobile_id for prop in data)
                    if found:
                        self.log_result("Get Immobili (With Data)", True, f"Retrieved {len(data)} properties including test property")
                        return True
                    else:
                        self.log_result("Get Immobili (With Data)", False, "Test property not found in list")
                        return False
                else:
                    self.log_result("Get Immobili (With Data)", False, "No properties returned")
                    return False
            else:
                self.log_result("Get Immobili (With Data)", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Get Immobili (With Data)", False, f"Exception: {str(e)}")
            return False
    
    def test_image_upload(self):
        """Test image upload for property"""
        if not self.test_immobile_id:
            self.log_result("Image Upload", False, "No test property ID available")
            return False
            
        try:
            # Create a small test image file
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp_file:
                # Write minimal JPEG header
                tmp_file.write(b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9')
                tmp_file_path = tmp_file.name
            
            with open(tmp_file_path, 'rb') as f:
                files = {'file': ('test_image.jpg', f, 'image/jpeg')}
                data = {'caption': 'Test image for Chiesa di Santa Croce'}
                
                response = self.session.post(
                    f"{API_BASE}/attractions/{self.test_attraction_id}/images",
                    files=files,
                    data=data
                )
            
            # Clean up temp file
            os.unlink(tmp_file_path)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("image"):
                    self.log_result("Image Upload", True, f"Image uploaded: {data['image'].get('url')}")
                    return True
                else:
                    self.log_result("Image Upload", False, "Response missing success or image data")
                    return False
            else:
                self.log_result("Image Upload", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Image Upload", False, f"Exception: {str(e)}")
            return False
    
    def test_audio_upload(self):
        """Test audio upload for attraction"""
        if not self.test_attraction_id:
            self.log_result("Audio Upload", False, "No test attraction ID available")
            return False
            
        try:
            # Create a minimal MP3 file (just headers)
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
                # Write minimal MP3 header
                tmp_file.write(b'ID3\x03\x00\x00\x00\x00\x00\x00\x00\xff\xfb\x90\x00')
                tmp_file_path = tmp_file.name
            
            with open(tmp_file_path, 'rb') as f:
                files = {'file': ('test_audio.mp3', f, 'audio/mpeg')}
                data = {'language': 'it'}
                
                response = self.session.post(
                    f"{API_BASE}/attractions/{self.test_attraction_id}/audio",
                    files=files,
                    data=data
                )
            
            # Clean up temp file
            os.unlink(tmp_file_path)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and data.get("audio_url"):
                    self.log_result("Audio Upload", True, f"Audio uploaded: {data.get('audio_url')}")
                    return True
                else:
                    self.log_result("Audio Upload", False, "Response missing success or audio_url")
                    return False
            else:
                self.log_result("Audio Upload", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Audio Upload", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_attraction(self):
        """Test deleting an attraction"""
        if not self.test_attraction_id:
            self.log_result("Delete Attraction", False, "No test attraction ID available")
            return False
            
        try:
            response = self.session.delete(f"{API_BASE}/attractions/{self.test_attraction_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    self.log_result("Delete Attraction", True, "Attraction deleted successfully")
                    return True
                else:
                    self.log_result("Delete Attraction", False, "Response missing success flag")
                    return False
            else:
                self.log_result("Delete Attraction", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Delete Attraction", False, f"Exception: {str(e)}")
            return False
    
    def test_get_deleted_attraction(self):
        """Test that deleted attraction is no longer accessible"""
        if not self.test_attraction_id:
            self.log_result("Get Deleted Attraction", False, "No test attraction ID available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/attractions/{self.test_attraction_id}")
            
            if response.status_code == 404:
                self.log_result("Get Deleted Attraction", True, "Attraction properly deleted (404 response)")
                return True
            else:
                self.log_result("Get Deleted Attraction", False, f"Expected 404, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Get Deleted Attraction", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting VisitTadasuni Attractions Backend Tests")
        print(f"📍 Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_admin_login,
            self.test_google_maps_config,
            self.test_get_attractions_empty,
            self.test_create_attraction,
            self.test_get_single_attraction,
            self.test_update_attraction,
            self.test_get_attractions_with_data,
            self.test_image_upload,
            self.test_audio_upload,
            self.test_delete_attraction,
            self.test_get_deleted_attraction
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            success = test()
            if success:
                passed += 1
            else:
                failed += 1
            print()  # Add spacing between tests
        
        print("=" * 60)
        print(f"📊 Test Results: {passed} passed, {failed} failed")
        
        if failed == 0:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed. Check details above.")
        
        return failed == 0

def main():
    """Main test runner"""
    tester = AttractionsTester()
    success = tester.run_all_tests()
    
    if not success:
        exit(1)

if __name__ == "__main__":
    main()