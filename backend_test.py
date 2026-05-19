#!/usr/bin/env python3
"""
MongoDB Backup System Backend Testing
Tests all backup endpoints with proper authorization and validation
"""

import requests
import json
import os
import time
from typing import Dict, Any, Optional

# Read base URL from .env
BASE_URL = None
with open('/app/.env', 'r') as f:
    for line in f:
        if line.startswith('NEXT_PUBLIC_BASE_URL='):
            BASE_URL = line.split('=', 1)[1].strip()
            break

if not BASE_URL:
    raise Exception("NEXT_PUBLIC_BASE_URL not found in .env")

API_BASE = f"{BASE_URL}/api"
BACKUP_DIR = "/app/backups"

# Test counters
tests_passed = 0
tests_failed = 0
test_results = []

def log_test(test_name: str, passed: bool, details: str = ""):
    """Log test result"""
    global tests_passed, tests_failed
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {test_name}")
    if details:
        print(f"  Details: {details}")
    
    test_results.append({
        "test": test_name,
        "passed": passed,
        "details": details
    })
    
    if passed:
        tests_passed += 1
    else:
        tests_failed += 1

def test_list_backups_without_auth():
    """TEST 1: GET /api/admin/backups without X-User-Role header should return 403"""
    try:
        response = requests.get(f"{API_BASE}/admin/backups", timeout=10)
        
        if response.status_code == 403:
            data = response.json()
            if data.get('error') == 'Solo Super Admin':
                log_test("List backups without auth returns 403", True, "Correct error message")
                return True
            else:
                log_test("List backups without auth returns 403", False, f"Wrong error message: {data.get('error')}")
                return False
        else:
            log_test("List backups without auth returns 403", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("List backups without auth returns 403", False, f"Exception: {str(e)}")
        return False

def test_list_backups_with_auth():
    """TEST 2: GET /api/admin/backups with SUPER_ADMIN header should return 200 with proper structure"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN"}
        response = requests.get(f"{API_BASE}/admin/backups", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("List backups with auth returns 200", False, f"Expected 200, got {response.status_code}")
            return False, None
        
        data = response.json()
        
        # Check required fields
        required_fields = ['ok', 'backups', 'totals', 'scheduler', 'backup_dir']
        missing_fields = [f for f in required_fields if f not in data]
        
        if missing_fields:
            log_test("List backups with auth returns 200", False, f"Missing fields: {missing_fields}")
            return False, None
        
        # Check ok is true
        if data['ok'] != True:
            log_test("List backups with auth returns 200", False, f"ok field is {data['ok']}, expected True")
            return False, None
        
        # Check backups is array
        if not isinstance(data['backups'], list):
            log_test("List backups with auth returns 200", False, "backups is not an array")
            return False, None
        
        # Check totals structure
        totals = data['totals']
        totals_fields = ['size_bytes', 'auto', 'manual', 'total_documents']
        missing_totals = [f for f in totals_fields if f not in totals]
        if missing_totals:
            log_test("List backups with auth returns 200", False, f"Missing totals fields: {missing_totals}")
            return False, None
        
        # Check scheduler structure
        scheduler = data['scheduler']
        if not scheduler:
            log_test("List backups with auth returns 200", False, "scheduler is null or missing")
            return False, None
        
        scheduler_fields = ['initialized', 'cron_expression', 'timezone', 'next_run']
        missing_scheduler = [f for f in scheduler_fields if f not in scheduler]
        if missing_scheduler:
            log_test("List backups with auth returns 200", False, f"Missing scheduler fields: {missing_scheduler}")
            return False, None
        
        # Verify scheduler is initialized
        if scheduler['initialized'] != True:
            log_test("List backups with auth returns 200", False, f"scheduler.initialized is {scheduler['initialized']}, expected True")
            return False, None
        
        # Verify cron expression
        if scheduler['cron_expression'] != '30 23 * * *':
            log_test("List backups with auth returns 200", False, f"cron_expression is {scheduler['cron_expression']}, expected '30 23 * * *'")
            return False, None
        
        # Verify timezone
        if scheduler['timezone'] != 'Europe/Rome':
            log_test("List backups with auth returns 200", False, f"timezone is {scheduler['timezone']}, expected 'Europe/Rome'")
            return False, None
        
        # Verify backup_dir
        if data['backup_dir'] != '/app/backups':
            log_test("List backups with auth returns 200", False, f"backup_dir is {data['backup_dir']}, expected '/app/backups'")
            return False, None
        
        details = f"Found {len(data['backups'])} backups, scheduler initialized: {scheduler['initialized']}, next_run: {scheduler.get('next_run', 'N/A')}"
        log_test("List backups with auth returns 200", True, details)
        return True, data
    except Exception as e:
        log_test("List backups with auth returns 200", False, f"Exception: {str(e)}")
        return False, None

def test_create_backup_without_auth():
    """TEST 3: POST /api/admin/backups/create without auth should return 403"""
    try:
        payload = {"note": "Test backup", "triggered_by": "test_agent"}
        response = requests.post(f"{API_BASE}/admin/backups/create", json=payload, timeout=120)
        
        if response.status_code == 403:
            data = response.json()
            if data.get('error') == 'Solo Super Admin':
                log_test("Create backup without auth returns 403", True, "Correct error message")
                return True
            else:
                log_test("Create backup without auth returns 403", False, f"Wrong error message: {data.get('error')}")
                return False
        else:
            log_test("Create backup without auth returns 403", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Create backup without auth returns 403", False, f"Exception: {str(e)}")
        return False

def test_create_backup_with_auth():
    """TEST 4: POST /api/admin/backups/create with auth should create backup and return 200"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN", "Content-Type": "application/json"}
        payload = {"note": "Test automated backup from test_agent", "triggered_by": "test_agent"}
        
        print("  Creating backup (this may take 30-60 seconds)...")
        response = requests.post(f"{API_BASE}/admin/backups/create", headers=headers, json=payload, timeout=120)
        
        if response.status_code != 200:
            log_test("Create backup with auth returns 200", False, f"Expected 200, got {response.status_code}: {response.text}")
            return False, None
        
        data = response.json()
        
        # Check required fields
        if data.get('ok') != True:
            log_test("Create backup with auth returns 200", False, f"ok field is {data.get('ok')}, expected True")
            return False, None
        
        if 'backup' not in data:
            log_test("Create backup with auth returns 200", False, "backup field missing in response")
            return False, None
        
        if 'elapsed_ms' not in data:
            log_test("Create backup with auth returns 200", False, "elapsed_ms field missing in response")
            return False, None
        
        backup = data['backup']
        
        # Check backup structure
        backup_fields = ['id', 'type', 'filename', 'manifest_file', 'created_at', 'size_bytes', 'size_human', 'db_name', 'collections', 'total_documents', 'note', 'triggered_by']
        missing_fields = [f for f in backup_fields if f not in backup]
        if missing_fields:
            log_test("Create backup with auth returns 200", False, f"Missing backup fields: {missing_fields}")
            return False, None
        
        # Verify type is MANUAL
        if backup['type'] != 'MANUAL':
            log_test("Create backup with auth returns 200", False, f"backup type is {backup['type']}, expected MANUAL")
            return False, None
        
        # Verify note
        if backup['note'] != "Test automated backup from test_agent":
            log_test("Create backup with auth returns 200", False, f"note mismatch: {backup['note']}")
            return False, None
        
        # Verify triggered_by
        if backup['triggered_by'] != 'test_agent':
            log_test("Create backup with auth returns 200", False, f"triggered_by is {backup['triggered_by']}, expected test_agent")
            return False, None
        
        # Verify file exists
        backup_file = os.path.join(BACKUP_DIR, backup['filename'])
        if not os.path.exists(backup_file):
            log_test("Create backup with auth returns 200", False, f"Backup file not found: {backup_file}")
            return False, None
        
        # Verify manifest exists
        manifest_file = os.path.join(BACKUP_DIR, backup['manifest_file'])
        if not os.path.exists(manifest_file):
            log_test("Create backup with auth returns 200", False, f"Manifest file not found: {manifest_file}")
            return False, None
        
        details = f"Backup created: {backup['id']}, size: {backup['size_human']}, documents: {backup['total_documents']}, elapsed: {data['elapsed_ms']}ms"
        log_test("Create backup with auth returns 200", True, details)
        return True, backup
    except Exception as e:
        log_test("Create backup with auth returns 200", False, f"Exception: {str(e)}")
        return False, None

