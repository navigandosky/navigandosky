#!/usr/bin/env python3
"""
MongoDB Backup Upload Endpoint Testing
Tests the NEW POST /api/admin/backups/upload endpoint
"""

import requests
import os
import gzip
import tempfile
from pathlib import Path

# Base URL from environment
BASE_URL = "https://sardinia-tours-hub.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

# Test results tracking
test_results = {
    "passed": 0,
    "failed": 0,
    "tests": []
}

def log_test(name, passed, details=""):
    """Log test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"\n{status}: {name}")
    if details:
        print(f"  Details: {details}")
    
    test_results["tests"].append({
        "name": name,
        "passed": passed,
        "details": details
    })
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

def print_summary():
    """Print test summary"""
    total = test_results["passed"] + test_results["failed"]
    print("\n" + "="*80)
    print(f"TEST SUMMARY: {test_results['passed']}/{total} tests passed")
    print("="*80)
    for test in test_results["tests"]:
        status = "✅" if test["passed"] else "❌"
        print(f"{status} {test['name']}")
    print("="*80)

# Headers for authenticated requests
AUTH_HEADERS = {
    "X-User-Role": "SUPER_ADMIN"
}

print("="*80)
print("MONGODB BACKUP UPLOAD ENDPOINT TESTING")
print("="*80)
print(f"Base URL: {BASE_URL}")
print(f"Testing endpoint: POST /api/admin/backups/upload")
print("="*80)

# Store uploaded backup ID for cleanup
uploaded_backup_id = None

# ============================================================================
# TEST 1: Happy path - valid backup upload
# ============================================================================
print("\n\n### TEST 1: Happy path - Upload valid backup file")
try:
    # Get an existing backup file from /app/backups/
    backup_dir = Path("/app/backups")
    backup_files = list(backup_dir.glob("*.archive.gz"))
    
    if not backup_files:
        log_test("Test 1 - Happy path", False, "No backup files found in /app/backups/")
    else:
        # Use the first available backup file
        backup_file = backup_files[0]
        print(f"Using backup file: {backup_file.name}")
        
        with open(backup_file, 'rb') as f:
            files = {
                'file': (backup_file.name, f, 'application/gzip')
            }
            data = {
                'note': 'Test upload from test_agent',
                'triggered_by': 'test_agent'
            }
            
            response = requests.post(
                f"{API_BASE}/admin/backups/upload",
                headers=AUTH_HEADERS,
                files=files,
                data=data,
                timeout=60
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok') and result.get('backup'):
                backup = result['backup']
                uploaded_backup_id = backup.get('id')
                
                # Verify backup structure
                required_fields = ['id', 'type', 'filename', 'size_bytes', 'verification_passed', 'original_filename']
                missing_fields = [f for f in required_fields if f not in backup]
                
                if missing_fields:
                    log_test("Test 1 - Happy path", False, f"Missing fields: {missing_fields}")
                elif backup['type'] != 'UPLOAD':
                    log_test("Test 1 - Happy path", False, f"Expected type='UPLOAD', got '{backup['type']}'")
                elif not backup['verification_passed']:
                    log_test("Test 1 - Happy path", False, "verification_passed is False")
                else:
                    # Verify backup appears in list
                    list_response = requests.get(
                        f"{API_BASE}/admin/backups",
                        headers=AUTH_HEADERS,
                        timeout=30
                    )
                    
                    if list_response.status_code == 200:
                        backups_list = list_response.json().get('backups', [])
                        found = any(b['id'] == uploaded_backup_id for b in backups_list)
                        
                        if found:
                            log_test("Test 1 - Happy path", True, 
                                   f"Backup uploaded successfully with ID: {uploaded_backup_id}, type=UPLOAD, verification_passed=True")
                        else:
                            log_test("Test 1 - Happy path", False, "Uploaded backup not found in list")
                    else:
                        log_test("Test 1 - Happy path", False, f"Failed to verify backup in list: {list_response.status_code}")
            else:
                log_test("Test 1 - Happy path", False, f"Response missing 'ok' or 'backup': {result}")
        else:
            log_test("Test 1 - Happy path", False, f"Expected 200, got {response.status_code}: {response.text[:200]}")
            
except Exception as e:
    log_test("Test 1 - Happy path", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 2: Unauthorized - no X-User-Role header
# ============================================================================
print("\n\n### TEST 2: Unauthorized - Upload without X-User-Role header")
try:
    backup_dir = Path("/app/backups")
    backup_files = list(backup_dir.glob("*.archive.gz"))
    
    if backup_files:
        backup_file = backup_files[0]
        
        with open(backup_file, 'rb') as f:
            files = {
                'file': (backup_file.name, f, 'application/gzip')
            }
            
            # No auth headers
            response = requests.post(
                f"{API_BASE}/admin/backups/upload",
                files=files,
                timeout=30
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code == 403:
            log_test("Test 2 - Unauthorized", True, "Correctly returned 403 without auth header")
        else:
            log_test("Test 2 - Unauthorized", False, f"Expected 403, got {response.status_code}")
    else:
        log_test("Test 2 - Unauthorized", False, "No backup files available for testing")
        
except Exception as e:
    log_test("Test 2 - Unauthorized", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 3: Invalid extension - upload .txt file
# ============================================================================
print("\n\n### TEST 3: Invalid extension - Upload .txt file")
try:
    # Create a temporary text file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
        tmp.write("This is a test text file, not a backup")
        tmp_path = tmp.name
    
    try:
        with open(tmp_path, 'rb') as f:
            files = {
                'file': ('test.txt', f, 'text/plain')
            }
            
            response = requests.post(
                f"{API_BASE}/admin/backups/upload",
                headers=AUTH_HEADERS,
                files=files,
                timeout=30
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code == 400:
            result = response.json()
            if 'estensione' in result.get('error', '').lower() or 'extension' in result.get('error', '').lower():
                log_test("Test 3 - Invalid extension", True, "Correctly rejected .txt file with 400")
            else:
                log_test("Test 3 - Invalid extension", False, f"Got 400 but wrong error message: {result.get('error')}")
        else:
            log_test("Test 3 - Invalid extension", False, f"Expected 400, got {response.status_code}")
    finally:
        os.unlink(tmp_path)
        
except Exception as e:
    log_test("Test 3 - Invalid extension", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 4: Not a gzip - file without gzip magic bytes
# ============================================================================
print("\n\n### TEST 4: Not a gzip - File without gzip magic bytes")
try:
    # Create a file with .archive.gz extension but not gzip content
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.archive.gz', delete=False) as tmp:
        tmp.write(b"This is not gzip content, just plain text")
        tmp_path = tmp.name
    
    try:
        with open(tmp_path, 'rb') as f:
            files = {
                'file': ('fake.archive.gz', f, 'application/gzip')
            }
            
            response = requests.post(
                f"{API_BASE}/admin/backups/upload",
                headers=AUTH_HEADERS,
                files=files,
                timeout=30
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code == 400:
            result = response.json()
            error_msg = result.get('error', '').lower()
            if 'magic' in error_msg or 'gzip' in error_msg:
                log_test("Test 4 - Not a gzip", True, "Correctly rejected non-gzip file with 400")
            else:
                log_test("Test 4 - Not a gzip", False, f"Got 400 but wrong error message: {result.get('error')}")
        else:
            log_test("Test 4 - Not a gzip", False, f"Expected 400, got {response.status_code}")
    finally:
        os.unlink(tmp_path)
        
except Exception as e:
    log_test("Test 4 - Not a gzip", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 5: Invalid dump - valid gzip but not a mongodump
# ============================================================================
print("\n\n### TEST 5: Invalid dump - Valid gzip but not a mongodump")
try:
    # Create a valid gzip file with random content (not a mongodump)
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.archive.gz', delete=False) as tmp:
        # Write gzip-compressed random content
        with gzip.open(tmp.name, 'wb') as gz:
            gz.write(b"This is random content, not a MongoDB dump\n" * 100)
        tmp_path = tmp.name
    
    try:
        with open(tmp_path, 'rb') as f:
            files = {
                'file': ('random.archive.gz', f, 'application/gzip')
            }
            
            response = requests.post(
                f"{API_BASE}/admin/backups/upload",
                headers=AUTH_HEADERS,
                files=files,
                timeout=60
            )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:300]}")
        
        if response.status_code == 400:
            result = response.json()
            error_msg = result.get('error', '').lower()
            if 'dump' in error_msg or 'mongodb' in error_msg or 'valido' in error_msg:
                log_test("Test 5 - Invalid dump", True, "Correctly rejected invalid MongoDB dump with 400")
            else:
                log_test("Test 5 - Invalid dump", False, f"Got 400 but wrong error message: {result.get('error')}")
        else:
            log_test("Test 5 - Invalid dump", False, f"Expected 400, got {response.status_code}")
    finally:
        os.unlink(tmp_path)
        
except Exception as e:
    log_test("Test 5 - Invalid dump", False, f"Exception: {str(e)}")

# ============================================================================
# TEST 6: Cleanup - Delete uploaded backup
# ============================================================================
print("\n\n### TEST 6: Cleanup - Delete uploaded backup")
if uploaded_backup_id:
    try:
        response = requests.delete(
            f"{API_BASE}/admin/backups/{uploaded_backup_id}",
            headers=AUTH_HEADERS,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                # Verify backup is deleted
                list_response = requests.get(
                    f"{API_BASE}/admin/backups",
                    headers=AUTH_HEADERS,
                    timeout=30
                )
                
                if list_response.status_code == 200:
                    backups_list = list_response.json().get('backups', [])
                    found = any(b['id'] == uploaded_backup_id for b in backups_list)
                    
                    if not found:
                        log_test("Test 6 - Cleanup", True, f"Backup {uploaded_backup_id} successfully deleted")
                    else:
                        log_test("Test 6 - Cleanup", False, "Backup still appears in list after deletion")
                else:
                    log_test("Test 6 - Cleanup", False, f"Failed to verify deletion: {list_response.status_code}")
            else:
                log_test("Test 6 - Cleanup", False, f"Delete response missing 'ok': {result}")
        else:
            log_test("Test 6 - Cleanup", False, f"Expected 200, got {response.status_code}")
            
    except Exception as e:
        log_test("Test 6 - Cleanup", False, f"Exception: {str(e)}")
else:
    log_test("Test 6 - Cleanup", False, "No backup ID to cleanup (Test 1 may have failed)")

# ============================================================================
# BONUS: Verify backup file exists on disk
# ============================================================================
print("\n\n### BONUS: Verify backup files exist on disk")
try:
    backup_dir = Path("/app/backups")
    upload_backups = list(backup_dir.glob("*-UPLOAD.archive.gz"))
    upload_manifests = list(backup_dir.glob("*-UPLOAD.manifest.json"))
    
    print(f"Found {len(upload_backups)} UPLOAD backup files")
    print(f"Found {len(upload_manifests)} UPLOAD manifest files")
    
    if len(upload_backups) > 0:
        print(f"✅ UPLOAD backup files exist on disk")
        for f in upload_backups[:3]:  # Show first 3
            print(f"  - {f.name} ({f.stat().st_size} bytes)")
    else:
        print(f"⚠️  No UPLOAD backup files found (may have been cleaned up)")
        
except Exception as e:
    print(f"❌ Error checking disk files: {str(e)}")

# Print final summary
print_summary()

# Exit with appropriate code
exit(0 if test_results["failed"] == 0 else 1)
