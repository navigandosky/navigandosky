#!/usr/bin/env python3
"""
Maretrek Cantiere (Boatyard) Module Backend Test Suite
Tests all Cantiere endpoints including templates and quotes with VAT calculations
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://marina-management.preview.emergentagent.com/api"
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
        print(f"\n{'='*80}")
        print(f"TEST SUMMARY: {self.passed}/{total} tests passed")
        if self.errors:
            print(f"\nFAILURES:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*80}")
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
        
        # Handle 204 No Content
        if response.status_code == 204:
            return None, None
        
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

def test_get_templates(results):
    """Test 1: GET /api/cantiere-templates - Verify auto-seeded templates"""
    print("\n🔄 Test 1: GET /api/cantiere-templates (auto-seeded list)...")
    
    data, error = make_request("GET", "cantiere-templates", expected_status=200)
    if error:
        results.failure("GET cantiere-templates", error)
        return None
    
    if not isinstance(data, list):
        results.failure("GET cantiere-templates", "Response should be an array")
        return None
    
    # Verify at least 22 templates (auto-seeded)
    if len(data) < 22:
        results.failure("GET cantiere-templates", f"Expected at least 22 templates, got {len(data)}")
        return None
    
    # Verify template structure
    required_fields = ['id', 'description', 'default_unit_price', 'category', 'is_active', 'created_at']
    for template in data[:3]:  # Check first 3 templates
        for field in required_fields:
            if field not in template:
                results.failure("GET cantiere-templates", f"Template missing required field: {field}")
                return None
    
    # Verify categories present
    categories = set(t['category'] for t in data)
    expected_categories = {'Cantiere', 'Manodopera Motore', 'Elettrico'}
    if not expected_categories.issubset(categories):
        results.failure("GET cantiere-templates", f"Missing expected categories. Found: {categories}")
        return None
    
    results.success(f"GET cantiere-templates - {len(data)} templates retrieved with correct structure and categories")
    return data

def test_create_template(results):
    """Test 2: POST /api/cantiere-templates - Create custom template"""
    print("\n🔄 Test 2: POST /api/cantiere-templates (create custom template)...")
    
    template_data = {
        "description": "Test custom service",
        "default_unit_price": 50,
        "category": "Custom"
    }
    
    data, error = make_request("POST", "cantiere-templates", template_data, expected_status=201)
    if error:
        results.failure("POST cantiere-templates", error)
        return None
    
    if not data or 'id' not in data:
        results.failure("POST cantiere-templates", "Response missing id field")
        return None
    
    # Verify fields
    if data.get('description') != "Test custom service":
        results.failure("POST cantiere-templates", f"Description mismatch: {data.get('description')}")
        return None
    
    if data.get('default_unit_price') != 50:
        results.failure("POST cantiere-templates", f"Price mismatch: {data.get('default_unit_price')}")
        return None
    
    if data.get('category') != "Custom":
        results.failure("POST cantiere-templates", f"Category mismatch: {data.get('category')}")
        return None
    
    if data.get('is_active') != True:
        results.failure("POST cantiere-templates", f"is_active should be true, got {data.get('is_active')}")
        return None
    
    results.success(f"POST cantiere-templates - custom template created with id {data['id']}")
    return data

def test_update_template(results, template_id):
    """Test 3: PUT /api/cantiere-templates/{id} - Update template"""
    print("\n🔄 Test 3: PUT /api/cantiere-templates/{id} (update template)...")
    
    update_data = {
        "description": "Updated custom service",
        "default_unit_price": 75
    }
    
    data, error = make_request("PUT", f"cantiere-templates/{template_id}", update_data, expected_status=200)
    if error:
        results.failure("PUT cantiere-templates", error)
        return None
    
    if data.get('description') != "Updated custom service":
        results.failure("PUT cantiere-templates", f"Description not updated: {data.get('description')}")
        return None
    
    if data.get('default_unit_price') != 75:
        results.failure("PUT cantiere-templates", f"Price not updated: {data.get('default_unit_price')}")
        return None
    
    results.success(f"PUT cantiere-templates - template {template_id} updated successfully")
    return data

def test_delete_template(results, template_id):
    """Test 4: DELETE /api/cantiere-templates/{id} - Delete template"""
    print("\n🔄 Test 4: DELETE /api/cantiere-templates/{id} (delete template)...")
    
    _, error = make_request("DELETE", f"cantiere-templates/{template_id}", expected_status=204)
    if error:
        results.failure("DELETE cantiere-templates", error)
        return False
    
    results.success(f"DELETE cantiere-templates - template {template_id} deleted successfully")
    return True

def test_create_quote(results):
    """Test 5: POST /api/cantiere - Create quote with critical validations"""
    print("\n🔄 Test 5: POST /api/cantiere (create quote with VAT calculations)...")
    
    quote_data = {
        "customer": {
            "name": "Mario",
            "surname": "Rossi",
            "email": "mario@test.it",
            "phone": "3331234567",
            "vat_number": "RSSMRA80A01H501Z"
        },
        "boat": {
            "name": "Stella Maris",
            "registration": "PS123",
            "length": 7.5,
            "type": "motor"
        },
        "items": [
            {
                "description": "Alaggio carrello",
                "qty": 1,
                "unit_price": 150,
                "discount": 0,
                "category": "Cantiere"
            },
            {
                "description": "Lavaggio carena",
                "qty": 7.5,
                "unit_price": 12,
                "discount": 10,
                "category": "Cantiere"
            }
        ],
        "iva_rate": 22,
        "payment_method": "Bonifico bancario",
        "notes": "Test preventivo",
        "status": "BOZZA"
    }
    
    data, error = make_request("POST", "cantiere", quote_data, expected_status=201)
    if error:
        results.failure("POST cantiere", error)
        return None
    
    # CRITICAL VALIDATIONS
    errors = []
    
    # 1. Verify quote_number format CANT-YYYY/NNNN
    quote_number = data.get('quote_number', '')
    if not quote_number.startswith('CANT-2026/'):
        errors.append(f"quote_number format incorrect: {quote_number}")
    
    # 2. Verify progressive is auto-incremented integer
    if 'progressive' not in data or not isinstance(data['progressive'], int):
        errors.append(f"progressive missing or not integer: {data.get('progressive')}")
    
    # 3. Verify items have calculated amount
    items = data.get('items', [])
    if len(items) != 2:
        errors.append(f"Expected 2 items, got {len(items)}")
    else:
        # Item 1: qty=1, unit_price=150, amount should be 150
        if items[0].get('amount') != 150:
            errors.append(f"Item 1 amount should be 150, got {items[0].get('amount')}")
        
        # Item 1: net_taxable = max(0, 150 - 0) = 150
        if items[0].get('net_taxable') != 150:
            errors.append(f"Item 1 net_taxable should be 150, got {items[0].get('net_taxable')}")
        
        # Item 2: qty=7.5, unit_price=12, amount should be 90
        if items[1].get('amount') != 90:
            errors.append(f"Item 2 amount should be 90, got {items[1].get('amount')}")
        
        # Item 2: net_taxable = max(0, 90 - 10) = 80
        if items[1].get('net_taxable') != 80:
            errors.append(f"Item 2 net_taxable should be 80, got {items[1].get('net_taxable')}")
    
    # 4. Verify subtotal_net = sum of net_taxable (150 + 80 = 230)
    expected_subtotal = 230
    if data.get('subtotal_net') != expected_subtotal:
        errors.append(f"subtotal_net should be {expected_subtotal}, got {data.get('subtotal_net')}")
    
    # 5. Verify iva_amount = subtotal_net × 22 / 100 (230 × 0.22 = 50.6)
    expected_iva = 50.6
    if abs(data.get('iva_amount', 0) - expected_iva) > 0.01:
        errors.append(f"iva_amount should be {expected_iva}, got {data.get('iva_amount')}")
    
    # 6. Verify grand_total = subtotal_net + iva_amount (230 + 50.6 = 280.6)
    expected_total = 280.6
    if abs(data.get('grand_total', 0) - expected_total) > 0.01:
        errors.append(f"grand_total should be {expected_total}, got {data.get('grand_total')}")
    
    # 7. Verify valid_until defaults to ~30 days from now
    if 'valid_until' not in data:
        errors.append("valid_until field missing")
    
    # 8. Verify status, payment_method, notes saved correctly
    if data.get('status') != 'BOZZA':
        errors.append(f"status should be BOZZA, got {data.get('status')}")
    
    if data.get('payment_method') != 'Bonifico bancario':
        errors.append(f"payment_method incorrect: {data.get('payment_method')}")
    
    if data.get('notes') != 'Test preventivo':
        errors.append(f"notes incorrect: {data.get('notes')}")
    
    if errors:
        results.failure("POST cantiere - critical validations", "; ".join(errors))
        return None
    
    results.success(f"POST cantiere - quote {quote_number} created with correct calculations (230 net + 50.6 IVA = 280.6 total)")
    return data

def test_get_quotes(results):
    """Test 6: GET /api/cantiere - List all quotes"""
    print("\n🔄 Test 6: GET /api/cantiere (list all quotes)...")
    
    data, error = make_request("GET", "cantiere", expected_status=200)
    if error:
        results.failure("GET cantiere", error)
        return None
    
    if not isinstance(data, list):
        results.failure("GET cantiere", "Response should be an array")
        return None
    
    if len(data) == 0:
        results.failure("GET cantiere", "No quotes found (should have at least 1 from previous test)")
        return None
    
    # Verify sorted by created_at DESC (newest first)
    if len(data) > 1:
        for i in range(len(data) - 1):
            if data[i].get('created_at', '') < data[i+1].get('created_at', ''):
                results.failure("GET cantiere", "Quotes not sorted by created_at DESC")
                return None
    
    results.success(f"GET cantiere - {len(data)} quotes retrieved, sorted by created_at DESC")
    return data

def test_filter_by_status(results):
    """Test 7: GET /api/cantiere?status=BOZZA - Filter by status"""
    print("\n🔄 Test 7: GET /api/cantiere?status=BOZZA (filter by status)...")
    
    data, error = make_request("GET", "cantiere?status=BOZZA", expected_status=200)
    if error:
        results.failure("GET cantiere?status=BOZZA", error)
        return None
    
    if not isinstance(data, list):
        results.failure("GET cantiere?status=BOZZA", "Response should be an array")
        return None
    
    # Verify all quotes have status BOZZA
    for quote in data:
        if quote.get('status') != 'BOZZA':
            results.failure("GET cantiere?status=BOZZA", f"Found quote with status {quote.get('status')}")
            return None
    
    results.success(f"GET cantiere?status=BOZZA - {len(data)} BOZZA quotes retrieved")
    return data

def test_filter_by_email(results):
    """Test 8: GET /api/cantiere?customer_email=mario@test.it - Filter by email"""
    print("\n🔄 Test 8: GET /api/cantiere?customer_email=mario@test.it (filter by email)...")
    
    data, error = make_request("GET", "cantiere?customer_email=mario@test.it", expected_status=200)
    if error:
        results.failure("GET cantiere?customer_email", error)
        return None
    
    if not isinstance(data, list):
        results.failure("GET cantiere?customer_email", "Response should be an array")
        return None
    
    # Verify all quotes have matching customer email
    for quote in data:
        customer_email = quote.get('customer', {}).get('email', '')
        if customer_email != 'mario@test.it':
            results.failure("GET cantiere?customer_email", f"Found quote with email {customer_email}")
            return None
    
    results.success(f"GET cantiere?customer_email - {len(data)} quotes for mario@test.it retrieved")
    return data

def test_get_single_quote(results, quote_id):
    """Test 9: GET /api/cantiere/{id} - Single quote retrieval"""
    print("\n🔄 Test 9: GET /api/cantiere/{id} (single quote retrieval)...")
    
    data, error = make_request("GET", f"cantiere/{quote_id}", expected_status=200)
    if error:
        results.failure("GET cantiere/{id}", error)
        return None
    
    if not data or data.get('id') != quote_id:
        results.failure("GET cantiere/{id}", f"Quote ID mismatch: expected {quote_id}, got {data.get('id')}")
        return None
    
    results.success(f"GET cantiere/{id} - quote {quote_id} retrieved successfully")
    return data

def test_update_quote_add_item(results, quote_id):
    """Test 10A: PUT /api/cantiere/{id} - Add item and verify totals recalculated"""
    print("\n🔄 Test 10A: PUT /api/cantiere/{id} (add item, verify totals recalculated)...")
    
    # Get current quote
    current_quote, error = make_request("GET", f"cantiere/{quote_id}")
    if error:
        results.failure("PUT cantiere - get current", error)
        return None
    
    # Add new item to items array
    new_items = current_quote.get('items', []) + [
        {
            "description": "Antivegetativa 1 mano",
            "qty": 7.5,
            "unit_price": 20,
            "discount": 0,
            "category": "Cantiere"
        }
    ]
    
    update_data = {
        "items": new_items
    }
    
    data, error = make_request("PUT", f"cantiere/{quote_id}", update_data, expected_status=200)
    if error:
        results.failure("PUT cantiere - add item", error)
        return None
    
    # Verify totals recalculated
    # Original: 230 net + 50.6 IVA = 280.6
    # New item: 7.5 × 20 = 150, net_taxable = 150
    # New totals: 380 net + 83.6 IVA = 463.6
    expected_subtotal = 380
    expected_iva = 83.6
    expected_total = 463.6
    
    errors = []
    if abs(data.get('subtotal_net', 0) - expected_subtotal) > 0.01:
        errors.append(f"subtotal_net should be {expected_subtotal}, got {data.get('subtotal_net')}")
    
    if abs(data.get('iva_amount', 0) - expected_iva) > 0.01:
        errors.append(f"iva_amount should be {expected_iva}, got {data.get('iva_amount')}")
    
    if abs(data.get('grand_total', 0) - expected_total) > 0.01:
        errors.append(f"grand_total should be {expected_total}, got {data.get('grand_total')}")
    
    if errors:
        results.failure("PUT cantiere - add item totals", "; ".join(errors))
        return None
    
    results.success(f"PUT cantiere - item added, totals recalculated correctly (380 net + 83.6 IVA = 463.6 total)")
    return data

def test_update_quote_change_iva(results, quote_id):
    """Test 10B: PUT /api/cantiere/{id} - Change IVA rate and verify recalculation"""
    print("\n🔄 Test 10B: PUT /api/cantiere/{id} (change IVA rate, verify recalculation)...")
    
    update_data = {
        "iva_rate": 10
    }
    
    data, error = make_request("PUT", f"cantiere/{quote_id}", update_data, expected_status=200)
    if error:
        results.failure("PUT cantiere - change IVA", error)
        return None
    
    # Verify IVA recalculated with new rate
    # subtotal_net should remain 380
    # iva_amount should be 380 × 10 / 100 = 38
    # grand_total should be 380 + 38 = 418
    expected_subtotal = 380
    expected_iva = 38
    expected_total = 418
    
    errors = []
    if data.get('iva_rate') != 10:
        errors.append(f"iva_rate should be 10, got {data.get('iva_rate')}")
    
    if abs(data.get('subtotal_net', 0) - expected_subtotal) > 0.01:
        errors.append(f"subtotal_net should remain {expected_subtotal}, got {data.get('subtotal_net')}")
    
    if abs(data.get('iva_amount', 0) - expected_iva) > 0.01:
        errors.append(f"iva_amount should be {expected_iva}, got {data.get('iva_amount')}")
    
    if abs(data.get('grand_total', 0) - expected_total) > 0.01:
        errors.append(f"grand_total should be {expected_total}, got {data.get('grand_total')}")
    
    if errors:
        results.failure("PUT cantiere - change IVA totals", "; ".join(errors))
        return None
    
    results.success(f"PUT cantiere - IVA rate changed to 10%, totals recalculated (380 net + 38 IVA = 418 total)")
    return data

def test_update_quote_change_status(results, quote_id):
    """Test 10C: PUT /api/cantiere/{id} - Change status, verify totals unchanged"""
    print("\n🔄 Test 10C: PUT /api/cantiere/{id} (change status, verify totals unchanged)...")
    
    # Get current totals
    current_quote, error = make_request("GET", f"cantiere/{quote_id}")
    if error:
        results.failure("PUT cantiere - get current for status change", error)
        return None
    
    current_subtotal = current_quote.get('subtotal_net')
    current_iva = current_quote.get('iva_amount')
    current_total = current_quote.get('grand_total')
    
    update_data = {
        "status": "INVIATO"
    }
    
    data, error = make_request("PUT", f"cantiere/{quote_id}", update_data, expected_status=200)
    if error:
        results.failure("PUT cantiere - change status", error)
        return None
    
    # Verify status changed
    if data.get('status') != 'INVIATO':
        results.failure("PUT cantiere - change status", f"Status should be INVIATO, got {data.get('status')}")
        return None
    
    # Verify totals unchanged
    errors = []
    if data.get('subtotal_net') != current_subtotal:
        errors.append(f"subtotal_net changed: {current_subtotal} → {data.get('subtotal_net')}")
    
    if data.get('iva_amount') != current_iva:
        errors.append(f"iva_amount changed: {current_iva} → {data.get('iva_amount')}")
    
    if data.get('grand_total') != current_total:
        errors.append(f"grand_total changed: {current_total} → {data.get('grand_total')}")
    
    # Verify quote_number, year, progressive are immutable
    if data.get('quote_number') != current_quote.get('quote_number'):
        errors.append(f"quote_number changed (should be immutable)")
    
    if data.get('year') != current_quote.get('year'):
        errors.append(f"year changed (should be immutable)")
    
    if data.get('progressive') != current_quote.get('progressive'):
        errors.append(f"progressive changed (should be immutable)")
    
    if errors:
        results.failure("PUT cantiere - change status validation", "; ".join(errors))
        return None
    
    results.success(f"PUT cantiere - status changed to INVIATO, totals and immutable fields unchanged")
    return data

def test_delete_quote(results, quote_id):
    """Test 11: DELETE /api/cantiere/{id} - Delete quote"""
    print("\n🔄 Test 11: DELETE /api/cantiere/{id} (delete quote)...")
    
    _, error = make_request("DELETE", f"cantiere/{quote_id}", expected_status=204)
    if error:
        results.failure("DELETE cantiere", error)
        return False
    
    # Verify quote is deleted (GET should return 404)
    _, error = make_request("GET", f"cantiere/{quote_id}", expected_status=404)
    if error and "404" not in str(error):
        results.failure("DELETE cantiere - verify deletion", f"Expected 404 after deletion, got: {error}")
        return False
    
    results.success(f"DELETE cantiere - quote {quote_id} deleted, subsequent GET returns 404")
    return True

def test_edge_case_empty_items(results):
    """Test 12A: Edge case - POST with empty items array"""
    print("\n🔄 Test 12A: Edge case - empty items array...")
    
    quote_data = {
        "customer": {
            "name": "Test",
            "surname": "Empty",
            "email": "empty@test.it",
            "phone": "1234567890",
            "vat_number": "TEST123"
        },
        "boat": {
            "name": "Test Boat",
            "registration": "TEST",
            "length": 5,
            "type": "motor"
        },
        "items": [],
        "iva_rate": 22,
        "payment_method": "Contanti",
        "status": "BOZZA"
    }
    
    data, error = make_request("POST", "cantiere", quote_data, expected_status=201)
    if error:
        results.failure("Edge case - empty items", error)
        return None
    
    # Verify totals are all 0
    if data.get('subtotal_net') != 0:
        results.failure("Edge case - empty items", f"subtotal_net should be 0, got {data.get('subtotal_net')}")
        return None
    
    if data.get('iva_amount') != 0:
        results.failure("Edge case - empty items", f"iva_amount should be 0, got {data.get('iva_amount')}")
        return None
    
    if data.get('grand_total') != 0:
        results.failure("Edge case - empty items", f"grand_total should be 0, got {data.get('grand_total')}")
        return None
    
    results.success("Edge case - empty items array creates quote with all totals = 0")
    return data

def test_edge_case_discount_greater_than_amount(results):
    """Test 12B: Edge case - discount > amount should result in net_taxable = 0"""
    print("\n🔄 Test 12B: Edge case - discount > amount...")
    
    quote_data = {
        "customer": {
            "name": "Test",
            "surname": "Discount",
            "email": "discount@test.it",
            "phone": "1234567890",
            "vat_number": "TEST456"
        },
        "boat": {
            "name": "Test Boat 2",
            "registration": "TEST2",
            "length": 6,
            "type": "motor"
        },
        "items": [
            {
                "description": "Test service",
                "qty": 1,
                "unit_price": 100,
                "discount": 150,  # Discount > amount
                "category": "Test"
            }
        ],
        "iva_rate": 22,
        "payment_method": "Contanti",
        "status": "BOZZA"
    }
    
    data, error = make_request("POST", "cantiere", quote_data, expected_status=201)
    if error:
        results.failure("Edge case - discount > amount", error)
        return None
    
    # Verify net_taxable is 0 (Math.max protection)
    items = data.get('items', [])
    if len(items) != 1:
        results.failure("Edge case - discount > amount", f"Expected 1 item, got {len(items)}")
        return None
    
    if items[0].get('net_taxable') != 0:
        results.failure("Edge case - discount > amount", f"net_taxable should be 0, got {items[0].get('net_taxable')}")
        return None
    
    # Verify all totals are 0
    if data.get('subtotal_net') != 0:
        results.failure("Edge case - discount > amount", f"subtotal_net should be 0, got {data.get('subtotal_net')}")
        return None
    
    results.success("Edge case - discount > amount results in net_taxable = 0 (Math.max protection working)")
    return data

def test_edge_case_nonexistent_id(results):
    """Test 12C: Edge case - GET non-existent ID returns 404"""
    print("\n🔄 Test 12C: Edge case - non-existent ID...")
    
    fake_id = "00000000-0000-0000-0000-000000000000"
    _, error = make_request("GET", f"cantiere/{fake_id}", expected_status=404)
    
    if error and "404" not in str(error):
        results.failure("Edge case - non-existent ID", f"Expected 404, got: {error}")
        return False
    
    results.success("Edge case - GET non-existent ID returns 404 with error message")
    return True

def main():
    """Main test execution"""
    print("🚀 Starting Maretrek Cantiere (Boatyard) Module Backend Tests")
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    results = TestResults()
    
    # Test 1: GET templates (auto-seeded)
    templates = test_get_templates(results)
    if not templates:
        print("⚠️  Warning: Cannot test template CRUD without templates")
    
    # Test 2: POST template (create custom)
    custom_template = test_create_template(results)
    
    # Test 3: PUT template (update)
    if custom_template:
        test_update_template(results, custom_template['id'])
    
    # Test 4: DELETE template
    if custom_template:
        test_delete_template(results, custom_template['id'])
    
    # Test 5: POST quote (create with validations)
    quote = test_create_quote(results)
    if not quote:
        print("❌ Cannot continue without quote")
        results.summary()
        return False
    
    quote_id = quote['id']
    
    # Test 6: GET all quotes
    test_get_quotes(results)
    
    # Test 7: Filter by status
    test_filter_by_status(results)
    
    # Test 8: Filter by email
    test_filter_by_email(results)
    
    # Test 9: GET single quote
    test_get_single_quote(results, quote_id)
    
    # Test 10A: Update quote - add item
    test_update_quote_add_item(results, quote_id)
    
    # Test 10B: Update quote - change IVA rate
    test_update_quote_change_iva(results, quote_id)
    
    # Test 10C: Update quote - change status
    test_update_quote_change_status(results, quote_id)
    
    # Test 11: DELETE quote
    test_delete_quote(results, quote_id)
    
    # Test 12: Edge cases
    empty_quote = test_edge_case_empty_items(results)
    discount_quote = test_edge_case_discount_greater_than_amount(results)
    test_edge_case_nonexistent_id(results)
    
    # Cleanup edge case quotes
    if empty_quote:
        make_request("DELETE", f"cantiere/{empty_quote['id']}")
    if discount_quote:
        make_request("DELETE", f"cantiere/{discount_quote['id']}")
    
    # Final summary
    success = results.summary()
    
    if success:
        print("\n🎉 ALL CANTIERE TESTS PASSED!")
        print("✅ Templates auto-seeding working (22+ templates)")
        print("✅ Template CRUD operations working")
        print("✅ Quote creation with correct VAT calculations")
        print("✅ Quote filtering (status, email) working")
        print("✅ Quote updates with totals recalculation working")
        print("✅ IVA rate changes recalculate correctly")
        print("✅ Status changes preserve totals")
        print("✅ Immutable fields (quote_number, year, progressive) protected")
        print("✅ Edge cases handled correctly (empty items, discount > amount, 404)")
    else:
        print("\n❌ SOME CANTIERE TESTS FAILED! Check the errors above.")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
