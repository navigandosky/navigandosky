#!/usr/bin/env python3
"""
Backend Test Suite for SumUp Embedded Payment Link Feature
Tests the NEW embedded payment mode alongside existing hosted mode
"""

import requests
import json
import sys
from pymongo import MongoClient
import os

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://marina-management.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"
MONGO_URL = os.getenv('MONGO_URL', 'mongodb://localhost:27017/maretrek')
DB_NAME = os.getenv('DB_NAME', 'maretrek')

# Test data
BOOKING_REF = 'MK-2026-0019'
COMPANY_ID = '03f77ea6-95c7-49c4-a13b-df54bc28ecc2'  # Marlin Sub
MERCHANT_CODE = 'MCAC6Y6C'

# Global test results
test_results = []
created_checkout_ids = []

def log_test(test_name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if message:
        print(f"   {message}")
    test_results.append({
        'test': test_name,
        'passed': passed,
        'message': message
    })

def test_a1_hosted_mode_default():
    """A1: POST /api/payment-link/create without mode field (default hosted)"""
    print("\n=== TEST A1: Backward compatibility - HOSTED mode (no mode field) ===")
    try:
        payload = {
            'booking_ref': BOOKING_REF,
            'customer_name': 'Test User',
            'customer_email': 'test@example.com',
            'amount': 5.00,
            'description': 'Test hosted',
            'send_via': 'show'
        }
        
        response = requests.post(f"{API_BASE}/payment-link/create", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("A1: Hosted mode default", False, f"Expected 200, got {response.status_code}: {response.text}")
            return None
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Validations
        checks = []
        checks.append(('hosted_url exists', 'hosted_url' in data))
        checks.append(('hosted_url is SumUp', data.get('hosted_url', '').startswith('https://checkout.sumup.com/pay/')))
        checks.append(('mode is hosted', data.get('mode') == 'hosted'))
        checks.append(('pay_token is null', data.get('pay_token') is None))
        checks.append(('checkout_id exists', 'checkout_id' in data and data['checkout_id']))
        checks.append(('amount is 5.00', data.get('amount') == 5.00))
        
        all_passed = all(check[1] for check in checks)
        failed_checks = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("A1: Hosted mode default", True, f"All checks passed. checkout_id: {data.get('checkout_id')}")
            created_checkout_ids.append(data.get('checkout_id'))
            return data
        else:
            log_test("A1: Hosted mode default", False, f"Failed checks: {', '.join(failed_checks)}")
            return None
            
    except Exception as e:
        log_test("A1: Hosted mode default", False, f"Exception: {str(e)}")
        return None

def test_a2_hosted_mode_explicit():
    """A2: POST /api/payment-link/create with explicit mode='hosted'"""
    print("\n=== TEST A2: Backward compatibility - HOSTED mode (explicit) ===")
    try:
        payload = {
            'booking_ref': BOOKING_REF,
            'customer_name': 'Test User Explicit',
            'customer_email': 'test@example.com',
            'amount': 6.00,
            'description': 'Test hosted explicit',
            'send_via': 'show',
            'mode': 'hosted'
        }
        
        response = requests.post(f"{API_BASE}/payment-link/create", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("A2: Hosted mode explicit", False, f"Expected 200, got {response.status_code}: {response.text}")
            return None
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Validations
        checks = []
        checks.append(('hosted_url exists', 'hosted_url' in data))
        checks.append(('hosted_url is SumUp', data.get('hosted_url', '').startswith('https://checkout.sumup.com/pay/')))
        checks.append(('mode is hosted', data.get('mode') == 'hosted'))
        checks.append(('pay_token is null', data.get('pay_token') is None))
        
        all_passed = all(check[1] for check in checks)
        failed_checks = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("A2: Hosted mode explicit", True, "All checks passed")
            created_checkout_ids.append(data.get('checkout_id'))
            return data
        else:
            log_test("A2: Hosted mode explicit", False, f"Failed checks: {', '.join(failed_checks)}")
            return None
            
    except Exception as e:
        log_test("A2: Hosted mode explicit", False, f"Exception: {str(e)}")
        return None

def test_b3_embedded_mode():
    """B3: POST /api/payment-link/create with mode='embedded'"""
    print("\n=== TEST B3: NEW Embedded mode ===")
    try:
        payload = {
            'booking_ref': BOOKING_REF,
            'customer_name': 'Test Embedded',
            'customer_email': 'test@example.com',
            'amount': 7.50,
            'description': 'Test embedded',
            'send_via': 'show',
            'mode': 'embedded'
        }
        
        response = requests.post(f"{API_BASE}/payment-link/create", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("B3: Embedded mode", False, f"Expected 200, got {response.status_code}: {response.text}")
            return None
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Validations
        checks = []
        checks.append(('mode is embedded', data.get('mode') == 'embedded'))
        checks.append(('pay_token exists', 'pay_token' in data and data['pay_token']))
        checks.append(('pay_token is 32 chars hex', len(data.get('pay_token', '')) == 32))
        checks.append(('pay_url contains /pay-integration/', '/pay-integration/' in data.get('pay_url', '')))
        checks.append(('pay_url contains t= param', 't=' in data.get('pay_url', '')))
        checks.append(('hosted_url equals pay_url', data.get('hosted_url') == data.get('pay_url')))
        checks.append(('checkout_id is UUID', len(data.get('checkout_id', '')) > 20))
        checks.append(('amount is 7.50', data.get('amount') == 7.50))
        
        all_passed = all(check[1] for check in checks)
        failed_checks = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("B3: Embedded mode", True, f"All checks passed. checkout_id: {data.get('checkout_id')}, pay_token: {data.get('pay_token')}")
            created_checkout_ids.append(data.get('checkout_id'))
            return data
        else:
            log_test("B3: Embedded mode", False, f"Failed checks: {', '.join(failed_checks)}")
            return None
            
    except Exception as e:
        log_test("B3: Embedded mode", False, f"Exception: {str(e)}")
        return None

def test_c4_mongodb_persistence(embedded_data):
    """C4: Verify MongoDB persistence of embedded payment"""
    print("\n=== TEST C4: MongoDB persistence ===")
    if not embedded_data:
        log_test("C4: MongoDB persistence", False, "Skipped - no embedded data from B3")
        return
    
    try:
        # Query via API
        response = requests.get(f"{API_BASE}/payment-link/lookup?ref={BOOKING_REF}", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("C4: MongoDB persistence", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        booking = data.get('booking', {})
        integration_payments = booking.get('integration_payments', [])
        
        print(f"Found {len(integration_payments)} integration_payments entries")
        
        # Find the embedded entry
        embedded_entry = None
        for entry in integration_payments:
            if entry.get('id') == embedded_data.get('checkout_id'):
                embedded_entry = entry
                break
        
        if not embedded_entry:
            log_test("C4: MongoDB persistence", False, f"Embedded entry not found in integration_payments")
            return
        
        print(f"Embedded entry: {json.dumps(embedded_entry, indent=2)}")
        
        # Validations
        checks = []
        checks.append(('id matches', embedded_entry.get('id') == embedded_data.get('checkout_id')))
        checks.append(('mode is embedded', embedded_entry.get('mode') == 'embedded'))
        checks.append(('pay_token exists', embedded_entry.get('pay_token') is not None))
        checks.append(('pay_token matches', embedded_entry.get('pay_token') == embedded_data.get('pay_token')))
        checks.append(('status is PENDING', embedded_entry.get('status') == 'PENDING'))
        checks.append(('amount is 7.5', embedded_entry.get('amount') == 7.5))
        
        all_passed = all(check[1] for check in checks)
        failed_checks = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("C4: MongoDB persistence", True, "All checks passed")
        else:
            log_test("C4: MongoDB persistence", False, f"Failed checks: {', '.join(failed_checks)}")
            
    except Exception as e:
        log_test("C4: MongoDB persistence", False, f"Exception: {str(e)}")

def test_d5_pay_integration_info_valid(embedded_data):
    """D5: GET /api/sumup/pay-integration-info with valid checkout_id and token"""
    print("\n=== TEST D5: Pay-Integration-Info endpoint (valid) ===")
    if not embedded_data:
        log_test("D5: Pay-Integration-Info valid", False, "Skipped - no embedded data from B3")
        return
    
    try:
        checkout_id = embedded_data.get('checkout_id')
        pay_token = embedded_data.get('pay_token')
        
        response = requests.get(
            f"{API_BASE}/sumup/pay-integration-info?checkout_id={checkout_id}&t={pay_token}",
            timeout=10
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("D5: Pay-Integration-Info valid", False, f"Expected 200, got {response.status_code}: {response.text}")
            return
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Validations
        checks = []
        checks.append(('booking_ref is MK-2026-0019', data.get('booking_ref') == BOOKING_REF))
        checks.append(('checkout_id matches', data.get('checkout_id') == checkout_id))
        checks.append(('amount is 7.5', data.get('amount') == 7.5))
        checks.append(('currency is EUR', data.get('currency') == 'EUR'))
        checks.append(('customer_name is Test Embedded', data.get('customer_name') == 'Test Embedded'))
        checks.append(('payment_status is PENDING', data.get('payment_status') == 'PENDING'))
        checks.append(('kind is experience', data.get('kind') == 'experience'))
        checks.append(('company_name exists', 'company_name' in data))
        checks.append(('NOT already_paid', data.get('already_paid') == False))
        
        all_passed = all(check[1] for check in checks)
        failed_checks = [check[0] for check in checks if not check[1]]
        
        if all_passed:
            log_test("D5: Pay-Integration-Info valid", True, "All checks passed")
        else:
            log_test("D5: Pay-Integration-Info valid", False, f"Failed checks: {', '.join(failed_checks)}")
            
    except Exception as e:
        log_test("D5: Pay-Integration-Info valid", False, f"Exception: {str(e)}")

def test_d6_pay_integration_info_wrong_token(embedded_data):
    """D6: GET /api/sumup/pay-integration-info with wrong token"""
    print("\n=== TEST D6: Pay-Integration-Info endpoint (wrong token) ===")
    if not embedded_data:
        log_test("D6: Pay-Integration-Info wrong token", False, "Skipped - no embedded data from B3")
        return
    
    try:
        checkout_id = embedded_data.get('checkout_id')
        wrong_token = 'wrongtoken1234567890abcdef1234567'
        
        response = requests.get(
            f"{API_BASE}/sumup/pay-integration-info?checkout_id={checkout_id}&t={wrong_token}",
            timeout=10
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            data = response.json()
            if 'Token non valido' in data.get('error', ''):
                log_test("D6: Pay-Integration-Info wrong token", True, "Correctly returned 403 with 'Token non valido'")
            else:
                log_test("D6: Pay-Integration-Info wrong token", False, f"Got 403 but wrong error message: {data.get('error')}")
        else:
            log_test("D6: Pay-Integration-Info wrong token", False, f"Expected 403, got {response.status_code}")
            
    except Exception as e:
        log_test("D6: Pay-Integration-Info wrong token", False, f"Exception: {str(e)}")

def test_d7_pay_integration_info_nonexistent():
    """D7: GET /api/sumup/pay-integration-info with non-existent checkout_id"""
    print("\n=== TEST D7: Pay-Integration-Info endpoint (non-existent checkout_id) ===")
    try:
        fake_checkout_id = 'fake-checkout-id-12345678'
        fake_token = 'faketoken1234567890abcdef12345678'
        
        response = requests.get(
            f"{API_BASE}/sumup/pay-integration-info?checkout_id={fake_checkout_id}&t={fake_token}",
            timeout=10
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 404:
            log_test("D7: Pay-Integration-Info non-existent", True, "Correctly returned 404")
        else:
            log_test("D7: Pay-Integration-Info non-existent", False, f"Expected 404, got {response.status_code}")
            
    except Exception as e:
        log_test("D7: Pay-Integration-Info non-existent", False, f"Exception: {str(e)}")

def test_d8_pay_integration_info_missing_params():
    """D8: GET /api/sumup/pay-integration-info with missing parameters"""
    print("\n=== TEST D8: Pay-Integration-Info endpoint (missing params) ===")
    try:
        # Missing both params
        response = requests.get(f"{API_BASE}/sumup/pay-integration-info", timeout=10)
        print(f"Status (no params): {response.status_code}")
        
        if response.status_code == 400:
            log_test("D8: Pay-Integration-Info missing params", True, "Correctly returned 400")
        else:
            log_test("D8: Pay-Integration-Info missing params", False, f"Expected 400, got {response.status_code}")
            
    except Exception as e:
        log_test("D8: Pay-Integration-Info missing params", False, f"Exception: {str(e)}")

def test_e9_confirm_integration_payment(embedded_data):
    """E9: POST /api/sumup/confirm-integration-payment with valid data"""
    print("\n=== TEST E9: Confirm-Integration-Payment endpoint (valid) ===")
    if not embedded_data:
        log_test("E9: Confirm-Integration-Payment valid", False, "Skipped - no embedded data from B3")
        return
    
    try:
        checkout_id = embedded_data.get('checkout_id')
        pay_token = embedded_data.get('pay_token')
        
        payload = {
            'checkout_id': checkout_id,
            'token': pay_token
        }
        
        print("NOTE: This request may take ~5 seconds due to polling...")
        response = requests.post(
            f"{API_BASE}/sumup/confirm-integration-payment",
            json=payload,
            timeout=15
        )
        print(f"Status: {response.status_code}")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Expected: 202 with status PENDING (no real card payment)
        if response.status_code == 202:
            if data.get('ok') == False and data.get('status') == 'PENDING':
                log_test("E9: Confirm-Integration-Payment valid", True, "Correctly returned 202 with status PENDING (no real payment)")
            else:
                log_test("E9: Confirm-Integration-Payment valid", False, f"Got 202 but unexpected data: {data}")
        else:
            log_test("E9: Confirm-Integration-Payment valid", False, f"Expected 202, got {response.status_code}: {data}")
            
    except Exception as e:
        log_test("E9: Confirm-Integration-Payment valid", False, f"Exception: {str(e)}")

def test_e10_confirm_integration_payment_wrong_token(embedded_data):
    """E10: POST /api/sumup/confirm-integration-payment with wrong token"""
    print("\n=== TEST E10: Confirm-Integration-Payment endpoint (wrong token) ===")
    if not embedded_data:
        log_test("E10: Confirm-Integration-Payment wrong token", False, "Skipped - no embedded data from B3")
        return
    
    try:
        checkout_id = embedded_data.get('checkout_id')
        wrong_token = 'wrongtoken1234567890abcdef1234567'
        
        payload = {
            'checkout_id': checkout_id,
            'token': wrong_token
        }
        
        response = requests.post(
            f"{API_BASE}/sumup/confirm-integration-payment",
            json=payload,
            timeout=15
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 403:
            log_test("E10: Confirm-Integration-Payment wrong token", True, "Correctly returned 403")
        else:
            log_test("E10: Confirm-Integration-Payment wrong token", False, f"Expected 403, got {response.status_code}")
            
    except Exception as e:
        log_test("E10: Confirm-Integration-Payment wrong token", False, f"Exception: {str(e)}")

def test_e11_confirm_integration_payment_nonexistent():
    """E11: POST /api/sumup/confirm-integration-payment with non-existent checkout_id"""
    print("\n=== TEST E11: Confirm-Integration-Payment endpoint (non-existent) ===")
    try:
        fake_checkout_id = 'fake-checkout-id-12345678'
        fake_token = 'faketoken1234567890abcdef12345678'
        
        payload = {
            'checkout_id': fake_checkout_id,
            'token': fake_token
        }
        
        response = requests.post(
            f"{API_BASE}/sumup/confirm-integration-payment",
            json=payload,
            timeout=15
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 404:
            log_test("E11: Confirm-Integration-Payment non-existent", True, "Correctly returned 404")
        else:
            log_test("E11: Confirm-Integration-Payment non-existent", False, f"Expected 404, got {response.status_code}")
            
    except Exception as e:
        log_test("E11: Confirm-Integration-Payment non-existent", False, f"Exception: {str(e)}")

def test_f12_validation_missing_email():
    """F12: POST /api/payment-link/create with mode='embedded' and missing customer_email"""
    print("\n=== TEST F12: Validation - missing customer_email ===")
    try:
        payload = {
            'booking_ref': BOOKING_REF,
            'customer_name': 'Test User',
            # customer_email missing
            'amount': 5.00,
            'description': 'Test validation',
            'send_via': 'show',
            'mode': 'embedded'
        }
        
        response = requests.post(f"{API_BASE}/payment-link/create", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 400:
            log_test("F12: Validation missing email", True, "Correctly returned 400")
        else:
            log_test("F12: Validation missing email", False, f"Expected 400, got {response.status_code}")
            
    except Exception as e:
        log_test("F12: Validation missing email", False, f"Exception: {str(e)}")

def test_f13_validation_invalid_mode():
    """F13: POST /api/payment-link/create with mode='invalid' (should fallback to hosted)"""
    print("\n=== TEST F13: Validation - invalid mode (fallback to hosted) ===")
    try:
        payload = {
            'booking_ref': BOOKING_REF,
            'customer_name': 'Test User',
            'customer_email': 'test@example.com',
            'amount': 5.00,
            'description': 'Test invalid mode',
            'send_via': 'show',
            'mode': 'invalid'
        }
        
        response = requests.post(f"{API_BASE}/payment-link/create", json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("F13: Validation invalid mode", False, f"Expected 200, got {response.status_code}")
            return
        
        data = response.json()
        print(f"Response mode: {data.get('mode')}")
        
        # Should fallback to hosted
        if data.get('mode') == 'hosted':
            log_test("F13: Validation invalid mode", True, "Correctly fell back to 'hosted' mode")
            created_checkout_ids.append(data.get('checkout_id'))
        else:
            log_test("F13: Validation invalid mode", False, f"Expected mode='hosted', got mode='{data.get('mode')}'")
            
    except Exception as e:
        log_test("F13: Validation invalid mode", False, f"Exception: {str(e)}")

def test_g14_cleanup():
    """G14: Cleanup - remove test integration_payments from MongoDB"""
    print("\n=== TEST G14: Cleanup ===")
    try:
        client = MongoClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Remove integration_payments entries with test descriptions
        result = db.bookings.update_one(
            {'booking_ref': BOOKING_REF},
            {
                '$pull': {
                    'integration_payments': {
                        'description': {
                            '$in': ['Test hosted', 'Test hosted explicit', 'Test embedded', 'Test validation', 'Test invalid mode']
                        }
                    }
                }
            }
        )
        
        print(f"Modified {result.modified_count} booking(s)")
        
        # Verify cleanup
        booking = db.bookings.find_one({'booking_ref': BOOKING_REF})
        remaining_test_entries = [
            p for p in booking.get('integration_payments', [])
            if p.get('description') in ['Test hosted', 'Test hosted explicit', 'Test embedded', 'Test validation', 'Test invalid mode']
        ]
        
        if len(remaining_test_entries) == 0:
            log_test("G14: Cleanup", True, f"Successfully removed test entries from {BOOKING_REF}")
        else:
            log_test("G14: Cleanup", False, f"Still found {len(remaining_test_entries)} test entries")
        
        client.close()
        
    except Exception as e:
        log_test("G14: Cleanup", False, f"Exception: {str(e)}")

def print_summary():
    """Print test summary"""
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in test_results if r['passed'])
    total = len(test_results)
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}%)\n")
    
    for result in test_results:
        status = "✅" if result['passed'] else "❌"
        print(f"{status} {result['test']}")
        if result['message'] and not result['passed']:
            print(f"   {result['message']}")
    
    print("\n" + "="*80)
    
    return passed == total

def main():
    """Run all tests"""
    print("="*80)
    print("SumUp Embedded Payment Link - Backend Test Suite")
    print("="*80)
    print(f"API Base URL: {API_BASE}")
    print(f"Test Booking: {BOOKING_REF}")
    print(f"Company: {COMPANY_ID} (Marlin Sub)")
    print("="*80)
    
    # Run tests in sequence
    test_a1_hosted_mode_default()
    test_a2_hosted_mode_explicit()
    
    embedded_data = test_b3_embedded_mode()
    
    test_c4_mongodb_persistence(embedded_data)
    
    test_d5_pay_integration_info_valid(embedded_data)
    test_d6_pay_integration_info_wrong_token(embedded_data)
    test_d7_pay_integration_info_nonexistent()
    test_d8_pay_integration_info_missing_params()
    
    test_e9_confirm_integration_payment(embedded_data)
    test_e10_confirm_integration_payment_wrong_token(embedded_data)
    test_e11_confirm_integration_payment_nonexistent()
    
    test_f12_validation_missing_email()
    test_f13_validation_invalid_mode()
    
    test_g14_cleanup()
    
    # Print summary
    all_passed = print_summary()
    
    sys.exit(0 if all_passed else 1)

if __name__ == '__main__':
    main()