def test_backup_appears_in_list(backup_id: str):
    """TEST 5: Verify created backup appears in GET /api/admin/backups"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN"}
        response = requests.get(f"{API_BASE}/admin/backups", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("Created backup appears in list", False, f"GET returned {response.status_code}")
            return False
        
        data = response.json()
        backups = data.get('backups', [])
        
        # Find backup by id
        found = any(b['id'] == backup_id for b in backups)
        
        if found:
            log_test("Created backup appears in list", True, f"Backup {backup_id} found in list")
            return True
        else:
            log_test("Created backup appears in list", False, f"Backup {backup_id} not found in list of {len(backups)} backups")
            return False
    except Exception as e:
        log_test("Created backup appears in list", False, f"Exception: {str(e)}")
        return False

def test_download_backup_without_auth(backup_id: str):
    """TEST 6: GET /api/admin/backups/{id}/download without auth should return 403"""
    try:
        response = requests.get(f"{API_BASE}/admin/backups/{backup_id}/download", timeout=10)
        
        if response.status_code == 403:
            # For download endpoint, response might be JSON or text
            try:
                data = response.json()
                if data.get('error') == 'Solo Super Admin':
                    log_test("Download backup without auth returns 403", True, "Correct error message")
                    return True
            except:
                pass
            log_test("Download backup without auth returns 403", True, "Returns 403")
            return True
        else:
            log_test("Download backup without auth returns 403", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Download backup without auth returns 403", False, f"Exception: {str(e)}")
        return False

def test_download_backup_with_auth(backup_id: str):
    """TEST 7: GET /api/admin/backups/{id}/download with auth should return gzip file"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN"}
        response = requests.get(f"{API_BASE}/admin/backups/{backup_id}/download", headers=headers, timeout=30)
        
        if response.status_code != 200:
            log_test("Download backup with auth returns 200", False, f"Expected 200, got {response.status_code}")
            return False
        
        # Check Content-Type
        content_type = response.headers.get('Content-Type', '')
        if 'application/gzip' not in content_type:
            log_test("Download backup with auth returns 200", False, f"Content-Type is {content_type}, expected application/gzip")
            return False
        
        # Check Content-Disposition
        content_disposition = response.headers.get('Content-Disposition', '')
        if 'attachment' not in content_disposition:
            log_test("Download backup with auth returns 200", False, f"Content-Disposition missing attachment: {content_disposition}")
            return False
        
        # Check body is non-empty
        if len(response.content) == 0:
            log_test("Download backup with auth returns 200", False, "Response body is empty")
            return False
        
        details = f"Downloaded {len(response.content)} bytes, Content-Type: {content_type}"
        log_test("Download backup with auth returns 200", True, details)
        return True
    except Exception as e:
        log_test("Download backup with auth returns 200", False, f"Exception: {str(e)}")
        return False

