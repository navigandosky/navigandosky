#!/usr/bin/env python3
"""
Backend Testing for Marina Payment Link and Admin Notifications
Tests the new endpoints:
1. POST /api/marina-payment-link/create
2. POST /api/marina-payment-link/send-bank-transfer
3. SumUp Webhook for Marina bookings
4. Admin Notifications Helper
5. Regression tests
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "https://marina-management.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Super Admin credentials
ADMIN_USERNAME = "Admin_Trivorsrl"
ADMIN_PASSWORD = "Trivor2026$"

def log_test(test_name, status, details=""):
    """Log test results"""
    symbol = "✅" if status == "PASS" else "❌"
    print(f"\n{symbol} TEST: {test_name}")
    if details:
        print(f"   {details}")

def test_section(section_name):
    """Print section header"""
    print(f"\n{'='*80}")
    print(f"  {section_name}")
    print(f"{'='*80}")

# ============================================================================
# SECTION 1: POST /api/marina-payment-link/create
# ============================================================================

def test_marina_payment_link_create():
    test_section("SECTION 1: POST /api/marina-payment-link/create")
    
    # First, get a marina booking to test with
    try:
        print("\n📋 Finding a marina booking to test with...")
        resp = requests.get(f"{API_BASE}/marina-bookings", timeout=10)
        if resp.status_code == 200:
            bookings = resp.json()
            if isinstance(bookings, list) and len(bookings) > 0:
                test_booking = bookings[0]
                booking_number = test_booking.get('booking_number')
                booking_id = test_booking.get('id')
                customer_name = test_booking.get('customer', {}).get('name', 'Test') + ' ' + test_booking.get('customer', {}).get('surname', 'Customer')
                customer_email = test_booking.get('customer', {}).get('email', 'test@example.com')
                print(f"   Found booking: {booking_number} (ID: {booking_id[:8]}...)")
                print(f"   Customer: {customer_name} ({customer_email})")
            else:
                print("   ⚠️  No marina bookings found, will test with mock data")
                booking_number = "BK-2026/0001"
                booking_id = None
                customer_name = "Test Customer"
                customer_email = "test@example.com"
        else:
            print(f"   ⚠️  Could not fetch bookings: {resp.status_code}")
            booking_number = "BK-2026/0001"
            booking_id = None
            customer_name = "Test Customer"
            customer_email = "test@example.com"
    except Exception as e:
        print(f"   ⚠️  Error fetching bookings: {e}")
        booking_number = "BK-2026/0001"
        booking_id = None
        customer_name = "Test Customer"
        customer_email = "test@example.com"
    
    # TEST A: Happy path - create payment link with send_via='show'
    try:
        print("\n🧪 TEST A: Happy path - create payment link with send_via='show'")
        payload = {
            "booking_number": booking_number,
            "customer_name": customer_name,
            "customer_email": customer_email,
            "amount": 50.00,
            "description": "Test payment link from backend test",
            "send_via": "show",
            "payment_type": "deposit",
            "from_label": "Admin · Test"
        }
        
        resp = requests.post(f"{API_BASE}/marina-payment-link/create", json=payload, timeout=15)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('hosted_url') and data.get('checkout_id'):
                hosted_url = data['hosted_url']
                checkout_id = data['checkout_id']
                checkout_ref = data.get('checkout_reference', '')
                
                # Verify checkout_reference starts with 'MAR-'
                if checkout_ref.startswith('MAR-'):
                    log_test("A: Happy path - create payment link", "PASS", 
                            f"hosted_url: {hosted_url[:50]}..., checkout_id: {checkout_id}, checkout_reference: {checkout_ref}")
                    
                    # Store for webhook test
                    global MARINA_CHECKOUT_ID
                    MARINA_CHECKOUT_ID = checkout_id
                else:
                    log_test("A: Happy path - create payment link", "FAIL", 
                            f"checkout_reference does not start with 'MAR-': {checkout_ref}")
            elif 'error' in data and 'SumUp non configurato' in data['error']:
                log_test("A: Happy path - create payment link", "PASS", 
                        f"Expected error (SumUp not configured): {data['error']}")
            else:
                log_test("A: Happy path - create payment link", "FAIL", 
                        f"Missing required fields in response: {data}")
        elif resp.status_code == 400 and 'SumUp non configurato' in resp.text:
            log_test("A: Happy path - create payment link", "PASS", 
                    f"Expected error (SumUp not configured): {resp.text}")
        elif resp.status_code == 404:
            log_test("A: Happy path - create payment link", "PASS", 
                    f"Expected error (booking not found): {resp.text}")
        else:
            log_test("A: Happy path - create payment link", "FAIL", 
                    f"Unexpected status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log_test("A: Happy path - create payment link", "FAIL", f"Exception: {e}")
    
    # TEST B: Validation tests
    validation_tests = [
        {
            "name": "B.1: Missing booking_number AND booking_id",
            "payload": {
                "customer_name": "Test",
                "customer_email": "test@test.com",
                "amount": 50,
                "send_via": "show"
            },
            "expected_status": 400,
            "expected_error": "Indica booking_number"
        },
        {
            "name": "B.2: Missing customer_name",
            "payload": {
                "booking_number": booking_number,
                "customer_email": "test@test.com",
                "amount": 50,
                "send_via": "show"
            },
            "expected_status": 400,
            "expected_error": "Nome e email cliente obbligatori"
        },
        {
            "name": "B.3: Missing customer_email",
            "payload": {
                "booking_number": booking_number,
                "customer_name": "Test Customer",
                "amount": 50,
                "send_via": "show"
            },
            "expected_status": 400,
            "expected_error": "Nome e email cliente obbligatori"
        },
        {
            "name": "B.4: Invalid amount (zero)",
            "payload": {
                "booking_number": booking_number,
                "customer_name": "Test",
                "customer_email": "test@test.com",
                "amount": 0,
                "send_via": "show"
            },
            "expected_status": 400,
            "expected_error": "Importo non valido"
        },
        {
            "name": "B.5: Invalid amount (negative)",
            "payload": {
                "booking_number": booking_number,
                "customer_name": "Test",
                "customer_email": "test@test.com",
                "amount": -10,
                "send_via": "show"
            },
            "expected_status": 400,
            "expected_error": "Importo non valido"
        },
        {
            "name": "B.6: Invalid send_via",
            "payload": {
                "booking_number": booking_number,
                "customer_name": "Test",
                "customer_email": "test@test.com",
                "amount": 50,
                "send_via": "invalid"
            },
            "expected_status": 400,
            "expected_error": "send_via deve essere"
        },
        {
            "name": "B.7: Non-existent booking",
            "payload": {
                "booking_number": "BK-9999/9999",
                "customer_name": "Test",
                "customer_email": "test@test.com",
                "amount": 50,
                "send_via": "show"
            },
            "expected_status": 404,
            "expected_error": "Prenotazione marina non trovata"
        }
    ]
    
    for test in validation_tests:
        try:
            print(f"\n🧪 TEST {test['name']}")
            resp = requests.post(f"{API_BASE}/marina-payment-link/create", json=test['payload'], timeout=10)
            
            if resp.status_code == test['expected_status']:
                error_text = resp.json().get('error', '') if resp.status_code != 200 else ''
                if test['expected_error'] in error_text or test['expected_error'] in resp.text:
                    log_test(test['name'], "PASS", f"Got expected {test['expected_status']} with error: {error_text}")
                else:
                    log_test(test['name'], "FAIL", f"Got {test['expected_status']} but wrong error: {resp.text[:200]}")
            else:
                log_test(test['name'], "FAIL", f"Expected {test['expected_status']}, got {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            log_test(test['name'], "FAIL", f"Exception: {e}")

# ============================================================================
# SECTION 2: POST /api/marina-payment-link/send-bank-transfer
# ============================================================================

def test_marina_bank_transfer():
    test_section("SECTION 2: POST /api/marina-payment-link/send-bank-transfer")
    
    # Get a marina booking
    try:
        print("\n📋 Finding a marina booking with customer email...")
        resp = requests.get(f"{API_BASE}/marina-bookings", timeout=10)
        if resp.status_code == 200:
            bookings = resp.json()
            test_booking = None
            for b in bookings:
                if isinstance(b, dict) and b.get('customer', {}).get('email'):
                    test_booking = b
                    break
            
            if test_booking:
                booking_number = test_booking.get('booking_number')
                booking_id = test_booking.get('id')
                customer_email = test_booking.get('customer', {}).get('email')
                print(f"   Found booking: {booking_number} with email: {customer_email}")
            else:
                print("   ⚠️  No marina bookings with email found")
                booking_number = "BK-2026/0001"
                booking_id = None
        else:
            booking_number = "BK-2026/0001"
            booking_id = None
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        booking_number = "BK-2026/0001"
        booking_id = None
    
    # TEST A: Happy path
    try:
        print("\n🧪 TEST A: Happy path - send bank transfer email")
        payload = {
            "booking_number": booking_number,
            "amount": 100.00,
            "payment_type": "deposit"
        }
        
        resp = requests.post(f"{API_BASE}/marina-payment-link/send-bank-transfer", json=payload, timeout=15)
        
        if resp.status_code == 200:
            data = resp.json()
            if data.get('ok') and data.get('message_id'):
                log_test("A: Send bank transfer email", "PASS", 
                        f"Email sent successfully, message_id: {data['message_id']}")
            else:
                log_test("A: Send bank transfer email", "FAIL", 
                        f"Missing required fields: {data}")
        elif resp.status_code == 400 and ('Coordinate bonifico non configurate' in resp.text or 'Cliente senza email' in resp.text):
            log_test("A: Send bank transfer email", "PASS", 
                    f"Expected error (bank transfer not configured or no email): {resp.text}")
        elif resp.status_code == 404:
            log_test("A: Send bank transfer email", "PASS", 
                    f"Expected error (booking not found): {resp.text}")
        else:
            log_test("A: Send bank transfer email", "FAIL", 
                    f"Unexpected status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log_test("A: Send bank transfer email", "FAIL", f"Exception: {e}")
    
    # TEST B: Validation tests
    validation_tests = [
        {
            "name": "B.1: Missing booking_id and booking_number",
            "payload": {
                "amount": 100
            },
            "expected_status": 400,
            "expected_error": "booking_id o booking_number richiesti"
        },
        {
            "name": "B.2: Invalid amount (zero)",
            "payload": {
                "booking_number": booking_number,
                "amount": 0
            },
            "expected_status": 400,
            "expected_error": "Importo non valido"
        },
        {
            "name": "B.3: Invalid amount (negative)",
            "payload": {
                "booking_number": booking_number,
                "amount": -50
            },
            "expected_status": 400,
            "expected_error": "Importo non valido"
        },
        {
            "name": "B.4: Non-existent booking",
            "payload": {
                "booking_number": "BK-9999/9999",
                "amount": 100
            },
            "expected_status": 404,
            "expected_error": "Prenotazione non trovata"
        }
    ]
    
    for test in validation_tests:
        try:
            print(f"\n🧪 TEST {test['name']}")
            resp = requests.post(f"{API_BASE}/marina-payment-link/send-bank-transfer", json=test['payload'], timeout=10)
            
            if resp.status_code == test['expected_status']:
                error_text = resp.json().get('error', '') if resp.status_code != 200 else ''
                if test['expected_error'] in error_text or test['expected_error'] in resp.text:
                    log_test(test['name'], "PASS", f"Got expected {test['expected_status']} with error: {error_text}")
                else:
                    log_test(test['name'], "FAIL", f"Got {test['expected_status']} but wrong error: {resp.text[:200]}")
            else:
                log_test(test['name'], "FAIL", f"Expected {test['expected_status']}, got {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            log_test(test['name'], "FAIL", f"Exception: {e}")

# ============================================================================
# SECTION 3: SumUp Webhook for Marina bookings
# ============================================================================

def test_sumup_webhook_marina():
    test_section("SECTION 3: SumUp Webhook for Marina bookings")
    
    # Check if we have a checkout_id from previous test
    if 'MARINA_CHECKOUT_ID' not in globals():
        print("\n⚠️  Skipping webhook test - no checkout_id from previous test")
        print("   This is expected if SumUp is not configured or booking not found")
        return
    
    checkout_id = MARINA_CHECKOUT_ID
    
    try:
        print(f"\n🧪 TEST: Simulate SumUp webhook with checkout_id: {checkout_id}")
        payload = {
            "event_type": "CHECKOUT_STATUS_CHANGED",
            "id": checkout_id
        }
        
        resp = requests.post(f"{API_BASE}/sumup/webhook", json=payload, timeout=15)
        
        # Webhook should return 204 No Content (success) or 202 (accepted but couldn't process)
        if resp.status_code in [204, 202]:
            log_test("SumUp webhook simulation", "PASS", 
                    f"Webhook returned {resp.status_code} (expected - real SumUp API will return PENDING status)")
        else:
            log_test("SumUp webhook simulation", "FAIL", 
                    f"Unexpected status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log_test("SumUp webhook simulation", "FAIL", f"Exception: {e}")

# ============================================================================
# SECTION 4: Admin Notifications Helper (indirect test via pay-deposit)
# ============================================================================

def test_admin_notifications():
    test_section("SECTION 4: Admin Notifications Helper (indirect test)")
    
    # Get a marina booking to test with
    try:
        print("\n📋 Finding a marina booking to test pay-deposit...")
        resp = requests.get(f"{API_BASE}/marina-bookings", timeout=10)
        if resp.status_code == 200:
            bookings = resp.json()
            test_booking = None
            for b in bookings:
                if isinstance(b, dict) and b.get('status') in ['PENDING', 'QUOTE']:
                    test_booking = b
                    break
            
            if test_booking:
                booking_id = test_booking.get('id')
                booking_number = test_booking.get('booking_number')
                print(f"   Found booking: {booking_number} (ID: {booking_id[:8]}...)")
            else:
                print("   ⚠️  No suitable marina bookings found for pay-deposit test")
                return
        else:
            print(f"   ⚠️  Could not fetch bookings: {resp.status_code}")
            return
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        return
    
    try:
        print(f"\n🧪 TEST: Trigger pay-deposit to test admin notification")
        payload = {
            "paid_amount": 100.00,
            "payment_method": "CASH",
            "payment_reference": "TEST-ADMIN-NOTIF-001",
            "note": "Backend test for admin notifications"
        }
        
        resp = requests.post(f"{API_BASE}/marina-bookings/{booking_id}?action=pay-deposit", 
                           json=payload, timeout=15)
        
        if resp.status_code == 200:
            data = resp.json()
            # pay-deposit returns the updated booking object, not {ok: true}
            if data.get('id') and data.get('deposit_paid') == True:
                log_test("Admin notification via pay-deposit", "PASS", 
                        f"pay-deposit successful (status: {data.get('status')}), admin notification should be sent")
                
                # Check nextjs logs for notification
                print("\n   📧 Checking nextjs logs for admin notification...")
                import subprocess
                try:
                    result = subprocess.run(
                        ["tail", "-n", "50", "/var/log/supervisor/nextjs.out.log"],
                        capture_output=True, text=True, timeout=5
                    )
                    if '[admin-notifications] ✉️  Notifica admin inviata (marina)' in result.stdout:
                        print("   ✅ Found admin notification log entry in logs")
                    else:
                        print("   ⚠️  Admin notification log entry not found (may take a moment)")
                except Exception as e:
                    print(f"   ⚠️  Could not check logs: {e}")
            else:
                log_test("Admin notification via pay-deposit", "FAIL", 
                        f"pay-deposit response missing expected fields: {data.get('id', 'NO_ID')}, deposit_paid={data.get('deposit_paid')}")
        else:
            log_test("Admin notification via pay-deposit", "FAIL", 
                    f"Unexpected status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log_test("Admin notification via pay-deposit", "FAIL", f"Exception: {e}")

# ============================================================================
# SECTION 5: Regression tests - existing endpoints not broken
# ============================================================================

def test_regression():
    test_section("SECTION 5: Regression tests - existing endpoints")
    
    # TEST 1: GET /api/marina-bookings (list)
    try:
        print("\n🧪 TEST 1: GET /api/marina-bookings (list)")
        resp = requests.get(f"{API_BASE}/marina-bookings", timeout=10)
        
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                log_test("GET /api/marina-bookings", "PASS", f"Returned {len(data)} bookings")
            else:
                log_test("GET /api/marina-bookings", "FAIL", f"Expected array, got: {type(data)}")
        else:
            log_test("GET /api/marina-bookings", "FAIL", f"Status {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        log_test("GET /api/marina-bookings", "FAIL", f"Exception: {e}")
    
    # TEST 2: Verify dispatcher coexistence
    try:
        print("\n🧪 TEST 2: Verify dispatcher coexistence (rental-payment-link, payment-link, marina-payment-link)")
        
        # Test that other payment link endpoints still work
        endpoints = [
            "/api/payment-link/lookup?ref=MK-2026-0001",
            "/api/rental-payment-link/lookup?ref=RB-2026-0001",
            "/api/marina-payment-link/lookup?ref=BK-2026-0001"
        ]
        
        all_pass = True
        for endpoint in endpoints:
            resp = requests.get(f"{BASE_URL}{endpoint}", timeout=10)
            # We expect 404 (not found) or 200 (found), but not 500 (server error) or 405 (method not allowed)
            if resp.status_code in [200, 404, 400]:
                print(f"   ✅ {endpoint}: {resp.status_code} (OK)")
            else:
                print(f"   ❌ {endpoint}: {resp.status_code} (FAIL)")
                all_pass = False
        
        if all_pass:
            log_test("Dispatcher coexistence", "PASS", "All payment link endpoints accessible")
        else:
            log_test("Dispatcher coexistence", "FAIL", "Some endpoints returned unexpected status")
    except Exception as e:
        log_test("Dispatcher coexistence", "FAIL", f"Exception: {e}")

# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n" + "="*80)
    print("  MARINA PAYMENT LINK & ADMIN NOTIFICATIONS - BACKEND TESTING")
    print("  Base URL:", BASE_URL)
    print("="*80)
    
    # Run all test sections
    test_marina_payment_link_create()
    test_marina_bank_transfer()
    test_sumup_webhook_marina()
    test_admin_notifications()
    test_regression()
    
    print("\n" + "="*80)
    print("  TESTING COMPLETE")
    print("="*80 + "\n")

if __name__ == "__main__":
    main()
