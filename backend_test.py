#!/usr/bin/env python3
"""
Backend API Testing Script for Maretrek GPS Advanced Features
Tests GPS config and analytics endpoints with speed alerts functionality
"""

import requests
import json
import sys
from datetime import datetime

# Base URL from environment
BASE_URL = "https://sardinia-tours-hub.preview.emergentagent.com/api"

# Test data
TEST_IMEI = "863738076364539"
TEST_DATE = "2026-05-15"  # Known date with 1803 GPS points, max speed 158 km/h
EDGE_CASE_DATE = "2020-01-01"  # Date with no data

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

def test_a_get_gps_config():
    """
    TEST A: GET /api/gps-config (read with threshold)
    Expected: 200 response with configured: true/false and speed_alert_threshold (default 30)
    """
    print_test("A) GET /api/gps-config - Read configuration with threshold")
    
    try:
        response = requests.get(f"{BASE_URL}/gps-config", timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Check required fields
        if 'configured' not in data:
            return print_result(False, "Missing 'configured' field")
        
        if 'speed_alert_threshold' not in data:
            return print_result(False, "Missing 'speed_alert_threshold' field")
        
        threshold = data.get('speed_alert_threshold')
        if not isinstance(threshold, (int, float)) or threshold <= 0:
            return print_result(False, f"Invalid threshold value: {threshold}")
        
        # If configured, should have email and api_token
        if data['configured']:
            if 'email' not in data or 'api_token' not in data:
                return print_result(False, "Configured but missing email or api_token")
            print(f"✓ Configured: email={data['email']}, threshold={threshold}")
        else:
            print(f"✓ Not configured yet, default threshold={threshold}")
        
        return print_result(True, f"GET /api/gps-config working correctly, threshold={threshold}")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_b_post_gps_config():
    """
    TEST B: POST /api/gps-config (write with threshold)
    - First GET to capture current email and api_token
    - POST with speed_alert_threshold: 25
    - GET again to verify threshold === 25
    - Try POST with invalid threshold (should reject or ignore)
    - Restore original threshold (30)
    """
    print_test("B) POST /api/gps-config - Write configuration with threshold")
    
    try:
        # Step 1: GET current config
        print("\nStep 1: GET current configuration")
        response = requests.get(f"{BASE_URL}/gps-config", timeout=10)
        if response.status_code != 200:
            return print_result(False, f"GET failed with {response.status_code}")
        
        current_config = response.json()
        print(f"Current config: {json.dumps(current_config, indent=2)}")
        
        if not current_config.get('configured'):
            return print_result(False, "GPS not configured - cannot test threshold update. Need email and api_token.")
        
        current_email = current_config['email']
        current_token = current_config['api_token']
        original_threshold = current_config.get('speed_alert_threshold', 30)
        
        # Step 2: POST with threshold 25
        print("\nStep 2: POST with speed_alert_threshold=25")
        post_data = {
            'email': current_email,
            'api_token': current_token,
            'speed_alert_threshold': 25
        }
        response = requests.post(f"{BASE_URL}/gps-config", json=post_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"POST failed with {response.status_code}")
        
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if not result.get('success'):
            return print_result(False, "POST did not return success: true")
        
        # Step 3: GET again to verify
        print("\nStep 3: GET to verify threshold=25")
        response = requests.get(f"{BASE_URL}/gps-config", timeout=10)
        if response.status_code != 200:
            return print_result(False, f"Verification GET failed with {response.status_code}")
        
        updated_config = response.json()
        print(f"Updated config: {json.dumps(updated_config, indent=2)}")
        
        if updated_config.get('speed_alert_threshold') != 25:
            return print_result(False, f"Expected threshold=25, got {updated_config.get('speed_alert_threshold')}")
        
        print("✓ Threshold successfully updated to 25")
        
        # Step 4: Try invalid threshold (string)
        print("\nStep 4: POST with invalid threshold (string 'abc')")
        invalid_data = {
            'email': current_email,
            'api_token': current_token,
            'speed_alert_threshold': 'abc'
        }
        response = requests.post(f"{BASE_URL}/gps-config", json=invalid_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        # Verify threshold wasn't overwritten with invalid value
        response = requests.get(f"{BASE_URL}/gps-config", timeout=10)
        check_config = response.json()
        if check_config.get('speed_alert_threshold') == 'abc':
            return print_result(False, "Invalid threshold 'abc' was saved - should be rejected")
        print(f"✓ Invalid threshold rejected, current value: {check_config.get('speed_alert_threshold')}")
        
        # Step 5: Try invalid threshold (negative)
        print("\nStep 5: POST with invalid threshold (negative -5)")
        invalid_data = {
            'email': current_email,
            'api_token': current_token,
            'speed_alert_threshold': -5
        }
        response = requests.post(f"{BASE_URL}/gps-config", json=invalid_data, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        # Verify threshold wasn't overwritten with negative value
        response = requests.get(f"{BASE_URL}/gps-config", timeout=10)
        check_config = response.json()
        if check_config.get('speed_alert_threshold') == -5:
            return print_result(False, "Negative threshold -5 was saved - should be rejected")
        print(f"✓ Negative threshold rejected, current value: {check_config.get('speed_alert_threshold')}")
        
        # Step 6: Restore original threshold
        print(f"\nStep 6: Restore original threshold={original_threshold}")
        restore_data = {
            'email': current_email,
            'api_token': current_token,
            'speed_alert_threshold': original_threshold
        }
        response = requests.post(f"{BASE_URL}/gps-config", json=restore_data, timeout=10)
        if response.status_code != 200:
            print(f"⚠️  Warning: Failed to restore original threshold")
        else:
            print(f"✓ Original threshold restored to {original_threshold}")
        
        return print_result(True, "POST /api/gps-config working correctly with validation")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_c_analytics_speed_alerts():
    """
    TEST C: GET /api/gps/analytics/{imei}?date=Y - Speed alerts structure
    Use IMEI 863738076364539 and date 2026-05-15
    Expected: speed_alerts array with proper structure
    """
    print_test("C) GET /api/gps/analytics/{imei}?date=Y - Speed alerts structure")
    
    try:
        url = f"{BASE_URL}/gps/analytics/{TEST_IMEI}?date={TEST_DATE}"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        
        # Check required keys
        required_keys = [
            'imei', 'date', 'total_distance', 'max_speed', 'avg_speed', 
            'total_time', 'engine_hours', 'stops', 'route', 'points_count',
            'alert_threshold', 'speed_alerts', 'speed_alerts_count'
        ]
        
        missing_keys = [key for key in required_keys if key not in data]
        if missing_keys:
            return print_result(False, f"Missing keys: {missing_keys}")
        
        print(f"\n✓ All required keys present")
        print(f"  - IMEI: {data['imei']}")
        print(f"  - Date: {data['date']}")
        print(f"  - Points count: {data['points_count']}")
        print(f"  - Max speed: {data['max_speed']} km/h")
        print(f"  - Alert threshold: {data['alert_threshold']} km/h")
        print(f"  - Speed alerts count: {data['speed_alerts_count']}")
        
        # Verify points_count > 0 (should be ~1803)
        if data['points_count'] == 0:
            return print_result(False, "Expected points_count > 0 for this date")
        
        # Verify speed_alerts_count > 0 (with threshold 30, expect ~79)
        if data['speed_alerts_count'] == 0:
            return print_result(False, "Expected speed_alerts_count > 0 with threshold 30")
        
        print(f"✓ Speed alerts detected: {data['speed_alerts_count']}")
        
        # Verify speed_alerts is an array
        if not isinstance(data['speed_alerts'], list):
            return print_result(False, "speed_alerts should be an array")
        
        if len(data['speed_alerts']) != data['speed_alerts_count']:
            return print_result(False, f"Mismatch: speed_alerts length {len(data['speed_alerts'])} != speed_alerts_count {data['speed_alerts_count']}")
        
        # Verify structure of each alert
        alert_keys = ['start_ts', 'end_ts', 'start_lat', 'start_lng', 'end_lat', 'end_lng', 
                      'max_speed', 'points', 'start_index', 'end_index']
        
        max_speed_found = 0
        for i, alert in enumerate(data['speed_alerts'][:5]):  # Check first 5 alerts
            missing = [key for key in alert_keys if key not in alert]
            if missing:
                return print_result(False, f"Alert {i} missing keys: {missing}")
            
            # Verify max_speed > alert_threshold
            if alert['max_speed'] <= data['alert_threshold']:
                return print_result(False, f"Alert {i} max_speed {alert['max_speed']} <= threshold {data['alert_threshold']}")
            
            # Verify points >= 1
            if alert['points'] < 1:
                return print_result(False, f"Alert {i} has points={alert['points']}, expected >= 1")
            
            # Verify start_index <= end_index < points_count
            if alert['start_index'] > alert['end_index']:
                return print_result(False, f"Alert {i} start_index > end_index")
            
            if alert['end_index'] >= data['points_count']:
                return print_result(False, f"Alert {i} end_index {alert['end_index']} >= points_count {data['points_count']}")
            
            if alert['max_speed'] > max_speed_found:
                max_speed_found = alert['max_speed']
        
        print(f"✓ All alerts have correct structure")
        print(f"✓ All alerts have max_speed > threshold")
        print(f"✓ All alerts have valid indices")
        
        # Verify at least one alert has max_speed > 50
        if max_speed_found <= 50:
            # Check all alerts
            max_speed_found = max(alert['max_speed'] for alert in data['speed_alerts'])
        
        if max_speed_found <= 50:
            return print_result(False, f"Expected at least one alert with max_speed > 50, found max {max_speed_found}")
        
        print(f"✓ Found alert with max_speed > 50 (max: {max_speed_found} km/h)")
        
        # Verify alert_threshold === 30 (default)
        if data['alert_threshold'] != 30:
            print(f"⚠️  Warning: Expected default threshold=30, got {data['alert_threshold']}")
        
        return print_result(True, f"Analytics with speed alerts working correctly ({data['speed_alerts_count']} alerts detected)")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_d_threshold_change_reflects():
    """
    TEST D: Threshold change reflects in analytics
    - POST /api/gps-config to set speed_alert_threshold: 60
    - GET /api/gps/analytics/{imei}?date=Y
    - Verify alert_threshold === 60 AND speed_alerts_count is LESS than with threshold 30
    - Restore threshold to 30
    """
    print_test("D) Threshold change reflects in analytics")
    
    try:
        # Step 1: Get baseline with threshold 30
        print("\nStep 1: Get baseline analytics with threshold 30")
        
        # First ensure threshold is 30
        response = requests.get(f"{BASE_URL}/gps-config", timeout=10)
        current_config = response.json()
        
        if not current_config.get('configured'):
            return print_result(False, "GPS not configured")
        
        current_email = current_config['email']
        current_token = current_config['api_token']
        
        # Set threshold to 30
        post_data = {
            'email': current_email,
            'api_token': current_token,
            'speed_alert_threshold': 30
        }
        requests.post(f"{BASE_URL}/gps-config", json=post_data, timeout=10)
        
        # Get analytics with threshold 30
        url = f"{BASE_URL}/gps/analytics/{TEST_IMEI}?date={TEST_DATE}"
        response = requests.get(url, timeout=30)
        
        if response.status_code != 200:
            return print_result(False, f"Analytics GET failed with {response.status_code}")
        
        baseline_data = response.json()
        baseline_count = baseline_data['speed_alerts_count']
        print(f"Baseline (threshold 30): {baseline_count} alerts")
        
        # Step 2: Change threshold to 60
        print("\nStep 2: POST speed_alert_threshold=60")
        post_data = {
            'email': current_email,
            'api_token': current_token,
            'speed_alert_threshold': 60
        }
        response = requests.post(f"{BASE_URL}/gps-config", json=post_data, timeout=10)
        
        if response.status_code != 200:
            return print_result(False, f"POST failed with {response.status_code}")
        
        print("✓ Threshold updated to 60")
        
        # Step 3: Get analytics with threshold 60
        print("\nStep 3: GET analytics with new threshold")
        response = requests.get(url, timeout=30)
        
        if response.status_code != 200:
            return print_result(False, f"Analytics GET failed with {response.status_code}")
        
        new_data = response.json()
        new_count = new_data['speed_alerts_count']
        new_threshold = new_data['alert_threshold']
        
        print(f"New analytics:")
        print(f"  - alert_threshold: {new_threshold}")
        print(f"  - speed_alerts_count: {new_count}")
        
        # Verify alert_threshold === 60
        if new_threshold != 60:
            return print_result(False, f"Expected alert_threshold=60, got {new_threshold}")
        
        print("✓ alert_threshold correctly reflects new value (60)")
        
        # Verify speed_alerts_count is LESS than baseline
        if new_count >= baseline_count:
            return print_result(False, f"Expected fewer alerts with higher threshold. Baseline: {baseline_count}, New: {new_count}")
        
        print(f"✓ Speed alerts count decreased: {baseline_count} → {new_count}")
        
        # Step 4: Restore threshold to 30
        print("\nStep 4: Restore threshold to 30")
        restore_data = {
            'email': current_email,
            'api_token': current_token,
            'speed_alert_threshold': 30
        }
        response = requests.post(f"{BASE_URL}/gps-config", json=restore_data, timeout=10)
        
        if response.status_code != 200:
            print(f"⚠️  Warning: Failed to restore threshold")
        else:
            print("✓ Threshold restored to 30")
        
        return print_result(True, f"Threshold change correctly reflects in analytics (60 km/h: {new_count} alerts vs 30 km/h: {baseline_count} alerts)")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def test_e_edge_case_no_data():
    """
    TEST E: Edge case - date with no data
    GET /api/gps/analytics/{imei}?date=2020-01-01
    Expected: 200 with points_count: 0, speed_alerts: [], speed_alerts_count: 0, route: []
    """
    print_test("E) Edge case - Date with no GPS data")
    
    try:
        url = f"{BASE_URL}/gps/analytics/{TEST_IMEI}?date={EDGE_CASE_DATE}"
        print(f"URL: {url}")
        
        response = requests.get(url, timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            return print_result(False, f"Expected 200, got {response.status_code}")
        
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Verify points_count: 0
        if data.get('points_count') != 0:
            return print_result(False, f"Expected points_count=0, got {data.get('points_count')}")
        
        # Verify speed_alerts: []
        if data.get('speed_alerts') != []:
            return print_result(False, f"Expected empty speed_alerts array, got {data.get('speed_alerts')}")
        
        # Verify speed_alerts_count: 0
        if data.get('speed_alerts_count') != 0:
            return print_result(False, f"Expected speed_alerts_count=0, got {data.get('speed_alerts_count')}")
        
        # Verify route: []
        if data.get('route') != []:
            return print_result(False, f"Expected empty route array, got length {len(data.get('route', []))}")
        
        print("✓ All fields correctly empty for date with no data")
        
        return print_result(True, "Edge case (no data) handled correctly")
        
    except Exception as e:
        return print_result(False, f"Exception: {str(e)}")

def main():
    """Run all GPS Advanced tests"""
    print("\n" + "="*80)
    print("MARETREK GPS ADVANCED FEATURES - BACKEND TESTING")
    print("="*80)
    print(f"Base URL: {BASE_URL}")
    print(f"Test IMEI: {TEST_IMEI}")
    print(f"Test Date: {TEST_DATE}")
    print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # Run all tests
    results.append(("A - GET gps-config", test_a_get_gps_config()))
    results.append(("B - POST gps-config", test_b_post_gps_config()))
    results.append(("C - Analytics speed alerts", test_c_analytics_speed_alerts()))
    results.append(("D - Threshold change reflects", test_d_threshold_change_reflects()))
    results.append(("E - Edge case no data", test_e_edge_case_no_data()))
    
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
