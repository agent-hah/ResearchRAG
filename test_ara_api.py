#!/usr/bin/env python3
"""
Test script to verify Ara API integration with direct HTTP calls
"""
import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

ARA_API_BASE_URL = "https://ara-api-prd.up.railway.app/v1"
ARA_APP_ID = "app_ceef9f2b23814ebabf98df34efe7807e"

async def test_ara_api():
    """Test direct API call to Ara."""
    
    # Get auth token from environment
    auth_token = os.getenv("ARA_APP_HEADER_KEY")
    if not auth_token:
        print("❌ ARA_APP_HEADER_KEY not found in environment")
        return
    
    print(f"🔑 Using auth token: {auth_token[:20]}...")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    endpoint = f"{ARA_API_BASE_URL}/apps/{ARA_APP_ID}/run"
    payload = {
        "agent": "research_assistant",
        "input": {
            "message": "Test analysis request"
        }
    }
    
    print(f"📡 Calling: {endpoint}")
    print(f"📦 Payload: {payload}")
    
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            
            print(f"\n✅ Status Code: {response.status_code}")
            print(f"📄 Response: {response.text[:500]}")
            
            if response.status_code == 200:
                print("\n🎉 SUCCESS! Ara API is working with direct HTTP calls")
                return True
            else:
                print(f"\n❌ FAILED with status {response.status_code}")
                return False
                
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Ara API Integration")
    print("=" * 50)
    result = asyncio.run(test_ara_api())
    exit(0 if result else 1)
