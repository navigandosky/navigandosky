import requests
import sys
import json
from datetime import datetime

class DigitalTwinsAPITester:
    def __init__(self, base_url="https://digitalsoci.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_socio_id = None

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
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.content else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login with fixed credentials"""
        success, response = self.run_test(
            "Login with fixed credentials",
            "POST",
            "api/auth/login",
            200,
            data={"username": "DigitalTwin26", "password": "Dgt_26$"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, _ = self.run_test(
            "Login with invalid credentials",
            "POST",
            "api/auth/login",
            401,
            data={"username": "wrong", "password": "wrong"}
        )
        return success

    def test_get_stats(self):
        """Test statistics endpoint"""
        success, response = self.run_test(
            "Get statistics",
            "GET",
            "api/stats",
            200
        )
        if success:
            print(f"   Total soci: {response.get('totale_soci', 'N/A')}")
            print(f"   Regions: {len(response.get('per_regione', []))}")
        return success

    def test_get_soci(self):
        """Test get all soci"""
        success, response = self.run_test(
            "Get all soci",
            "GET",
            "api/soci",
            200
        )
        if success:
            print(f"   Found {len(response)} soci")
            if len(response) > 0:
                print(f"   First socio: {response[0].get('nome', '')} {response[0].get('cognome', '')}")
        return success

    def test_search_soci(self):
        """Test search functionality"""
        success, response = self.run_test(
            "Search soci by name",
            "GET",
            "api/soci?search=Andrea",
            200
        )
        if success:
            print(f"   Found {len(response)} soci with 'Andrea'")
        return success

    def test_filter_soci_by_region(self):
        """Test filter by region"""
        success, response = self.run_test(
            "Filter soci by region",
            "GET",
            "api/soci?regione=LOMBARDIA",
            200
        )
        if success:
            print(f"   Found {len(response)} soci in LOMBARDIA")
        return success

    def test_create_socio(self):
        """Test creating a new socio"""
        test_socio = {
            "nome": "Test",
            "cognome": "User",
            "email": f"test.user.{datetime.now().strftime('%H%M%S')}@test.com",
            "regione": "LAZIO",
            "citta": "Roma",
            "carica": "Socio",
            "qualifica": "Socio",
            "tipo_dispositivo": "PRO3"
        }
        
        success, response = self.run_test(
            "Create new socio",
            "POST",
            "api/soci",
            200,
            data=test_socio
        )
        if success and 'id' in response:
            self.created_socio_id = response['id']
            print(f"   Created socio with ID: {self.created_socio_id}")
        return success

    def test_get_socio_by_id(self):
        """Test get socio by ID"""
        if not self.created_socio_id:
            print("❌ Skipping - No socio ID available")
            return False
            
        success, response = self.run_test(
            "Get socio by ID",
            "GET",
            f"api/soci/{self.created_socio_id}",
            200
        )
        if success:
            print(f"   Retrieved: {response.get('nome', '')} {response.get('cognome', '')}")
        return success

    def test_update_socio(self):
        """Test updating a socio"""
        if not self.created_socio_id:
            print("❌ Skipping - No socio ID available")
            return False
            
        update_data = {
            "nome": "Test Updated",
            "cognome": "User Updated",
            "email": f"test.updated.{datetime.now().strftime('%H%M%S')}@test.com",
            "regione": "LAZIO",
            "citta": "Roma",
            "telefono": "+39 333 1234567",
            "carica": "Socio",
            "qualifica": "Socio",
            "tipo_dispositivo": "PRO3"
        }
        
        success, response = self.run_test(
            "Update socio",
            "PUT",
            f"api/soci/{self.created_socio_id}",
            200,
            data=update_data
        )
        if success:
            print(f"   Updated: {response.get('nome', '')} {response.get('cognome', '')}")
        return success

    def test_get_map_data(self):
        """Test map data endpoint"""
        success, response = self.run_test(
            "Get map data",
            "GET",
            "api/map-data",
            200
        )
        if success:
            print(f"   Found {len(response)} regions with data")
            if len(response) > 0:
                total_soci = sum(r.get('totale', 0) for r in response)
                print(f"   Total soci in map: {total_soci}")
        return success

    def test_dropdown_options(self):
        """Test dropdown options endpoints"""
        categories = ["dispositivo", "qualifica", "carica"]
        all_success = True
        
        for category in categories:
            success, response = self.run_test(
                f"Get {category} options",
                "GET",
                f"api/dropdown/{category}",
                200
            )
            if success:
                print(f"   Found {len(response)} {category} options")
            all_success = all_success and success
            
        return all_success

    def test_seed_data(self):
        """Test seed data endpoint"""
        success, response = self.run_test(
            "Seed initial data",
            "POST",
            "api/seed",
            200
        )
        if success:
            print(f"   Seed result: {response.get('message', 'N/A')}")
            print(f"   Soci count: {response.get('soci_count', 'N/A')}")
        return success

    def test_delete_socio(self):
        """Test deleting a socio"""
        if not self.created_socio_id:
            print("❌ Skipping - No socio ID available")
            return False
            
        success, response = self.run_test(
            "Delete socio",
            "DELETE",
            f"api/soci/{self.created_socio_id}",
            200
        )
        if success:
            print(f"   Deleted socio: {self.created_socio_id}")
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API endpoint",
            "GET",
            "api/",
            200
        )
        if success:
            print(f"   Message: {response.get('message', 'N/A')}")
        return success

    def test_get_comunicazioni(self):
        """Test get all comunicazioni"""
        success, response = self.run_test(
            "Get all comunicazioni",
            "GET",
            "api/comunicazioni",
            200
        )
        if success:
            print(f"   Found {len(response)} comunicazioni")
        return success

    def test_get_comunicazioni_tipi(self):
        """Test get comunicazioni types"""
        success, response = self.run_test(
            "Get comunicazioni types",
            "GET",
            "api/comunicazioni-tipi",
            200
        )
        if success:
            print(f"   Found {len(response)} communication types")
            if len(response) > 0:
                print(f"   First type: {response[0].get('label', 'N/A')}")
        return success

    def test_create_comunicazione(self):
        """Test creating a new comunicazione"""
        # First get some soci to use as recipients
        soci_success, soci_response = self.run_test(
            "Get soci for comunicazione",
            "GET",
            "api/soci",
            200
        )
        
        if not soci_success or len(soci_response) == 0:
            print("❌ Cannot test comunicazione - no soci available")
            return False
            
        # Get first 2 soci with email
        destinatari_ids = []
        for socio in soci_response[:2]:
            if socio.get('email'):
                destinatari_ids.append(socio['id'])
        
        if len(destinatari_ids) == 0:
            print("❌ Cannot test comunicazione - no soci with email")
            return False
        
        test_comunicazione = {
            "tipo": "circolare",
            "oggetto": "Test Comunicazione API",
            "descrizione": "Questa è una comunicazione di test creata automaticamente durante i test API.",
            "destinatari_ids": destinatari_ids
        }
        
        success, response = self.run_test(
            "Create new comunicazione",
            "POST",
            "api/comunicazioni",
            200,
            data=test_comunicazione
        )
        if success and 'id' in response:
            self.created_comunicazione_id = response['id']
            print(f"   Created comunicazione with ID: {self.created_comunicazione_id}")
            print(f"   Recipients: {response.get('totale_destinatari', 0)}")
        return success

    def test_get_comunicazione_by_id(self):
        """Test get comunicazione by ID"""
        if not hasattr(self, 'created_comunicazione_id') or not self.created_comunicazione_id:
            print("❌ Skipping - No comunicazione ID available")
            return False
            
        success, response = self.run_test(
            "Get comunicazione by ID",
            "GET",
            f"api/comunicazioni/{self.created_comunicazione_id}",
            200
        )
        if success:
            print(f"   Retrieved: {response.get('oggetto', '')}")
            print(f"   Status: {response.get('stato', '')}")
        return success

    def test_update_comunicazione(self):
        """Test updating a comunicazione"""
        if not hasattr(self, 'created_comunicazione_id') or not self.created_comunicazione_id:
            print("❌ Skipping - No comunicazione ID available")
            return False
            
        # Get soci for recipients
        soci_success, soci_response = self.run_test(
            "Get soci for update",
            "GET",
            "api/soci",
            200
        )
        
        if not soci_success:
            return False
            
        destinatari_ids = [s['id'] for s in soci_response[:1] if s.get('email')]
        
        update_data = {
            "tipo": "newsletter",
            "oggetto": "Test Comunicazione Updated",
            "descrizione": "Comunicazione aggiornata durante i test API.",
            "destinatari_ids": destinatari_ids
        }
        
        success, response = self.run_test(
            "Update comunicazione",
            "PUT",
            f"api/comunicazioni/{self.created_comunicazione_id}",
            200,
            data=update_data
        )
        if success:
            print(f"   Updated: {response.get('oggetto', '')}")
        return success

    def test_delete_comunicazione(self):
        """Test deleting a comunicazione"""
        if not hasattr(self, 'created_comunicazione_id') or not self.created_comunicazione_id:
            print("❌ Skipping - No comunicazione ID available")
            return False
            
        success, response = self.run_test(
            "Delete comunicazione",
            "DELETE",
            f"api/comunicazioni/{self.created_comunicazione_id}",
            200
        )
        if success:
            print(f"   Deleted comunicazione: {self.created_comunicazione_id}")
        return success

def main():
    print("🚀 Starting Digital Twins Italia API Tests")
    print("=" * 50)
    
    tester = DigitalTwinsAPITester()
    
    # Test sequence
    tests = [
        ("Root endpoint", tester.test_root_endpoint),
        ("Valid login", tester.test_login),
        ("Invalid login", tester.test_invalid_login),
        ("Get statistics", tester.test_get_stats),
        ("Get all soci", tester.test_get_soci),
        ("Search soci", tester.test_search_soci),
        ("Filter by region", tester.test_filter_soci_by_region),
        ("Get map data", tester.test_get_map_data),
        ("Dropdown options", tester.test_dropdown_options),
        ("Seed data", tester.test_seed_data),
        ("Create socio", tester.test_create_socio),
        ("Get socio by ID", tester.test_get_socio_by_id),
        ("Update socio", tester.test_update_socio),
        ("Delete socio", tester.test_delete_socio),
    ]
    
    failed_tests = []
    
    for test_name, test_func in tests:
        try:
            if not test_func():
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} - Exception: {str(e)}")
            failed_tests.append(test_name)
    
    # Print results
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS")
    print("=" * 50)
    print(f"Tests run: {tester.tests_run}")
    print(f"Tests passed: {tester.tests_passed}")
    print(f"Tests failed: {len(failed_tests)}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if failed_tests:
        print(f"\n❌ Failed tests:")
        for test in failed_tests:
            print(f"   - {test}")
    else:
        print(f"\n✅ All tests passed!")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())