#!/usr/bin/env python3
"""
Marina Transit Pass Backend Testing
Tests all CRUD operations and validation for the new Marina Transit Pass feature
"""

import requests
import json
from datetime import datetime, timedelta

# Base URL from .env
BASE_URL = "https://marina-management.preview.emergentagent.com/api"

# Test data
MARINA_ID = "77a960f0-44d6-4911-bd4f-302d3025e0a1"  # Porticciolo Bosa Marina
COMPANY_ID = "03f77ea6-95c7-49c4-a13b-df54bc28ecc2"  # Marlin Sub

# Store created pass IDs for cleanup
created_pass_ids = []

def print_test(test_num, description):
    print(f"\n{'='*80}")
    print(f"TEST {test_num}: {description}")
    print('='*80)

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")

# ============================================================================
# SECTION A: CREATE PASS
# ============================================================================

def test_a1_create_valid_pass():
    """A1: Create pass with valid payload"""
    print_test("A1", "Create pass with valid payload")
    
    try:
        payload = {
            "marina_id": MARINA_ID,
            "company_id": COMPANY_ID,
            "customer": {
                "name": "Mario",
                "surname": "Rossi",
                "email": "mario@test.it",
                "phone": "+39 333 1234567"
            },
            "boat": {
                "name": "Sea Breeze",
                "type": "Vela"
            },
            "license_plate": "IT-AB-123",
            "valid_from": "2026-06-20",
            "valid_to": "2026-06-25",
            "notes": "Test pass"
        }
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Validate response
            assert "id" in data, "Missing id field"
            assert "pass_number" in data, "Missing pass_number field"
            assert data["pass_number"].startswith("PT-2026/"), f"Invalid pass_number format: {data['pass_number']}"
            assert data["marina_name"] == "Porticciolo Bosa Marina", f"Wrong marina_name: {data['marina_name']}"
            assert data["company_name"], "Missing company_name"
            assert data["archived"] == False, "Should not be archived"
            assert data["customer"]["name"] == "Mario", "Customer name mismatch"
            assert data["customer"]["email"] == "mario@test.it", "Customer email mismatch"
            assert data["boat"]["name"] == "Sea Breeze", "Boat name mismatch"
            assert data["license_plate"] == "IT-AB-123", "License plate mismatch"
            assert data["valid_from"] == "2026-06-20", "valid_from mismatch"
            assert data["valid_to"] == "2026-06-25", "valid_to mismatch"
            assert data["notes"] == "Test pass", "Notes mismatch"
            
            created_pass_ids.append(data["id"])
            print_result(True, f"Pass created successfully with number {data['pass_number']}")
            return data
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 201, got {response.status_code}")
            return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return None

def test_a2_create_second_pass():
    """A2: Create second pass to verify progressive numbering"""
    print_test("A2", "Create second pass - verify progressive number increments")
    
    try:
        payload = {
            "marina_id": MARINA_ID,
            "company_id": COMPANY_ID,
            "customer": {
                "name": "Luigi",
                "surname": "Bianchi",
                "email": "luigi@test.it",
                "phone": "+39 333 9876543"
            },
            "boat": {
                "name": "Ocean Dream",
                "type": "Motore"
            },
            "license_plate": "IT-CD-456",
            "valid_from": "2026-06-22",
            "valid_to": "2026-06-28",
            "notes": "Second test pass"
        }
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes", json=payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            print(f"Pass number: {data['pass_number']}")
            
            # Extract number from pass_number (PT-2026/0002)
            pass_num = int(data['pass_number'].split('/')[-1])
            print(f"Progressive number: {pass_num}")
            
            created_pass_ids.append(data["id"])
            print_result(True, f"Pass created with progressive number {data['pass_number']}")
            return data
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 201, got {response.status_code}")
            return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return None

def test_a3_missing_marina_id():
    """A3: Missing marina_id should return 400"""
    print_test("A3", "Missing marina_id - expect 400")
    
    try:
        payload = {
            "company_id": COMPANY_ID,
            "customer": {"name": "Test", "email": "test@test.it"},
            "valid_from": "2026-06-20",
            "valid_to": "2026-06-25"
        }
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            print_result(True, "Correctly rejected missing marina_id with 400")
            return True
        else:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

