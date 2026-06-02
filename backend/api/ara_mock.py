"""
Mock/stub ARA integration endpoints.

ARA integration was removed pending a fix. These endpoints provide
graceful error responses so the frontend remains functional.
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/api/ara", tags=["ara"])


@router.get("/status")
async def get_ara_status():
    return {
        "status": "not_configured",
        "message": "ARA integration temporarily disabled pending fix",
        "backend_status": "running",
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/trigger")
async def trigger_manual_analysis():
    return {
        "status": "error",
        "message": "ARA integration is temporarily disabled",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/logs")
async def get_ara_logs():
    return {
        "status": "success",
        "logs": [],
        "message": "ARA integration is temporarily disabled",
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/health")
async def ara_health_check():
    return {
        "service": "ara_integration",
        "status": "disabled",
        "message": "ARA integration is temporarily disabled pending fix",
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/deploy")
async def deploy_ara_app():
    return {
        "status": "error",
        "message": "ARA integration is temporarily disabled",
        "timestamp": datetime.now().isoformat(),
    }
