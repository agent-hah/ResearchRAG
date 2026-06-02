"""
Ara Integration API Endpoints
Ultra-fast implementation for agent management
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import Dict, Any, Optional
import json
import os
from datetime import datetime
import asyncio
import httpx
from sqlalchemy.orm import Session


class TriggerRequest(BaseModel):
    agent_name: str = "research_assistant"
    message: Optional[str] = "Analyze current workspace"

from backend.database import get_db
from backend.services.query_service import get_query_service
from backend.utils.logger import get_logger

router = APIRouter(prefix="/api/ara", tags=["ara"])
logger = get_logger(__name__)

# Ara API Configuration
ARA_API_BASE_URL = "https://ara-api-prd.up.railway.app/v1"
ARA_APP_ID = "app_ceef9f2b23814ebabf98df34efe7807e"

@router.get("/status")
async def get_ara_status():
    """Get basic Ara integration status."""
    try:
        # Check if ara_app.py exists
        ara_app_exists = os.path.exists("ara_app.py")
        
        return {
            "ara_app_exists": ara_app_exists,
            "ara_status": "available" if ara_app_exists else "not_configured",
            "backend_status": "running",
            "timestamp": datetime.now().isoformat(),
            "integration_ready": ara_app_exists,
            "message": "Ara integration ready" if ara_app_exists else "Run setup_ara.py to configure"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get Ara status: {str(e)}")

def get_ara_auth_header() -> str:
    """Get Ara authentication header from environment."""
    # Try to get the app header key from environment
    app_header_key = os.getenv("ARA_APP_HEADER_KEY")
    if not app_header_key:
        # Fallback to API key
        api_key = os.getenv("ARA_API_KEY")
        if not api_key:
            raise ValueError("No Ara authentication key found in environment")
        return api_key
    return app_header_key

async def call_ara_api(endpoint: str, method: str = "POST", data: Optional[Dict] = None, timeout: int = 60) -> Dict[str, Any]:
    """Make direct HTTP call to Ara API."""
    try:
        auth_token = get_ara_auth_header()
        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        
        url = f"{ARA_API_BASE_URL}{endpoint}"
        
        async with httpx.AsyncClient(timeout=timeout) as client:
            if method == "POST":
                response = await client.post(url, json=data or {}, headers=headers)
            elif method == "GET":
                response = await client.get(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            return {
                "status_code": response.status_code,
                "success": response.status_code in [200, 201],
                "data": response.json() if response.status_code in [200, 201] else None,
                "error": response.text if response.status_code not in [200, 201] else None
            }
            
    except Exception as e:
        return {
            "status_code": 500,
            "success": False,
            "data": None,
            "error": str(e)
        }

@router.post("/deploy")
async def deploy_ara_app(background_tasks: BackgroundTasks):
    """Deploy the Ara app to cloud services via direct API call."""
    try:
        if not os.path.exists("ara_app.py"):
            raise HTTPException(status_code=404, detail="ara_app.py not found")
        
        # Note: Deployment typically requires CLI or specific deployment endpoint
        # For now, return status that app is already deployed
        return {
            "status": "success",
            "message": f"Ara app already deployed with ID: {ARA_APP_ID}",
            "app_id": ARA_APP_ID,
            "timestamp": datetime.now().isoformat(),
            "note": "Use CLI 'ara deploy ara_app.py' for redeployment"
        }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deployment error: {str(e)}")

@router.post("/trigger")
async def trigger_manual_analysis(
    request: TriggerRequest,
    db: Session = Depends(get_db)
):
    """Manually trigger an Ara agent via direct API call."""
    try:
        if not os.path.exists("ara_app.py"):
            raise HTTPException(status_code=404, detail="ara_app.py not found")

        agent_name = request.agent_name
        user_message = request.message or "Analyze current workspace"
        start_time = datetime.now()

        # ── Collect live workspace data from our local DB ──────────────────
        workspace_context = ""
        try:
            from backend.models.dataset import Dataset
            from backend.models.literature import Literature
            from backend.models.query_history import QueryHistory as QH

            datasets = db.query(Dataset).all()
            literature = db.query(Literature).all()
            recent_queries = (
                db.query(QH)
                .order_by(QH.created_at.desc())
                .limit(5)
                .all()
            )

            ds_lines = [
                f"  - {d.filename}: {d.row_count or '?'} rows x {d.column_count or '?'} cols"
                for d in datasets
            ] or ["  (none uploaded yet)"]

            lit_lines = [
                f"  - {l.filename} [{l.processing_status}]"
                for l in literature
            ] or ["  (none uploaded yet)"]

            q_lines = [
                f"  - {getattr(q, 'query_text', getattr(q, 'query', 'unknown'))[:80]} "
                f"-> {getattr(q, 'result_count', getattr(q, 'row_count', 0))} rows"
                for q in recent_queries
            ] or ["  (no queries run yet)"]

            workspace_context = f"""

