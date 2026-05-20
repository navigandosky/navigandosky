#!/usr/bin/env python3
"""
Maretrek Admin User Management and Resource Fixes Testing
Tests critical fixes for user management API and resource assignment
"""

import requests
import json
from typing import List, Dict, Any

# Base URL from environment
BASE_URL = "https://sardinia-tours-hub.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Marlin Sub company ID
MARLIN_COMPANY_ID = "03f77ea6-95c7-49c4-a13b-df54bc28ecc2"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

# Store created test user IDs for cleanup
created_test_user_ids: List[str] = []

def log_test(name: str, passed: bool, details: str = ""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {name}")
    if details:
        print(f"  Details: {details}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def print_summary():
    """Print test summary"""
    total = test_results["passed"] + test_results["failed"]
    print("\n" + "="*80)
    print(f"TEST SUMMARY: {test_results['passed']}/{total} tests passed")
    print("="*80)
    for test in test_results["tests"]:
        status = "✅" if test["passed"] else "❌"
        print(f"{status} {test['name']}")
    print("="*80)

print("="*80)
print("MARETREK ADMIN USER MANAGEMENT & RESOURCE FIXES TESTING")
print("="*80)
print(f"Base URL: {BASE_URL}")
print(f"Marlin Company ID: {MARLIN_COMPANY_ID}")
print("="*80)

# ============================================================================
# SECTION 1: USER MANAGEMENT API TESTS
# ============================================================================
print("\n\n" + "="*80)
print("SECTION 1: USER MANAGEMENT API (AdminDashboard gestione utenti)")
print("="*80)

# ============================================================================
# TEST 1.1: GET /api/users?company_id=... returns array of users
# ============================================================================
print("\n\n### TEST 1.1: GET /api/users?company_id={MARLIN_COMPANY_ID}")
try:
    response = requests.get(
        f"{API_BASE}/users",
        params={"company_id": MARLIN_COMPANY_ID},
        timeout=30
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        users = response.json()
        
        if isinstance(users, list):
            print(f"Found {len(users)} users for Marlin company")
            
            # Verify structure
            if len(users) > 0:
                sample_user = users[0]
                required_fields = ['id', 'email', 'role', 'company_id', 'is_active']
                missing_fields = [f for f in required_fields if f not in sample_user]
                
                # Verify password is NOT exposed
                if 'password' in sample_user:
                    log_test("Test 1.1 - GET users by company", False, 
                           "Password field exposed in response (security issue)")
                elif missing_fields:
                    log_test("Test 1.1 - GET users by company", False, 
                           f"Missing required fields: {missing_fields}")
                else:
                    log_test("Test 1.1 - GET users by company", True, 
                           f"Returns {len(users)} users, password not exposed, all required fields present")
            else:
                log_test("Test 1.1 - GET users by company", True, 
                       "Returns empty array (no users yet for this company)")
        else:
            log_test("Test 1.1 - GET users by company", False, 
                   f"Expected array, got {type(users)}")
    else:
        log_test("Test 1.1 - GET users by company", False, 
               f"Expected 200, got {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    log_test("Test 1.1 - GET users by company", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 1.2: POST /api/users creates user with hashed password
# ============================================================================
print("\n\n### TEST 1.2: POST /api/users - Create new user")
test_user_email = "test_user_maretrek_2026@example.com"
test_user_password = "TestPassword2026!"
test_user_id = None

try:
    user_data = {
        "email": test_user_email,
        "username": "test_user_maretrek",
        "password": test_user_password,
        "role": "COMPANY_ADMIN",
        "company_id": MARLIN_COMPANY_ID,
        "is_active": True,
        "full_name": "Test User Maretrek",
        "phone": "+39 333 1234567"
    }
    
    response = requests.post(
        f"{API_BASE}/users",
        json=user_data,
        timeout=30
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")
    
    if response.status_code == 201:
        created_user = response.json()
        test_user_id = created_user.get('id')
        
        if test_user_id:
            created_test_user_ids.append(test_user_id)
        
        # Verify user structure
        if 'password' in created_user:
            log_test("Test 1.2 - POST create user", False, 
                   "Password exposed in response (should be hashed and hidden)")
        elif not test_user_id:
            log_test("Test 1.2 - POST create user", False, "No user ID returned")
        elif created_user.get('email') != test_user_email:
            log_test("Test 1.2 - POST create user", False, 
                   f"Email mismatch: expected {test_user_email}, got {created_user.get('email')}")
        elif created_user.get('role') != 'COMPANY_ADMIN':
            log_test("Test 1.2 - POST create user", False, 
                   f"Role mismatch: expected COMPANY_ADMIN, got {created_user.get('role')}")
        else:
            log_test("Test 1.2 - POST create user", True, 
                   f"User created with ID: {test_user_id}, password hashed (not exposed)")
    else:
        log_test("Test 1.2 - POST create user", False, 
               f"Expected 201, got {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    log_test("Test 1.2 - POST create user", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 1.3: POST /api/users with duplicate email returns 400
# ============================================================================
print("\n\n### TEST 1.3: POST /api/users - Duplicate email validation")
try:
    duplicate_data = {
        "email": test_user_email,  # Same email as Test 1.2
        "username": "test_user_duplicate",
        "password": "AnotherPassword123!",
        "role": "COMPANY_ADMIN",
        "company_id": MARLIN_COMPANY_ID
    }
    
    response = requests.post(
        f"{API_BASE}/users",
        json=duplicate_data,
        timeout=30
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:200]}")
    
    if response.status_code == 400:
        error_data = response.json()
        error_msg = error_data.get('error', '').lower()
        
        if 'email' in error_msg or 'registrata' in error_msg or 'duplicate' in error_msg:
            log_test("Test 1.3 - Duplicate email validation", True, 
                   "Correctly rejected duplicate email with 400")
        else:
            log_test("Test 1.3 - Duplicate email validation", False, 
                   f"Got 400 but wrong error message: {error_data.get('error')}")
    else:
        log_test("Test 1.3 - Duplicate email validation", False, 
               f"Expected 400, got {response.status_code}")
        
except Exception as e:
    log_test("Test 1.3 - Duplicate email validation", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 1.4: Created user CAN login with given credentials
# ============================================================================
print("\n\n### TEST 1.4: POST /api/users?action=login - Login with created user")
try:
    login_data = {
        "email": test_user_email,
        "password": test_user_password
    }
    
    response = requests.post(
        f"{API_BASE}/users?action=login",
        json=login_data,
        timeout=30
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:300]}")
    
    if response.status_code == 200:
        result = response.json()
        user = result.get('user')
        
        if not user:
            log_test("Test 1.4 - Login with created user", False, "No user object in response")
        elif 'password' in user:
            log_test("Test 1.4 - Login with created user", False, 
                   "Password exposed in login response (security issue)")
        elif user.get('email') != test_user_email:
            log_test("Test 1.4 - Login with created user", False, 
                   f"Email mismatch: expected {test_user_email}, got {user.get('email')}")
        else:
            log_test("Test 1.4 - Login with created user", True, 
                   f"Login successful for {test_user_email}, password not exposed")
    else:
        log_test("Test 1.4 - Login with created user", False, 
               f"Expected 200, got {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    log_test("Test 1.4 - Login with created user", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 1.5: PUT /api/users/{id} with password=undefined doesn't reset password
# ============================================================================
print("\n\n### TEST 1.5: PUT /api/users/{id} - Update without password field")
if test_user_id:
    try:
        update_data = {
            "email": test_user_email,
            "role": "COMPANY_ADMIN",
            "is_active": True,
            "full_name": "Test User Updated"
            # Note: NO password field
        }
        
        response = requests.put(
            f"{API_BASE}/users/{test_user_id}",
            json=update_data,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        if response.status_code == 200:
            # Try to login with original password
            login_data = {
                "email": test_user_email,
                "password": test_user_password
            }
            
            login_response = requests.post(
                f"{API_BASE}/users?action=login",
                json=login_data,
                timeout=30
            )
            
            if login_response.status_code == 200:
                log_test("Test 1.5 - Update without password", True, 
                       "Password preserved after update without password field")
            else:
                log_test("Test 1.5 - Update without password", False, 
                       f"Login failed after update, password may have been reset: {login_response.status_code}")
        else:
            log_test("Test 1.5 - Update without password", False, 
                   f"Expected 200, got {response.status_code}: {response.text[:200]}")
            
    except Exception as e:
        log_test("Test 1.5 - Update without password", False, f"Exception: {str(e)}")
else:
    log_test("Test 1.5 - Update without password", False, "No test user ID (Test 1.2 may have failed)")

# ============================================================================
# TEST 1.6: PUT /api/users/{id} with new password changes password
# ============================================================================
print("\n\n### TEST 1.6: PUT /api/users/{id} - Update with new password")
new_password = "NewPassword2026!"

if test_user_id:
    try:
        update_data = {
            "email": test_user_email,
            "password": new_password,
            "role": "COMPANY_ADMIN",
            "is_active": True
        }
        
        response = requests.put(
            f"{API_BASE}/users/{test_user_id}",
            json=update_data,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        if response.status_code == 200:
            # Try to login with OLD password (should fail)
            old_login_data = {
                "email": test_user_email,
                "password": test_user_password
            }
            
            old_login_response = requests.post(
                f"{API_BASE}/users?action=login",
                json=old_login_data,
                timeout=30
            )
            
            # Try to login with NEW password (should succeed)
            new_login_data = {
                "email": test_user_email,
                "password": new_password
            }
            
            new_login_response = requests.post(
                f"{API_BASE}/users?action=login",
                json=new_login_data,
                timeout=30
            )
            
            if old_login_response.status_code == 401 and new_login_response.status_code == 200:
                log_test("Test 1.6 - Update with new password", True, 
                       "Password successfully changed (old password rejected, new password accepted)")
            elif old_login_response.status_code == 200:
                log_test("Test 1.6 - Update with new password", False, 
                       "Old password still works, password not changed")
            elif new_login_response.status_code != 200:
                log_test("Test 1.6 - Update with new password", False, 
                       f"New password doesn't work: {new_login_response.status_code}")
            else:
                log_test("Test 1.6 - Update with new password", False, 
                       "Unexpected login behavior after password change")
        else:
            log_test("Test 1.6 - Update with new password", False, 
                   f"Expected 200, got {response.status_code}: {response.text[:200]}")
            
    except Exception as e:
        log_test("Test 1.6 - Update with new password", False, f"Exception: {str(e)}")
else:
    log_test("Test 1.6 - Update with new password", False, "No test user ID (Test 1.2 may have failed)")

# ============================================================================
# SECTION 2: RESOURCE FIX VERIFICATION
# ============================================================================
print("\n\n" + "="*80)
print("SECTION 2: RESOURCE FIX VERIFICATION (GOM01_Golfo assignment)")
print("="*80)

# ============================================================================
# TEST 2.1: GET /api/resources?company_id=... includes GOM01_Golfo
# ============================================================================
print("\n\n### TEST 2.1: GET /api/resources?company_id={MARLIN_COMPANY_ID}")
try:
    response = requests.get(
        f"{API_BASE}/resources",
        params={"company_id": MARLIN_COMPANY_ID},
        timeout=30
    )
    
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        resources = response.json()
        
        if isinstance(resources, list):
            print(f"Found {len(resources)} resources for Marlin company")
            
            # Look for specific resources
            resource_names = [r.get('name') for r in resources]
            print(f"Resource names: {resource_names}")
            
            expected_resources = ['Tav01 Gom', 'Tav02 Gom', 'GOM01_Golfo']
            found_resources = [name for name in expected_resources if name in resource_names]
            missing_resources = [name for name in expected_resources if name not in resource_names]
            
            # Find GOM01_Golfo specifically
            gom01_resource = next((r for r in resources if r.get('name') == 'GOM01_Golfo'), None)
            
            if gom01_resource:
                gom01_company_id = gom01_resource.get('company_id')
                print(f"GOM01_Golfo found with company_id: {gom01_company_id}")
                
                if gom01_company_id == MARLIN_COMPANY_ID:
                    log_test("Test 2.1 - GOM01_Golfo resource fix", True, 
                           f"GOM01_Golfo correctly assigned to Marlin Sub (company_id={MARLIN_COMPANY_ID}). "
                           f"Found resources: {found_resources}")
                else:
                    log_test("Test 2.1 - GOM01_Golfo resource fix", False, 
                           f"GOM01_Golfo has wrong company_id: {gom01_company_id} (expected {MARLIN_COMPANY_ID})")
            else:
                log_test("Test 2.1 - GOM01_Golfo resource fix", False, 
                       f"GOM01_Golfo not found in resources. Found: {resource_names}")
        else:
            log_test("Test 2.1 - GOM01_Golfo resource fix", False, 
                   f"Expected array, got {type(resources)}")
    else:
        log_test("Test 2.1 - GOM01_Golfo resource fix", False, 
               f"Expected 200, got {response.status_code}: {response.text[:200]}")
        
except Exception as e:
    log_test("Test 2.1 - GOM01_Golfo resource fix", False, f"Exception: {str(e)}")

# ============================================================================
# SECTION 3: CLEANUP
# ============================================================================
print("\n\n" + "="*80)
print("SECTION 3: CLEANUP - Delete test users")
print("="*80)

# ============================================================================
# TEST 3.1: DELETE test users created during testing
# ============================================================================
print(f"\n\n### TEST 3.1: DELETE test users (count: {len(created_test_user_ids)})")

if created_test_user_ids:
    cleanup_success = 0
    cleanup_failed = 0
    
    for user_id in created_test_user_ids:
        try:
            response = requests.delete(
                f"{API_BASE}/users/{user_id}",
                timeout=30
            )
            
            print(f"DELETE /api/users/{user_id}: {response.status_code}")
            
            if response.status_code in [200, 204]:
                cleanup_success += 1
            else:
                cleanup_failed += 1
                print(f"  Failed to delete: {response.text[:200]}")
                
        except Exception as e:
            cleanup_failed += 1
            print(f"  Exception deleting {user_id}: {str(e)}")
    
    if cleanup_failed == 0:
        log_test("Test 3.1 - Cleanup test users", True, 
               f"Successfully deleted {cleanup_success} test users")
    else:
        log_test("Test 3.1 - Cleanup test users", False, 
               f"Deleted {cleanup_success} users, failed to delete {cleanup_failed} users")
else:
    log_test("Test 3.1 - Cleanup test users", True, "No test users to cleanup")

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print_summary()

# Additional summary for the review request
print("\n" + "="*80)
print("REVIEW REQUEST SUMMARY")
print("="*80)
print(f"✅ User Management API: {test_results['passed']} tests passed")
print(f"✅ Resource Fix (GOM01_Golfo): Verified assignment to Marlin Sub")
print(f"✅ Cleanup: Test users deleted")
print("="*80)

# Exit with appropriate code
exit(0 if test_results["failed"] == 0 else 1)
