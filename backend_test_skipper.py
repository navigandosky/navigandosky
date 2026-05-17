#!/usr/bin/env python3
"""
Backend Testing Script for Skipper Mobile Dashboard
Tests all new endpoints: users (skipper), skipper-bookings, transport-logs, bookings (passengers_checkin)
"""

import os
import sys
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://sardinia-tours-hub.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Test credentials and IDs
SKIPPER_ID = "64bd1689-0458-49c5-bba4-645aa1468fd3"
SKIPPER_USERNAME = "skipper_marlin"
SKIPPER_PASSWORD = "Skipper2026$"
COMPANY_ID = "03f77ea6-95c7-49c4-a13b-df54bc28ecc2"
ASSIGNED_RESOURCES = [
    "b160d597-f794-4b32-b289-7365538f12cd",
    "4c5c8ae7-e813-43ac-b4ca-8b5e2a21272b",
    "1b82206d-0ecb-42c5-9f5d-7ac68159e217",
    "458139f6-f5e5-4946-a4ff-e60dc752e870"
]
TEST_BOOKING_ID = "4d5f6156-a89f-420b-b202-407e7147447f"  # MK-2026-0002

# Test results
test_results = []

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    test_results.append({"name": name, "passed": passed, "details": details})
    print(f"{status}: {name}")
    if details:
        print(f"   {details}")

def print_summary():
    """Print test summary"""
    total = len(test_results)
    passed = sum(1 for t in test_results if t["passed"])
    failed = total - passed
    
    print("\n" + "="*80)
    print(f"TEST SUMMARY: {passed}/{total} passed ({failed} failed)")
    print("="*80)
    
    if failed > 0:
        print("\nFailed tests:")
        for t in test_results:
            if not t["passed"]:
                print(f"  ❌ {t['name']}: {t['details']}")
    
    return failed == 0

# ==================== A) USERS API - Skipper management & login ====================

def test_a1_create_skipper():
    """A1: POST /api/users with skipper role and new fields"""
    print("\n[A1] Testing POST /api/users - Create skipper with new fields")
    
    payload = {
        "email": f"test_skipper_{datetime.now().timestamp()}@test.com",
        "username": f"test_skipper_{int(datetime.now().timestamp())}",
        "password": "TestPass123!",
        "role": "SKIPPER",
        "full_name": "Test Skipper Full Name",
        "phone": "+39 333 9999999",
        "company_id": COMPANY_ID,
        "assigned_resource_ids": [ASSIGNED_RESOURCES[0]]
    }
    
    try:
        resp = requests.post(f"{API_URL}/users", json=payload, timeout=10)
        
        if resp.status_code != 201:
            log_test("A1: Create skipper", False, f"Expected 201, got {resp.status_code}: {resp.text[:200]}")
            return None
        
        data = resp.json()
        
        # Verify all fields are present
        required_fields = ["id", "email", "username", "role", "full_name", "phone", "assigned_resource_ids"]
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            log_test("A1: Create skipper", False, f"Missing fields: {missing}")
            return None
        
        if data["role"] != "SKIPPER":
            log_test("A1: Create skipper", False, f"Role should be SKIPPER, got {data['role']}")
            return None
        
        if data["full_name"] != payload["full_name"]:
            log_test("A1: Create skipper", False, f"full_name mismatch")
            return None
        
        if data["phone"] != payload["phone"]:
            log_test("A1: Create skipper", False, f"phone mismatch")
            return None
        
        if data["assigned_resource_ids"] != payload["assigned_resource_ids"]:
            log_test("A1: Create skipper", False, f"assigned_resource_ids mismatch")
            return None
        
        if "password" in data:
            log_test("A1: Create skipper", False, "Password should not be returned")
            return None
        
        log_test("A1: Create skipper", True, f"Created skipper {data['id']} with all new fields")
        return data["id"]
        
    except Exception as e:
        log_test("A1: Create skipper", False, f"Exception: {str(e)}")
        return None

