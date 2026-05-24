#!/usr/bin/env python3
"""
Maretrek Berths (Posti Barca) Backend Test Suite
Tests all berths functionality including CRUD operations, occupy/release, and status computation
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://marina-management.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
    
    def success(self, test_name):
        self.passed += 1
        print(f"✅ {test_name}")
    
    def failure(self, test_name, error):
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f"❌ {test_name}: {error}")
    
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*60}")
        print(f"BERTHS TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILURES:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*60}")
        return self.failed == 0

def make_request(method, endpoint, data=None, expected_status=None):
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}/{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, headers=HEADERS, timeout=30)
        elif method == "POST":
            response = requests.post(url, headers=HEADERS, json=data, timeout=30)
        elif method == "PUT":
            response = requests.put(url, headers=HEADERS, json=data, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, headers=HEADERS, timeout=30)
        
        if expected_status and response.status_code != expected_status:
            return None, f"Expected status {expected_status}, got {response.status_code}: {response.text}"
        
        if response.status_code >= 400:
            return None, f"HTTP {response.status_code}: {response.text}"
        
        try:
            return response.json(), None
        except:
            return response.text, None
            
    except requests.exceptions.Timeout:
        return None, "Request timeout"
    except requests.exceptions.ConnectionError:
        return None, "Connection error"
    except Exception as e:
        return None, f"Request error: {str(e)}"

def test_get_marinas(results):
    """Test 1: Get marinas to find Bosa Marina ID"""
    print("\n🔄 Getting marinas to find Bosa Marina...")
    
    data, error = make_request("GET", "marinas?slug=bosa-marina")
    if error:
        results.failure("Get Bosa Marina", error)
        return None
    
    if not isinstance(data, list) or len(data) == 0:
        results.failure("Get Bosa Marina", "Bosa Marina not found")
        return None
    
    marina = data[0]
    if not marina.get('id'):
        results.failure("Get Bosa Marina", "Marina ID missing")
        return None
    
    results.success(f"Get Bosa Marina - found marina {marina['name']} with ID {marina['id']}")
    return marina

def test_seed_berths_layout(results, marina_id):
    """Test 2: Seed berths layout for marina"""
    print("\n🔄 Testing berths layout seeding...")
    
    seed_data = {
        "marina_id": marina_id,
        "pontoons": 3,
        "berths_per_side": 20
    }
    
    data, error = make_request("POST", "berths/seed-layout", seed_data, expected_status=200)
    if error:
        results.failure("Seed berths layout", error)
        return None
    
    if not data or not data.get('success'):
        results.failure("Seed berths layout", "Invalid response format")
        return None
    
    expected_count = 3 * 2 * 20  # 3 pontoons × 2 sides × 20 berths = 120
    if data.get('count') != expected_count:
        results.failure("Seed berths layout", f"Expected {expected_count} berths, got {data.get('count')}")
        return None
    
    results.success(f"Seed berths layout - created {data['count']} berths successfully")
    return data

def test_get_berths_by_marina_id(results, marina_id):
    """Test 3: Get berths by marina_id"""
    print("\n🔄 Testing GET berths by marina_id...")
    
    data, error = make_request("GET", f"berths?marina_id={marina_id}")
    if error:
        results.failure("Get berths by marina_id", error)
        return None
    
    if not isinstance(data, list):
        results.failure("Get berths by marina_id", "Response should be a list")
        return None
    
    if len(data) != 120:
        results.failure("Get berths by marina_id", f"Expected 120 berths, got {len(data)}")
        return None
    
    # Verify berth structure
    berth = data[0]
    required_fields = ['id', 'marina_id', 'pontoon', 'side', 'position', 'label', 'length_max', 'beam_max', 'status']
    for field in required_fields:
        if field not in berth:
            results.failure("Get berths by marina_id", f"Missing required field: {field}")
            return None
    
    # Verify status field is computed
    if berth['status'] not in ['free', 'occupied', 'releasing']:
        results.failure("Get berths by marina_id", f"Invalid status: {berth['status']}")
        return None
    
    # Verify label format (e.g., "P1-SX-01")
    if not berth['label'].startswith('P'):
        results.failure("Get berths by marina_id", f"Invalid label format: {berth['label']}")
        return None
    
    results.success(f"Get berths by marina_id - retrieved {len(data)} berths with correct structure")
    return data

def test_get_berths_by_marina_slug(results):
    """Test 4: Get berths by marina_slug"""
    print("\n🔄 Testing GET berths by marina_slug...")
    
    data, error = make_request("GET", "berths?marina_slug=bosa-marina")
    if error:
        results.failure("Get berths by marina_slug", error)
        return None
    
    if not isinstance(data, list) or len(data) != 120:
        results.failure("Get berths by marina_slug", f"Expected 120 berths, got {len(data) if isinstance(data, list) else 'not a list'}")
        return None
    
    results.success(f"Get berths by marina_slug - retrieved {len(data)} berths")
    return data

def test_get_single_berth(results, berths):
    """Test 5: Get single berth by ID"""
    print("\n🔄 Testing GET single berth...")
    
    if not berths or len(berths) == 0:
        results.failure("Get single berth", "No berths available for testing")
        return None
    
    berth_id = berths[0]['id']
    data, error = make_request("GET", f"berths/{berth_id}")
    if error:
        results.failure("Get single berth", error)
        return None
    
    if not data or data.get('id') != berth_id:
        results.failure("Get single berth", "Invalid response or ID mismatch")
        return None
    
    # Verify status is computed
    if 'status' not in data:
        results.failure("Get single berth", "Status field missing")
        return None
    
    results.success(f"Get single berth - retrieved berth {berth_id} with status {data['status']}")
    return data

def test_occupy_berth_success(results, berths):
    """Test 6: Occupy a berth successfully"""
    print("\n🔄 Testing berth occupation (success case)...")
    
    if not berths or len(berths) == 0:
        results.failure("Occupy berth", "No berths available for testing")
        return None
    
    # Find a free berth
    free_berth = next((b for b in berths if b['status'] == 'free'), None)
    if not free_berth:
        results.failure("Occupy berth", "No free berths available")
        return None
    
    # Create occupation data
    tomorrow = datetime.now() + timedelta(days=1)
    end_date = tomorrow + timedelta(days=3)
    
    occupation_data = {
        "customer": {
            "name": "Mario",
            "surname": "Rossi",
            "email": "mario@test.it",
            "phone": "+393331234567"
        },
        "boat": {
            "name": "Aurora",
            "registration": "CA-1234",
            "type": "motor",
            "length": 8,
            "beam": 3
        },
        "start_date": tomorrow.strftime("%Y-%m-%d"),
        "end_date": end_date.strftime("%Y-%m-%d"),
        "notes": "Test occupation",
        "total_amount": 150
    }
    
    data, error = make_request("POST", f"berths/{free_berth['id']}/occupy", occupation_data, expected_status=200)
    if error:
        results.failure("Occupy berth", error)
        return None
    
    if not data or not data.get('current_occupation'):
        results.failure("Occupy berth", "Invalid response - missing current_occupation")
        return None
    
    # Verify occupation data
    occupation = data['current_occupation']
    if occupation['customer']['name'] != 'Mario':
        results.failure("Occupy berth", "Customer name mismatch")
        return None
    
    if occupation['boat']['name'] != 'Aurora':
        results.failure("Occupy berth", "Boat name mismatch")
        return None
    
    # Verify status is now occupied
    if data.get('status') != 'occupied':
        results.failure("Occupy berth", f"Expected status 'occupied', got '{data.get('status')}'")
        return None
    
    results.success(f"Occupy berth - berth {free_berth['label']} occupied successfully")
    return data

def test_occupy_berth_validation_errors(results, berths):
    """Test 7: Occupy berth validation errors"""
    print("\n🔄 Testing berth occupation validation errors...")
    
    if not berths or len(berths) == 0:
        results.failure("Occupy berth validation", "No berths available for testing")
        return None
    
    free_berth = next((b for b in berths if b['status'] == 'free'), None)
    if not free_berth:
        # Use any berth for validation testing
        free_berth = berths[0]
    
    # Test missing customer name
    invalid_data1 = {
        "customer": {
            "email": "test@test.it"
        },
        "boat": {"name": "Test"},
        "start_date": "2025-01-15",
        "end_date": "2025-01-18"
    }
    
    data1, error1 = make_request("POST", f"berths/{free_berth['id']}/occupy", invalid_data1, expected_status=400)
    if not error1 or "400" not in error1:
        results.failure("Occupy berth validation - missing name", "Should return 400 error for missing customer name")
        return None
    
    # Test missing customer email
    invalid_data2 = {
        "customer": {
            "name": "Mario"
        },
        "boat": {"name": "Test"},
        "start_date": "2025-01-15",
        "end_date": "2025-01-18"
    }
    
    data2, error2 = make_request("POST", f"berths/{free_berth['id']}/occupy", invalid_data2, expected_status=400)
    if not error2 or "400" not in error2:
        results.failure("Occupy berth validation - missing email", "Should return 400 error for missing customer email")
        return None
    
    # Test missing dates
    invalid_data3 = {
        "customer": {
            "name": "Mario",
            "email": "mario@test.it"
        },
        "boat": {"name": "Test"}
    }
    
    data3, error3 = make_request("POST", f"berths/{free_berth['id']}/occupy", invalid_data3, expected_status=400)
    if not error3 or "400" not in error3:
        results.failure("Occupy berth validation - missing dates", "Should return 400 error for missing dates")
        return None
    
    results.success("Occupy berth validation - all validation errors handled correctly")
    return True

def test_occupy_already_occupied_berth(results, occupied_berth):
    """Test 8: Try to occupy already occupied berth"""
    print("\n🔄 Testing occupation of already occupied berth...")
    
    if not occupied_berth:
        results.failure("Occupy occupied berth", "No occupied berth available for testing")
        return None
    
    occupation_data = {
        "customer": {
            "name": "Giulia",
            "surname": "Verdi",
            "email": "giulia@test.it",
            "phone": "+393339876543"
        },
        "boat": {
            "name": "Stella",
            "registration": "MI-5678",
            "type": "sail",
            "length": 10,
            "beam": 3.5
        },
        "start_date": "2025-01-20",
        "end_date": "2025-01-25"
    }
    
    data, error = make_request("POST", f"berths/{occupied_berth['id']}/occupy", occupation_data, expected_status=409)
    if not error or "409" not in error:
        results.failure("Occupy occupied berth", "Should return 409 error for already occupied berth")
        return None
    
    results.success("Occupy occupied berth - correctly rejected with 409 error")
    return True

def test_release_berth(results, occupied_berth):
    """Test 9: Release an occupied berth"""
    print("\n🔄 Testing berth release...")
    
    if not occupied_berth:
        results.failure("Release berth", "No occupied berth available for testing")
        return None
    
    data, error = make_request("POST", f"berths/{occupied_berth['id']}/release", {}, expected_status=200)
    if error:
        results.failure("Release berth", error)
        return None
    
    if not data or not data.get('success'):
        results.failure("Release berth", "Invalid response format")
        return None
    
    # Verify berth is now free
    berth_data, berth_error = make_request("GET", f"berths/{occupied_berth['id']}")
    if berth_error:
        results.failure("Release berth verification", berth_error)
        return None
    
    if berth_data.get('status') != 'free':
        results.failure("Release berth verification", f"Expected status 'free', got '{berth_data.get('status')}'")
        return None
    
    if berth_data.get('current_occupation') is not None:
        results.failure("Release berth verification", "current_occupation should be null after release")
        return None
    
    results.success(f"Release berth - berth released successfully and status is now 'free'")
    return berth_data

def test_status_computation_logic(results, berths):
    """Test 10: Status computation logic with different date scenarios"""
    print("\n🔄 Testing status computation logic...")
    
    if not berths or len(berths) < 3:
        results.failure("Status computation", "Need at least 3 berths for testing")
        return None
    
    # Test 1: Future occupation (should be 'occupied')
    future_berth = berths[0]
    tomorrow = datetime.now() + timedelta(days=1)
    future_end = tomorrow + timedelta(days=5)
    
    future_occupation = {
        "customer": {"name": "Test", "email": "test@test.it"},
        "boat": {"name": "Future", "type": "motor", "length": 8, "beam": 3},
        "start_date": tomorrow.strftime("%Y-%m-%d"),
        "end_date": future_end.strftime("%Y-%m-%d")
    }
    
    data1, error1 = make_request("POST", f"berths/{future_berth['id']}/occupy", future_occupation)
    if error1:
        results.failure("Status computation - future", error1)
        return None
    
    if data1.get('status') != 'occupied':
        results.failure("Status computation - future", f"Expected 'occupied', got '{data1.get('status')}'")
        return None
    
    # Test 2: Releasing soon (end date is tomorrow - should be 'releasing')
    releasing_berth = berths[1]
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    tomorrow = today + timedelta(days=1)
    
    releasing_occupation = {
        "customer": {"name": "Releasing", "email": "releasing@test.it"},
        "boat": {"name": "Releasing", "type": "motor", "length": 8, "beam": 3},
        "start_date": yesterday.strftime("%Y-%m-%d"),
        "end_date": tomorrow.strftime("%Y-%m-%d")
    }
    
    data2, error2 = make_request("POST", f"berths/{releasing_berth['id']}/occupy", releasing_occupation)
    if error2:
        results.failure("Status computation - releasing", error2)
        return None
    
    if data2.get('status') != 'releasing':
        results.failure("Status computation - releasing", f"Expected 'releasing', got '{data2.get('status')}'")
        return None
    
    results.success("Status computation logic - all scenarios working correctly")
    return True

def test_berth_not_found(results):
    """Test 11: Test berth not found scenarios"""
    print("\n🔄 Testing berth not found scenarios...")
    
    fake_id = "00000000-0000-0000-0000-000000000000"
    
    # Test GET non-existent berth
    data1, error1 = make_request("GET", f"berths/{fake_id}", expected_status=404)
    if not error1 or "404" not in error1:
        results.failure("Berth not found - GET", "Should return 404 for non-existent berth")
        return None
    
    # Test occupy non-existent berth
    occupation_data = {
        "customer": {"name": "Test", "email": "test@test.it"},
        "boat": {"name": "Test"},
        "start_date": "2025-01-15",
        "end_date": "2025-01-18"
    }
    
    data2, error2 = make_request("POST", f"berths/{fake_id}/occupy", occupation_data, expected_status=404)
    if not error2 or "404" not in error2:
        results.failure("Berth not found - occupy", "Should return 404 for non-existent berth")
        return None
    
    # Test release non-existent berth
    data3, error3 = make_request("POST", f"berths/{fake_id}/release", {}, expected_status=404)
    if not error3 or "404" not in error3:
        results.failure("Berth not found - release", "Should return 404 for non-existent berth")
        return None
    
    results.success("Berth not found scenarios - all 404 errors handled correctly")
    return True

def main():
    """Main test execution"""
    print("🚀 Starting Maretrek Berths (Posti Barca) Backend Tests")
    print(f"Base URL: {BASE_URL}")
    
    results = TestResults()
    
    # Test 1: Get Bosa Marina
    marina = test_get_marinas(results)
    if not marina:
        print("❌ Cannot continue without marina")
        return False
    
    marina_id = marina['id']
    
    # Test 2: Seed berths layout
    seed_result = test_seed_berths_layout(results, marina_id)
    if not seed_result:
        print("❌ Cannot continue without seeded berths")
        return False
    
    # Test 3: Get berths by marina_id
    berths = test_get_berths_by_marina_id(results, marina_id)
    if not berths:
        print("❌ Cannot continue without berths")
        return False
    
    # Test 4: Get berths by marina_slug
    test_get_berths_by_marina_slug(results)
    
    # Test 5: Get single berth
    test_get_single_berth(results, berths)
    
    # Test 6: Occupy berth successfully
    occupied_berth = test_occupy_berth_success(results, berths)
    
    # Test 7: Validation errors
    test_occupy_berth_validation_errors(results, berths)
    
    # Test 8: Try to occupy already occupied berth
    if occupied_berth:
        test_occupy_already_occupied_berth(results, occupied_berth)
    
    # Test 9: Release berth
    if occupied_berth:
        test_release_berth(results, occupied_berth)
    
    # Test 10: Status computation logic
    test_status_computation_logic(results, berths)
    
    # Test 11: Berth not found scenarios
    test_berth_not_found(results)
    
    # Final summary
    success = results.summary()
    
    if success:
        print("\n🎉 ALL BERTHS TESTS PASSED! Berths backend is working correctly.")
        print("✅ CRUD operations working")
        print("✅ Occupy/Release functionality working")
        print("✅ Status computation working")
        print("✅ Validation and error handling working")
    else:
        print("\n❌ SOME BERTHS TESTS FAILED! Check the errors above.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)