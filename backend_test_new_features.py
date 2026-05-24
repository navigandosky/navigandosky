#!/usr/bin/env python3
"""
Backend API Testing Script for Maretrek New Features
Tests:
A) GPS Analytics Range endpoint - /api/gps/analytics-range/{imei}?from=YYYY-MM-DD&to=YYYY-MM-DD
B) PUT /api/marinas/{id} with SumUp auto-refresh merchant_code
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://marina-management.preview.emergentagent.com/api"

# Test data
TEST_IMEI = "863738076364539"  # Real Balin GPS data

def print_test(name):
    """Print test header"""
    print(f"\n{'='*80}")
    print(f"TEST: {name}")
    print('='*80)

def print_result(success, message):
    """Print test result"""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    return success

# ==================== GPS ANALYTICS RANGE TESTS ====================

def test_gps_range_1_valid_3_days():
    """
    TEST 1: GET /api/gps/analytics-range/863738076364539?from=2026-05-14&to=2026-05-16 (3 days)
    Expected: 200 with keys: imei, from, to, days, points_count, total_distance, max_speed, 
              avg_speed, total_time, engine_hours, stops, route, alert_threshold, 
              speed_alerts, speed_alerts_count, day_markers
    Verify:
    - days === 3
    - from === '2026-05-14', to === '2026-05-16'
    - day_markers is array of 3 objects with {date, start_index, end_index, points}
    - points_count === sum of day_markers[].points
    - route has length points_count and each point has .date field (YYYY-MM-DD)
    - route[0].date <= route[route.length-1].date (chronological order)
    - If speed_alerts.length > 0, each alert has date field
    - total_distance > 0 and engine_hours > 0 (if data exists)
    """
    print_test("GPS Range Test 1: Valid 3-day range (2026-05-14 to 2026-05-16)")
    
    try:
        url = f"{BASE_URL}/gps/analytics-range/{TEST_IMEI}?from=2026-05-14&to=2026-05-16"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        
        # Check required keys
        required_keys = [
            'imei', 'from', 'to', 'days', 'points_count', 'total_distance', 
            'max_speed', 'avg_speed', 'total_time', 'engine_hours', 'stops', 
            'route', 'alert_threshold', 'speed_alerts', 'speed_alerts_count', 'day_markers'
        ]
        
        missing_keys = [key for key in required_keys if key not in data]
        if missing_keys:
            return print_result(False, f"Missing keys: {missing_keys}")
        
        print(f"✓ All required keys present")
        
        # Verify days === 3
        if data['days'] != 3:
            return print_result(False, f"Expected days=3, got {data['days']}")
        print(f"✓ days === 3")
        
        # Verify from and to
        if data['from'] != '2026-05-14':
            return print_result(False, f"Expected from='2026-05-14', got {data['from']}")
        if data['to'] != '2026-05-16':
            return print_result(False, f"Expected to='2026-05-16', got {data['to']}")
        print(f"✓ from === '2026-05-14', to === '2026-05-16'")
        
        # Verify day_markers is array of 3 objects
        if not isinstance(data['day_markers'], list):
            return print_result(False, "day_markers should be an array")
        if len(data['day_markers']) != 3:
            return print_result(False, f"Expected 3 day_markers, got {len(data['day_markers'])}")
        
        # Verify day_markers structure
        for i, marker in enumerate(data['day_markers']):
            required_marker_keys = ['date', 'start_index', 'end_index', 'points']
            missing = [key for key in required_marker_keys if key not in marker]
            if missing:
                return print_result(False, f"day_markers[{i}] missing keys: {missing}")
        
        print(f"✓ day_markers is array of 3 objects with correct structure")
        
        # Verify points_count === sum of day_markers[].points
        total_points_from_markers = sum(m['points'] for m in data['day_markers'])
        if data['points_count'] != total_points_from_markers:
            return print_result(False, f"points_count {data['points_count']} != sum of day_markers.points {total_points_from_markers}")
        print(f"✓ points_count ({data['points_count']}) === sum of day_markers[].points")
        
        # Verify route has length points_count
        if len(data['route']) != data['points_count']:
            return print_result(False, f"route length {len(data['route'])} != points_count {data['points_count']}")
        print(f"✓ route has length {data['points_count']}")
        
        # Verify each route point has .date field
        if data['points_count'] > 0:
            if 'date' not in data['route'][0]:
                return print_result(False, "route[0] missing 'date' field")
            if 'date' not in data['route'][-1]:
                return print_result(False, "route[-1] missing 'date' field")
            
            # Verify chronological order
            first_date = data['route'][0]['date']
            last_date = data['route'][-1]['date']
            if first_date > last_date:
                return print_result(False, f"route not in chronological order: {first_date} > {last_date}")
            print(f"✓ route points have .date field and are in chronological order ({first_date} to {last_date})")
        
        # Verify speed_alerts have date field if present
        if data['speed_alerts_count'] > 0:
            if 'date' not in data['speed_alerts'][0]:
                return print_result(False, "speed_alerts[0] missing 'date' field")
            print(f"✓ speed_alerts have date field ({data['speed_alerts_count']} alerts)")
        
        # Verify total_distance > 0 and engine_hours > 0 if data exists
        if data['points_count'] > 0:
            if data['total_distance'] <= 0:
                return print_result(False, f"Expected total_distance > 0, got {data['total_distance']}")
            if data['engine_hours'] <= 0:
                return print_result(False, f"Expected engine_hours > 0, got {data['engine_hours']}")
            print(f"✓ total_distance={data['total_distance']} km, engine_hours={data['engine_hours']} h")
        
        print(f"\nSummary:")
        print(f"  - Days: {data['days']}")
        print(f"  - Total points: {data['points_count']}")
        day_markers_str = [f"{m['date']}: {m['points']} pts" for m in data['day_markers']]
        print(f"  - Day markers: {day_markers_str}")
        print(f"  - Total distance: {data['total_distance']} km")
        print(f"  - Max speed: {data['max_speed']} km/h")
        print(f"  - Speed alerts: {data['speed_alerts_count']}")
        
        return print_result(True, "GPS analytics-range 3-day test passed")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_gps_range_2_invalid_range():
    """
    TEST 2: GET /api/gps/analytics-range/{imei}?from=2026-05-16&to=2026-05-14 (from > to)
    Expected: 400 with error "from > to"
    """
    print_test("GPS Range Test 2: Invalid range (from > to)")
    
    try:
        url = f"{BASE_URL}/gps/analytics-range/{TEST_IMEI}?from=2026-05-16&to=2026-05-14"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            return print_result(False, f"Expected 400, got {response.status_code}")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if 'error' not in data:
            return print_result(False, "Expected error field in response")
        
        error_msg = data['error'].lower()
        if 'from' not in error_msg or 'to' not in error_msg:
            return print_result(False, f"Expected error about 'from > to', got: {data['error']}")
        
        print(f"✓ Correct error message: {data['error']}")
        
        return print_result(True, "Invalid range correctly rejected with 400")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_gps_range_3_missing_params():
    """
    TEST 3: GET /api/gps/analytics-range/{imei}?from=2026-05-14 (missing 'to')
    Expected: 400 with error "from e to richiesti"
    """
    print_test("GPS Range Test 3: Missing parameters")
    
    try:
        url = f"{BASE_URL}/gps/analytics-range/{TEST_IMEI}?from=2026-05-14"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            return print_result(False, f"Expected 400, got {response.status_code}")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if 'error' not in data:
            return print_result(False, "Expected error field in response")
        
        error_msg = data['error'].lower()
        if 'from' not in error_msg or 'to' not in error_msg or 'richiesti' not in error_msg:
            return print_result(False, f"Expected error about 'from e to richiesti', got: {data['error']}")
        
        print(f"✓ Correct error message: {data['error']}")
        
        return print_result(True, "Missing parameters correctly rejected with 400")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_gps_range_4_too_wide():
    """
    TEST 4: GET /api/gps/analytics-range/{imei}?from=2025-01-01&to=2026-05-14 (> 31 days)
    Expected: 400 with error "Range troppo ampio"
    """
    print_test("GPS Range Test 4: Range too wide (> 31 days)")
    
    try:
        url = f"{BASE_URL}/gps/analytics-range/{TEST_IMEI}?from=2025-01-01&to=2026-05-14"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 400:
            return print_result(False, f"Expected 400, got {response.status_code}")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        if 'error' not in data:
            return print_result(False, "Expected error field in response")
        
        error_msg = data['error'].lower()
        if 'range' not in error_msg or 'ampio' not in error_msg:
            return print_result(False, f"Expected error about 'Range troppo ampio', got: {data['error']}")
        
        print(f"✓ Correct error message: {data['error']}")
        
        return print_result(True, "Range too wide correctly rejected with 400")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_gps_range_5_no_data():
    """
    TEST 5: GET /api/gps/analytics-range/{imei}?from=2020-01-01&to=2020-01-03 (no data)
    Expected: 200 with points_count=0, route=[], speed_alerts=[], day_markers=3 entries with points=0
    """
    print_test("GPS Range Test 5: Range with no data")
    
    try:
        url = f"{BASE_URL}/gps/analytics-range/{TEST_IMEI}?from=2020-01-01&to=2020-01-03"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=60)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        
        # Verify points_count=0
        if data['points_count'] != 0:
            return print_result(False, f"Expected points_count=0, got {data['points_count']}")
        print(f"✓ points_count === 0")
        
        # Verify route=[]
        if data['route'] != []:
            return print_result(False, f"Expected empty route, got length {len(data['route'])}")
        print(f"✓ route === []")
        
        # Verify speed_alerts=[]
        if data['speed_alerts'] != []:
            return print_result(False, f"Expected empty speed_alerts, got length {len(data['speed_alerts'])}")
        print(f"✓ speed_alerts === []")
        
        # Verify day_markers has 3 entries
        if len(data['day_markers']) != 3:
            return print_result(False, f"Expected 3 day_markers, got {len(data['day_markers'])}")
        
        # Verify each day_marker has points=0
        for i, marker in enumerate(data['day_markers']):
            if marker['points'] != 0:
                return print_result(False, f"day_markers[{i}] expected points=0, got {marker['points']}")
        
        print(f"✓ day_markers has 3 entries, all with points=0")
        
        print(f"\nSummary:")
        print(f"  - Days: {data['days']}")
        day_markers_str = [f"{m['date']}: {m['points']} pts" for m in data['day_markers']]
        print(f"  - Day markers: {day_markers_str}")
        
        return print_result(True, "GPS analytics-range no-data test passed")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

# ==================== MARINAS SUMUP AUTO-REFRESH TESTS ====================

def get_first_marina_id():
    """Helper: Get first marina ID from GET /api/marinas"""
    try:
        response = requests.get(f"{BASE_URL}/marinas", timeout=10)
        if response.status_code == 200:
            marinas = response.json()
            if isinstance(marinas, list) and len(marinas) > 0:
                return marinas[0]['id']
        return None
    except:
        return None

def test_marina_sumup_1_flat_schema():
    """
    TEST 1: PUT /api/marinas/{id} with flat schema
    Body: { payment_config: { sumup_api_key: 'sup_sk_Fw71D812tu91FLZveGe3l45sgQR86384K', sumup_merchant_code: '' } }
    Expected: 200, response must contain payment_config.sumup_merchant_code === 'MCAC6Y6C' (auto-refresh)
    """
    print_test("Marina SumUp Test 1: Auto-refresh with flat schema")
    
    try:
        # Get first marina
        marina_id = get_first_marina_id()
        if not marina_id:
            return print_result(False, "No marina found in database")
        
        print(f"Using marina ID: {marina_id}")
        
        # PUT with flat schema
        url = f"{BASE_URL}/marinas/{marina_id}"
        payload = {
            "payment_config": {
                "sumup_api_key": "sup_sk_Fw71D812tu91FLZveGe3l45sgQR86384K",
                "sumup_merchant_code": ""
            }
        }
        
        print(f"URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.put(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        
        # Verify payment_config exists
        if 'payment_config' not in data:
            return print_result(False, "Response missing payment_config")
        
        pc = data['payment_config']
        
        # Check flat schema
        if 'sumup_merchant_code' not in pc:
            return print_result(False, "payment_config missing sumup_merchant_code")
        
        merchant_code = pc['sumup_merchant_code']
        
        if merchant_code != 'MCAC6Y6C':
            return print_result(False, f"Expected merchant_code='MCAC6Y6C', got '{merchant_code}'")
        
        print(f"✓ merchant_code auto-populated: {merchant_code}")
        print(f"✓ Flat schema working correctly")
        
        return print_result(True, "Marina SumUp auto-refresh with flat schema passed")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_marina_sumup_2_nested_schema():
    """
    TEST 2: PUT /api/marinas/{id} with nested schema
    Body: { payment_config: { sumup: { api_key: 'sup_sk_Fw71D812tu91FLZveGe3l45sgQR86384K', merchant_code: '' } } }
    Expected: 200, response must contain payment_config.sumup.merchant_code === 'MCAC6Y6C'
    """
    print_test("Marina SumUp Test 2: Auto-refresh with nested schema")
    
    try:
        # Get first marina
        marina_id = get_first_marina_id()
        if not marina_id:
            return print_result(False, "No marina found in database")
        
        print(f"Using marina ID: {marina_id}")
        
        # PUT with nested schema
        url = f"{BASE_URL}/marinas/{marina_id}"
        payload = {
            "payment_config": {
                "sumup": {
                    "api_key": "sup_sk_Fw71D812tu91FLZveGe3l45sgQR86384K",
                    "merchant_code": ""
                }
            }
        }
        
        print(f"URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.put(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        
        # Verify payment_config.sumup exists
        if 'payment_config' not in data:
            return print_result(False, "Response missing payment_config")
        
        pc = data['payment_config']
        
        if 'sumup' not in pc:
            return print_result(False, "payment_config missing sumup object")
        
        sumup = pc['sumup']
        
        if 'merchant_code' not in sumup:
            return print_result(False, "payment_config.sumup missing merchant_code")
        
        merchant_code = sumup['merchant_code']
        
        if merchant_code != 'MCAC6Y6C':
            return print_result(False, f"Expected merchant_code='MCAC6Y6C', got '{merchant_code}'")
        
        print(f"✓ merchant_code auto-populated: {merchant_code}")
        print(f"✓ Nested schema working correctly")
        
        return print_result(True, "Marina SumUp auto-refresh with nested schema passed")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_marina_sumup_3_invalid_key():
    """
    TEST 3: PUT /api/marinas/{id} with invalid api_key
    Body: { payment_config: { sumup_api_key: 'sup_sk_INVALID_FAKE', sumup_merchant_code: 'OLDCODE' } }
    Expected: 200, response must have payment_config.sumup_merchant_code === '' (cleared obsolete code)
    """
    print_test("Marina SumUp Test 3: Invalid API key clears merchant_code")
    
    try:
        # Get first marina
        marina_id = get_first_marina_id()
        if not marina_id:
            return print_result(False, "No marina found in database")
        
        print(f"Using marina ID: {marina_id}")
        
        # PUT with invalid api_key
        url = f"{BASE_URL}/marinas/{marina_id}"
        payload = {
            "payment_config": {
                "sumup_api_key": "sup_sk_INVALID_FAKE",
                "sumup_merchant_code": "OLDCODE"
            }
        }
        
        print(f"URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.put(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        
        # Verify payment_config exists
        if 'payment_config' not in data:
            return print_result(False, "Response missing payment_config")
        
        pc = data['payment_config']
        
        # Check that merchant_code is cleared (empty string)
        merchant_code = pc.get('sumup_merchant_code', 'NOT_FOUND')
        
        if merchant_code != '':
            return print_result(False, f"Expected merchant_code='', got '{merchant_code}'")
        
        print(f"✓ merchant_code cleared: '{merchant_code}'")
        print(f"✓ Invalid API key handling working correctly")
        
        return print_result(True, "Marina SumUp invalid key test passed")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_marina_sumup_4_no_payment_config():
    """
    TEST 4: PUT /api/marinas/{id} without payment_config
    Body: { name: 'Test Marina Updated' }
    Expected: 200, no side effects, other fields modified normally
    """
    print_test("Marina SumUp Test 4: PUT without payment_config (no side effects)")
    
    try:
        # Get first marina
        marina_id = get_first_marina_id()
        if not marina_id:
            return print_result(False, "No marina found in database")
        
        print(f"Using marina ID: {marina_id}")
        
        # GET current state
        response = requests.get(f"{BASE_URL}/marinas/{marina_id}", timeout=10)
        if response.status_code != 200:
            return print_result(False, f"GET failed with {response.status_code}")
        
        before = response.json()
        original_name = before.get('name', '')
        original_payment_config = before.get('payment_config', {})
        
        print(f"Original name: {original_name}")
        print(f"Original payment_config: {json.dumps(original_payment_config, indent=2)}")
        
        # PUT with only name change
        url = f"{BASE_URL}/marinas/{marina_id}"
        new_name = f"Test Marina Updated {datetime.now().strftime('%H%M%S')}"
        payload = {
            "name": new_name
        }
        
        print(f"URL: {url}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.put(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        
        # Verify name was updated
        if data.get('name') != new_name:
            return print_result(False, f"Name not updated: expected '{new_name}', got '{data.get('name')}'")
        
        print(f"✓ Name updated: {new_name}")
        
        # Verify payment_config unchanged (if it existed)
        after_payment_config = data.get('payment_config', {})
        
        # If there was a payment_config before, it should still be there
        if original_payment_config:
            if not after_payment_config:
                return print_result(False, "payment_config was removed")
            print(f"✓ payment_config preserved")
        
        print(f"✓ No side effects on payment_config")
        
        # Restore original name
        restore_payload = {"name": original_name}
        requests.put(url, json=restore_payload, timeout=10)
        print(f"✓ Original name restored")
        
        return print_result(True, "Marina PUT without payment_config test passed")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def main():
    """Run all new feature tests"""
    print("\n" + "="*80)
    print("MARETREK NEW FEATURES - BACKEND TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    print("\n" + "="*80)
    print("SECTION A: GPS ANALYTICS RANGE ENDPOINT")
    print("="*80)
    
    # GPS Analytics Range tests
    results.append(("GPS Range 1 - Valid 3 days", test_gps_range_1_valid_3_days()))
    results.append(("GPS Range 2 - Invalid range", test_gps_range_2_invalid_range()))
    results.append(("GPS Range 3 - Missing params", test_gps_range_3_missing_params()))
    results.append(("GPS Range 4 - Too wide", test_gps_range_4_too_wide()))
    results.append(("GPS Range 5 - No data", test_gps_range_5_no_data()))
    
    print("\n" + "="*80)
    print("SECTION B: MARINAS SUMUP AUTO-REFRESH")
    print("="*80)
    
    # Marina SumUp tests
    results.append(("Marina SumUp 1 - Flat schema", test_marina_sumup_1_flat_schema()))
    results.append(("Marina SumUp 2 - Nested schema", test_marina_sumup_2_nested_schema()))
    results.append(("Marina SumUp 3 - Invalid key", test_marina_sumup_3_invalid_key()))
    results.append(("Marina SumUp 4 - No payment_config", test_marina_sumup_4_no_payment_config()))
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}%)")
    print(f"Completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Exit with appropriate code
    sys.exit(0 if passed == total else 1)

if __name__ == "__main__":
    main()