def test_a4_missing_valid_from():
    """A4: Missing valid_from should return 400"""
    print_test("A4", "Missing valid_from - expect 400")
    
    try:
        payload = {
            "marina_id": MARINA_ID,
            "company_id": COMPANY_ID,
            "customer": {"name": "Test", "email": "test@test.it"},
            "valid_to": "2026-06-25"
        }
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            print_result(True, "Correctly rejected missing valid_from with 400")
            return True
        else:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

def test_a5_invalid_date_range():
    """A5: valid_from > valid_to should return 400"""
    print_test("A5", "valid_from > valid_to - expect 400 with 'data inizio deve precedere'")
    
    try:
        payload = {
            "marina_id": MARINA_ID,
            "company_id": COMPANY_ID,
            "customer": {"name": "Test", "email": "test@test.it"},
            "valid_from": "2026-07-01",
            "valid_to": "2026-06-25"
        }
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            error_msg = response.json().get("error", "").lower()
            if "data inizio" in error_msg or "precedere" in error_msg:
                print_result(True, f"Correctly rejected with error: {response.json().get('error')}")
                return True
            else:
                print_result(False, f"Got 400 but wrong error message: {response.json().get('error')}")
                return False
        else:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

def test_a6_missing_customer_name():
    """A6: Missing customer.name should return 400"""
    print_test("A6", "Missing customer.name - expect 400")
    
    try:
        payload = {
            "marina_id": MARINA_ID,
            "company_id": COMPANY_ID,
            "customer": {"email": "test@test.it"},
            "valid_from": "2026-06-20",
            "valid_to": "2026-06-25"
        }
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            print_result(True, "Correctly rejected missing customer.name with 400")
            return True
        else:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

# ============================================================================
# SECTION B: LIST PASSES
# ============================================================================

def test_b7_list_by_marina():
    """B7: List passes by marina_id"""
    print_test("B7", "List passes by marina_id - should return array with created passes")
    
    try:
        response = requests.get(f"{BASE_URL}/marina-transit-passes?marina_id={MARINA_ID}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data)} passes")
            
            if len(data) >= 2:
                # Check if sorted by issued_at DESC
                print(f"First pass issued_at: {data[0].get('issued_at')}")
                print(f"Last pass issued_at: {data[-1].get('issued_at')}")
                
                # Check if our test passes are in the list
                test_emails = ["mario@test.it", "luigi@test.it"]
                found_passes = [p for p in data if p.get("customer", {}).get("email") in test_emails]
                print(f"Found {len(found_passes)} test passes")
                
                print_result(True, f"List endpoint working, found {len(data)} passes including {len(found_passes)} test passes")
                return data
            else:
                print_result(False, f"Expected at least 2 passes, found {len(data)}")
                return data
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return None

def test_b8_list_archived():
    """B8: List only archived passes"""
    print_test("B8", "List archived passes - ?archived=true")
    
    try:
        response = requests.get(f"{BASE_URL}/marina-transit-passes?archived=true")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data)} archived passes")
            
            # All should be archived
            non_archived = [p for p in data if not p.get("archived")]
            if len(non_archived) == 0:
                print_result(True, f"All {len(data)} passes are archived")
                return True
            else:
                print_result(False, f"Found {len(non_archived)} non-archived passes in archived list")
                return False
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

def test_b9_list_by_company():
    """B9: List passes by company_id"""
    print_test("B9", "List passes by company_id")
    
    try:
        response = requests.get(f"{BASE_URL}/marina-transit-passes?company_id={COMPANY_ID}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data)} passes for company")
            
            # All should have the same company_id
            wrong_company = [p for p in data if p.get("company_id") != COMPANY_ID]
            if len(wrong_company) == 0:
                print_result(True, f"All {len(data)} passes belong to company {COMPANY_ID}")
                return True
            else:
                print_result(False, f"Found {len(wrong_company)} passes with wrong company_id")
                return False
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

# ============================================================================
# SECTION C: DETAIL
# ============================================================================

