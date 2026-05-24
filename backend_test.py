#!/usr/bin/env python3
"""
Pre-deployment validation testing for N+1 query optimization and core endpoints.
Focus: /api/bookings/by-resource optimization and smoke tests.
"""

import requests
import os
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://marina-management.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test credentials
SUPER_ADMIN_USERNAME = "Admin_Trivorsrl"
SUPER_ADMIN_PASSWORD = "Trivor2026$"

# Test data from database
RESOURCE_WITH_BOOKINGS = "3d72d849-b3a2-46a6-9f6b-087e8957e74b"  # GOM01_Golfo
DATE_WITH_BOOKINGS = "2026-08-18"
RESOURCE_WITHOUT_BOOKINGS = "d30a1e3b-a2e4-419d-9e15-9cc1ade3ce10"  # Tav01 Gom
DATE_WITHOUT_BOOKINGS = "2026-05-24"
TEST_COMPANY_ID = "03f77ea6-95c7-49c4-a13b-df54bc28ecc2"  # Marlin Sub

def print_test(test_name):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print('='*80)

def print_result(success, message):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    return success

def test_bookings_by_resource_with_bookings():
    """Test 1: N+1 optimization - resource with bookings"""
    print_test("N+1 Optimization - Resource WITH bookings")
    
    try:
        url = f"{API_BASE}/bookings/by-resource"
        params = {
            'resource_id': RESOURCE_WITH_BOOKINGS,
            'date': DATE_WITH_BOOKINGS
        }
        
        print(f"GET {url}")
        print(f"Params: {params}")
        
        response = requests.get(url, params=params, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify response shape
        required_keys = ['resource_id', 'date', 'bookings', 'total', 'total_passengers']
        missing_keys = [k for k in required_keys if k not in data]
        if missing_keys:
            return print_result(False, f"Missing keys in response: {missing_keys}")
        
        print(f"✓ Response has all required keys: {required_keys}")
        
        # Verify values
        if data['resource_id'] != RESOURCE_WITH_BOOKINGS:
            return print_result(False, f"resource_id mismatch: expected {RESOURCE_WITH_BOOKINGS}, got {data['resource_id']}")
        
        if data['date'] != DATE_WITH_BOOKINGS:
            return print_result(False, f"date mismatch: expected {DATE_WITH_BOOKINGS}, got {data['date']}")
        
        print(f"✓ resource_id: {data['resource_id']}")
        print(f"✓ date: {data['date']}")
        print(f"✓ total bookings: {data['total']}")
        print(f"✓ total_passengers: {data['total_passengers']}")
        
        # Verify bookings array
        bookings = data['bookings']
        if not isinstance(bookings, list):
            return print_result(False, f"bookings should be array, got {type(bookings)}")
        
        print(f"✓ bookings is array with {len(bookings)} items")
        
        if len(bookings) > 0:
            # Verify enrichment fields on first booking
            booking = bookings[0]
            print(f"\nFirst booking keys: {list(booking.keys())}")
            
            enrichment_fields = ['slot_time', 'experience_name', 'experience_type']
            missing_enrichment = [f for f in enrichment_fields if f not in booking]
            if missing_enrichment:
                return print_result(False, f"Missing enrichment fields in booking: {missing_enrichment}")
            
            print(f"✓ Booking has enrichment fields:")
            print(f"  - slot_time: {booking.get('slot_time')}")
            print(f"  - experience_name: {booking.get('experience_name')}")
            print(f"  - experience_type: {booking.get('experience_type')}")
            
            # Verify enrichment values are not null/empty
            if not booking.get('slot_time'):
                return print_result(False, "slot_time is null or empty")
            if not booking.get('experience_name'):
                return print_result(False, "experience_name is null or empty")
            if not booking.get('experience_type'):
                return print_result(False, "experience_type is null or empty")
            
            print(f"✓ All enrichment fields have valid values")
        
        return print_result(True, f"N+1 optimization working correctly - found {len(bookings)} bookings with proper enrichment")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_bookings_by_resource_without_bookings():
    """Test 2: N+1 optimization - resource without bookings"""
    print_test("N+1 Optimization - Resource WITHOUT bookings")
    
    try:
        url = f"{API_BASE}/bookings/by-resource"
        params = {
            'resource_id': RESOURCE_WITHOUT_BOOKINGS,
            'date': DATE_WITHOUT_BOOKINGS
        }
        
        print(f"GET {url}")
        print(f"Params: {params}")
        
        response = requests.get(url, params=params, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        print(f"Response: {data}")
        
        # Verify response shape
        required_keys = ['resource_id', 'date', 'bookings', 'total']
        missing_keys = [k for k in required_keys if k not in data]
        if missing_keys:
            return print_result(False, f"Missing keys in response: {missing_keys}")
        
        # Verify empty bookings
        if data['bookings'] != []:
            return print_result(False, f"Expected empty bookings array, got {len(data['bookings'])} items")
        
        if data['total'] != 0:
            return print_result(False, f"Expected total=0, got {data['total']}")
        
        print(f"✓ Empty bookings handled correctly")
        print(f"✓ resource_id: {data['resource_id']}")
        print(f"✓ date: {data['date']}")
        print(f"✓ bookings: [] (empty)")
        print(f"✓ total: 0")
        
        return print_result(True, "Resource without bookings handled correctly")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_companies_endpoint():
    """Test 3: Smoke test - GET /api/companies"""
    print_test("Smoke Test - GET /api/companies")
    
    try:
        url = f"{API_BASE}/companies"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        
        if not isinstance(data, list):
            return print_result(False, f"Expected array, got {type(data)}")
        
        print(f"✓ Returns array with {len(data)} companies")
        
        if len(data) > 0:
            print(f"✓ Sample company: {data[0].get('name', 'N/A')}")
        
        return print_result(True, f"Companies endpoint working - {len(data)} companies found")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_experiences_endpoint():
    """Test 4: Smoke test - GET /api/experiences"""
    print_test("Smoke Test - GET /api/experiences")
    
    try:
        url = f"{API_BASE}/experiences"
        print(f"GET {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        
        if not isinstance(data, list):
            return print_result(False, f"Expected array, got {type(data)}")
        
        print(f"✓ Returns array with {len(data)} experiences")
        
        if len(data) > 0:
            print(f"✓ Sample experience: {data[0].get('name', 'N/A')}")
        
        return print_result(True, f"Experiences endpoint working - {len(data)} experiences found")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_rental_units_endpoint():
    """Test 5: Smoke test - GET /api/rental-units?public=true"""
    print_test("Smoke Test - GET /api/rental-units?public=true")
    
    try:
        url = f"{API_BASE}/rental-units"
        params = {'public': 'true'}
        print(f"GET {url}")
        print(f"Params: {params}")
        
        response = requests.get(url, params=params, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        
        if not isinstance(data, list):
            return print_result(False, f"Expected array, got {type(data)}")
        
        print(f"✓ Returns array with {len(data)} rental units")
        
        if len(data) > 0:
            print(f"✓ Sample rental unit: {data[0].get('name', 'N/A')}")
        
        return print_result(True, f"Rental units endpoint working - {len(data)} units found")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_auth_login():
    """Test 6: Smoke test - POST /api/users/login"""
    print_test("Smoke Test - POST /api/users/login (Super Admin)")
    
    try:
        url = f"{API_BASE}/users/login"
        payload = {
            'email_or_username': SUPER_ADMIN_USERNAME,
            'password': SUPER_ADMIN_PASSWORD
        }
        print(f"POST {url}")
        print(f"Username: {SUPER_ADMIN_USERNAME}")
        
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        print(f"Response keys: {list(data.keys())}")
        
        # Verify user object
        if 'user' not in data:
            return print_result(False, "Missing 'user' in response")
        
        user = data['user']
        print(f"✓ User: {user.get('username', 'N/A')}")
        print(f"✓ Role: {user.get('role', 'N/A')}")
        
        if user.get('role') != 'SUPER_ADMIN':
            return print_result(False, f"Expected role SUPER_ADMIN, got {user.get('role')}")
        
        # Verify password not exposed
        if 'password' in user:
            return print_result(False, "Password should not be exposed in response")
        
        print(f"✓ Password not exposed")
        
        return print_result(True, "Login endpoint working correctly")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_bookings_endpoint():
    """Test 7: Smoke test - GET /api/bookings?company_id=<any>"""
    print_test("Smoke Test - GET /api/bookings?company_id=<any>")
    
    try:
        url = f"{API_BASE}/bookings"
        params = {'company_id': TEST_COMPANY_ID}
        print(f"GET {url}")
        print(f"Params: {params}")
        
        response = requests.get(url, params=params, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}: {response.text}")
        
        data = response.json()
        
        if not isinstance(data, list):
            return print_result(False, f"Expected array, got {type(data)}")
        
        print(f"✓ Returns array with {len(data)} bookings")
        
        if len(data) > 0:
            print(f"✓ Sample booking: {data[0].get('booking_ref', 'N/A')}")
        
        return print_result(True, f"Bookings endpoint working - {len(data)} bookings found")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def check_console_errors():
    """Test 8: Check for console errors in logs"""
    print_test("Check Console Errors in Logs")
    
    try:
        log_file = "/var/log/supervisor/nextjs.out.log"
        print(f"Checking: {log_file}")
        
        # Read last 200 lines
        with open(log_file, 'r') as f:
            lines = f.readlines()
            recent_lines = lines[-200:] if len(lines) > 200 else lines
        
        # Look for errors (case-insensitive)
        errors = []
        for i, line in enumerate(recent_lines):
            line_lower = line.lower()
            if any(keyword in line_lower for keyword in ['error', 'exception', 'failed', 'crash']):
                # Exclude common non-critical patterns
                if 'deprecated' not in line_lower and 'warning' not in line_lower:
                    errors.append((i, line.strip()))
        
        if errors:
            print(f"⚠️  Found {len(errors)} potential error lines:")
            for i, line in errors[-10:]:  # Show last 10
                print(f"  Line {i}: {line[:150]}")
            return print_result(False, f"Found {len(errors)} error lines in logs (showing last 10)")
        else:
            print(f"✓ No critical errors found in last 200 lines")
            return print_result(True, "No console errors detected")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("PRE-DEPLOYMENT VALIDATION TESTING")
    print("Focus: N+1 Query Optimization + Core Endpoints Smoke Tests")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    results = []
    
    # Test 1-2: N+1 optimization
    results.append(("N+1 with bookings", test_bookings_by_resource_with_bookings()))
    results.append(("N+1 without bookings", test_bookings_by_resource_without_bookings()))
    
    # Test 3-7: Smoke tests
    results.append(("Companies endpoint", test_companies_endpoint()))
    results.append(("Experiences endpoint", test_experiences_endpoint()))
    results.append(("Rental units endpoint", test_rental_units_endpoint()))
    results.append(("Auth login", test_auth_login()))
    results.append(("Bookings endpoint", test_bookings_endpoint()))
    
    # Test 8: Log check
    results.append(("Console errors check", check_console_errors()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED - Pre-deployment validation successful!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed - Review required")
        return 1

if __name__ == "__main__":
    sys.exit(main())
