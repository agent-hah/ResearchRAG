#!/usr/bin/env python3
"""
Test script to verify Ara analysis results are saved to query history
"""
import requests
import time
import json

BACKEND_URL = "http://localhost:8000"

def test_ara_persistence():
    """Test that Ara analysis is saved to query history."""
    
    print("🧪 Testing Ara Analysis Persistence")
    print("=" * 50)
    
    # Step 1: Get initial query history count
    print("\n1. Getting initial query history...")
    response = requests.get(f"{BACKEND_URL}/api/v1/query/history?page=1&page_size=100")
    if response.status_code != 200:
        print(f"❌ Failed to get query history: {response.status_code}")
        return False
    
    initial_queries = response.json()
    initial_count = len(initial_queries)
    print(f"   Initial query count: {initial_count}")
    
    # Step 2: Trigger Ara analysis
    print("\n2. Triggering Ara analysis...")
    test_message = "Test analysis for persistence verification"
    response = requests.post(
        f"{BACKEND_URL}/api/ara/trigger",
        params={"message": test_message}
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to trigger analysis: {response.status_code}")
        print(f"   Response: {response.text}")
        return False
    
    result = response.json()
    print(f"   Status: {result.get('status')}")
    print(f"   Saved to history: {result.get('saved_to_history', False)}")
    
    if result.get('status') != 'success':
        print(f"❌ Analysis failed: {result.get('message')}")
        return False
    
    # Step 3: Wait a moment for database commit
    time.sleep(1)
    
    # Step 4: Check query history again
    print("\n3. Checking query history...")
    response = requests.get(f"{BACKEND_URL}/api/v1/query/history?page=1&page_size=100")
    if response.status_code != 200:
        print(f"❌ Failed to get updated query history: {response.status_code}")
        return False
    
    updated_queries = response.json()
    updated_count = len(updated_queries)
    print(f"   Updated query count: {updated_count}")
    
    # Step 5: Verify new entry exists
    if updated_count <= initial_count:
        print(f"❌ Query history count did not increase!")
        print(f"   Expected: > {initial_count}, Got: {updated_count}")
        return False
    
    # Step 6: Find the Ara query
    print("\n4. Looking for Ara query in history...")
    ara_query = None
    for query in updated_queries:
        if "[Ara Analysis]" in query.get("query", ""):
            ara_query = query
            break
    
    if not ara_query:
        print("❌ Could not find Ara query in history!")
        return False
    
    print(f"   ✅ Found Ara query!")
    print(f"   Query: {ara_query['query'][:80]}...")
    print(f"   Created: {ara_query['created_at']}")
    print(f"   Processing time: {ara_query['processing_time_ms']}ms")
    
    # Step 7: Verify query content
    if test_message not in ara_query['query']:
        print(f"❌ Query doesn't contain expected message!")
        print(f"   Expected: '{test_message}'")
        print(f"   Got: '{ara_query['query']}'")
        return False
    
    print("\n" + "=" * 50)
    print("✅ SUCCESS! Ara analysis is being saved to query history")
    print("\nYou can now:")
    print("- View Ara analyses in the Query History page")
    print("- Export Ara results with other queries")
    print("- Search and filter Ara analyses")
    
    return True

if __name__ == "__main__":
    try:
        success = test_ara_persistence()
        exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