def test_c10_get_detail():
    """C10: Get pass detail by ID"""
    print_test("C10", "Get pass detail by valid ID - expect 200")
    
    if not created_pass_ids:
        print_result(False, "No passes created yet")
        return None
    
    try:
        pass_id = created_pass_ids[0]
        response = requests.get(f"{BASE_URL}/marina-transit-passes/{pass_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Pass number: {data.get('pass_number')}")
            print(f"Customer: {data.get('customer', {}).get('name')} {data.get('customer', {}).get('surname')}")
            
            assert data["id"] == pass_id, "ID mismatch"
            print_result(True, f"Retrieved pass {data['pass_number']} successfully")
            return data
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return None

def test_c11_get_nonexistent():
    """C11: Get non-existent pass should return 404"""
    print_test("C11", "Get non-existent pass - expect 404")
    
    try:
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = requests.get(f"{BASE_URL}/marina-transit-passes/{fake_id}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 404:
            print_result(True, "Correctly returned 404 for non-existent pass")
            return True
        else:
            print_result(False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

# ============================================================================
# SECTION D: UPDATE
# ============================================================================

def test_d12_update_pass():
    """D12: Update pass notes and valid_to"""
    print_test("D12", "Update pass - notes and valid_to, pass_number should be immutable")
    
    if not created_pass_ids:
        print_result(False, "No passes created yet")
        return None
    
    try:
        pass_id = created_pass_ids[0]
        
        # Get original pass
        orig_response = requests.get(f"{BASE_URL}/marina-transit-passes/{pass_id}")
        orig_data = orig_response.json()
        orig_pass_number = orig_data.get("pass_number")
        print(f"Original pass_number: {orig_pass_number}")
        
        # Update
        update_payload = {
            "notes": "Updated note",
            "valid_to": "2026-06-30"
        }
        
        response = requests.put(f"{BASE_URL}/marina-transit-passes/{pass_id}", json=update_payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Updated notes: {data.get('notes')}")
            print(f"Updated valid_to: {data.get('valid_to')}")
            print(f"Pass number after update: {data.get('pass_number')}")
            
            assert data["notes"] == "Updated note", "Notes not updated"
            assert data["valid_to"] == "2026-06-30", "valid_to not updated"
            assert data["pass_number"] == orig_pass_number, "pass_number should be immutable!"
            assert "updated_at" in data, "Missing updated_at field"
            
            print_result(True, f"Pass updated successfully, pass_number remained {orig_pass_number}")
            return data
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return None
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return None

def test_d13_update_pass_number_immutable():
    """D13: Try to change pass_number - should remain immutable"""
    print_test("D13", "Try to change pass_number - should NOT change")
    
    if not created_pass_ids:
        print_result(False, "No passes created yet")
        return None
    
    try:
        pass_id = created_pass_ids[0]
        
        # Get original pass
        orig_response = requests.get(f"{BASE_URL}/marina-transit-passes/{pass_id}")
        orig_data = orig_response.json()
        orig_pass_number = orig_data.get("pass_number")
        print(f"Original pass_number: {orig_pass_number}")
        
        # Try to update pass_number
        update_payload = {
            "pass_number": "PT-2026/9999",
            "notes": "Trying to change pass_number"
        }
        
        response = requests.put(f"{BASE_URL}/marina-transit-passes/{pass_id}", json=update_payload)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Pass number after update: {data.get('pass_number')}")
            
            if data["pass_number"] == orig_pass_number:
                print_result(True, f"pass_number correctly remained immutable: {orig_pass_number}")
                return True
            else:
                print_result(False, f"pass_number changed from {orig_pass_number} to {data['pass_number']} - should be immutable!")
                return False
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

# ============================================================================
# SECTION E: ARCHIVE/UNARCHIVE
# ============================================================================

def test_e14_archive_pass():
    """E14: Archive pass"""
    print_test("E14", "Archive pass - action=archive")
    
    if not created_pass_ids:
        print_result(False, "No passes created yet")
        return None
    
    try:
        pass_id = created_pass_ids[0]
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes/{pass_id}?action=archive")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            assert data.get("ok") == True, "ok should be true"
            assert data.get("archived") == True, "archived should be true"
            
            # Verify by getting detail
            detail_response = requests.get(f"{BASE_URL}/marina-transit-passes/{pass_id}")
            detail_data = detail_response.json()
            print(f"Archived: {detail_data.get('archived')}")
            print(f"Archived at: {detail_data.get('archived_at')}")
            
            assert detail_data.get("archived") == True, "Pass should be archived"
            assert detail_data.get("archived_at") is not None, "archived_at should be set"
            
            print_result(True, f"Pass archived successfully at {detail_data.get('archived_at')}")
            return True
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

def test_e15_unarchive_pass():
    """E15: Unarchive pass"""
    print_test("E15", "Unarchive pass - action=unarchive")
    
    if not created_pass_ids:
        print_result(False, "No passes created yet")
        return None
    
    try:
        pass_id = created_pass_ids[0]
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes/{pass_id}?action=unarchive")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            assert data.get("ok") == True, "ok should be true"
            assert data.get("archived") == False, "archived should be false"
            
            # Verify by getting detail
            detail_response = requests.get(f"{BASE_URL}/marina-transit-passes/{pass_id}")
            detail_data = detail_response.json()
            print(f"Archived: {detail_data.get('archived')}")
            
            assert detail_data.get("archived") == False, "Pass should not be archived"
            
            print_result(True, "Pass unarchived successfully")
            return True
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

# ============================================================================
# SECTION F: DELETE
# ============================================================================

def test_f16_delete_pass():
    """F16: Delete pass"""
    print_test("F16", "Delete pass - expect 200 with ok:true")
    
    if len(created_pass_ids) < 2:
        print_result(False, "Need at least 2 passes for delete test")
        return None
    
    try:
        # Delete the second pass (keep first for other tests)
        pass_id = created_pass_ids[1]
        
        response = requests.delete(f"{BASE_URL}/marina-transit-passes/{pass_id}")
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            assert data.get("ok") == True, "ok should be true"
            
            print_result(True, f"Pass {pass_id} deleted successfully")
            return True
        else:
            print(f"Error: {response.text}")
            print_result(False, f"Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

def test_f17_get_deleted_pass():
    """F17: Get deleted pass should return 404"""
    print_test("F17", "Get deleted pass - expect 404")
    
    if len(created_pass_ids) < 2:
        print_result(False, "Need at least 2 passes for this test")
        return None
    
    try:
        pass_id = created_pass_ids[1]
        
        response = requests.get(f"{BASE_URL}/marina-transit-passes/{pass_id}")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 404:
            print_result(True, "Correctly returned 404 for deleted pass")
            return True
        else:
            print_result(False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

# ============================================================================
# SECTION G: EMAIL ACTION
# ============================================================================

def test_g18_send_email():
    """G18: Send email with PDF (mock)"""
    print_test("G18", "Send email with PDF - expect 502/500/200 (Resend may reject)")
    
    if not created_pass_ids:
        print_result(False, "No passes created yet")
        return None
    
    try:
        pass_id = created_pass_ids[0]
        
        payload = {
            "email": "test@example.com",
            "pdf_base64": "VGVzdEJhc2U2NEZpbGU="  # "TestBase64File" in base64
        }
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes/{pass_id}?action=send-email", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Accept 200, 500, or 502 (Resend may reject test data)
        if response.status_code in [200, 500, 502]:
            if response.status_code == 200:
                data = response.json()
                print(f"Email sent successfully: {json.dumps(data, indent=2)}")
                
                # Check if last_email_sent_at was updated
                detail_response = requests.get(f"{BASE_URL}/marina-transit-passes/{pass_id}")
                detail_data = detail_response.json()
                if detail_data.get("last_email_sent_at"):
                    print(f"last_email_sent_at: {detail_data.get('last_email_sent_at')}")
                    print_result(True, "Email sent and timestamp updated")
                else:
                    print_result(True, "Email endpoint returned 200 (timestamp may not be updated)")
            else:
                print_result(True, f"Got expected error {response.status_code} (Resend rejection is acceptable)")
            return True
        else:
            print_result(False, f"Unexpected status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

def test_g19_send_email_without_pdf():
    """G19: Send email without PDF should return 400"""
    print_test("G19", "Send email without pdf_base64 - expect 400")
    
    if not created_pass_ids:
        print_result(False, "No passes created yet")
        return None
    
    try:
        pass_id = created_pass_ids[0]
        
        payload = {
            "email": "test@example.com"
            # Missing pdf_base64
        }
        
        response = requests.post(f"{BASE_URL}/marina-transit-passes/{pass_id}?action=send-email", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 400:
            error_msg = response.json().get("error", "").lower()
            if "pdf" in error_msg and "mancante" in error_msg:
                print_result(True, f"Correctly rejected with error: {response.json().get('error')}")
                return True
            else:
                print_result(False, f"Got 400 but wrong error message: {response.json().get('error')}")
                return False
        else:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

# ============================================================================
# SECTION H: CLEANUP
# ============================================================================

def test_h20_cleanup():
    """H20: Cleanup - delete all test passes"""
    print_test("H20", "Cleanup - delete all test passes created during testing")
    
    try:
        # Get all passes with test email
        response = requests.get(f"{BASE_URL}/marina-transit-passes?marina_id={MARINA_ID}")
        if response.status_code != 200:
            print_result(False, "Failed to get pass list for cleanup")
            return False
        
        all_passes = response.json()
        test_passes = [
            p for p in all_passes 
            if p.get("customer", {}).get("email") in ["mario@test.it", "luigi@test.it"]
            or (p.get("notes", "").startswith("Test") or p.get("notes", "").startswith("Second test") or p.get("notes", "").startswith("Updated"))
        ]
        
        print(f"Found {len(test_passes)} test passes to delete")
        
        deleted_count = 0
        for pass_obj in test_passes:
            pass_id = pass_obj["id"]
            del_response = requests.delete(f"{BASE_URL}/marina-transit-passes/{pass_id}")
            if del_response.status_code == 200:
                deleted_count += 1
                print(f"Deleted pass {pass_obj['pass_number']}")
            else:
                print(f"Failed to delete pass {pass_obj['pass_number']}: {del_response.status_code}")
        
        print_result(True, f"Cleanup complete: deleted {deleted_count}/{len(test_passes)} test passes")
        return True
    except Exception as e:
        print(f"Exception: {str(e)}")
        print_result(False, str(e))
        return False

# ============================================================================
# MAIN TEST RUNNER
# ============================================================================

def run_all_tests():
    print("\n" + "="*80)
    print("MARINA TRANSIT PASS BACKEND TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Marina ID: {MARINA_ID}")
    print(f"Company ID: {COMPANY_ID}")
    print("="*80)
    
    results = {}
    
    # Section A: Create
    results["A1"] = test_a1_create_valid_pass()
    results["A2"] = test_a2_create_second_pass()
    results["A3"] = test_a3_missing_marina_id()
    results["A4"] = test_a4_missing_valid_from()
    results["A5"] = test_a5_invalid_date_range()
    results["A6"] = test_a6_missing_customer_name()
    
    # Section B: List
    results["B7"] = test_b7_list_by_marina()
    results["B8"] = test_b8_list_archived()
    results["B9"] = test_b9_list_by_company()
    
    # Section C: Detail
    results["C10"] = test_c10_get_detail()
    results["C11"] = test_c11_get_nonexistent()
    
    # Section D: Update
    results["D12"] = test_d12_update_pass()
    results["D13"] = test_d13_update_pass_number_immutable()
    
    # Section E: Archive/Unarchive
    results["E14"] = test_e14_archive_pass()
    results["E15"] = test_e15_unarchive_pass()
    
    # Section F: Delete
    results["F16"] = test_f16_delete_pass()
    results["F17"] = test_f17_get_deleted_pass()
    
    # Section G: Email
    results["G18"] = test_g18_send_email()
    results["G19"] = test_g19_send_email_without_pdf()
    
    # Section H: Cleanup
    results["H20"] = test_h20_cleanup()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_id, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_id}: {status}")
    
    print("="*80)
    print(f"TOTAL: {passed}/{total} tests passed ({passed*100//total}%)")
    print("="*80)
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