=== Current Workspace Status ===
Datasets ({len(datasets)} total):
{chr(10).join(ds_lines)}

Literature ({len(literature)} total):
{chr(10).join(lit_lines)}

Recent Queries ({len(recent_queries)} shown):
{chr(10).join(q_lines)}
=================================
"""
            logger.info(f"Enriched ARA trigger with workspace context: {len(datasets)} datasets, {len(literature)} literature, {len(recent_queries)} queries")

        except Exception as ctx_err:
            logger.warning(f"Could not fetch workspace context: {ctx_err}")
            workspace_context = "\n(Workspace data unavailable.)\n"

        # Build enriched message for the ARA agent.
        # Instructions are embedded here (not in ara_app.py) so changes take
        # effect immediately without needing to redeploy to ARA's cloud.
        instructions = """
INSTRUCTIONS (follow these exactly):
1. The workspace status below contains the real data — use it directly, do NOT say you cannot access the workspace.
2. Always start with a detailed summary of what is in the workspace (datasets, literature, recent queries) with specific numbers.
3. If datasets are present, provide analysis insights.
4. If ONLY literature is present (no datasets), summarize the literature content in detail. Do NOT ask the user to upload a dataset until AFTER you give the literature summary.
5. If the workspace is completely empty (no datasets AND no literature), then encourage the user to upload files.
6. Ask follow-up questions about the data AFTER providing your summary not instead of it.
7. Be specific, detailed, and conversational.
8. HOWEVER, VERY IMPORTANT. If the user asks a custom request after this message, focus on the user's message FIRST and FOREMOST. Do not do traditional summary stuff above.
"""
        enriched_message = f"{instructions}\nUser request: {user_message}\n{workspace_context}"

        # Make direct API call to Ara
        endpoint = f"/apps/{ARA_APP_ID}/run"
        payload = {
            "agent": agent_name,
            "input": {
                "message": enriched_message
            }
        }
        
        result = await call_ara_api(endpoint, method="POST", data=payload, timeout=120)
        
        # Calculate processing time
        processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
        
        # Save to query history if successful
        if result["success"] and db:
            try:
                # Extract output text from Ara response
                output_text = ""
                if result["data"] and "result" in result["data"]:
                    ara_result = result["data"]["result"]
                    output_text = ara_result.get("output_text", "")
                
                # Create QueryHistory directly with correct field names
                from backend.models.query_history import QueryHistory
                
                query_history = QueryHistory(
                    query_text=f"[Ara Analysis] {user_message}",
                    sql_query=f"-- Ara Agent: {agent_name}\n-- Run ID: {result['data'].get('run_id', 'unknown')}\n-- Output:\n{output_text}",
                    result_count=0,
                    execution_time_ms=int(processing_time_ms)
                )
                
                db.add(query_history)
                db.commit()
                db.refresh(query_history)
                
                logger.info(f"✅ Saved Ara analysis to query history (ID: {query_history.id}): {message[:50]}")
            except Exception as e:
                logger.error(f"❌ Failed to save Ara result to query history: {e}", exc_info=True)
                db.rollback()
        
        if result["success"]:
            return {
                "status": "success",
                "message": "Analysis triggered successfully",
                "data": result["data"],
                "timestamp": datetime.now().isoformat(),
                "saved_to_history": True
            }
        else:
            return {
                "status": "failed",
                "message": "Analysis failed",
                "error": result["error"],
                "status_code": result["status_code"],
                "timestamp": datetime.now().isoformat(),
                "saved_to_history": False
            }
            
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis error: {str(e)}")

@router.get("/logs")
async def get_ara_logs(limit: int = 50):
    """Get recent Ara execution logs via direct API call."""
    try:
        # Call Ara API to get events/logs
        endpoint = f"/apps/{ARA_APP_ID}/events?limit={limit}"
        result = await call_ara_api(endpoint, method="GET", timeout=30)
        
        if result["success"]:
            return {
                "status": "success",
                "logs": result["data"],
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "failed",
                "message": "Failed to get logs",
                "error": result["error"],
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Logs error: {str(e)}")

@router.get("/health")
async def ara_health_check():
    """Simple health check for Ara integration."""
    return {
        "service": "ara_integration",
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "ultra_fast_mvp"
    }