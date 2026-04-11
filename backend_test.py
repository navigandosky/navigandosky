#!/usr/bin/env python3
"""
Maretrek Booking Engine Backend API Test Suite
Tests all CRUD operations and business logic for the tourism booking system.
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://sardinia-tours-hub.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class APITester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.created_ids = {
            'experiences': [],
            'resources': [],
            'slots': [],
            'bookings': [],
            'vouchers': []
        }
        
    def log_result(self, test_name, success, message="", data=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'data': data
        })
        
    def make_request(self, method, endpoint, data=None, params=None):
        """Make HTTP request with error handling"""
        url = f"{API_BASE}/{endpoint}"
        try:
            if method == 'GET':
                response = self.session.get(url, params=params)
            elif method == 'POST':
                response = self.session.post(url, json=data)
            elif method == 'PUT':
                response = self.session.put(url, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            return None
            
    def test_seed_data(self):
        """Test seed data population"""
        print("\n=== TESTING SEED DATA ===")
        
        response = self.make_request('POST', 'seed')
        if response and response.status_code == 200:
            data = response.json()
            if 'counts' in data:
                counts = data['counts']
                self.log_result(
                    "Seed Data", 
                    True, 
                    f"Created {counts.get('experiences', 0)} experiences, {counts.get('resources', 0)} resources, {counts.get('slots', 0)} slots, {counts.get('vouchers', 0)} vouchers"
                )
                return True
            else:
                self.log_result("Seed Data", False, "Missing counts in response")
        else:
            status = response.status_code if response else "No response"
            self.log_result("Seed Data", False, f"Failed with status {status}")
        return False
        
    def test_experiences_crud(self):
        """Test Experiences CRUD operations"""
        print("\n=== TESTING EXPERIENCES CRUD ===")
        
        # Test GET all experiences
        response = self.make_request('GET', 'experiences')
        if response and response.status_code == 200:
            experiences = response.json()
            self.log_result("GET Experiences", True, f"Retrieved {len(experiences)} experiences")
            
            # Test filtering by type
            response = self.make_request('GET', 'experiences', params={'type': 'BOAT_EXCURSION'})
            if response and response.status_code == 200:
                boat_experiences = response.json()
                self.log_result("GET Experiences by Type", True, f"Retrieved {len(boat_experiences)} boat excursions")
            else:
                self.log_result("GET Experiences by Type", False, "Failed to filter by type")
                
            # Test get all including inactive
            response = self.make_request('GET', 'experiences', params={'all': 'true'})
            if response and response.status_code == 200:
                all_experiences = response.json()
                self.log_result("GET All Experiences", True, f"Retrieved {len(all_experiences)} total experiences")
            else:
                self.log_result("GET All Experiences", False, "Failed to get all experiences")
                
        else:
            self.log_result("GET Experiences", False, "Failed to retrieve experiences")
            return False
            
        # Test POST new experience
        new_experience = {
            "name": "Test Boat Tour",
            "type": "BOAT_EXCURSION",
            "description": "Test description for automated testing",
            "duration_minutes": 240,
            "max_capacity": 10,
            "price_b2c": 75,
            "price_b2b": 60,
            "languages": ["IT", "EN"],
            "meeting_point": "Test Marina",
            "weather_dependent": True,
            "is_active": True
        }
        
        response = self.make_request('POST', 'experiences', new_experience)
        if response and response.status_code == 201:
            created_exp = response.json()
            exp_id = created_exp.get('id')
            self.created_ids['experiences'].append(exp_id)
            self.log_result("POST Experience", True, f"Created experience with ID {exp_id}")
            
            # Test GET single experience
            response = self.make_request('GET', f'experiences/{exp_id}')
            if response and response.status_code == 200:
                retrieved_exp = response.json()
                self.log_result("GET Single Experience", True, f"Retrieved experience: {retrieved_exp.get('name')}")
                
                # Test PUT update experience
                update_data = {"name": "Updated Test Boat Tour", "price_b2c": 80}
                response = self.make_request('PUT', f'experiences/{exp_id}', update_data)
                if response and response.status_code == 200:
                    updated_exp = response.json()
                    self.log_result("PUT Experience", True, f"Updated experience name to: {updated_exp.get('name')}")
                else:
                    self.log_result("PUT Experience", False, "Failed to update experience")
                    
                # Test DELETE experience
                response = self.make_request('DELETE', f'experiences/{exp_id}')
                if response and response.status_code == 200:
                    self.log_result("DELETE Experience", True, "Successfully deleted experience")
                    self.created_ids['experiences'].remove(exp_id)
                else:
                    self.log_result("DELETE Experience", False, "Failed to delete experience")
            else:
                self.log_result("GET Single Experience", False, "Failed to retrieve single experience")
        else:
            status = response.status_code if response else "No response"
            self.log_result("POST Experience", False, f"Failed to create experience, status: {status}")
            
    def test_resources_crud(self):
        """Test Resources CRUD operations"""
        print("\n=== TESTING RESOURCES CRUD ===")
        
        # Test GET all resources
        response = self.make_request('GET', 'resources')
        if response and response.status_code == 200:
            resources = response.json()
            self.log_result("GET Resources", True, f"Retrieved {len(resources)} resources")
        else:
            self.log_result("GET Resources", False, "Failed to retrieve resources")
            return False
            
        # Test POST new resource (guide)
        new_guide = {
            "name": "Test Guide",
            "type": "GUIDE",
            "bio": "Test guide for automated testing",
            "languages": ["IT", "EN"],
            "certifications": ["Test Certification"],
            "phone": "+39 333 1111111",
            "email": "testguide@test.com"
        }
        
        response = self.make_request('POST', 'resources', new_guide)
        if response and response.status_code == 201:
            created_guide = response.json()
            guide_id = created_guide.get('id')
            self.created_ids['resources'].append(guide_id)
            self.log_result("POST Guide Resource", True, f"Created guide with ID {guide_id}")
            
            # Test POST new resource (boat)
            new_boat = {
                "name": "Test Boat",
                "type": "BOAT",
                "boat_type": "GOMMONE",
                "capacity": 8,
                "bio": "Test boat for automated testing"
            }
            
            response = self.make_request('POST', 'resources', new_boat)
            if response and response.status_code == 201:
                created_boat = response.json()
                boat_id = created_boat.get('id')
                self.created_ids['resources'].append(boat_id)
                self.log_result("POST Boat Resource", True, f"Created boat with ID {boat_id}")
                
                # Test DELETE resources
                for resource_id in [guide_id, boat_id]:
                    response = self.make_request('DELETE', f'resources/{resource_id}')
                    if response and response.status_code == 200:
                        self.log_result(f"DELETE Resource {resource_id[:8]}", True, "Successfully deleted resource")
                        self.created_ids['resources'].remove(resource_id)
                    else:
                        self.log_result(f"DELETE Resource {resource_id[:8]}", False, "Failed to delete resource")
            else:
                self.log_result("POST Boat Resource", False, "Failed to create boat resource")
        else:
            self.log_result("POST Guide Resource", False, "Failed to create guide resource")
            
    def test_slots_crud(self):
        """Test Slots CRUD operations"""
        print("\n=== TESTING SLOTS CRUD ===")
        
        # First get an experience to create slots for
        response = self.make_request('GET', 'experiences')
        if not response or response.status_code != 200:
            self.log_result("Slots Test Setup", False, "Cannot get experiences for slot testing")
            return False
            
        experiences = response.json()
        if not experiences:
            self.log_result("Slots Test Setup", False, "No experiences available for slot testing")
            return False
            
        experience_id = experiences[0]['id']
        
        # Test GET all slots
        response = self.make_request('GET', 'slots')
        if response and response.status_code == 200:
            slots = response.json()
            self.log_result("GET Slots", True, f"Retrieved {len(slots)} slots")
            
            # Test filtering by experience_id
            response = self.make_request('GET', 'slots', params={'experience_id': experience_id})
            if response and response.status_code == 200:
                exp_slots = response.json()
                self.log_result("GET Slots by Experience", True, f"Retrieved {len(exp_slots)} slots for experience")
            else:
                self.log_result("GET Slots by Experience", False, "Failed to filter slots by experience")
        else:
            self.log_result("GET Slots", False, "Failed to retrieve slots")
            
        # Test POST new slot
        tomorrow = datetime.now() + timedelta(days=1)
        start_time = tomorrow.replace(hour=10, minute=0, second=0, microsecond=0)
        end_time = start_time + timedelta(hours=4)
        
        new_slot = {
            "experience_id": experience_id,
            "start_datetime": start_time.isoformat(),
            "end_datetime": end_time.isoformat(),
            "max_seats": 8,
            "notes": "Test slot for automated testing"
        }
        
        response = self.make_request('POST', 'slots', new_slot)
        if response and response.status_code == 201:
            created_slot = response.json()
            slot_id = created_slot.get('id')
            self.created_ids['slots'].append(slot_id)
            self.log_result("POST Slot", True, f"Created slot with ID {slot_id}")
            
            # Test DELETE slot
            response = self.make_request('DELETE', f'slots/{slot_id}')
            if response and response.status_code == 200:
                self.log_result("DELETE Slot", True, "Successfully deleted slot")
                self.created_ids['slots'].remove(slot_id)
            else:
                self.log_result("DELETE Slot", False, "Failed to delete slot")
        else:
            status = response.status_code if response else "No response"
            self.log_result("POST Slot", False, f"Failed to create slot, status: {status}")
            
    def test_bookings_and_seat_management(self):
        """Test Bookings CRUD and seat management"""
        print("\n=== TESTING BOOKINGS & SEAT MANAGEMENT ===")
        
        # Get available slots for booking
        response = self.make_request('GET', 'slots')
        if not response or response.status_code != 200:
            self.log_result("Booking Test Setup", False, "Cannot get slots for booking testing")
            return False
            
        slots = response.json()
        available_slots = [s for s in slots if s.get('available_seats', 0) > 0]
        
        if not available_slots:
            self.log_result("Booking Test Setup", False, "No available slots for booking testing")
            return False
            
        test_slot = available_slots[0]
        slot_id = test_slot['id']
        experience_id = test_slot['experience_id']
        initial_booked_seats = test_slot.get('booked_seats', 0)
        
        self.log_result("Booking Test Setup", True, f"Using slot {slot_id[:8]} with {initial_booked_seats} booked seats")
        
        # Test POST booking
        booking_data = {
            "slot_id": slot_id,
            "experience_id": experience_id,
            "customer_name": "Marco Rossi",
            "customer_email": "marco.rossi@email.com",
            "customer_phone": "+39 333 1234567",
            "seats": 2,
            "special_requests": "Test booking for automated testing"
        }
        
        response = self.make_request('POST', 'bookings', booking_data)
        if response and response.status_code == 201:
            created_booking = response.json()
            booking_id = created_booking.get('id')
            booking_ref = created_booking.get('booking_ref')
            self.created_ids['bookings'].append(booking_id)
            self.log_result("POST Booking", True, f"Created booking {booking_ref} with ID {booking_id}")
            
            # Verify seat count increased
            response = self.make_request('GET', f'slots/{slot_id}')
            if response and response.status_code == 200:
                updated_slot = response.json()
                new_booked_seats = updated_slot.get('booked_seats', 0)
                if new_booked_seats == initial_booked_seats + 2:
                    self.log_result("Seat Count Increase", True, f"Booked seats increased from {initial_booked_seats} to {new_booked_seats}")
                else:
                    self.log_result("Seat Count Increase", False, f"Expected {initial_booked_seats + 2}, got {new_booked_seats}")
            else:
                self.log_result("Seat Count Verification", False, "Failed to verify seat count after booking")
                
            # Test GET bookings
            response = self.make_request('GET', 'bookings')
            if response and response.status_code == 200:
                bookings = response.json()
                self.log_result("GET Bookings", True, f"Retrieved {len(bookings)} bookings")
            else:
                self.log_result("GET Bookings", False, "Failed to retrieve bookings")
                
            # Test booking check-in
            response = self.make_request('PUT', f'bookings/{booking_id}', {"action": "checkin"})
            if response and response.status_code == 200:
                checked_in_booking = response.json()
                if checked_in_booking.get('checked_in_at'):
                    self.log_result("Booking Check-in", True, "Successfully checked in booking")
                else:
                    self.log_result("Booking Check-in", False, "Check-in timestamp not set")
            else:
                self.log_result("Booking Check-in", False, "Failed to check in booking")
                
            # Test booking cancellation
            response = self.make_request('PUT', f'bookings/{booking_id}', {"action": "cancel"})
            if response and response.status_code == 200:
                cancelled_booking = response.json()
                if cancelled_booking.get('status') == 'CANCELLED':
                    self.log_result("Booking Cancellation", True, "Successfully cancelled booking")
                    
                    # Verify seat count decreased
                    response = self.make_request('GET', f'slots/{slot_id}')
                    if response and response.status_code == 200:
                        final_slot = response.json()
                        final_booked_seats = final_slot.get('booked_seats', 0)
                        if final_booked_seats == initial_booked_seats:
                            self.log_result("Seat Count Decrease", True, f"Booked seats returned to {final_booked_seats}")
                        else:
                            self.log_result("Seat Count Decrease", False, f"Expected {initial_booked_seats}, got {final_booked_seats}")
                    else:
                        self.log_result("Seat Count Verification", False, "Failed to verify seat count after cancellation")
                else:
                    self.log_result("Booking Cancellation", False, "Booking status not updated to CANCELLED")
            else:
                self.log_result("Booking Cancellation", False, "Failed to cancel booking")
                
            self.created_ids['bookings'].remove(booking_id)
        else:
            status = response.status_code if response else "No response"
            self.log_result("POST Booking", False, f"Failed to create booking, status: {status}")
            
    def test_voucher_validation(self):
        """Test voucher validation and application"""
        print("\n=== TESTING VOUCHER VALIDATION ===")
        
        # Test valid voucher
        response = self.make_request('POST', 'vouchers/validate', {"code": "BENVENUTO10"})
        if response and response.status_code == 200:
            result = response.json()
            if result.get('valid') == True:
                voucher = result.get('voucher', {})
                self.log_result("Valid Voucher", True, f"BENVENUTO10 is valid: {voucher.get('type')} {voucher.get('value')}%")
            else:
                self.log_result("Valid Voucher", False, f"BENVENUTO10 should be valid: {result.get('error')}")
        else:
            self.log_result("Valid Voucher", False, "Failed to validate BENVENUTO10")
            
        # Test invalid voucher
        response = self.make_request('POST', 'vouchers/validate', {"code": "INVALID"})
        if response and response.status_code == 200:
            result = response.json()
            if result.get('valid') == False:
                self.log_result("Invalid Voucher", True, "INVALID code correctly rejected")
            else:
                self.log_result("Invalid Voucher", False, "INVALID code should be rejected")
        else:
            self.log_result("Invalid Voucher", False, "Failed to test invalid voucher")
            
        # Test other voucher codes
        for code in ["ESTATE2025", "SARDEGNA20"]:
            response = self.make_request('POST', 'vouchers/validate', {"code": code})
            if response and response.status_code == 200:
                result = response.json()
                if result.get('valid'):
                    voucher = result.get('voucher', {})
                    self.log_result(f"Voucher {code}", True, f"{code} is valid: {voucher.get('type')} {voucher.get('value')}")
                else:
                    self.log_result(f"Voucher {code}", False, f"{code} validation failed: {result.get('error')}")
            else:
                self.log_result(f"Voucher {code}", False, f"Failed to validate {code}")
                
        # Test POST new voucher
        new_voucher = {
            "code": "TEST2025",
            "type": "PERCENTAGE",
            "value": 15,
            "min_amount": 50,
            "max_uses": 10
        }
        
        response = self.make_request('POST', 'vouchers', new_voucher)
        if response and response.status_code == 201:
            created_voucher = response.json()
            voucher_id = created_voucher.get('id')
            self.created_ids['vouchers'].append(voucher_id)
            self.log_result("POST Voucher", True, f"Created voucher {created_voucher.get('code')}")
            
            # Clean up
            response = self.make_request('DELETE', f'vouchers/{voucher_id}')
            if response and response.status_code == 200:
                self.log_result("DELETE Voucher", True, "Successfully deleted test voucher")
                self.created_ids['vouchers'].remove(voucher_id)
        else:
            self.log_result("POST Voucher", False, "Failed to create test voucher")
            
    def test_stats_api(self):
        """Test stats/dashboard API"""
        print("\n=== TESTING STATS API ===")
        
        response = self.make_request('GET', 'stats')
        if response and response.status_code == 200:
            stats = response.json()
            required_fields = ['total_bookings', 'total_revenue', 'total_experiences', 'total_resources', 'recent_bookings']
            
            missing_fields = [field for field in required_fields if field not in stats]
            if not missing_fields:
                self.log_result("Stats API", True, f"Retrieved stats: {stats.get('total_bookings')} bookings, €{stats.get('total_revenue')} revenue")
            else:
                self.log_result("Stats API", False, f"Missing fields: {missing_fields}")
        else:
            self.log_result("Stats API", False, "Failed to retrieve stats")
            
    def test_booking_with_voucher(self):
        """Test booking creation with voucher application"""
        print("\n=== TESTING BOOKING WITH VOUCHER ===")
        
        # Get available slots
        response = self.make_request('GET', 'slots')
        if not response or response.status_code != 200:
            self.log_result("Voucher Booking Setup", False, "Cannot get slots")
            return False
            
        slots = response.json()
        available_slots = [s for s in slots if s.get('available_seats', 0) > 0]
        
        if not available_slots:
            self.log_result("Voucher Booking Setup", False, "No available slots")
            return False
            
        test_slot = available_slots[0]
        slot_id = test_slot['id']
        experience_id = test_slot['experience_id']
        
        # Create booking with voucher
        booking_data = {
            "slot_id": slot_id,
            "experience_id": experience_id,
            "customer_name": "Giulia Bianchi",
            "customer_email": "giulia.bianchi@email.com",
            "customer_phone": "+39 333 9876543",
            "seats": 1,
            "voucher_code": "BENVENUTO10"
        }
        
        response = self.make_request('POST', 'bookings', booking_data)
        if response and response.status_code == 201:
            booking = response.json()
            booking_id = booking.get('id')
            discount = booking.get('discount', 0)
            voucher_code = booking.get('voucher_code')
            
            if discount > 0 and voucher_code == "BENVENUTO10":
                self.log_result("Booking with Voucher", True, f"Applied BENVENUTO10 discount: €{discount}")
                
                # Clean up
                self.make_request('PUT', f'bookings/{booking_id}', {"action": "cancel"})
            else:
                self.log_result("Booking with Voucher", False, f"Voucher not applied correctly. Discount: {discount}, Code: {voucher_code}")
        else:
            self.log_result("Booking with Voucher", False, "Failed to create booking with voucher")
            
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Maretrek Booking Engine Backend API Tests")
        print(f"Base URL: {BASE_URL}")
        print(f"API Base: {API_BASE}")
        
        # Run tests in order
        self.test_seed_data()
        self.test_experiences_crud()
        self.test_resources_crud()
        self.test_slots_crud()
        self.test_bookings_and_seat_management()
        self.test_voucher_validation()
        self.test_stats_api()
        self.test_booking_with_voucher()
        
        # Summary
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['message']}")
                    
        return passed == total

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)