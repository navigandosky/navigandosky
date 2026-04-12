#!/usr/bin/env python3
"""
Maretrek Booking Engine Backend Test Suite
Tests all backend functionality including seat assignments and drag & drop
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://sardinia-tours-hub.preview.emergentagent.com/api"
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
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
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

def test_seed_data(results):
    """Test 1: Load demo data using POST /api/seed"""
    print("\n🔄 Testing seed data loading...")
    
    data, error = make_request("POST", "seed", expected_status=200)
    if error:
        results.failure("Seed data loading", error)
        return None
    
    if not data or 'counts' not in data:
        results.failure("Seed data loading", "Invalid response format")
        return None
    
    counts = data['counts']
    expected_counts = {
        'experiences': 6,
        'resources': 8,
        'slots': 117,  # Based on the previous test results
        'vouchers': 3,
        'agencies': 3
    }
    
    for key, expected in expected_counts.items():
        if counts.get(key, 0) != expected:
            results.failure("Seed data loading", f"Expected {expected} {key}, got {counts.get(key, 0)}")
            return None
    
    results.success("Seed data loading - all demo data created correctly")
    return data

def test_get_resources(results):
    """Get available resources for slot creation"""
    print("\n🔄 Getting available resources...")
    
    data, error = make_request("GET", "resources")
    if error:
        results.failure("Get resources", error)
        return None
    
    if not isinstance(data, list) or len(data) == 0:
        results.failure("Get resources", "No resources found")
        return None
    
    # Find boat resources (Libeccio or Poseidon)
    boat_resources = [r for r in data if r.get('type') == 'BOAT' and r.get('name') in ['Libeccio', 'Poseidon']]
    if not boat_resources:
        results.failure("Get resources", "No boat resources (Libeccio/Poseidon) found")
        return None
    
    results.success(f"Get resources - found {len(data)} resources, {len(boat_resources)} boats")
    return data

def test_get_experiences(results):
    """Get available experiences"""
    print("\n🔄 Getting available experiences...")
    
    data, error = make_request("GET", "experiences")
    if error:
        results.failure("Get experiences", error)
        return None
    
    if not isinstance(data, list) or len(data) == 0:
        results.failure("Get experiences", "No experiences found")
        return None
    
    results.success(f"Get experiences - found {len(data)} experiences")
    return data

def test_create_slot(results, experiences, resources):
    """Test 2: Create slot with BOAT resource"""
    print("\n🔄 Testing slot creation...")
    
    # Find a boat experience and boat resource
    boat_experience = next((e for e in experiences if e.get('type') == 'BOAT_EXCURSION'), None)
    if not boat_experience:
        results.failure("Create slot", "No boat excursion experience found")
        return None
    
    boat_resource = next((r for r in resources if r.get('type') == 'BOAT' and r.get('name') in ['Libeccio', 'Poseidon']), None)
    if not boat_resource:
        results.failure("Create slot", "No suitable boat resource found")
        return None
    
    # Create slot for tomorrow
    tomorrow = datetime.now() + timedelta(days=1)
    start_time = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=boat_experience['duration_minutes'])
    
    slot_data = {
        "experience_id": boat_experience['id'],
        "resource_ids": [boat_resource['id']],
        "start_datetime": start_time.isoformat(),
        "end_datetime": end_time.isoformat(),
        "max_seats": 8,
        "notes": "Test slot for seat assignments"
    }
    
    data, error = make_request("POST", "slots", slot_data, expected_status=201)
    if error:
        results.failure("Create slot", error)
        return None
    
    if not data or 'id' not in data:
        results.failure("Create slot", "Invalid response - missing slot ID")
        return None
    
    # Verify slot properties
    if data.get('experience_id') != boat_experience['id']:
        results.failure("Create slot", "Experience ID mismatch")
        return None
    
    if data.get('max_seats') != 8:
        results.failure("Create slot", "Max seats mismatch")
        return None
    
    if data.get('booked_seats') != 0:
        results.failure("Create slot", "Initial booked seats should be 0")
        return None
    
    results.success(f"Create slot - slot {data['id']} created successfully")
    return data

def test_create_booking(results, slot, experience):
    """Test 3: Create booking with customer details"""
    print("\n🔄 Testing booking creation...")
    
    booking_data = {
        "slot_id": slot['id'],
        "experience_id": experience['id'],
        "customer_name": "Mario Rossi",
        "customer_email": "mario@test.com",
        "customer_phone": "+39 333 1234567",
        "seats": 4,
        "special_requests": "Test booking for seat assignments"
    }
    
    data, error = make_request("POST", "bookings", booking_data, expected_status=201)
    if error:
        results.failure("Create booking", error)
        return None
    
    if not data or 'id' not in data:
        results.failure("Create booking", "Invalid response - missing booking ID")
        return None
    
    # Verify booking properties
    expected_fields = {
        'customer_name': 'Mario Rossi',
        'customer_email': 'mario@test.com',
        'customer_phone': '+39 333 1234567',
        'seats': 4,
        'status': 'CONFIRMED',
        'slot_id': slot['id']
    }
    
    for field, expected_value in expected_fields.items():
        if data.get(field) != expected_value:
            results.failure("Create booking", f"Field {field}: expected {expected_value}, got {data.get(field)}")
            return None
    
    # Verify booking reference format
    if not data.get('booking_ref', '').startswith('MK-'):
        results.failure("Create booking", f"Invalid booking reference format: {data.get('booking_ref')}")
        return None
    
    results.success(f"Create booking - booking {data['booking_ref']} created with status CONFIRMED")
    return data

def test_seat_assignments(results, booking):
    """Test 4: Assign seats to booking (NEW FUNCTIONALITY)"""
    print("\n🔄 Testing seat assignments (NEW FUNCTIONALITY)...")
    
    seat_assignments = ["Posto 1", "Posto 2", "Posto 3", "Posto 4"]
    
    update_data = {
        "action": "update_details",
        "seat_assignments": seat_assignments
    }
    
    data, error = make_request("PUT", f"bookings/{booking['id']}", update_data, expected_status=200)
    if error:
        results.failure("Seat assignments", error)
        return None
    
    if not data or 'seat_assignments' not in data:
        results.failure("Seat assignments", "Response missing seat_assignments field")
        return None
    
    if data['seat_assignments'] != seat_assignments:
        results.failure("Seat assignments", f"Seat assignments mismatch: expected {seat_assignments}, got {data['seat_assignments']}")
        return None
    
    results.success("Seat assignments - seats assigned successfully")
    return data

def test_get_booking_with_seats(results, booking_id):
    """Test 5: Verify seat assignments are persisted"""
    print("\n🔄 Testing seat assignments persistence...")
    
    data, error = make_request("GET", f"bookings/{booking_id}")
    if error:
        results.failure("Get booking with seats", error)
        return None
    
    if not data or 'seat_assignments' not in data:
        results.failure("Get booking with seats", "Response missing seat_assignments field")
        return None
    
    expected_seats = ["Posto 1", "Posto 2", "Posto 3", "Posto 4"]
    if data['seat_assignments'] != expected_seats:
        results.failure("Get booking with seats", f"Seat assignments not persisted correctly: {data['seat_assignments']}")
        return None
    
    results.success("Get booking with seats - seat assignments persisted correctly")
    return data

def test_create_second_slot(results, experiences, resources):
    """Test 6: Create second slot for drag & drop testing"""
    print("\n🔄 Creating second slot for drag & drop testing...")
    
    # Find a boat experience and boat resource
    boat_experience = next((e for e in experiences if e.get('type') == 'BOAT_EXCURSION'), None)
    if not boat_experience:
        results.failure("Create second slot", "No boat excursion experience found")
        return None
    
    boat_resource = next((r for r in resources if r.get('type') == 'BOAT' and r.get('name') in ['Libeccio', 'Poseidon']), None)
    if not boat_resource:
        results.failure("Create second slot", "No suitable boat resource found")
        return None
    
    # Create slot for day after tomorrow
    day_after_tomorrow = datetime.now() + timedelta(days=2)
    start_time = day_after_tomorrow.replace(hour=14, minute=0, second=0, microsecond=0)
    end_time = start_time + timedelta(minutes=boat_experience['duration_minutes'])
    
    slot_data = {
        "experience_id": boat_experience['id'],
        "resource_ids": [boat_resource['id']],
        "start_datetime": start_time.isoformat(),
        "end_datetime": end_time.isoformat(),
        "max_seats": 10,
        "notes": "Second test slot for drag & drop"
    }
    
    data, error = make_request("POST", "slots", slot_data, expected_status=201)
    if error:
        results.failure("Create second slot", error)
        return None
    
    results.success(f"Create second slot - slot {data['id']} created successfully")
    return data

def test_drag_drop_reassign(results, booking, new_slot):
    """Test 7: Drag & Drop - Reassign booking to new slot"""
    print("\n🔄 Testing drag & drop booking reassignment...")
    
    original_seat_assignments = booking.get('seat_assignments', [])
    
    reassign_data = {
        "action": "reassign",
        "new_slot_id": new_slot['id']
    }
    
    data, error = make_request("PUT", f"bookings/{booking['id']}", reassign_data, expected_status=200)
    if error:
        results.failure("Drag & drop reassign", error)
        return None
    
    if not data:
        results.failure("Drag & drop reassign", "No response data")
        return None
    
    # Verify booking was moved to new slot
    if data.get('slot_id') != new_slot['id']:
        results.failure("Drag & drop reassign", f"Booking not moved to new slot: expected {new_slot['id']}, got {data.get('slot_id')}")
        return None
    
    # Verify seat assignments are preserved
    if data.get('seat_assignments') != original_seat_assignments:
        results.failure("Drag & drop reassign", f"Seat assignments not preserved: expected {original_seat_assignments}, got {data.get('seat_assignments')}")
        return None
    
    results.success("Drag & drop reassign - booking moved successfully with seat assignments preserved")
    return data

def test_modify_booking_details(results, booking):
    """Test 8: Modify booking details including seat assignments"""
    print("\n🔄 Testing booking details modification...")
    
    new_seat_assignments = ["A1", "A2", "B1", "B2"]
    
    update_data = {
        "action": "update_details",
        "customer_name": "Mario Bianchi",
        "customer_phone": "+39 333 9999999",
        "seat_assignments": new_seat_assignments
    }
    
    data, error = make_request("PUT", f"bookings/{booking['id']}", update_data, expected_status=200)
    if error:
        results.failure("Modify booking details", error)
        return None
    
    # Verify all changes were applied
    expected_changes = {
        'customer_name': 'Mario Bianchi',
        'customer_phone': '+39 333 9999999',
        'seat_assignments': new_seat_assignments
    }
    
    for field, expected_value in expected_changes.items():
        if data.get(field) != expected_value:
            results.failure("Modify booking details", f"Field {field}: expected {expected_value}, got {data.get(field)}")
            return None
    
    results.success("Modify booking details - all changes applied successfully")
    return data

def test_query_bookings_by_slot(results, slot_id):
    """Test 9: Query bookings by slot ID"""
    print("\n🔄 Testing bookings query by slot...")
    
    data, error = make_request("GET", f"bookings?slot_id={slot_id}")
    if error:
        results.failure("Query bookings by slot", error)
        return None
    
    if not isinstance(data, list):
        results.failure("Query bookings by slot", "Response should be a list")
        return None
    
    # Verify all bookings belong to the specified slot
    for booking in data:
        if booking.get('slot_id') != slot_id:
            results.failure("Query bookings by slot", f"Booking {booking.get('id')} has wrong slot_id: {booking.get('slot_id')}")
            return None
    
    results.success(f"Query bookings by slot - found {len(data)} bookings for slot {slot_id}")
    return data

def test_single_seat_booking(results, slot, experience):
    """Test 10: Edge case - booking with 1 seat"""
    print("\n🔄 Testing single seat booking edge case...")
    
    booking_data = {
        "slot_id": slot['id'],
        "experience_id": experience['id'],
        "customer_name": "Giulia Verdi",
        "customer_email": "giulia@test.com",
        "customer_phone": "+39 333 5555555",
        "seats": 1,
        "special_requests": "Single seat booking test"
    }
    
    data, error = make_request("POST", "bookings", booking_data, expected_status=201)
    if error:
        results.failure("Single seat booking", error)
        return None
    
    if data.get('seats') != 1:
        results.failure("Single seat booking", f"Expected 1 seat, got {data.get('seats')}")
        return None
    
    # Test single seat assignment
    seat_assignment_data = {
        "action": "update_details",
        "seat_assignments": ["VIP-1"]
    }
    
    updated_data, error = make_request("PUT", f"bookings/{data['id']}", seat_assignment_data, expected_status=200)
    if error:
        results.failure("Single seat assignment", error)
        return None
    
    if updated_data.get('seat_assignments') != ["VIP-1"]:
        results.failure("Single seat assignment", f"Seat assignment failed: {updated_data.get('seat_assignments')}")
        return None
    
    results.success("Single seat booking - created and assigned successfully")
    return updated_data

def test_multiple_booking_modifications(results, booking):
    """Test 11: Multiple modifications to same booking"""
    print("\n🔄 Testing multiple booking modifications...")
    
    # First modification
    update1 = {
        "action": "update_details",
        "customer_name": "Mario Rossi Updated",
        "seat_assignments": ["Premium-1", "Premium-2", "Premium-3", "Premium-4"]
    }
    
    data1, error = make_request("PUT", f"bookings/{booking['id']}", update1, expected_status=200)
    if error:
        results.failure("Multiple modifications - first update", error)
        return None
    
    # Second modification
    update2 = {
        "action": "update_details",
        "special_requests": "Updated special requests",
        "seat_assignments": ["Final-A", "Final-B", "Final-C", "Final-D"]
    }
    
    data2, error = make_request("PUT", f"bookings/{booking['id']}", update2, expected_status=200)
    if error:
        results.failure("Multiple modifications - second update", error)
        return None
    
    # Verify final state
    final_data, error = make_request("GET", f"bookings/{booking['id']}")
    if error:
        results.failure("Multiple modifications - final verification", error)
        return None
    
    expected_final_state = {
        'customer_name': 'Mario Rossi Updated',
        'special_requests': 'Updated special requests',
        'seat_assignments': ["Final-A", "Final-B", "Final-C", "Final-D"]
    }
    
    for field, expected_value in expected_final_state.items():
        if final_data.get(field) != expected_value:
            results.failure("Multiple modifications", f"Final state {field}: expected {expected_value}, got {final_data.get(field)}")
            return None
    
    results.success("Multiple modifications - all updates applied correctly")
    return final_data

def main():
    """Main test execution"""
    print("🚀 Starting Maretrek Booking Engine Backend Tests")
    print(f"Base URL: {BASE_URL}")
    
    results = TestResults()
    
    # Test 1: Setup - Load demo data
    seed_result = test_seed_data(results)
    if not seed_result:
        print("❌ Cannot continue without seed data")
        return False
    
    # Get resources and experiences for testing
    resources = test_get_resources(results)
    experiences = test_get_experiences(results)
    
    if not resources or not experiences:
        print("❌ Cannot continue without resources and experiences")
        return False
    
    # Test 2: Create first slot
    slot1 = test_create_slot(results, experiences, resources)
    if not slot1:
        print("❌ Cannot continue without slot")
        return False
    
    # Find boat experience for booking
    boat_experience = next((e for e in experiences if e.get('type') == 'BOAT_EXCURSION'), None)
    
    # Test 3: Create booking
    booking = test_create_booking(results, slot1, boat_experience)
    if not booking:
        print("❌ Cannot continue without booking")
        return False
    
    # Test 4: Seat assignments (NEW FUNCTIONALITY)
    booking_with_seats = test_seat_assignments(results, booking)
    if not booking_with_seats:
        print("❌ Seat assignments failed")
        return False
    
    # Test 5: Verify seat assignments persistence
    test_get_booking_with_seats(results, booking['id'])
    
    # Test 6: Create second slot for drag & drop
    slot2 = test_create_second_slot(results, experiences, resources)
    if not slot2:
        print("❌ Cannot continue without second slot")
        return False
    
    # Test 7: Drag & Drop reassignment
    reassigned_booking = test_drag_drop_reassign(results, booking_with_seats, slot2)
    if not reassigned_booking:
        print("❌ Drag & drop failed")
        return False
    
    # Test 8: Modify booking details
    modified_booking = test_modify_booking_details(results, reassigned_booking)
    if not modified_booking:
        print("❌ Booking modification failed")
        return False
    
    # Test 9: Query bookings by slot
    test_query_bookings_by_slot(results, slot2['id'])
    
    # Test 10: Single seat booking edge case
    test_single_seat_booking(results, slot1, boat_experience)
    
    # Test 11: Multiple modifications
    test_multiple_booking_modifications(results, modified_booking)
    
    # Final summary
    success = results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Maretrek booking engine backend is working correctly.")
        print("✅ Seat assignments functionality working")
        print("✅ Drag & drop reassignment working")
        print("✅ All booking modifications working")
        print("✅ Edge cases handled correctly")
    else:
        print("\n❌ SOME TESTS FAILED! Check the errors above.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)