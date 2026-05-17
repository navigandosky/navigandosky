#!/usr/bin/env python3
"""
SumUp Payment Integration Backend Tests
Tests the merchant_code auto-refresh fix and create-checkout flow
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://sardinia-tours-hub.preview.emergentagent.com/api"
MARLIN_COMPANY_ID = "03f77ea6-95c7-49c4-a13b-df54bc28ecc2"
VALID_API_KEY = "sup_sk_Fw71D812tu91FLZveGe3l45sgQR86384K"
EXPECTED_MERCHANT_CODE = "MCAC6Y6C"

def log_test(test_name, status, details=""):
    """Log test result"""
    symbol = "✅" if status == "PASS" else "❌"
    print(f"\n{symbol} {test_name}")
    if details:
        print(f"   {details}")

def test_get_marlin_company():
    """Test A.1: GET current Marlin company - confirm sumup config present"""
    print("\n" + "="*80)
    print("TEST A.1: GET Marlin Company - Verify SumUp Config")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/companies/{MARLIN_COMPANY_ID}"
        response = requests.get(url)
        
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET Marlin Company", "FAIL", f"Expected 200, got {response.status_code}")
            return None
        
        company = response.json()
        
        # Verify sumup config exists
        if not company.get('payment_config', {}).get('sumup'):
            log_test("GET Marlin Company", "FAIL", "SumUp config not found in payment_config")
            return None
        
        sumup_config = company['payment_config']['sumup']
        print(f"SumUp Config: enabled={sumup_config.get('enabled')}, mode={sumup_config.get('mode')}")
        print(f"API Key: {sumup_config.get('api_key', '')[:20]}...")
        print(f"Merchant Code: {sumup_config.get('merchant_code')}")
        
        if sumup_config.get('merchant_code') != EXPECTED_MERCHANT_CODE:
            log_test("GET Marlin Company", "FAIL", 
                    f"Expected merchant_code={EXPECTED_MERCHANT_CODE}, got {sumup_config.get('merchant_code')}")
            return None
        
        log_test("GET Marlin Company", "PASS", 
                f"SumUp config present with correct merchant_code: {EXPECTED_MERCHANT_CODE}")
        return company
        
    except Exception as e:
        log_test("GET Marlin Company", "FAIL", f"Exception: {str(e)}")
        return None

def test_put_company_auto_refresh():
    """Test A.2: PUT with valid api_key and empty merchant_code - should auto-populate"""
    print("\n" + "="*80)
    print("TEST A.2: PUT Company - Auto-refresh merchant_code with valid API key")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/companies/{MARLIN_COMPANY_ID}"
        
        # Send PUT with valid api_key but empty merchant_code
        payload = {
            "payment_config": {
                "sumup": {
                    "enabled": True,
                    "mode": "live",
                    "api_key": VALID_API_KEY,
                    "merchant_code": ""  # Empty - should be auto-populated
                }
            }
        }
        
        print(f"PUT {url}")
        print(f"Payload: api_key={VALID_API_KEY[:20]}..., merchant_code='' (empty)")
        
        response = requests.put(url, json=payload, headers={"Content-Type": "application/json"})
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("PUT Auto-refresh merchant_code", "FAIL", 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        updated_company = response.json()
        updated_merchant_code = updated_company.get('payment_config', {}).get('sumup', {}).get('merchant_code')
        
        print(f"Response merchant_code: {updated_merchant_code}")
        
        if updated_merchant_code != EXPECTED_MERCHANT_CODE:
            log_test("PUT Auto-refresh merchant_code", "FAIL", 
                    f"Expected merchant_code={EXPECTED_MERCHANT_CODE}, got {updated_merchant_code}")
            return False
        
        log_test("PUT Auto-refresh merchant_code", "PASS", 
                f"merchant_code auto-populated correctly: {EXPECTED_MERCHANT_CODE}")
        return True
        
    except Exception as e:
        log_test("PUT Auto-refresh merchant_code", "FAIL", f"Exception: {str(e)}")
        return False

def test_put_company_invalid_key():
    """Test A.3: PUT with invalid api_key - should clear merchant_code"""
    print("\n" + "="*80)
    print("TEST A.3: PUT Company - Invalid API key should clear merchant_code")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/companies/{MARLIN_COMPANY_ID}"
        
        # Send PUT with invalid api_key
        invalid_key = "sup_sk_INVALID_TEST_KEY"
        payload = {
            "payment_config": {
                "sumup": {
                    "enabled": True,
                    "mode": "live",
                    "api_key": invalid_key,
                    "merchant_code": "OLD_CODE"  # Should be cleared
                }
            }
        }
        
        print(f"PUT {url}")
        print(f"Payload: api_key={invalid_key}, merchant_code='OLD_CODE'")
        
        response = requests.put(url, json=payload, headers={"Content-Type": "application/json"})
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("PUT Invalid API key", "FAIL", 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        updated_company = response.json()
        updated_merchant_code = updated_company.get('payment_config', {}).get('sumup', {}).get('merchant_code')
        
        print(f"Response merchant_code: '{updated_merchant_code}'")
        
        if updated_merchant_code != '':
            log_test("PUT Invalid API key", "FAIL", 
                    f"Expected merchant_code='', got '{updated_merchant_code}'")
            # Restore valid key before returning
            restore_payload = {
                "payment_config": {
                    "sumup": {
                        "enabled": True,
                        "mode": "live",
                        "api_key": VALID_API_KEY,
                        "merchant_code": ""
                    }
                }
            }
            requests.put(url, json=restore_payload, headers={"Content-Type": "application/json"})
            return False
        
        log_test("PUT Invalid API key", "PASS", 
                "merchant_code cleared correctly (empty string)")
        
        # Restore valid key
        print("\nRestoring valid API key...")
        restore_payload = {
            "payment_config": {
                "sumup": {
                    "enabled": True,
                    "mode": "live",
                    "api_key": VALID_API_KEY,
                    "merchant_code": ""
                }
            }
        }
        restore_response = requests.put(url, json=restore_payload, headers={"Content-Type": "application/json"})
        if restore_response.status_code == 200:
            restored = restore_response.json()
            restored_mc = restored.get('payment_config', {}).get('sumup', {}).get('merchant_code')
            print(f"✓ Valid key restored, merchant_code: {restored_mc}")
        
        return True
        
    except Exception as e:
        log_test("PUT Invalid API key", "FAIL", f"Exception: {str(e)}")
        return False

def test_get_payment_methods():
    """Test C: GET /api/companies/{id}/payment-methods"""
    print("\n" + "="*80)
    print("TEST C: GET Payment Methods")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/companies/{MARLIN_COMPANY_ID}/payment-methods"
        response = requests.get(url)
        
        print(f"GET {url}")
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("GET Payment Methods", "FAIL", f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check for SumUp method
        sumup_method = None
        for method in data.get('methods', []):
            if method.get('type') == 'ONLINE' and method.get('provider') == 'sumup':
                sumup_method = method
                break
        
        if not sumup_method:
            log_test("GET Payment Methods", "FAIL", "SumUp payment method not found in response")
            return False
        
        if sumup_method.get('source') != 'company':
            log_test("GET Payment Methods", "FAIL", 
                    f"Expected source='company', got '{sumup_method.get('source')}'")
            return False
        
        log_test("GET Payment Methods", "PASS", 
                f"SumUp method found: type=ONLINE, provider=sumup, source=company")
        return True
        
    except Exception as e:
        log_test("GET Payment Methods", "FAIL", f"Exception: {str(e)}")
        return False

def find_or_create_booking():
    """Find existing Marlin booking or create one for testing"""
    print("\n" + "="*80)
    print("SETUP: Find or Create Test Booking")
    print("="*80)
    
    try:
        # Try to find existing booking
        url = f"{BASE_URL}/bookings?company_id={MARLIN_COMPANY_ID}"
        response = requests.get(url)
        
        if response.status_code == 200:
            bookings = response.json()
            # Find a booking with total_amount > 0 and customer_email
            for booking in bookings:
                if booking.get('total_amount', 0) > 0 and booking.get('customer_email'):
                    print(f"✓ Found existing booking: {booking['booking_ref']}")
                    print(f"  ID: {booking['id']}")
                    print(f"  Amount: {booking['total_amount']} {booking.get('currency', 'EUR')}")
                    print(f"  Email: {booking['customer_email']}")
                    return booking['id']
        
        # Create a new booking
        print("No suitable booking found. Creating test booking...")
        
        # First, get a slot
        slots_url = f"{BASE_URL}/slots?company_id={MARLIN_COMPANY_ID}"
        slots_response = requests.get(slots_url)
        
        if slots_response.status_code != 200 or not slots_response.json():
            print("❌ No slots available for creating test booking")
            return None
        
        slots = slots_response.json()
        # Find a slot with available seats
        test_slot = None
        for slot in slots:
            if slot.get('available_seats', 0) > 0:
                test_slot = slot
                break
        
        if not test_slot:
            print("❌ No slots with available seats")
            return None
        
        # Create booking
        booking_payload = {
            "slot_id": test_slot['id'],
            "experience_id": test_slot['experience_id'],
            "company_id": MARLIN_COMPANY_ID,
            "customer_name": "Mario Rossi",
            "customer_email": "mario.rossi@test.com",
            "customer_phone": "+39 333 1234567",
            "seats": 2,
            "total_amount": 100.00,
            "currency": "EUR",
            "payment_method": "ONLINE",
            "special_requests": "Test booking for SumUp integration"
        }
        
        create_response = requests.post(f"{BASE_URL}/bookings", json=booking_payload)
        
        if create_response.status_code == 201:
            booking = create_response.json()
            print(f"✓ Created test booking: {booking['booking_ref']}")
            print(f"  ID: {booking['id']}")
            print(f"  Amount: {booking['total_amount']} {booking.get('currency', 'EUR')}")
            return booking['id']
        else:
            print(f"❌ Failed to create booking: {create_response.status_code}")
            print(f"   {create_response.text}")
            return None
        
    except Exception as e:
        print(f"❌ Exception in find_or_create_booking: {str(e)}")
        return None

def test_create_checkout(booking_id):
    """Test B: POST /api/sumup/create-checkout"""
    print("\n" + "="*80)
    print("TEST B: POST /api/sumup/create-checkout")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/sumup/create-checkout"
        payload = {"booking_id": booking_id}
        
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 200:
            log_test("POST create-checkout", "FAIL", 
                    f"Expected 200, got {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify response structure
        required_fields = ['ok', 'hosted_url', 'checkout_id', 'amount', 'currency']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            log_test("POST create-checkout", "FAIL", 
                    f"Missing required fields: {', '.join(missing_fields)}")
            return False
        
        if not data.get('ok'):
            log_test("POST create-checkout", "FAIL", "Response ok=false")
            return False
        
        if not data.get('hosted_url', '').startswith('https://checkout.sumup.com/pay/'):
            log_test("POST create-checkout", "FAIL", 
                    f"Invalid hosted_url: {data.get('hosted_url')}")
            return False
        
        # Verify booking was updated
        booking_url = f"{BASE_URL}/bookings/{booking_id}"
        booking_response = requests.get(booking_url)
        
        if booking_response.status_code == 200:
            booking = booking_response.json()
            
            required_booking_fields = ['sumup_checkout_id', 'sumup_hosted_url', 
                                      'sumup_checkout_reference', 'sumup_created_at']
            missing_booking_fields = [f for f in required_booking_fields if not booking.get(f)]
            
            if missing_booking_fields:
                log_test("POST create-checkout", "FAIL", 
                        f"Booking not updated with: {', '.join(missing_booking_fields)}")
                return False
            
            print(f"\n✓ Booking updated:")
            print(f"  sumup_checkout_id: {booking['sumup_checkout_id']}")
            print(f"  sumup_hosted_url: {booking['sumup_hosted_url'][:50]}...")
            print(f"  sumup_checkout_reference: {booking['sumup_checkout_reference']}")
        
        log_test("POST create-checkout", "PASS", 
                f"Checkout created successfully, hosted_url: {data['hosted_url'][:50]}...")
        return True
        
    except Exception as e:
        log_test("POST create-checkout", "FAIL", f"Exception: {str(e)}")
        return False

def test_edge_case_missing_booking():
    """Test D.1: POST create-checkout with non-existent booking_id"""
    print("\n" + "="*80)
    print("TEST D.1: Edge Case - Non-existent booking_id")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/sumup/create-checkout"
        payload = {"booking_id": "non-existent-booking-id-12345"}
        
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        
        print(f"Status: {response.status_code}")
        
        if response.status_code != 404:
            log_test("Edge Case - Non-existent booking", "FAIL", 
                    f"Expected 404, got {response.status_code}")
            return False
        
        log_test("Edge Case - Non-existent booking", "PASS", "Correctly returned 404")
        return True
        
    except Exception as e:
        log_test("Edge Case - Non-existent booking", "FAIL", f"Exception: {str(e)}")
        return False

def test_edge_case_missing_body():
    """Test D.2: POST create-checkout without body"""
    print("\n" + "="*80)
    print("TEST D.2: Edge Case - Missing booking_id in body")
    print("="*80)
    
    try:
        url = f"{BASE_URL}/sumup/create-checkout"
        payload = {}
        
        print(f"POST {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers={"Content-Type": "application/json"})
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code != 400:
            log_test("Edge Case - Missing booking_id", "FAIL", 
                    f"Expected 400, got {response.status_code}")
            return False
        
        data = response.json()
        if 'booking_id required' not in data.get('error', ''):
            log_test("Edge Case - Missing booking_id", "FAIL", 
                    f"Expected error message 'booking_id required', got: {data.get('error')}")
            return False
        
        log_test("Edge Case - Missing booking_id", "PASS", 
                "Correctly returned 400 with 'booking_id required' error")
        return True
        
    except Exception as e:
        log_test("Edge Case - Missing booking_id", "FAIL", f"Exception: {str(e)}")
        return False

def main():
    """Run all SumUp integration tests"""
    print("\n" + "="*80)
    print("SUMUP PAYMENT INTEGRATION - BACKEND TESTS")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Marlin Company ID: {MARLIN_COMPANY_ID}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    results = {
        "total": 0,
        "passed": 0,
        "failed": 0
    }
    
    # Test A: Company PUT auto-refresh
    print("\n\n" + "="*80)
    print("TEST SUITE A: Company PUT - Auto-refresh merchant_code")
    print("="*80)
    
    results["total"] += 1
    if test_get_marlin_company():
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    results["total"] += 1
    if test_put_company_auto_refresh():
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    results["total"] += 1
    if test_put_company_invalid_key():
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test C: Payment Methods
    print("\n\n" + "="*80)
    print("TEST SUITE C: Payment Methods Endpoint")
    print("="*80)
    
    results["total"] += 1
    if test_get_payment_methods():
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Test B: Create Checkout
    print("\n\n" + "="*80)
    print("TEST SUITE B: SumUp Create Checkout")
    print("="*80)
    
    booking_id = find_or_create_booking()
    if booking_id:
        results["total"] += 1
        if test_create_checkout(booking_id):
            results["passed"] += 1
        else:
            results["failed"] += 1
    else:
        print("❌ Skipping create-checkout test - no booking available")
        results["total"] += 1
        results["failed"] += 1
    
    # Test D: Edge Cases
    print("\n\n" + "="*80)
    print("TEST SUITE D: Edge Cases")
    print("="*80)
    
    results["total"] += 1
    if test_edge_case_missing_booking():
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    results["total"] += 1
    if test_edge_case_missing_body():
        results["passed"] += 1
    else:
        results["failed"] += 1
    
    # Summary
    print("\n\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {results['total']}")
    print(f"✅ Passed: {results['passed']}")
    print(f"❌ Failed: {results['failed']}")
    print(f"Success Rate: {(results['passed']/results['total']*100):.1f}%")
    
    if results['failed'] == 0:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {results['failed']} TEST(S) FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())
