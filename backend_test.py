#!/usr/bin/env python3
"""
Backend API Testing for Maretrek Payment Link Online (SumUp Integration)
Tests the new payment link generation feature for Company Admins
"""

import requests
import json
import os
from datetime import datetime

# Read base URL from .env
BASE_URL = "https://sardinia-tours-hub.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test data
TEST_BOOKING_REF = "MK-2026-0019"
TEST_COMPANY_ID = "03f77ea6-95c7-49c4-a13b-df54bc28ecc2"
TEST_CUSTOMER_NAME = "ANTONIO DEIANA"
TEST_CUSTOMER_EMAIL = "antoniodeiana@tiscali.it"

def print_test_header(test_name):
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")

def print_result(passed, message):
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {message}")

def test_lookup_valid_booking():
    """TEST 1: GET /api/payment-link/lookup with valid booking_ref"""
    print_test_header("Lookup Valid Booking (MK-2026-0019)")
    
    try:
        url = f"{API_BASE}/payment-link/lookup?ref={TEST_BOOKING_REF}&company_id={TEST_COMPANY_ID}"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        if not data.get('ok'):
            print_result(False, "Response missing 'ok: true'")
            return False
        
        booking = data.get('booking', {})
        
        # Check required fields
        required_fields = ['id', 'booking_ref', 'customer_name', 'customer_email', 
                          'total_amount', 'seats', 'currency', 'status', 
                          'payment_status', 'slot_datetime', 'company_id']
        
        missing_fields = [f for f in required_fields if f not in booking]
        if missing_fields:
            print_result(False, f"Missing required fields: {missing_fields}")
            return False
        
        # Verify _id is NOT present (MongoDB field should be excluded)
        if '_id' in booking:
            print_result(False, "_id MongoDB field should be excluded from response")
            return False
        
        # Verify booking data matches expected values
        if booking['booking_ref'] != TEST_BOOKING_REF:
            print_result(False, f"booking_ref mismatch: expected {TEST_BOOKING_REF}, got {booking['booking_ref']}")
            return False
        
        if booking['company_id'] != TEST_COMPANY_ID:
            print_result(False, f"company_id mismatch")
            return False
        
        # Check integration_payments field exists
        if 'integration_payments' not in booking:
            print_result(False, "Missing integration_payments field")
            return False
        
        # Check paid_integrations_total field exists
        if 'paid_integrations_total' not in booking:
            print_result(False, "Missing paid_integrations_total field")
            return False
        
        print_result(True, f"Lookup successful: {booking['booking_ref']} - {booking['customer_name']} - €{booking['total_amount']}")
        print(f"Integration payments: {len(booking.get('integration_payments', []))}")
        print(f"Paid integrations total: €{booking.get('paid_integrations_total', 0)}")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_lookup_missing_ref():
    """TEST 2: GET /api/payment-link/lookup without ref parameter"""
    print_test_header("Lookup Missing Ref Parameter")
    
    try:
        url = f"{API_BASE}/payment-link/lookup"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
        
        print_result(True, "Correctly returns 400 for missing ref parameter")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_lookup_nonexistent_booking():
    """TEST 3: GET /api/payment-link/lookup with non-existent booking_ref"""
    print_test_header("Lookup Non-existent Booking")
    
    try:
        url = f"{API_BASE}/payment-link/lookup?ref=MK-9999-0000"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 404:
            print_result(False, f"Expected 404, got {response.status_code}")
            return False
        
        print_result(True, "Correctly returns 404 for non-existent booking")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_create_payment_link_happy_path():
    """TEST 4A: POST /api/payment-link/create - Happy path with send_via=show"""
    print_test_header("Create Payment Link - Happy Path (show)")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        print(f"URL: {url}")
        
        payload = {
            "booking_ref": TEST_BOOKING_REF,
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "amount": 10.50,
            "description": "Test integration",
            "send_via": "show"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=15)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        required_fields = ['ok', 'hosted_url', 'checkout_id', 'checkout_reference', 
                          'amount', 'currency', 'booking_ref', 'email_sent']
        
        missing_fields = [f for f in required_fields if f not in data]
        if missing_fields:
            print_result(False, f"Missing required fields: {missing_fields}")
            return False
        
        if not data['ok']:
            print_result(False, "Response ok field is not true")
            return False
        
        # Verify hosted_url starts with correct domain
        hosted_url = data['hosted_url']
        if not (hosted_url.startswith('https://checkout.sumup.com') or 
                hosted_url.startswith('https://pay.sumup.com')):
            print_result(False, f"Invalid hosted_url domain: {hosted_url}")
            return False
        
        # Verify checkout_reference starts with INTG-MK-
        checkout_ref = data['checkout_reference']
        if not checkout_ref.startswith('INTG-MK-'):
            print_result(False, f"checkout_reference should start with 'INTG-MK-', got: {checkout_ref}")
            return False
        
        # Verify amount
        if data['amount'] != 10.50:
            print_result(False, f"Amount mismatch: expected 10.50, got {data['amount']}")
            return False
        
        # Verify email_sent is false for send_via=show
        if data['email_sent'] != False:
            print_result(False, f"email_sent should be false for send_via=show, got {data['email_sent']}")
            return False
        
        print_result(True, f"Payment link created successfully: {checkout_ref}")
        print(f"Hosted URL: {hosted_url}")
        
        # Now verify MongoDB was updated - lookup the booking again
        print("\nVerifying MongoDB update...")
        lookup_url = f"{API_BASE}/payment-link/lookup?ref={TEST_BOOKING_REF}"
        lookup_response = requests.get(lookup_url, timeout=10)
        
        if lookup_response.status_code == 200:
            lookup_data = lookup_response.json()
            booking = lookup_data.get('booking', {})
            integration_payments = booking.get('integration_payments', [])
            
            # Find the integration we just created
            found = False
            for payment in integration_payments:
                if payment.get('checkout_reference') == checkout_ref:
                    found = True
                    print(f"✅ Found integration in MongoDB: {payment.get('checkout_reference')}")
                    print(f"   Status: {payment.get('status')}")
                    print(f"   Amount: €{payment.get('amount')}")
                    print(f"   Hosted URL: {payment.get('hosted_url')}")
                    
                    # Verify fields
                    if payment.get('status') != 'PENDING':
                        print_result(False, f"Expected status PENDING, got {payment.get('status')}")
                        return False
                    if payment.get('amount') != 10.50:
                        print_result(False, f"Amount mismatch in MongoDB")
                        return False
                    break
            
            if not found:
                print_result(False, "Integration payment not found in MongoDB")
                return False
        else:
            print(f"⚠️  Could not verify MongoDB update (lookup returned {lookup_response.status_code})")
        
        print_result(True, "Payment link created and saved to MongoDB successfully")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_create_validation_missing_booking():
    """TEST 4B: POST /api/payment-link/create - Missing booking_id AND booking_ref"""
    print_test_header("Create Payment Link - Missing booking_id/booking_ref")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        payload = {
            "customer_name": "Test",
            "customer_email": "test@example.com",
            "amount": 10,
            "send_via": "show"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
        
        data = response.json()
        if 'booking_ref' not in data.get('error', '').lower() and 'booking_id' not in data.get('error', '').lower():
            print_result(False, "Error message should mention booking_ref or booking_id")
            return False
        
        print_result(True, "Correctly returns 400 for missing booking_ref/booking_id")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_create_validation_missing_customer_name():
    """TEST 4C: POST /api/payment-link/create - Missing customer_name"""
    print_test_header("Create Payment Link - Missing customer_name")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        payload = {
            "booking_ref": TEST_BOOKING_REF,
            "customer_email": "test@example.com",
            "amount": 10,
            "send_via": "show"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
        
        print_result(True, "Correctly returns 400 for missing customer_name")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_create_validation_missing_customer_email():
    """TEST 4D: POST /api/payment-link/create - Missing customer_email"""
    print_test_header("Create Payment Link - Missing customer_email")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        payload = {
            "booking_ref": TEST_BOOKING_REF,
            "customer_name": "Test Customer",
            "amount": 10,
            "send_via": "show"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
        
        print_result(True, "Correctly returns 400 for missing customer_email")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_create_validation_invalid_amount():
    """TEST 4E: POST /api/payment-link/create - Invalid amount (0 or negative)"""
    print_test_header("Create Payment Link - Invalid amount")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        
        # Test with 0
        payload = {
            "booking_ref": TEST_BOOKING_REF,
            "customer_name": "Test",
            "customer_email": "test@example.com",
            "amount": 0,
            "send_via": "show"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        print(f"Test amount=0: Status {response.status_code}")
        
        if response.status_code != 400:
            print_result(False, f"Expected 400 for amount=0, got {response.status_code}")
            return False
        
        # Test with negative
        payload['amount'] = -10
        response = requests.post(url, json=payload, timeout=10)
        print(f"Test amount=-10: Status {response.status_code}")
        
        if response.status_code != 400:
            print_result(False, f"Expected 400 for negative amount, got {response.status_code}")
            return False
        
        print_result(True, "Correctly returns 400 for invalid amounts")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_create_validation_invalid_send_via():
    """TEST 4F: POST /api/payment-link/create - Invalid send_via"""
    print_test_header("Create Payment Link - Invalid send_via")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        payload = {
            "booking_ref": TEST_BOOKING_REF,
            "customer_name": "Test",
            "customer_email": "test@example.com",
            "amount": 10,
            "send_via": "invalid"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            print_result(False, f"Expected 400, got {response.status_code}")
            return False
        
        print_result(True, "Correctly returns 400 for invalid send_via")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_create_validation_nonexistent_booking():
    """TEST 4G: POST /api/payment-link/create - Non-existent booking_ref"""
    print_test_header("Create Payment Link - Non-existent booking")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        payload = {
            "booking_ref": "MK-9999-9999",
            "customer_name": "Test",
            "customer_email": "test@example.com",
            "amount": 10,
            "send_via": "show"
        }
        
        response = requests.post(url, json=payload, timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 404:
            print_result(False, f"Expected 404, got {response.status_code}")
            return False
        
        print_result(True, "Correctly returns 404 for non-existent booking")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        return False

def test_create_multiple_integrations():
    """TEST 4H: Create multiple payment links for same booking"""
    print_test_header("Create Multiple Payment Links for Same Booking")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        
        # Create first payment link
        payload1 = {
            "booking_ref": TEST_BOOKING_REF,
            "customer_name": "Test Customer 1",
            "customer_email": "test1@example.com",
            "amount": 15.00,
            "description": "First integration",
            "send_via": "show"
        }
        
        response1 = requests.post(url, json=payload1, timeout=15)
        print(f"First payment link: Status {response1.status_code}")
        
        if response1.status_code != 200:
            print_result(False, f"First payment link creation failed: {response1.status_code}")
            print(f"Response: {response1.text}")
            return False
        
        data1 = response1.json()
        checkout_ref1 = data1.get('checkout_reference')
        print(f"First checkout_reference: {checkout_ref1}")
        
        # Create second payment link
        payload2 = {
            "booking_ref": TEST_BOOKING_REF,
            "customer_name": "Test Customer 2",
            "customer_email": "test2@example.com",
            "amount": 25.00,
            "description": "Second integration",
            "send_via": "show"
        }
        
        response2 = requests.post(url, json=payload2, timeout=15)
        print(f"Second payment link: Status {response2.status_code}")
        
        if response2.status_code != 200:
            print_result(False, f"Second payment link creation failed: {response2.status_code}")
            print(f"Response: {response2.text}")
            return False
        
        data2 = response2.json()
        checkout_ref2 = data2.get('checkout_reference')
        print(f"Second checkout_reference: {checkout_ref2}")
        
        # Verify both entries exist in MongoDB
        lookup_url = f"{API_BASE}/payment-link/lookup?ref={TEST_BOOKING_REF}"
        lookup_response = requests.get(lookup_url, timeout=10)
        
        if lookup_response.status_code != 200:
            print_result(False, f"Lookup failed: {lookup_response.status_code}")
            return False
        
        lookup_data = lookup_response.json()
        booking = lookup_data.get('booking', {})
        integration_payments = booking.get('integration_payments', [])
        
        print(f"\nTotal integration_payments in booking: {len(integration_payments)}")
        
        # Find both integrations
        found1 = False
        found2 = False
        
        for payment in integration_payments:
            ref = payment.get('checkout_reference')
            if ref == checkout_ref1:
                found1 = True
                print(f"✅ Found first integration: {ref} - €{payment.get('amount')}")
            elif ref == checkout_ref2:
                found2 = True
                print(f"✅ Found second integration: {ref} - €{payment.get('amount')}")
        
        if not found1:
            print_result(False, "First integration not found in MongoDB")
            return False
        
        if not found2:
            print_result(False, "Second integration not found in MongoDB")
            return False
        
        print_result(True, "Multiple integrations created successfully (no overwrite)")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_create_with_email():
    """TEST 4I: POST /api/payment-link/create with send_via=email"""
    print_test_header("Create Payment Link - send_via=email")
    
    try:
        url = f"{API_BASE}/payment-link/create"
        payload = {
            "booking_ref": TEST_BOOKING_REF,
            "customer_name": "Email Test Customer",
            "customer_email": "emailtest@example.com",
            "amount": 5.00,
            "description": "Email integration test",
            "send_via": "email"
        }
        
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, timeout=15)
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            print_result(False, f"Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # With send_via=email, the endpoint should either:
        # 1. Return ok=true with email_sent=true (if email configured)
        # 2. Return ok=true with warning message (if email not configured but link created)
        
        if not data.get('ok'):
            print_result(False, "Response ok field is not true")
            return False
        
        # Check if email was sent or if there's a warning
        email_sent = data.get('email_sent', False)
        has_warning = 'warning' in data
        
        if email_sent:
            print(f"✅ Email sent successfully via {data.get('email_provider', 'unknown')}")
        elif has_warning:
            print(f"⚠️  Email not sent (expected if not configured): {data.get('warning')}")
        else:
            print(f"ℹ️  Email status: email_sent={email_sent}")
        
        # Verify the link was still created
        if 'hosted_url' not in data or 'checkout_reference' not in data:
            print_result(False, "Payment link not created")
            return False
        
        print_result(True, "Payment link created with send_via=email (no crash)")
        return True
        
    except Exception as e:
        print_result(False, f"Exception: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("\n" + "="*80)
    print("MARETREK PAYMENT LINK ONLINE (SUMUP INTEGRATION) - BACKEND TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Booking: {TEST_BOOKING_REF}")
    print(f"Test Company: {TEST_COMPANY_ID}")
    print("="*80)
    
    results = {}
    
    # Test 1: Lookup endpoints
    print("\n" + "="*80)
    print("SECTION 1: LOOKUP ENDPOINT TESTS")
    print("="*80)
    
    results['lookup_valid'] = test_lookup_valid_booking()
    results['lookup_missing_ref'] = test_lookup_missing_ref()
    results['lookup_nonexistent'] = test_lookup_nonexistent_booking()
    
    # Test 2: Create endpoint - Happy path
    print("\n" + "="*80)
    print("SECTION 2: CREATE ENDPOINT - HAPPY PATH")
    print("="*80)
    
    results['create_happy_path'] = test_create_payment_link_happy_path()
    
    # Test 3: Create endpoint - Validation
    print("\n" + "="*80)
    print("SECTION 3: CREATE ENDPOINT - VALIDATION TESTS")
    print("="*80)
    
    results['create_missing_booking'] = test_create_validation_missing_booking()
    results['create_missing_name'] = test_create_validation_missing_customer_name()
    results['create_missing_email'] = test_create_validation_missing_customer_email()
    results['create_invalid_amount'] = test_create_validation_invalid_amount()
    results['create_invalid_send_via'] = test_create_validation_invalid_send_via()
    results['create_nonexistent_booking'] = test_create_validation_nonexistent_booking()
    
    # Test 4: Create endpoint - Multiple integrations
    print("\n" + "="*80)
    print("SECTION 4: CREATE ENDPOINT - MULTIPLE INTEGRATIONS")
    print("="*80)
    
    results['create_multiple'] = test_create_multiple_integrations()
    
    # Test 5: Create endpoint - Email
    print("\n" + "="*80)
    print("SECTION 5: CREATE ENDPOINT - EMAIL DELIVERY")
    print("="*80)
    
    results['create_email'] = test_create_with_email()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"\nTotal Tests: {total}")
    print(f"Passed: {passed}")
    print(f"Failed: {total - passed}")
    print(f"Success Rate: {(passed/total*100):.1f}%")
    
    print("\nDetailed Results:")
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {test_name}")
    
    print("\n" + "="*80)
    print("TESTING COMPLETE")
    print("="*80)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