def test_download_nonexistent_backup():
    """TEST 8: GET /api/admin/backups/{nonexistent_id}/download should return 404"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN"}
        response = requests.get(f"{API_BASE}/admin/backups/nonexistent_backup_id_12345/download", headers=headers, timeout=10)
        
        if response.status_code == 404:
            log_test("Download non-existent backup returns 404", True, "Correct 404 response")
            return True
        else:
            log_test("Download non-existent backup returns 404", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Download non-existent backup returns 404", False, f"Exception: {str(e)}")
        return False

def test_restore_without_confirm(backup_id: str):
    """TEST 9: POST /api/admin/backups/{id}/restore without confirm should return 400"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN", "Content-Type": "application/json"}
        payload = {}
        response = requests.post(f"{API_BASE}/admin/backups/{backup_id}/restore", headers=headers, json=payload, timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            error = data.get('error', '')
            if 'RIPRISTINA-DEFINITIVO' in error:
                log_test("Restore without confirm returns 400", True, "Correct error message about RIPRISTINA-DEFINITIVO")
                return True
            else:
                log_test("Restore without confirm returns 400", False, f"Wrong error message: {error}")
                return False
        else:
            log_test("Restore without confirm returns 400", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Restore without confirm returns 400", False, f"Exception: {str(e)}")
        return False

def test_restore_with_wrong_confirm(backup_id: str):
    """TEST 10: POST /api/admin/backups/{id}/restore with wrong confirm value should return 400"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN", "Content-Type": "application/json"}
        payload = {"confirm": "wrong-value"}
        response = requests.post(f"{API_BASE}/admin/backups/{backup_id}/restore", headers=headers, json=payload, timeout=10)
        
        if response.status_code == 400:
            data = response.json()
            error = data.get('error', '')
            if 'RIPRISTINA-DEFINITIVO' in error:
                log_test("Restore with wrong confirm returns 400", True, "Correct error message")
                return True
            else:
                log_test("Restore with wrong confirm returns 400", False, f"Wrong error message: {error}")
                return False
        else:
            log_test("Restore with wrong confirm returns 400", False, f"Expected 400, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Restore with wrong confirm returns 400", False, f"Exception: {str(e)}")
        return False

def test_restore_nonexistent_backup():
    """TEST 11: POST /api/admin/backups/{nonexistent_id}/restore should return 404"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN", "Content-Type": "application/json"}
        payload = {"confirm": "RIPRISTINA-DEFINITIVO"}
        response = requests.post(f"{API_BASE}/admin/backups/nonexistent_backup_id_12345/restore", headers=headers, json=payload, timeout=10)
        
        if response.status_code == 404:
            log_test("Restore non-existent backup returns 404", True, "Correct 404 response")
            return True
        else:
            log_test("Restore non-existent backup returns 404", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Restore non-existent backup returns 404", False, f"Exception: {str(e)}")
        return False

def test_delete_backup_without_auth(backup_id: str):
    """TEST 12: DELETE /api/admin/backups/{id} without auth should return 403"""
    try:
        response = requests.delete(f"{API_BASE}/admin/backups/{backup_id}", timeout=10)
        
        if response.status_code == 403:
            data = response.json()
            if data.get('error') == 'Solo Super Admin':
                log_test("Delete backup without auth returns 403", True, "Correct error message")
                return True
            else:
                log_test("Delete backup without auth returns 403", False, f"Wrong error message: {data.get('error')}")
                return False
        else:
            log_test("Delete backup without auth returns 403", False, f"Expected 403, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Delete backup without auth returns 403", False, f"Exception: {str(e)}")
        return False

def test_delete_backup_with_auth(backup_id: str, backup_filename: str, manifest_filename: str):
    """TEST 13: DELETE /api/admin/backups/{id} with auth should delete backup"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN"}
        response = requests.delete(f"{API_BASE}/admin/backups/{backup_id}", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("Delete backup with auth returns 200", False, f"Expected 200, got {response.status_code}")
            return False
        
        data = response.json()
        
        if data.get('ok') != True:
            log_test("Delete backup with auth returns 200", False, f"ok field is {data.get('ok')}, expected True")
            return False
        
        if data.get('id') != backup_id:
            log_test("Delete backup with auth returns 200", False, f"id mismatch: {data.get('id')} vs {backup_id}")
            return False
        
        # Verify files are deleted
        backup_file = os.path.join(BACKUP_DIR, backup_filename)
        manifest_file = os.path.join(BACKUP_DIR, manifest_filename)
        
        if os.path.exists(backup_file):
            log_test("Delete backup with auth returns 200", False, f"Backup file still exists: {backup_file}")
            return False
        
        if os.path.exists(manifest_file):
            log_test("Delete backup with auth returns 200", False, f"Manifest file still exists: {manifest_file}")
            return False
        
        log_test("Delete backup with auth returns 200", True, f"Backup {backup_id} deleted successfully")
        return True
    except Exception as e:
        log_test("Delete backup with auth returns 200", False, f"Exception: {str(e)}")
        return False

def test_deleted_backup_not_in_list(backup_id: str):
    """TEST 14: Verify deleted backup does not appear in GET /api/admin/backups"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN"}
        response = requests.get(f"{API_BASE}/admin/backups", headers=headers, timeout=10)
        
        if response.status_code != 200:
            log_test("Deleted backup not in list", False, f"GET returned {response.status_code}")
            return False
        
        data = response.json()
        backups = data.get('backups', [])
        
        # Verify backup is NOT in list
        found = any(b['id'] == backup_id for b in backups)
        
        if not found:
            log_test("Deleted backup not in list", True, f"Backup {backup_id} correctly removed from list")
            return True
        else:
            log_test("Deleted backup not in list", False, f"Backup {backup_id} still appears in list")
            return False
    except Exception as e:
        log_test("Deleted backup not in list", False, f"Exception: {str(e)}")
        return False

def test_delete_nonexistent_backup():
    """TEST 15: DELETE /api/admin/backups/{nonexistent_id} should return 404"""
    try:
        headers = {"X-User-Role": "SUPER_ADMIN"}
        response = requests.delete(f"{API_BASE}/admin/backups/nonexistent_backup_id_12345", headers=headers, timeout=10)
        
        if response.status_code == 404:
            log_test("Delete non-existent backup returns 404", True, "Correct 404 response")
            return True
        else:
            log_test("Delete non-existent backup returns 404", False, f"Expected 404, got {response.status_code}")
            return False
    except Exception as e:
        log_test("Delete non-existent backup returns 404", False, f"Exception: {str(e)}")
        return False

def main():
    print("=" * 80)
    print("MongoDB Backup System Backend Testing")
    print("=" * 80)
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Backup Dir: {BACKUP_DIR}")
    print("=" * 80)
    print()
    
    # TEST 1: List backups without auth
    test_list_backups_without_auth()
    
    # TEST 2: List backups with auth
    success, list_data = test_list_backups_with_auth()
    
    # TEST 3: Create backup without auth
    test_create_backup_without_auth()
    
    # TEST 4: Create backup with auth
    success, backup_data = test_create_backup_with_auth()
    
    if success and backup_data:
        backup_id = backup_data['id']
        backup_filename = backup_data['filename']
        manifest_filename = backup_data['manifest_file']
        
        # TEST 5: Verify backup appears in list
        test_backup_appears_in_list(backup_id)
        
        # TEST 6: Download backup without auth
        test_download_backup_without_auth(backup_id)
        
        # TEST 7: Download backup with auth
        test_download_backup_with_auth(backup_id)
        
        # TEST 8: Download non-existent backup
        test_download_nonexistent_backup()
        
        # TEST 9: Restore without confirm
        test_restore_without_confirm(backup_id)
        
        # TEST 10: Restore with wrong confirm
        test_restore_with_wrong_confirm(backup_id)
        
        # TEST 11: Restore non-existent backup
        test_restore_nonexistent_backup()
        
        # TEST 12: Delete backup without auth
        test_delete_backup_without_auth(backup_id)
        
        # TEST 13: Delete backup with auth
        test_delete_backup_with_auth(backup_id, backup_filename, manifest_filename)
        
        # TEST 14: Verify deleted backup not in list
        test_deleted_backup_not_in_list(backup_id)
        
        # TEST 15: Delete non-existent backup
        test_delete_nonexistent_backup()
    else:
        print("\n⚠️  Skipping tests that depend on backup creation (tests 5-15)")
        print("   Reason: Backup creation failed or returned no data")
    
    # Print summary
    print()
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {tests_passed + tests_failed}")
    print(f"✅ Passed: {tests_passed}")
    print(f"❌ Failed: {tests_failed}")
    print(f"Success Rate: {(tests_passed / (tests_passed + tests_failed) * 100):.1f}%")
    print("=" * 80)
    
    if tests_failed > 0:
        print("\nFailed Tests:")
        for result in test_results:
            if not result['passed']:
                print(f"  ❌ {result['test']}")
                if result['details']:
                    print(f"     {result['details']}")
    
    print()
    
    # Exit with appropriate code
    exit(0 if tests_failed == 0 else 1)

if __name__ == "__main__":
    main()