def test_a2_login_skipper():
    """A2: POST /api/users/login with existing skipper credentials"""
    print("\n[A2] Testing POST /api/users/login - Login with skipper credentials")
    
    payload = {
        "email_or_username": SKIPPER_USERNAME,
        "password": SKIPPER_PASSWORD
    }
    
    try:
        resp = requests.post(f"{API_URL}/users/login", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_test("A2: Login skipper", False, f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        
        if "user" not in data:
            log_test("A2: Login skipper", False, "Response should contain 'user' object")
            return False
        
        user = data["user"]
        
        if "password" in user:
            log_test("A2: Login skipper", False, "Password should not be returned")
            return False
        
        if user.get("id") != SKIPPER_ID:
            log_test("A2: Login skipper", False, f"Expected skipper ID {SKIPPER_ID}, got {user.get('id')}")
            return False
        
        if user.get("role") != "SKIPPER":
            log_test("A2: Login skipper", False, f"Expected role SKIPPER, got {user.get('role')}")
            return False
        
        log_test("A2: Login skipper", True, f"Login successful for {SKIPPER_USERNAME}")
        return True
        
    except Exception as e:
        log_test("A2: Login skipper", False, f"Exception: {str(e)}")
        return False

def test_a3_login_wrong_password():
    """A3: POST /api/users/login with wrong password should return 401"""
    print("\n[A3] Testing POST /api/users/login - Wrong password")
    
    payload = {
        "email_or_username": SKIPPER_USERNAME,
        "password": "WrongPassword123!"
    }
    
    try:
        resp = requests.post(f"{API_URL}/users/login", json=payload, timeout=10)
        
        if resp.status_code != 401:
            log_test("A3: Login wrong password", False, f"Expected 401, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if "error" not in data:
            log_test("A3: Login wrong password", False, "Response should contain 'error' field")
            return False
        
        if "Credenziali non valide" not in data["error"]:
            log_test("A3: Login wrong password", False, f"Expected 'Credenziali non valide', got {data['error']}")
            return False
        
        log_test("A3: Login wrong password", True, "Correctly rejected with 401")
        return True
        
    except Exception as e:
        log_test("A3: Login wrong password", False, f"Exception: {str(e)}")
        return False

def test_a4_update_assigned_resources():
    """A4: PUT /api/users/{id} to update assigned_resource_ids without overwriting password"""
    print("\n[A4] Testing PUT /api/users/{id} - Update assigned_resource_ids")
    
    # First, get current user data
    try:
        resp = requests.get(f"{API_URL}/users/{SKIPPER_ID}", timeout=10)
        if resp.status_code != 200:
            log_test("A4: Update assigned resources", False, f"Failed to get user: {resp.status_code}")
            return False
        
        original_user = resp.json()
        
        # Update only assigned_resource_ids
        new_resources = ["res1", "res2"]
        payload = {
            "assigned_resource_ids": new_resources
        }
        
        resp = requests.put(f"{API_URL}/users/{SKIPPER_ID}", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_test("A4: Update assigned resources", False, f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        
        if data.get("assigned_resource_ids") != new_resources:
            log_test("A4: Update assigned resources", False, f"assigned_resource_ids not updated correctly")
            return False
        
        # Verify password was not overwritten (try to login)
        login_payload = {
            "email_or_username": SKIPPER_USERNAME,
            "password": SKIPPER_PASSWORD
        }
        
        login_resp = requests.post(f"{API_URL}/users/login", json=login_payload, timeout=10)
        
        if login_resp.status_code != 200:
            log_test("A4: Update assigned resources", False, "Password was overwritten - login failed")
            # Restore original resources
            requests.put(f"{API_URL}/users/{SKIPPER_ID}", json={"assigned_resource_ids": ASSIGNED_RESOURCES}, timeout=10)
            return False
        
        # Restore original assigned resources
        requests.put(f"{API_URL}/users/{SKIPPER_ID}", json={"assigned_resource_ids": ASSIGNED_RESOURCES}, timeout=10)
        
        log_test("A4: Update assigned resources", True, "Updated assigned_resource_ids without overwriting password")
        return True
        
    except Exception as e:
        log_test("A4: Update assigned resources", False, f"Exception: {str(e)}")
        return False

def test_a5_login_empty_body():
    """A5: POST /api/users/login with empty body should return 401"""
    print("\n[A5] Testing POST /api/users/login - Empty body")
    
    try:
        resp = requests.post(f"{API_URL}/users/login", json={}, timeout=10)
        
        if resp.status_code != 401:
            log_test("A5: Login empty body", False, f"Expected 401, got {resp.status_code}")
            return False
        
        log_test("A5: Login empty body", True, "Correctly rejected with 401")
        return True
        
    except Exception as e:
        log_test("A5: Login empty body", False, f"Exception: {str(e)}")
        return False

# ==================== B) SKIPPER-BOOKINGS endpoint ====================

def test_b1_skipper_bookings_no_id():
    """B1: GET /api/skipper-bookings without skipper_id should return 400"""
    print("\n[B1] Testing GET /api/skipper-bookings - No skipper_id")
    
    try:
        resp = requests.get(f"{API_URL}/skipper-bookings", timeout=10)
        
        if resp.status_code != 400:
            log_test("B1: Skipper bookings no ID", False, f"Expected 400, got {resp.status_code}")
            return False
        
        log_test("B1: Skipper bookings no ID", True, "Correctly returned 400")
        return True
        
    except Exception as e:
        log_test("B1: Skipper bookings no ID", False, f"Exception: {str(e)}")
        return False

def test_b2_skipper_bookings_invalid_id():
    """B2: GET /api/skipper-bookings?skipper_id=invalid should return 404"""
    print("\n[B2] Testing GET /api/skipper-bookings - Invalid skipper_id")
    
    try:
        resp = requests.get(f"{API_URL}/skipper-bookings?skipper_id=invalid_id_12345", timeout=10)
        
        if resp.status_code != 404:
            log_test("B2: Skipper bookings invalid ID", False, f"Expected 404, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if "Skipper non trovato" not in data.get("error", ""):
            log_test("B2: Skipper bookings invalid ID", False, f"Expected 'Skipper non trovato', got {data.get('error')}")
            return False
        
        log_test("B2: Skipper bookings invalid ID", True, "Correctly returned 404 with 'Skipper non trovato'")
        return True
        
    except Exception as e:
        log_test("B2: Skipper bookings invalid ID", False, f"Exception: {str(e)}")
        return False

def test_b3_skipper_bookings_valid():
    """B3: GET /api/skipper-bookings with valid skipper_id and date"""
    print("\n[B3] Testing GET /api/skipper-bookings - Valid request")
    
    try:
        resp = requests.get(
            f"{API_URL}/skipper-bookings?skipper_id={SKIPPER_ID}&date=2026-05-21",
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("B3: Skipper bookings valid", False, f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        
        # Verify structure
        required_fields = ["skipper", "date", "groups", "total_bookings"]
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            log_test("B3: Skipper bookings valid", False, f"Missing fields: {missing}")
            return False
        
        # Verify skipper object
        skipper = data["skipper"]
        skipper_fields = ["id", "full_name", "email", "phone"]
        missing_skipper = [f for f in skipper_fields if f not in skipper]
        
        if missing_skipper:
            log_test("B3: Skipper bookings valid", False, f"Missing skipper fields: {missing_skipper}")
            return False
        
        # Verify date echo
        if data["date"] != "2026-05-21":
            log_test("B3: Skipper bookings valid", False, f"Date mismatch: expected 2026-05-21, got {data['date']}")
            return False
        
        # Verify groups structure
        if not isinstance(data["groups"], list):
            log_test("B3: Skipper bookings valid", False, "groups should be an array")
            return False
        
        for group in data["groups"]:
            if "resource" not in group or "bookings" not in group:
                log_test("B3: Skipper bookings valid", False, "Each group should have 'resource' and 'bookings'")
                return False
        
        # Verify total_bookings is a number
        if not isinstance(data["total_bookings"], int):
            log_test("B3: Skipper bookings valid", False, "total_bookings should be a number")
            return False
        
        log_test("B3: Skipper bookings valid", True, f"Returned {data['total_bookings']} bookings in {len(data['groups'])} groups")
        return True
        
    except Exception as e:
        log_test("B3: Skipper bookings valid", False, f"Exception: {str(e)}")
        return False

def test_b4_skipper_bookings_filtering():
    """B4: Verify bookings are filtered by assigned resources"""
    print("\n[B4] Testing GET /api/skipper-bookings - Filtering logic")
    
    try:
        resp = requests.get(
            f"{API_URL}/skipper-bookings?skipper_id={SKIPPER_ID}&date=2026-05-21",
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("B4: Skipper bookings filtering", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Verify that returned bookings are for assigned resources
        for group in data["groups"]:
            resource_id = group["resource"]["id"]
            if resource_id not in ASSIGNED_RESOURCES:
                log_test("B4: Skipper bookings filtering", False, f"Resource {resource_id} not in assigned resources")
                return False
        
        log_test("B4: Skipper bookings filtering", True, "All returned bookings are for assigned resources")
        return True
        
    except Exception as e:
        log_test("B4: Skipper bookings filtering", False, f"Exception: {str(e)}")
        return False

def test_b5_skipper_bookings_specific_date():
    """B5: Verify specific bookings on 2026-05-21"""
    print("\n[B5] Testing GET /api/skipper-bookings - Specific date bookings")
    
    try:
        resp = requests.get(
            f"{API_URL}/skipper-bookings?skipper_id={SKIPPER_ID}&date=2026-05-21",
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("B5: Skipper bookings specific date", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Look for "Tav01 Gom" group with MK-2026-0002 and MK-2026-0017
        found_tav01 = False
        found_mk0002 = False
        found_mk0017 = False
        
        for group in data["groups"]:
            resource_name = group["resource"].get("name", "")
            if "Tav01 Gom" in resource_name:
                found_tav01 = True
                for booking in group["bookings"]:
                    ref = booking.get("booking_ref", "")
                    if ref == "MK-2026-0002":
                        found_mk0002 = True
                    if ref == "MK-2026-0017":
                        found_mk0017 = True
        
        if not found_tav01:
            log_test("B5: Skipper bookings specific date", False, "Expected 'Tav01 Gom' group not found")
            return False
        
        if not found_mk0002:
            log_test("B5: Skipper bookings specific date", False, "Expected booking MK-2026-0002 not found")
            return False
        
        if not found_mk0017:
            log_test("B5: Skipper bookings specific date", False, "Expected booking MK-2026-0017 not found")
            return False
        
        log_test("B5: Skipper bookings specific date", True, "Found Tav01 Gom group with MK-2026-0002 and MK-2026-0017")
        return True
        
    except Exception as e:
        log_test("B5: Skipper bookings specific date", False, f"Exception: {str(e)}")
        return False

def test_b6_skipper_bookings_no_data():
    """B6: Test with date with no bookings"""
    print("\n[B6] Testing GET /api/skipper-bookings - No data date")
    
    try:
        resp = requests.get(
            f"{API_URL}/skipper-bookings?skipper_id={SKIPPER_ID}&date=2030-01-01",
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("B6: Skipper bookings no data", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if data.get("groups") != []:
            log_test("B6: Skipper bookings no data", False, f"Expected empty groups, got {len(data.get('groups', []))} groups")
            return False
        
        if data.get("total_bookings") != 0:
            log_test("B6: Skipper bookings no data", False, f"Expected total_bookings=0, got {data.get('total_bookings')}")
            return False
        
        log_test("B6: Skipper bookings no data", True, "Correctly returned empty groups and total_bookings=0")
        return True
        
    except Exception as e:
        log_test("B6: Skipper bookings no data", False, f"Exception: {str(e)}")
        return False

# ==================== C) TRANSPORT-LOGS endpoint ====================

def test_c1_get_transport_logs():
    """C1: GET /api/transport-logs (no params)"""
    print("\n[C1] Testing GET /api/transport-logs - Get all logs")
    
    try:
        resp = requests.get(f"{API_URL}/transport-logs", timeout=10)
        
        if resp.status_code != 200:
            log_test("C1: Get transport logs", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if not isinstance(data, list):
            log_test("C1: Get transport logs", False, "Response should be an array")
            return False
        
        log_test("C1: Get transport logs", True, f"Returned {len(data)} logs")
        return True
        
    except Exception as e:
        log_test("C1: Get transport logs", False, f"Exception: {str(e)}")
        return False

def test_c2_create_transport_log():
    """C2: POST /api/transport-logs - Create new log"""
    print("\n[C2] Testing POST /api/transport-logs - Create log")
    
    payload = {
        "resource_id": "1b82206d-0ecb-42c5-9f5d-7ac68159e217",
        "resource_name": "Tav01 Gom",
        "skipper_id": SKIPPER_ID,
        "skipper_name": "Mario Rossi",
        "skipper_phone": "+39 348 1234567",
        "company_id": COMPANY_ID,
        "date": "2026-05-21",
        "bookings_snapshot": [
            {
                "booking_ref": "MK-2026-0002",
                "customer_name": "Test Customer",
                "seats": 2
            }
        ],
        "total_passengers": 2,
        "total_bookings": 1,
        "status": "CLOSED",
        "pdf_data": "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA2MTIgNzkyXS9Db250ZW50cyA0IDAgUj4+CmVuZG9iago0IDAgb2JqCjw8L0xlbmd0aCA0Nj4+CnN0cmVhbQpCVAovRjEgMTIgVGYKMTAwIDcwMCBUZAooVGVzdCBQREYpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjE1IDAwMDAwIG4gCjAwMDAwMDAyNjQgMDAwMDAgbiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTAzIDAwMDAwIG4gCjAwMDAwMDAzMjMgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDEKJSVFT0YK"
    }
    
    try:
        resp = requests.post(f"{API_URL}/transport-logs", json=payload, timeout=10)
        
        if resp.status_code != 201:
            log_test("C2: Create transport log", False, f"Expected 201, got {resp.status_code}: {resp.text[:200]}")
            return None
        
        data = resp.json()
        
        # Verify all fields
        required_fields = ["id", "resource_id", "resource_name", "skipper_id", "date", "bookings_snapshot", "total_passengers", "total_bookings", "status", "pdf_data"]
        missing = [f for f in required_fields if f not in data]
        
        if missing:
            log_test("C2: Create transport log", False, f"Missing fields: {missing}")
            return None
        
        if data["pdf_data"] != payload["pdf_data"]:
            log_test("C2: Create transport log", False, "pdf_data not stored correctly")
            return None
        
        log_test("C2: Create transport log", True, f"Created log {data['id']} with pdf_data")
        return data["id"]
        
    except Exception as e:
        log_test("C2: Create transport log", False, f"Exception: {str(e)}")
        return None

def test_c3_upsert_transport_log(log_id):
    """C3: POST again with same resource_id+date should update (upsert)"""
    print("\n[C3] Testing POST /api/transport-logs - Upsert existing log")
    
    payload = {
        "resource_id": "1b82206d-0ecb-42c5-9f5d-7ac68159e217",
        "resource_name": "Tav01 Gom",
        "skipper_id": SKIPPER_ID,
        "skipper_name": "Mario Rossi",
        "skipper_phone": "+39 348 1234567",
        "company_id": COMPANY_ID,
        "date": "2026-05-21",
        "bookings_snapshot": [
            {
                "booking_ref": "MK-2026-0002",
                "customer_name": "Test Customer",
                "seats": 2
            },
            {
                "booking_ref": "MK-2026-0017",
                "customer_name": "Another Customer",
                "seats": 3
            }
        ],
        "total_passengers": 5,
        "total_bookings": 2,
        "status": "CLOSED",
        "pdf_data": "data:application/pdf;base64,UPDATED_PDF_DATA"
    }
    
    try:
        resp = requests.post(f"{API_URL}/transport-logs", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_test("C3: Upsert transport log", False, f"Expected 200 (update), got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        
        # Verify it's the same ID (updated, not created)
        if log_id and data.get("id") != log_id:
            log_test("C3: Upsert transport log", False, f"Expected same ID {log_id}, got {data.get('id')}")
            return False
        
        # Verify updated data
        if data.get("total_bookings") != 2:
            log_test("C3: Upsert transport log", False, f"Expected total_bookings=2, got {data.get('total_bookings')}")
            return False
        
        if data.get("total_passengers") != 5:
            log_test("C3: Upsert transport log", False, f"Expected total_passengers=5, got {data.get('total_passengers')}")
            return False
        
        log_test("C3: Upsert transport log", True, "Successfully updated existing log (upsert)")
        return True
        
    except Exception as e:
        log_test("C3: Upsert transport log", False, f"Exception: {str(e)}")
        return False

def test_c4_get_logs_by_resource():
    """C4: GET /api/transport-logs?resource_id=X"""
    print("\n[C4] Testing GET /api/transport-logs - Filter by resource_id")
    
    try:
        resp = requests.get(
            f"{API_URL}/transport-logs?resource_id=1b82206d-0ecb-42c5-9f5d-7ac68159e217",
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("C4: Get logs by resource", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if not isinstance(data, list):
            log_test("C4: Get logs by resource", False, "Response should be an array")
            return False
        
        # Verify all logs are for the specified resource
        for log in data:
            if log.get("resource_id") != "1b82206d-0ecb-42c5-9f5d-7ac68159e217":
                log_test("C4: Get logs by resource", False, f"Found log with different resource_id: {log.get('resource_id')}")
                return False
        
        log_test("C4: Get logs by resource", True, f"Returned {len(data)} logs for resource")
        return True
        
    except Exception as e:
        log_test("C4: Get logs by resource", False, f"Exception: {str(e)}")
        return False

def test_c5_get_logs_by_date():
    """C5: GET /api/transport-logs?date=YYYY-MM-DD"""
    print("\n[C5] Testing GET /api/transport-logs - Filter by date")
    
    try:
        resp = requests.get(f"{API_URL}/transport-logs?date=2026-05-21", timeout=10)
        
        if resp.status_code != 200:
            log_test("C5: Get logs by date", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if not isinstance(data, list):
            log_test("C5: Get logs by date", False, "Response should be an array")
            return False
        
        # Verify all logs are for the specified date
        for log in data:
            if log.get("date") != "2026-05-21":
                log_test("C5: Get logs by date", False, f"Found log with different date: {log.get('date')}")
                return False
        
        log_test("C5: Get logs by date", True, f"Returned {len(data)} logs for date")
        return True
        
    except Exception as e:
        log_test("C5: Get logs by date", False, f"Exception: {str(e)}")
        return False

def test_c6_get_logs_by_range():
    """C6: GET /api/transport-logs?from=X&to=Y"""
    print("\n[C6] Testing GET /api/transport-logs - Filter by date range")
    
    try:
        resp = requests.get(
            f"{API_URL}/transport-logs?from=2026-05-01&to=2026-05-31",
            timeout=10
        )
        
        if resp.status_code != 200:
            log_test("C6: Get logs by range", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if not isinstance(data, list):
            log_test("C6: Get logs by range", False, "Response should be an array")
            return False
        
        # Verify all logs are within the range
        for log in data:
            log_date = log.get("date")
            if log_date < "2026-05-01" or log_date > "2026-05-31":
                log_test("C6: Get logs by range", False, f"Found log outside range: {log_date}")
                return False
        
        log_test("C6: Get logs by range", True, f"Returned {len(data)} logs in range")
        return True
        
    except Exception as e:
        log_test("C6: Get logs by range", False, f"Exception: {str(e)}")
        return False

def test_c7_get_logs_by_company():
    """C7: GET /api/transport-logs?company_id=X"""
    print("\n[C7] Testing GET /api/transport-logs - Filter by company_id")
    
    try:
        resp = requests.get(f"{API_URL}/transport-logs?company_id={COMPANY_ID}", timeout=10)
        
        if resp.status_code != 200:
            log_test("C7: Get logs by company", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if not isinstance(data, list):
            log_test("C7: Get logs by company", False, "Response should be an array")
            return False
        
        # Verify all logs are for the specified company
        for log in data:
            if log.get("company_id") != COMPANY_ID:
                log_test("C7: Get logs by company", False, f"Found log with different company_id: {log.get('company_id')}")
                return False
        
        log_test("C7: Get logs by company", True, f"Returned {len(data)} logs for company")
        return True
        
    except Exception as e:
        log_test("C7: Get logs by company", False, f"Exception: {str(e)}")
        return False

def test_c8_get_single_log(log_id):
    """C8: GET /api/transport-logs/{id}"""
    print("\n[C8] Testing GET /api/transport-logs/{id} - Get single log")
    
    if not log_id:
        log_test("C8: Get single log", False, "No log_id provided")
        return False
    
    try:
        resp = requests.get(f"{API_URL}/transport-logs/{log_id}", timeout=10)
        
        if resp.status_code != 200:
            log_test("C8: Get single log", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        if data.get("id") != log_id:
            log_test("C8: Get single log", False, f"Expected id {log_id}, got {data.get('id')}")
            return False
        
        log_test("C8: Get single log", True, f"Retrieved log {log_id}")
        return True
        
    except Exception as e:
        log_test("C8: Get single log", False, f"Exception: {str(e)}")
        return False

def test_c9_update_log(log_id):
    """C9: PUT /api/transport-logs/{id}"""
    print("\n[C9] Testing PUT /api/transport-logs/{id} - Update log")
    
    if not log_id:
        log_test("C9: Update log", False, "No log_id provided")
        return False
    
    payload = {
        "notes": "Updated notes from test"
    }
    
    try:
        resp = requests.put(f"{API_URL}/transport-logs/{log_id}", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_test("C9: Update log", False, f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        
        if data.get("notes") != "Updated notes from test":
            log_test("C9: Update log", False, f"Notes not updated correctly")
            return False
        
        log_test("C9: Update log", True, "Successfully updated log notes")
        return True
        
    except Exception as e:
        log_test("C9: Update log", False, f"Exception: {str(e)}")
        return False

def test_c10_delete_log(log_id):
    """C10: DELETE /api/transport-logs/{id}"""
    print("\n[C10] Testing DELETE /api/transport-logs/{id} - Delete log")
    
    if not log_id:
        log_test("C10: Delete log", False, "No log_id provided")
        return False
    
    try:
        resp = requests.delete(f"{API_URL}/transport-logs/{log_id}", timeout=10)
        
        if resp.status_code != 200:
            log_test("C10: Delete log", False, f"Expected 200, got {resp.status_code}")
            return False
        
        # Verify it's deleted
        get_resp = requests.get(f"{API_URL}/transport-logs/{log_id}", timeout=10)
        
        if get_resp.status_code != 404:
            log_test("C10: Delete log", False, f"Log still exists after deletion")
            return False
        
        log_test("C10: Delete log", True, "Successfully deleted log")
        return True
        
    except Exception as e:
        log_test("C10: Delete log", False, f"Exception: {str(e)}")
        return False

def test_c11_create_log_missing_fields():
    """C11: POST without resource_id or date should return 400"""
    print("\n[C11] Testing POST /api/transport-logs - Missing required fields")
    
    # Test without resource_id
    payload1 = {
        "date": "2026-05-21",
        "total_passengers": 2
    }
    
    try:
        resp = requests.post(f"{API_URL}/transport-logs", json=payload1, timeout=10)
        
        if resp.status_code != 400:
            log_test("C11: Create log missing fields", False, f"Expected 400 for missing resource_id, got {resp.status_code}")
            return False
        
        # Test without date
        payload2 = {
            "resource_id": "test-resource-id",
            "total_passengers": 2
        }
        
        resp = requests.post(f"{API_URL}/transport-logs", json=payload2, timeout=10)
        
        if resp.status_code != 400:
            log_test("C11: Create log missing fields", False, f"Expected 400 for missing date, got {resp.status_code}")
            return False
        
        log_test("C11: Create log missing fields", True, "Correctly rejected missing required fields with 400")
        return True
        
    except Exception as e:
        log_test("C11: Create log missing fields", False, f"Exception: {str(e)}")
        return False

# ==================== D) BOOKING UPDATE - passengers_checkin ====================

def test_d1_update_booking_passengers_checkin():
    """D1: PUT /api/bookings/{id} with passengers_checkin field"""
    print("\n[D1] Testing PUT /api/bookings/{id} - Update passengers_checkin")
    
    payload = {
        "passengers_checkin": [
            {
                "name": "Mario",
                "surname": "Rossi",
                "phone": "+39123456789",
                "notes": "Test passenger"
            },
            {
                "name": "Giulia",
                "surname": "Bianchi",
                "phone": "+39987654321"
            }
        ],
        "checked_in_at": "2026-05-21T10:00:00Z",
        "assigned_skipper_id": SKIPPER_ID
    }
    
    try:
        resp = requests.put(f"{API_URL}/bookings/{TEST_BOOKING_ID}", json=payload, timeout=10)
        
        if resp.status_code != 200:
            log_test("D1: Update booking passengers_checkin", False, f"Expected 200, got {resp.status_code}: {resp.text[:200]}")
            return False
        
        data = resp.json()
        
        # Verify passengers_checkin is stored
        if "passengers_checkin" not in data:
            log_test("D1: Update booking passengers_checkin", False, "passengers_checkin field not in response")
            return False
        
        if len(data["passengers_checkin"]) != 2:
            log_test("D1: Update booking passengers_checkin", False, f"Expected 2 passengers, got {len(data['passengers_checkin'])}")
            return False
        
        # Verify checked_in_at
        if data.get("checked_in_at") != "2026-05-21T10:00:00Z":
            log_test("D1: Update booking passengers_checkin", False, "checked_in_at not updated correctly")
            return False
        
        # Verify assigned_skipper_id
        if data.get("assigned_skipper_id") != SKIPPER_ID:
            log_test("D1: Update booking passengers_checkin", False, "assigned_skipper_id not updated correctly")
            return False
        
        log_test("D1: Update booking passengers_checkin", True, "Successfully updated passengers_checkin, checked_in_at, and assigned_skipper_id")
        return True
        
    except Exception as e:
        log_test("D1: Update booking passengers_checkin", False, f"Exception: {str(e)}")
        return False

def test_d2_get_booking_with_passengers_checkin():
    """D2: GET /api/bookings/{id} should return passengers_checkin"""
    print("\n[D2] Testing GET /api/bookings/{id} - Retrieve passengers_checkin")
    
    try:
        resp = requests.get(f"{API_URL}/bookings/{TEST_BOOKING_ID}", timeout=10)
        
        if resp.status_code != 200:
            log_test("D2: Get booking with passengers_checkin", False, f"Expected 200, got {resp.status_code}")
            return False
        
        data = resp.json()
        
        # Verify passengers_checkin is present
        if "passengers_checkin" not in data:
            log_test("D2: Get booking with passengers_checkin", False, "passengers_checkin field not in response")
            return False
        
        if not isinstance(data["passengers_checkin"], list):
            log_test("D2: Get booking with passengers_checkin", False, "passengers_checkin should be an array")
            return False
        
        if len(data["passengers_checkin"]) != 2:
            log_test("D2: Get booking with passengers_checkin", False, f"Expected 2 passengers, got {len(data['passengers_checkin'])}")
            return False
        
        # Verify passenger data integrity
        first_passenger = data["passengers_checkin"][0]
        if first_passenger.get("name") != "Mario" or first_passenger.get("surname") != "Rossi":
            log_test("D2: Get booking with passengers_checkin", False, "Passenger data not intact")
            return False
        
        log_test("D2: Get booking with passengers_checkin", True, "Successfully retrieved passengers_checkin array")
        return True
        
    except Exception as e:
        log_test("D2: Get booking with passengers_checkin", False, f"Exception: {str(e)}")
        return False

# ==================== MAIN TEST RUNNER ====================

def main():
    print("="*80)
    print("SKIPPER MOBILE DASHBOARD - BACKEND API TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API URL: {API_URL}")
    print("="*80)
    
    # A) USERS API - Skipper management & login
    print("\n" + "="*80)
    print("A) USERS API - Skipper management & login")
    print("="*80)
    
    new_skipper_id = test_a1_create_skipper()
    test_a2_login_skipper()
    test_a3_login_wrong_password()
    test_a4_update_assigned_resources()
    test_a5_login_empty_body()
    
    # B) SKIPPER-BOOKINGS endpoint
    print("\n" + "="*80)
    print("B) SKIPPER-BOOKINGS endpoint")
    print("="*80)
    
    test_b1_skipper_bookings_no_id()
    test_b2_skipper_bookings_invalid_id()
    test_b3_skipper_bookings_valid()
    test_b4_skipper_bookings_filtering()
    test_b5_skipper_bookings_specific_date()
    test_b6_skipper_bookings_no_data()
    
    # C) TRANSPORT-LOGS endpoint
    print("\n" + "="*80)
    print("C) TRANSPORT-LOGS endpoint (CRUD)")
    print("="*80)
    
    test_c1_get_transport_logs()
    log_id = test_c2_create_transport_log()
    test_c3_upsert_transport_log(log_id)
    test_c4_get_logs_by_resource()
    test_c5_get_logs_by_date()
    test_c6_get_logs_by_range()
    test_c7_get_logs_by_company()
    test_c8_get_single_log(log_id)
    test_c9_update_log(log_id)
    test_c10_delete_log(log_id)
    test_c11_create_log_missing_fields()
    
    # D) BOOKING UPDATE - passengers_checkin
    print("\n" + "="*80)
    print("D) BOOKING UPDATE - passengers_checkin field")
    print("="*80)
    
    test_d1_update_booking_passengers_checkin()
    test_d2_get_booking_with_passengers_checkin()
    
    # Print summary
    all_passed = print_summary()
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
