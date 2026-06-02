#!/usr/bin/env python3
"""
Minimal test server to verify Ara API endpoint works
"""
import asyncio
import httpx
import os
from fastapi import FastAPI
from dotenv import load_dotenv
import uvicorn

load_dotenv()

app = FastAPI()

ARA_API_BASE_URL = "https://ara-api-prd.up.railway.app/v1"
ARA_APP_ID = "app_ceef9f2b23814ebabf98df34efe7807e"

def get_ara_auth_header():
    """Get Ara authentication header from environment."""
    app_header_key = os.getenv("ARA_APP_HEADER_KEY")
    if not app_header_key:
        api_key = os.getenv("ARA_API_KEY")
        if not api_key:
            raise ValueError("No Ara authentication key found")
        return api_key
    return app_header_key

@app.get("/")
async def root():
    return {"status": "ok", "message": "Ara test server running"}

@app.post("/api/ara/trigger")
async def trigger_ara(agent_name: str = "research_assistant", message: str = "Test"):
    """Test Ara API trigger endpoint."""
    try:
        auth_token = get_ara_auth_header()
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        endpoint = f"{ARA_API_BASE_URL}/apps/{ARA_APP_ID}/run"
        payload = {
            "agent": agent_name,
            "input": {"message": message}
        }
        
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(endpoint, json=payload, headers=headers)
            
            return {
                "status": "success" if response.status_code == 200 else "failed",
                "status_code": response.status_code,
                "data": response.json() if response.status_code == 200 else None,
                "error": response.text if response.status_code != 200 else None
            }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    print("🚀 Starting Ara Test Server on http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)
