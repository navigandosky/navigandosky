#!/usr/bin/env python3
"""
Backend Testing Script for Locazioni Brevi (Short-Term Rentals) Module
Tests all endpoints: /api/rental-units, /api/rental-bookings, /api/rental-stats
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from .env
BASE_URL = "https://sardinia-tours-hub.preview.emergentagent.com/api"
COMPANY_ID = "03f77ea6-95c7-49c4-a13b-df54bc28ecc2"  # Marlin Sub

# Store IDs for cross-test usage
nominal_unit_id = None
pool_unit_id = None
booking1_id = None
pool_booking_id = None
pool_booking2_id = None
pool_booking3_id = None

def log_test(test_name, passed, message=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {test_name}")
    if message:
        print(f"   {message}")
    return passed

def test_1_1_create_nominal_unit():
    """TEST 1.1: POST create NOMINAL unit"""
    global nominal_unit_id
    print("\n=== TEST 1.1: Create NOMINAL unit (Apartment) ===")
    
    payload = {
        "name": "Test Appartamento Bilocale",
        "category": "APARTMENT",
        "unit_mode": "NOMINAL",
        "duration_unit": "NIGHTS",
        "check_in_time": "16:00",
        "check_out_time": "10:00",
        "base_price": 80,
        "deposit_percentage": 30,
        "min_duration": 2,
        "max_guests": 4,
        "bedrooms": 1,
        "bathrooms": 1,
        "amenities": ["WiFi", "Aria Condizionata"],
        "seasonal_pricing": [
            {"name": "Alta Stagione", "start_date": "2026-07-01", "end_date": "2026-08-31", "price_per_unit": 150},
            {"name": "Media Stagione", "start_date": "2026-06-01", "end_date": "2026-06-30", "price_per_unit": 100}
        ],
        "company_id": COMPANY_ID
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-units", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 201:
            return log_test("TEST 1.1", False, f"Expected 201, got {resp.status_code}: {data}")
        
        # Verify response structure
        checks = []
        checks.append(("has id", "id" in data and data["id"]))
        checks.append(("no booking_number", "booking_number" not in data))
        checks.append(("quantity is 1", data.get("quantity") == 1))
        checks.append(("seasonal_pricing has 2 entries", len(data.get("seasonal_pricing", [])) == 2))
        checks.append(("is_active is true", data.get("is_active") == True))
        checks.append(("no _id exposed", "_id" not in data))
        checks.append(("unit_mode is NOMINAL", data.get("unit_mode") == "NOMINAL"))
        checks.append(("duration_unit is NIGHTS", data.get("duration_unit") == "NIGHTS"))
        
        # Check seasonal pricing has ids
        for season in data.get("seasonal_pricing", []):
            checks.append((f"season '{season.get('name')}' has id", "id" in season))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 1.1", False, f"Failed checks: {[c[0] for c in failed]}")
        
        nominal_unit_id = data["id"]
        return log_test("TEST 1.1", True, f"Created NOMINAL unit: {nominal_unit_id}")
        
    except Exception as e:
        return log_test("TEST 1.1", False, f"Exception: {str(e)}")

def test_1_2_create_pool_unit():
    """TEST 1.2: POST create POOL unit"""
    global pool_unit_id
    print("\n=== TEST 1.2: Create POOL unit (Bike) ===")
    
    payload = {
        "name": "Test Bici MTB",
        "category": "BIKE",
        "unit_mode": "POOL",
        "quantity": 5,
        "base_price": 15,
        "deposit_percentage": 50,
        "company_id": COMPANY_ID
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-units", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 201:
            return log_test("TEST 1.2", False, f"Expected 201, got {resp.status_code}: {data}")
        
        checks = []
        checks.append(("unit_mode is POOL", data.get("unit_mode") == "POOL"))
        checks.append(("quantity is 5", data.get("quantity") == 5))
        checks.append(("duration_unit is DAYS", data.get("duration_unit") == "DAYS"))
        checks.append(("category is BIKE", data.get("category") == "BIKE"))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 1.2", False, f"Failed checks: {[c[0] for c in failed]}")
        
        pool_unit_id = data["id"]
        return log_test("TEST 1.2", True, f"Created POOL unit: {pool_unit_id}")
        
    except Exception as e:
        return log_test("TEST 1.2", False, f"Exception: {str(e)}")

def test_1_3_validation_missing_name():
    """TEST 1.3: Validation - missing name"""
    print("\n=== TEST 1.3: Validation - missing name ===")
    
    payload = {"category": "BIKE"}
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-units", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 400:
            return log_test("TEST 1.3", False, f"Expected 400, got {resp.status_code}")
        
        if "error" not in data or "obbligatorio" not in data["error"].lower():
            return log_test("TEST 1.3", False, f"Expected error about 'obbligatorio', got: {data}")
        
        return log_test("TEST 1.3", True, "Validation working correctly")
        
    except Exception as e:
        return log_test("TEST 1.3", False, f"Exception: {str(e)}")

def test_1_4_get_list_with_filter():
    """TEST 1.4: GET list with filter"""
    print("\n=== TEST 1.4: GET list with company_id filter ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/rental-units?company_id={COMPANY_ID}", timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 1.4", False, f"Expected 200, got {resp.status_code}")
        
        if not isinstance(data, list):
            return log_test("TEST 1.4", False, f"Expected array, got: {type(data)}")
        
        if len(data) < 2:
            return log_test("TEST 1.4", False, f"Expected at least 2 units, got {len(data)}")
        
        # Check both units are in the list
        ids = [u["id"] for u in data]
        if nominal_unit_id not in ids or pool_unit_id not in ids:
            return log_test("TEST 1.4", False, "Created units not found in list")
        
        return log_test("TEST 1.4", True, f"Found {len(data)} units including both created units")
        
    except Exception as e:
        return log_test("TEST 1.4", False, f"Exception: {str(e)}")

def test_1_5_get_single():
    """TEST 1.5: GET single unit"""
    print("\n=== TEST 1.5: GET single unit ===")
    
    try:
        # Get existing unit
        resp = requests.get(f"{BASE_URL}/rental-units/{nominal_unit_id}", timeout=10)
        if resp.status_code != 200:
            return log_test("TEST 1.5", False, f"Expected 200 for existing unit, got {resp.status_code}")
        
        # Get non-existent unit
        resp = requests.get(f"{BASE_URL}/rental-units/non-existent-id-12345", timeout=10)
        if resp.status_code != 404:
            return log_test("TEST 1.5", False, f"Expected 404 for non-existent unit, got {resp.status_code}")
        
        return log_test("TEST 1.5", True, "GET single working correctly")
        
    except Exception as e:
        return log_test("TEST 1.5", False, f"Exception: {str(e)}")

def test_1_6_put_update():
    """TEST 1.6: PUT update unit"""
    print("\n=== TEST 1.6: PUT update unit ===")
    
    payload = {"base_price": 20, "quantity": 8}
    
    try:
        resp = requests.put(f"{BASE_URL}/rental-units/{pool_unit_id}", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 1.6", False, f"Expected 200, got {resp.status_code}: {data}")
        
        if data.get("base_price") != 20 or data.get("quantity") != 8:
            return log_test("TEST 1.6", False, f"Update not applied: base_price={data.get('base_price')}, quantity={data.get('quantity')}")
        
        return log_test("TEST 1.6", True, "Update successful: base_price=20, quantity=8")
        
    except Exception as e:
        return log_test("TEST 1.6", False, f"Exception: {str(e)}")

def test_2_1_nominal_availability_free():
    """TEST 2.1: NOMINAL availability - free dates"""
    print("\n=== TEST 2.1: NOMINAL availability - free dates ===")
    
    try:
        resp = requests.get(
            f"{BASE_URL}/rental-units/availability?unit_id={nominal_unit_id}&start_date=2026-07-15&end_date=2026-07-20",
            timeout=10
        )
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 2.1", False, f"Expected 200, got {resp.status_code}: {data}")
        
        checks = []
        checks.append(("available is true", data.get("available") == True))
        checks.append(("available_quantity is 1", data.get("available_quantity") == 1))
        checks.append(("billable_units is 5", data.get("pricing", {}).get("billable_units") == 5))
        checks.append(("total is 750", data.get("pricing", {}).get("total") == 750))
        checks.append(("min_duration_ok is true", data.get("min_duration_ok") == True))
        
        # Check breakdown
        breakdown = data.get("pricing", {}).get("breakdown", [])
        if len(breakdown) > 0:
            checks.append(("breakdown has Alta Stagione", breakdown[0].get("name") == "Alta Stagione"))
            checks.append(("days is 5", breakdown[0].get("days") == 5))
            checks.append(("price_per_unit is 150", breakdown[0].get("price_per_unit") == 150))
            checks.append(("subtotal is 750", breakdown[0].get("subtotal") == 750))
        else:
            checks.append(("breakdown not empty", False))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 2.1", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 2.1", True, "Availability check passed: 5 nights, 750€ total")
        
    except Exception as e:
        return log_test("TEST 2.1", False, f"Exception: {str(e)}")

def test_2_2_multi_season_pricing():
    """TEST 2.2: Multi-season pricing"""
    print("\n=== TEST 2.2: Multi-season pricing ===")
    
    try:
        resp = requests.get(
            f"{BASE_URL}/rental-units/availability?unit_id={nominal_unit_id}&start_date=2026-06-29&end_date=2026-07-03",
            timeout=10
        )
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 2.2", False, f"Expected 200, got {resp.status_code}: {data}")
        
        breakdown = data.get("pricing", {}).get("breakdown", [])
        total = data.get("pricing", {}).get("total")
        
        if len(breakdown) != 2:
            return log_test("TEST 2.2", False, f"Expected 2 breakdown entries, got {len(breakdown)}")
        
        # Find Media and Alta seasons
        media = next((b for b in breakdown if "Media" in b.get("name", "")), None)
        alta = next((b for b in breakdown if "Alta" in b.get("name", "")), None)
        
        if not media or not alta:
            return log_test("TEST 2.2", False, f"Missing season entries: {breakdown}")
        
        checks = []
        checks.append(("Media days is 2", media.get("days") == 2))
        checks.append(("Media subtotal is 200", media.get("subtotal") == 200))
        checks.append(("Alta days is 2", alta.get("days") == 2))
        checks.append(("Alta subtotal is 300", alta.get("subtotal") == 300))
        checks.append(("total is 500", total == 500))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 2.2", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 2.2", True, "Multi-season pricing: 2 days Media (200€) + 2 days Alta (300€) = 500€")
        
    except Exception as e:
        return log_test("TEST 2.2", False, f"Exception: {str(e)}")

def test_2_3_base_price_fallback():
    """TEST 2.3: Base price fallback - no matching season"""
    print("\n=== TEST 2.3: Base price fallback ===")
    
    try:
        resp = requests.get(
            f"{BASE_URL}/rental-units/availability?unit_id={nominal_unit_id}&start_date=2026-05-10&end_date=2026-05-13",
            timeout=10
        )
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 2.3", False, f"Expected 200, got {resp.status_code}: {data}")
        
        breakdown = data.get("pricing", {}).get("breakdown", [])
        total = data.get("pricing", {}).get("total")
        
        if len(breakdown) == 0:
            return log_test("TEST 2.3", False, "No breakdown entries")
        
        checks = []
        checks.append(("name is Tariffa Base", breakdown[0].get("name") == "Tariffa Base"))
        checks.append(("price_per_unit is 80", breakdown[0].get("price_per_unit") == 80))
        checks.append(("days is 3", breakdown[0].get("days") == 3))
        checks.append(("subtotal is 240", breakdown[0].get("subtotal") == 240))
        checks.append(("total is 240", total == 240))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 2.3", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 2.3", True, "Base price fallback: 3 nights × 80€ = 240€")
        
    except Exception as e:
        return log_test("TEST 2.3", False, f"Exception: {str(e)}")

def test_2_4_min_duration_violation():
    """TEST 2.4: min_duration violation"""
    print("\n=== TEST 2.4: min_duration violation ===")
    
    try:
        resp = requests.get(
            f"{BASE_URL}/rental-units/availability?unit_id={nominal_unit_id}&start_date=2026-07-15&end_date=2026-07-16",
            timeout=10
        )
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 2.4", False, f"Expected 200, got {resp.status_code}")
        
        checks = []
        checks.append(("available is false", data.get("available") == False))
        checks.append(("min_duration_ok is false", data.get("min_duration_ok") == False))
        checks.append(("reason mentions Durata minima", "Durata minima" in data.get("reason", "")))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 2.4", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 2.4", True, "min_duration violation detected correctly")
        
    except Exception as e:
        return log_test("TEST 2.4", False, f"Exception: {str(e)}")

def test_2_5_pool_availability():
    """TEST 2.5: POOL availability"""
    print("\n=== TEST 2.5: POOL availability ===")
    
    try:
        resp = requests.get(
            f"{BASE_URL}/rental-units/availability?unit_id={pool_unit_id}&start_date=2026-07-10&end_date=2026-07-12&quantity=3",
            timeout=10
        )
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 2.5", False, f"Expected 200, got {resp.status_code}: {data}")
        
        checks = []
        checks.append(("available is true", data.get("available") == True))
        checks.append(("available_quantity is 8", data.get("available_quantity") == 8))
        checks.append(("billable_units is 2", data.get("pricing", {}).get("billable_units") == 2))
        # 20 (base_price updated in TEST 1.6) × 2 days × 3 qty = 120
        checks.append(("total is 120", data.get("pricing", {}).get("total") == 120))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 2.5", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 2.5", True, "POOL availability: 2 days × 3 qty × 20€ = 120€")
        
    except Exception as e:
        return log_test("TEST 2.5", False, f"Exception: {str(e)}")

def test_2_6_price_check():
    """TEST 2.6: POST price-check"""
    print("\n=== TEST 2.6: POST price-check ===")
    
    payload = {
        "unit_id": nominal_unit_id,
        "start_date": "2026-07-15",
        "end_date": "2026-07-20"
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-units/price-check", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 2.6", False, f"Expected 200, got {resp.status_code}: {data}")
        
        # Should match TEST 2.1 pricing
        checks = []
        checks.append(("billable_units is 5", data.get("billable_units") == 5))
        checks.append(("total is 750", data.get("total") == 750))
        checks.append(("has breakdown", len(data.get("breakdown", [])) > 0))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 2.6", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 2.6", True, "Price check matches availability pricing")
        
    except Exception as e:
        return log_test("TEST 2.6", False, f"Exception: {str(e)}")

def test_2_7_invalid_dates():
    """TEST 2.7: Invalid dates (end <= start)"""
    print("\n=== TEST 2.7: Invalid dates ===")
    
    try:
        resp = requests.get(
            f"{BASE_URL}/rental-units/availability?unit_id={nominal_unit_id}&start_date=2026-07-20&end_date=2026-07-15",
            timeout=10
        )
        
        if resp.status_code != 400:
            return log_test("TEST 2.7", False, f"Expected 400, got {resp.status_code}")
        
        return log_test("TEST 2.7", True, "Invalid dates rejected with 400")
        
    except Exception as e:
        return log_test("TEST 2.7", False, f"Exception: {str(e)}")

def test_3_1_create_nominal_booking():
    """TEST 3.1: POST create NOMINAL booking - happy path"""
    global booking1_id
    print("\n=== TEST 3.1: Create NOMINAL booking ===")
    
    payload = {
        "unit_id": nominal_unit_id,
        "start_date": "2026-07-15",
        "end_date": "2026-07-20",
        "customer": {
            "name": "Mario Rossi",
            "email": "mario@example.com",
            "phone": "3331234567"
        },
        "guests_count": 2,
        "status": "CONFIRMED",
        "payment_status": "PENDING",
        "company_id": COMPANY_ID
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-bookings", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 201:
            return log_test("TEST 3.1", False, f"Expected 201, got {resp.status_code}: {data}")
        
        checks = []
        checks.append(("has booking_number", "booking_number" in data))
        checks.append(("booking_number matches RB-2026/NNNN", data.get("booking_number", "").startswith("RB-2026/")))
        checks.append(("duration_value is 5", data.get("duration_value") == 5))
        checks.append(("total_amount is 750", data.get("total_amount") == 750))
        checks.append(("deposit_pct is 30", data.get("deposit_pct") == 30))
        checks.append(("deposit_amount is 225", data.get("deposit_amount") == 225))
        checks.append(("balance_amount is 525", data.get("balance_amount") == 525))
        checks.append(("has pricing_breakdown", len(data.get("pricing_breakdown", [])) > 0))
        checks.append(("category is APARTMENT", data.get("category") == "APARTMENT"))
        checks.append(("unit_name matches", "Appartamento" in data.get("unit_name", "")))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 3.1", False, f"Failed checks: {[c[0] for c in failed]}")
        
        booking1_id = data["id"]
        return log_test("TEST 3.1", True, f"Created booking: {data.get('booking_number')} - 750€ (deposit 225€)")
        
    except Exception as e:
        return log_test("TEST 3.1", False, f"Exception: {str(e)}")

def test_3_2_overlap_nominal_fail():
    """TEST 3.2: POST overlap NOMINAL - should fail"""
    print("\n=== TEST 3.2: Overlap NOMINAL booking (should fail) ===")
    
    payload = {
        "unit_id": nominal_unit_id,
        "start_date": "2026-07-18",
        "end_date": "2026-07-25",
        "customer": {"name": "Test", "email": "test@test.com"},
        "company_id": COMPANY_ID
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-bookings", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 409:
            return log_test("TEST 3.2", False, f"Expected 409, got {resp.status_code}: {data}")
        
        if "error" not in data or "disponibile" not in data["error"].lower():
            return log_test("TEST 3.2", False, f"Expected error about availability, got: {data}")
        
        return log_test("TEST 3.2", True, "Overlap correctly rejected with 409")
        
    except Exception as e:
        return log_test("TEST 3.2", False, f"Exception: {str(e)}")

def test_3_3_create_pool_booking():
    """TEST 3.3: POST POOL booking with quantity"""
    global pool_booking_id
    print("\n=== TEST 3.3: Create POOL booking ===")
    
    payload = {
        "unit_id": pool_unit_id,
        "start_date": "2026-07-10",
        "end_date": "2026-07-13",
        "quantity": 3,
        "customer": {"name": "Anna Verdi", "email": "anna@test.com"},
        "company_id": COMPANY_ID
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-bookings", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 201:
            return log_test("TEST 3.3", False, f"Expected 201, got {resp.status_code}: {data}")
        
        # 20 (base_price) × 3 days × 3 qty = 180
        checks = []
        checks.append(("quantity is 3", data.get("quantity") == 3))
        checks.append(("total_amount is 180", data.get("total_amount") == 180))
        checks.append(("duration_value is 3", data.get("duration_value") == 3))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 3.3", False, f"Failed checks: {[c[0] for c in failed]}")
        
        pool_booking_id = data["id"]
        return log_test("TEST 3.3", True, f"Created POOL booking: 3 days × 3 qty = 180€")
        
    except Exception as e:
        return log_test("TEST 3.3", False, f"Exception: {str(e)}")

def test_3_4_pool_overlapping_within_capacity():
    """TEST 3.4: POOL overlapping - within capacity"""
    global pool_booking2_id
    print("\n=== TEST 3.4: POOL overlapping within capacity ===")
    
    payload = {
        "unit_id": pool_unit_id,
        "start_date": "2026-07-10",
        "end_date": "2026-07-13",
        "quantity": 4,
        "customer": {"name": "Test User 2", "email": "test2@test.com"},
        "company_id": COMPANY_ID
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-bookings", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 201:
            return log_test("TEST 3.4", False, f"Expected 201, got {resp.status_code}: {data}")
        
        pool_booking2_id = data["id"]
        return log_test("TEST 3.4", True, "POOL booking within capacity (3+4=7 <= 8)")
        
    except Exception as e:
        return log_test("TEST 3.4", False, f"Exception: {str(e)}")

def test_3_5_pool_exceeds_capacity():
    """TEST 3.5: POOL overlapping - exceeds capacity"""
    print("\n=== TEST 3.5: POOL exceeds capacity (should fail) ===")
    
    payload = {
        "unit_id": pool_unit_id,
        "start_date": "2026-07-10",
        "end_date": "2026-07-13",
        "quantity": 5,
        "customer": {"name": "Test User 3", "email": "test3@test.com"},
        "company_id": COMPANY_ID
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-bookings", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 409:
            return log_test("TEST 3.5", False, f"Expected 409, got {resp.status_code}: {data}")
        
        if "error" not in data or "disponibili" not in data["error"].lower():
            return log_test("TEST 3.5", False, f"Expected error about availability, got: {data}")
        
        return log_test("TEST 3.5", True, "Capacity exceeded correctly rejected (3+4+5=12 > 8)")
        
    except Exception as e:
        return log_test("TEST 3.5", False, f"Exception: {str(e)}")

def test_3_6_min_duration_violation_booking():
    """TEST 3.6: min_duration violation on booking"""
    print("\n=== TEST 3.6: min_duration violation on booking ===")
    
    payload = {
        "unit_id": nominal_unit_id,
        "start_date": "2026-09-01",
        "end_date": "2026-09-02",
        "customer": {"name": "Test", "email": "test@test.com"},
        "company_id": COMPANY_ID
    }
    
    try:
        resp = requests.post(f"{BASE_URL}/rental-bookings", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 400:
            return log_test("TEST 3.6", False, f"Expected 400, got {resp.status_code}: {data}")
        
        if "error" not in data or "Durata minima" not in data["error"]:
            return log_test("TEST 3.6", False, f"Expected error about min_duration, got: {data}")
        
        return log_test("TEST 3.6", True, "min_duration violation on booking rejected")
        
    except Exception as e:
        return log_test("TEST 3.6", False, f"Exception: {str(e)}")

def test_3_7_get_bookings_filtered():
    """TEST 3.7: GET list filtered"""
    print("\n=== TEST 3.7: GET bookings filtered by company ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/rental-bookings?company_id={COMPANY_ID}", timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 3.7", False, f"Expected 200, got {resp.status_code}")
        
        if not isinstance(data, list):
            return log_test("TEST 3.7", False, f"Expected array, got: {type(data)}")
        
        # Check booking1_id is in the list
        ids = [b["id"] for b in data]
        if booking1_id not in ids:
            return log_test("TEST 3.7", False, "Created booking not found in list")
        
        return log_test("TEST 3.7", True, f"Found {len(data)} bookings including created ones")
        
    except Exception as e:
        return log_test("TEST 3.7", False, f"Exception: {str(e)}")

def test_3_8_update_with_date_change():
    """TEST 3.8: PUT update with date change → re-pricing"""
    print("\n=== TEST 3.8: Update booking with date change (re-pricing) ===")
    
    payload = {
        "start_date": "2026-06-29",
        "end_date": "2026-07-03"
    }
    
    try:
        resp = requests.put(f"{BASE_URL}/rental-bookings/{booking1_id}", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 3.8", False, f"Expected 200, got {resp.status_code}: {data}")
        
        checks = []
        checks.append(("total_amount is 500", data.get("total_amount") == 500))
        checks.append(("duration_value is 4", data.get("duration_value") == 4))
        checks.append(("pricing_breakdown has 2 entries", len(data.get("pricing_breakdown", [])) == 2))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 3.8", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 3.8", True, "Date change re-priced: 4 nights = 500€ (multi-season)")
        
    except Exception as e:
        return log_test("TEST 3.8", False, f"Exception: {str(e)}")

def test_3_9_update_inline_status():
    """TEST 3.9: PUT inline status change"""
    print("\n=== TEST 3.9: Update payment_status inline ===")
    
    payload = {"payment_status": "PAID"}
    
    try:
        resp = requests.put(f"{BASE_URL}/rental-bookings/{booking1_id}", json=payload, timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 3.9", False, f"Expected 200, got {resp.status_code}: {data}")
        
        checks = []
        checks.append(("payment_status is PAID", data.get("payment_status") == "PAID"))
        checks.append(("total_amount unchanged (500)", data.get("total_amount") == 500))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 3.9", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 3.9", True, "Status updated, total unchanged")
        
    except Exception as e:
        return log_test("TEST 3.9", False, f"Exception: {str(e)}")

def test_4_1_stats():
    """TEST 4.1: GET /api/rental-stats"""
    print("\n=== TEST 4.1: GET rental stats ===")
    
    try:
        resp = requests.get(f"{BASE_URL}/rental-stats?company_id={COMPANY_ID}", timeout=10)
        data = resp.json()
        
        if resp.status_code != 200:
            return log_test("TEST 4.1", False, f"Expected 200, got {resp.status_code}: {data}")
        
        required_keys = ["total_units", "active_units", "total_bookings", "active_now", "upcoming", "total_revenue", "by_category"]
        missing = [k for k in required_keys if k not in data]
        if missing:
            return log_test("TEST 4.1", False, f"Missing keys: {missing}")
        
        by_cat = data.get("by_category", {})
        if "APARTMENT" not in by_cat or "BIKE" not in by_cat:
            return log_test("TEST 4.1", False, f"Missing categories in by_category: {list(by_cat.keys())}")
        
        checks = []
        checks.append(("APARTMENT.units >= 1", by_cat.get("APARTMENT", {}).get("units", 0) >= 1))
        checks.append(("BIKE.units >= 1", by_cat.get("BIKE", {}).get("units", 0) >= 1))
        
        failed = [c for c in checks if not c[1]]
        if failed:
            return log_test("TEST 4.1", False, f"Failed checks: {[c[0] for c in failed]}")
        
        return log_test("TEST 4.1", True, f"Stats: {data.get('total_units')} units, {data.get('total_bookings')} bookings")
        
    except Exception as e:
        return log_test("TEST 4.1", False, f"Exception: {str(e)}")

def test_5_1_delete_unit_with_bookings():
    """TEST 5.1: DELETE unit with active bookings - blocked"""
    print("\n=== TEST 5.1: DELETE unit with active bookings (should fail) ===")
    
    try:
        resp = requests.delete(f"{BASE_URL}/rental-units/{nominal_unit_id}", timeout=10)
        data = resp.json()
        
        if resp.status_code != 400:
            return log_test("TEST 5.1", False, f"Expected 400, got {resp.status_code}: {data}")
        
        if "error" not in data or "prenotazioni attive" not in data["error"].lower():
            return log_test("TEST 5.1", False, f"Expected error about active bookings, got: {data}")
        
        return log_test("TEST 5.1", True, "Delete blocked due to active bookings")
        
    except Exception as e:
        return log_test("TEST 5.1", False, f"Exception: {str(e)}")

def test_5_2_delete_bookings():
    """TEST 5.2: DELETE bookings"""
    print("\n=== TEST 5.2: DELETE bookings ===")
    
    try:
        # Delete all bookings
        bookings_to_delete = [booking1_id, pool_booking_id, pool_booking2_id]
        for bid in bookings_to_delete:
            if bid:
                resp = requests.delete(f"{BASE_URL}/rental-bookings/{bid}", timeout=10)
                if resp.status_code not in [200, 204]:
                    return log_test("TEST 5.2", False, f"Failed to delete booking {bid}: {resp.status_code}")
        
        return log_test("TEST 5.2", True, "All bookings deleted successfully")
        
    except Exception as e:
        return log_test("TEST 5.2", False, f"Exception: {str(e)}")

def test_5_3_delete_units_after_cleanup():
    """TEST 5.3: DELETE units after cleanup"""
    print("\n=== TEST 5.3: DELETE units after cleanup ===")
    
    try:
        # Delete nominal unit
        resp = requests.delete(f"{BASE_URL}/rental-units/{nominal_unit_id}", timeout=10)
        if resp.status_code not in [200, 204]:
            return log_test("TEST 5.3", False, f"Failed to delete nominal unit: {resp.status_code}")
        
        # Delete pool unit
        resp = requests.delete(f"{BASE_URL}/rental-units/{pool_unit_id}", timeout=10)
        if resp.status_code not in [200, 204]:
            return log_test("TEST 5.3", False, f"Failed to delete pool unit: {resp.status_code}")
        
        return log_test("TEST 5.3", True, "Both units deleted successfully")
        
    except Exception as e:
        return log_test("TEST 5.3", False, f"Exception: {str(e)}")

def main():
    """Run all tests"""
    print("=" * 80)
    print("LOCAZIONI BREVI (Short-Term Rentals) - Backend Testing")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"Company ID: {COMPANY_ID}")
    print("=" * 80)
    
    results = []
    
    # Section 1: Rental Units CRUD
    print("\n" + "=" * 80)
    print("SECTION 1: RENTAL UNITS CRUD")
    print("=" * 80)
    results.append(test_1_1_create_nominal_unit())
    results.append(test_1_2_create_pool_unit())
    results.append(test_1_3_validation_missing_name())
    results.append(test_1_4_get_list_with_filter())
    results.append(test_1_5_get_single())
    results.append(test_1_6_put_update())
    
    # Section 2: Availability + Price Check
    print("\n" + "=" * 80)
    print("SECTION 2: AVAILABILITY + PRICE CHECK")
    print("=" * 80)
    results.append(test_2_1_nominal_availability_free())
    results.append(test_2_2_multi_season_pricing())
    results.append(test_2_3_base_price_fallback())
    results.append(test_2_4_min_duration_violation())
    results.append(test_2_5_pool_availability())
    results.append(test_2_6_price_check())
    results.append(test_2_7_invalid_dates())
    
    # Section 3: Rental Bookings CRUD
    print("\n" + "=" * 80)
    print("SECTION 3: RENTAL BOOKINGS CRUD")
    print("=" * 80)
    results.append(test_3_1_create_nominal_booking())
    results.append(test_3_2_overlap_nominal_fail())
    results.append(test_3_3_create_pool_booking())
    results.append(test_3_4_pool_overlapping_within_capacity())
    results.append(test_3_5_pool_exceeds_capacity())
    results.append(test_3_6_min_duration_violation_booking())
    results.append(test_3_7_get_bookings_filtered())
    results.append(test_3_8_update_with_date_change())
    results.append(test_3_9_update_inline_status())
    
    # Section 4: Stats
    print("\n" + "=" * 80)
    print("SECTION 4: STATS")
    print("=" * 80)
    results.append(test_4_1_stats())
    
    # Section 5: Delete Constraints
    print("\n" + "=" * 80)
    print("SECTION 5: DELETE CONSTRAINTS")
    print("=" * 80)
    results.append(test_5_1_delete_unit_with_bookings())
    results.append(test_5_2_delete_bookings())
    results.append(test_5_3_delete_units_after_cleanup())
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    passed = sum(results)
    total = len(results)
    print(f"Total: {passed}/{total} tests passed ({passed*100//total}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! 🎉")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
