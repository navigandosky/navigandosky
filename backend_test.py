#!/usr/bin/env python3
"""
Backend API Tests for Trivor Website
Tests all backend endpoints as specified in the review request
"""

import requests
import json
import base64
from datetime import datetime
import sys
import os

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BACKEND_URL = get_backend_url()
if not BACKEND_URL:
    print("ERROR: Could not get REACT_APP_BACKEND_URL from frontend/.env")
    sys.exit(1)

print(f"Testing backend at: {BACKEND_URL}")

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Trivor2024$"

# TRIVORDOC credentials
TRIVORDOC_USERNAME = "Trivor_doc"
TRIVORDOC_PASSWORD = "Doc_trivor$"

def create_auth_header():
    """Create Basic Auth header for admin endpoints"""
    credentials = f"{ADMIN_USERNAME}:{ADMIN_PASSWORD}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded_credentials}"}

def create_trivordoc_auth_header():
    """Create Basic Auth header for TRIVORDOC endpoints"""
    credentials = f"{TRIVORDOC_USERNAME}:{TRIVORDOC_PASSWORD}"
    encoded_credentials = base64.b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded_credentials}"}

def test_api_health():
    """Test basic API connectivity"""
    print("\n=== Testing API Health ===")
    try:
        response = requests.get(f"{BACKEND_URL}/api/health", timeout=10)
        print(f"Health check status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            return True
        else:
            print(f"Health check failed: {response.text}")
            return False
    except Exception as e:
        print(f"Health check error: {e}")
        return False

def test_get_settings():
    """Test GET /api/settings - should return hero images configuration"""
    print("\n=== Testing GET /api/settings ===")
    try:
        response = requests.get(f"{BACKEND_URL}/api/settings", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Settings data: {json.dumps(data, indent=2)}")
            
            # Verify structure
            if 'hero_images' in data:
                print(f"✅ Hero images found: {len(data['hero_images'])} images")
                for i, img in enumerate(data['hero_images']):
                    if 'url' in img and 'title' in img:
                        print(f"  Image {i+1}: {img['title']} - {img['url']}")
                    else:
                        print(f"  ❌ Image {i+1} missing url or title")
                return True
            else:
                print("❌ No hero_images field in response")
                return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_projects():
    """Test GET /api/projects - should return list of projects (3 projects expected)"""
    print("\n=== Testing GET /api/projects ===")
    try:
        response = requests.get(f"{BACKEND_URL}/api/projects", timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            projects = response.json()
            print(f"Projects count: {len(projects)}")
            
            if len(projects) >= 3:
                print("✅ Expected 3+ projects found")
                for i, project in enumerate(projects[:3]):
                    print(f"  Project {i+1}: {project.get('title', 'No title')} - {project.get('client', 'No client')}")
                    # Verify required fields
                    required_fields = ['id', 'title', 'client', 'category', 'description']
                    missing_fields = [field for field in required_fields if field not in project]
                    if missing_fields:
                        print(f"    ❌ Missing fields: {missing_fields}")
                    else:
                        print(f"    ✅ All required fields present")
                return True
            else:
                print(f"❌ Expected 3+ projects, got {len(projects)}")
                return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_post_contact():
    """Test POST /api/contact with valid data - should create a message"""
    print("\n=== Testing POST /api/contact ===")
    
    contact_data = {
        "name": "Mario Rossi",
        "email": "mario.rossi@example.com",
        "phone": "+39 123 456 7890",
        "subject": "Richiesta informazioni",
        "message": "Salve, vorrei maggiori informazioni sui vostri servizi di digitalizzazione."
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/api/contact",
            json=contact_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Contact message created successfully")
            print(f"Message ID: {data.get('id', 'No ID')}")
            print(f"Name: {data.get('name', 'No name')}")
            print(f"Email: {data.get('email', 'No email')}")
            print(f"Subject: {data.get('subject', 'No subject')}")
            
            # Verify required fields are returned
            required_fields = ['id', 'name', 'email', 'subject', 'message', 'created_at']
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                print(f"❌ Missing fields in response: {missing_fields}")
                return False
            else:
                print("✅ All required fields present in response")
                return True
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_admin_login():
    """Test admin login at /api/admin/verify with credentials admin:Trivor2024$"""
    print("\n=== Testing Admin Login /api/admin/verify ===")
    
    try:
        headers = create_auth_header()
        response = requests.get(f"{BACKEND_URL}/api/admin/verify", headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Admin login successful")
            print(f"Response: {data}")
            
            if data.get('authenticated') == True and data.get('username') == ADMIN_USERNAME:
                print("✅ Authentication verified correctly")
                return True
            else:
                print("❌ Authentication response invalid")
                return False
        elif response.status_code == 401:
            print(f"❌ Authentication failed - Invalid credentials")
            return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_put_admin_settings():
    """Test PUT /api/admin/settings with new hero_images - should update site settings"""
    print("\n=== Testing PUT /api/admin/settings ===")
    
    new_settings = {
        "hero_images": [
            {"url": "https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=1920&q=80", "title": "Costa Smeralda Updated"},
            {"url": "https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200&q=80", "title": "Grotte Marine Updated"},
            {"url": "https://images.unsplash.com/photo-1523531294919-4bcd7c65e216?w=1200&q=80", "title": "Borghi Storici Updated"},
            {"url": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80", "title": "Test Image"}
        ]
    }
    
    try:
        headers = create_auth_header()
        headers["Content-Type"] = "application/json"
        
        response = requests.put(
            f"{BACKEND_URL}/api/admin/settings",
            json=new_settings,
            headers=headers,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Settings updated successfully")
            print(f"Updated hero images count: {len(data.get('hero_images', []))}")
            
            # Verify the update worked
            if len(data.get('hero_images', [])) == 4:
                print("✅ All 4 hero images updated correctly")
                for i, img in enumerate(data['hero_images']):
                    print(f"  Image {i+1}: {img.get('title', 'No title')}")
                return True
            else:
                print(f"❌ Expected 4 hero images, got {len(data.get('hero_images', []))}")
                return False
        elif response.status_code == 401:
            print(f"❌ Authentication failed")
            return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_admin_stats():
    """Test admin stats endpoint to verify data integrity"""
    print("\n=== Testing Admin Stats ===")
    try:
        headers = create_auth_header()
        response = requests.get(f"{BACKEND_URL}/api/admin/stats", headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Admin stats retrieved")
            print(f"Projects: {data.get('projects', 0)}")
            print(f"Messages: {data.get('messages', 0)}")
            print(f"Unread messages: {data.get('unread_messages', 0)}")
            return True
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_checkdb_databases():
    """Test CheckDB Multi-Database API - GET /api/checkdb/databases"""
    print("\n=== Testing CheckDB Multi-Database API ===")
    try:
        headers = create_trivordoc_auth_header()
        response = requests.get(f"{BACKEND_URL}/api/checkdb/databases", headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ CheckDB databases retrieved successfully")
            print(f"Database count: {data.get('count', 0)}")
            
            databases = data.get('databases', [])
            expected_dbs = ['trivor_db', 'spoke_galaveras', 'spoke_ghivine']
            found_dbs = [db['name'] for db in databases]
            
            print(f"Found databases: {found_dbs}")
            
            # Check if expected databases are present
            missing_dbs = [db for db in expected_dbs if db not in found_dbs]
            if missing_dbs:
                print(f"⚠️ Missing expected databases: {missing_dbs}")
            else:
                print(f"✅ All expected databases found")
            
            # Check database structure
            for db in databases:
                if 'name' in db and 'sizeOnDisk' in db:
                    print(f"  Database: {db['name']} - Size: {db['sizeOnDisk']} bytes")
                else:
                    print(f"  ❌ Database {db.get('name', 'unknown')} missing required fields")
            
            return len(databases) > 0
        elif response.status_code == 401:
            print(f"❌ Authentication failed - Check TRIVORDOC credentials")
            return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_checkdb_specific_database():
    """Test CheckDB Specific Database Status - GET /api/checkdb/database/trivor_db/status"""
    print("\n=== Testing CheckDB Specific Database Status ===")
    try:
        headers = create_trivordoc_auth_header()
        response = requests.get(f"{BACKEND_URL}/api/checkdb/database/trivor_db/status", headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Database status retrieved successfully")
            
            database_info = data.get('database', {})
            collections = data.get('collections', [])
            
            print(f"Database: {database_info.get('name', 'unknown')}")
            print(f"Collections count: {database_info.get('collections', 0)}")
            print(f"Total objects: {database_info.get('objects', 0)}")
            print(f"Data size: {database_info.get('dataSize', 0)} bytes")
            
            if collections:
                print(f"Collections found: {len(collections)}")
                for coll in collections[:5]:  # Show first 5 collections
                    print(f"  - {coll.get('name', 'unknown')}: {coll.get('count', 0)} documents")
            else:
                print("No collections found")
            
            # Verify required fields
            required_db_fields = ['name', 'collections', 'dataSize', 'objects']
            missing_fields = [field for field in required_db_fields if field not in database_info]
            if missing_fields:
                print(f"❌ Missing database fields: {missing_fields}")
                return False
            else:
                print("✅ All required database fields present")
                return True
        elif response.status_code == 401:
            print(f"❌ Authentication failed - Check TRIVORDOC credentials")
            return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_trivordoc_document_creation():
    """Test TRIVORDOC Document Creation - POST /api/trivordoc/documents"""
    print("\n=== Testing TRIVORDOC Document Creation ===")
    
    document_data = {
        "gruppo": "Test Group",
        "tipo_documento": "pdf",
        "data_creazione": "2025-12-30",
        "autore": "Test User",
        "keywords": ["test", "api"],
        "categoria": "Altro",
        "descrizione": "Test document created via API"
    }
    
    try:
        headers = create_trivordoc_auth_header()
        headers["Content-Type"] = "application/json"
        
        response = requests.post(
            f"{BACKEND_URL}/api/trivordoc/documents",
            json=document_data,
            headers=headers,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Document created successfully")
            doc_id = data.get('id', '')
            print(f"Document ID: {doc_id}")
            print(f"Message: {data.get('message', '')}")
            
            # Verify document ID format (should be DOC-YYYY-XXXX)
            if doc_id.startswith('DOC-2025-') or doc_id.startswith('DOC-2024-'):
                print(f"✅ Document ID format is correct: {doc_id}")
                return doc_id  # Return doc_id for file upload test
            else:
                print(f"❌ Document ID format unexpected: {doc_id}")
                return False
        elif response.status_code == 401:
            print(f"❌ Authentication failed - Check TRIVORDOC credentials")
            return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_trivordoc_file_upload(doc_id):
    """Test TRIVORDOC File Upload - POST /api/trivordoc/documents/{doc_id}/upload"""
    print(f"\n=== Testing TRIVORDOC File Upload for Document {doc_id} ===")
    
    if not doc_id:
        print("❌ No document ID provided - skipping file upload test")
        return False
    
    try:
        headers = create_trivordoc_auth_header()
        
        # Create a simple test file
        test_content = "This is a test file for TRIVORDOC upload functionality.\nCreated for API testing purposes."
        
        files = {
            'file': ('test_document.txt', test_content, 'text/plain')
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/trivordoc/documents/{doc_id}/upload",
            files=files,
            headers=headers,
            timeout=10
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ File uploaded successfully")
            print(f"Message: {data.get('message', '')}")
            
            allegato = data.get('allegato', {})
            if allegato:
                print(f"File name: {allegato.get('nome', '')}")
                print(f"File URL: {allegato.get('url', '')}")
                print(f"File type: {allegato.get('tipo', '')}")
                print(f"File size: {allegato.get('size', 0)} bytes")
                
                # Verify required fields
                required_fields = ['nome', 'url', 'tipo', 'size']
                missing_fields = [field for field in required_fields if field not in allegato]
                if missing_fields:
                    print(f"❌ Missing attachment fields: {missing_fields}")
                    return False
                else:
                    print("✅ All required attachment fields present")
                    return True
            else:
                print("❌ No attachment info in response")
                return False
        elif response.status_code == 401:
            print(f"❌ Authentication failed - Check TRIVORDOC credentials")
            return False
        elif response.status_code == 404:
            print(f"❌ Document not found - Document ID may be invalid")
            return False
        else:
            print(f"❌ Failed with status {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Run all backend tests"""
    print("=" * 60)
    print("TRIVOR BACKEND API TESTS")
    print("=" * 60)
    
    test_results = {}
    
    # Test basic connectivity first
    test_results['health'] = test_api_health()
    
    # Test public endpoints
    test_results['settings'] = test_get_settings()
    test_results['projects'] = test_get_projects()
    test_results['contact'] = test_post_contact()
    
    # Test admin endpoints
    test_results['admin_login'] = test_admin_login()
    test_results['admin_settings'] = test_put_admin_settings()
    test_results['admin_stats'] = test_admin_stats()
    
    # Test TRIVORDOC and CheckDB endpoints (Review Request Tests)
    print("\n" + "=" * 60)
    print("REVIEW REQUEST SPECIFIC TESTS")
    print("=" * 60)
    
    test_results['checkdb_databases'] = test_checkdb_databases()
    test_results['checkdb_specific_db'] = test_checkdb_specific_database()
    
    # Test document creation and file upload (linked tests)
    doc_id = test_trivordoc_document_creation()
    if doc_id and doc_id != False:
        test_results['trivordoc_document_creation'] = True
        test_results['trivordoc_file_upload'] = test_trivordoc_file_upload(doc_id)
    else:
        test_results['trivordoc_document_creation'] = False
        test_results['trivordoc_file_upload'] = False
        print("❌ Skipping file upload test due to document creation failure")
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = 0
    total = len(test_results)
    
    # Group tests by category
    basic_tests = ['health', 'settings', 'projects', 'contact']
    admin_tests = ['admin_login', 'admin_settings', 'admin_stats']
    review_tests = ['checkdb_databases', 'checkdb_specific_db', 'trivordoc_document_creation', 'trivordoc_file_upload']
    
    print("BASIC API TESTS:")
    for test_name in basic_tests:
        if test_name in test_results:
            status = "✅ PASS" if test_results[test_name] else "❌ FAIL"
            print(f"  {test_name.upper()}: {status}")
            if test_results[test_name]:
                passed += 1
    
    print("\nADMIN API TESTS:")
    for test_name in admin_tests:
        if test_name in test_results:
            status = "✅ PASS" if test_results[test_name] else "❌ FAIL"
            print(f"  {test_name.upper()}: {status}")
            if test_results[test_name]:
                passed += 1
    
    print("\nREVIEW REQUEST TESTS:")
    for test_name in review_tests:
        if test_name in test_results:
            status = "✅ PASS" if test_results[test_name] else "❌ FAIL"
            print(f"  {test_name.upper()}: {status}")
            if test_results[test_name]:
                passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All backend tests PASSED!")
        return True
    else:
        print(f"⚠️  {total - passed} tests FAILED")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)