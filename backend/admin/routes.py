"""Admin API routes for managing council members."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/admin", tags=["admin"])

# Will be set by main.py
council = None


class MemberConfig(BaseModel):
    id: str
    name: str
    type: str  # cli, ollama, api
    enabled: bool = True
    command: Optional[str] = None
    args: list[str] = []
    host: Optional[str] = None
    model: Optional[str] = None
    provider: Optional[str] = None


class SetChairmanRequest(BaseModel):
    chairman: str


@router.get("/members")
async def list_members():
    """List all council members."""
    if not council:
        raise HTTPException(500, "Council not initialized")
    return {"members": council.get_members()}


@router.post("/members")
async def add_member(member: MemberConfig):
    """Add a new council member."""
    if not council:
        raise HTTPException(500, "Council not initialized")
    
    from models.schemas import CouncilMember, ModelType
    
    try:
        model_type = ModelType(member.type)
    except:
        raise HTTPException(400, f"Invalid model type: {member.type}")
    
    cm = CouncilMember(
        id=member.id,
        name=member.name,
        type=model_type,
        enabled=member.enabled,
        command=member.command,
        args=member.args,
        host=member.host,
        model=member.model,
        provider=member.provider
    )
    
    council.add_member(cm)
    return {"status": "added", "member": cm}


@router.delete("/members/{member_id}")
async def remove_member(member_id: str):
    """Remove a council member."""
    if not council:
        raise HTTPException(500, "Council not initialized")

    if member_id not in council.members:
        raise HTTPException(404, "Member not found")

    council.remove_member(member_id)
    return {"status": "removed", "member_id": member_id}


@router.put("/members/{member_id}")
async def update_member(member_id: str, data: dict):
    """Update a council member."""
    if not council:
        raise HTTPException(500, "Council not initialized")

    if member_id not in council.members:
        raise HTTPException(404, "Member not found")

    # Extract member data from nested structure
    member_data = data.get("member", data)

    from models.schemas import CouncilMember, ModelType

    # Get the existing member to preserve fields not being updated
    existing_member = council.members[member_id]

    try:
        model_type = ModelType(member_data.get("type", existing_member.type.value))
    except:
        raise HTTPException(400, f"Invalid model type: {member_data.get('type')}")

    # Only update fields that are provided in the request
    updated_member = CouncilMember(
        id=member_id,  # Always use the ID from the URL path
        name=member_data.get("name", existing_member.name),
        type=model_type,
        enabled=member_data.get("enabled", existing_member.enabled),
        command=member_data.get("command", existing_member.command),
        args=member_data.get("args", existing_member.args),
        host=member_data.get("host", existing_member.host),
        model=member_data.get("model", existing_member.model),
        provider=member_data.get("provider", existing_member.provider)
    )

    # Update the member
    council.members[member_id] = updated_member
    council.adapters[member_id] = council._create_adapter(updated_member)
    council._save_config()

    return {"status": "updated", "member": updated_member}


@router.get("/chairman")
async def get_chairman():
    """Get current chairman model."""
    if not council:
        raise HTTPException(500, "Council not initialized")
    return {"chairman": council.chairman_id}


@router.post("/chairman")
async def set_chairman(request: SetChairmanRequest):
    """Set the chairman model."""
    if not council:
        raise HTTPException(500, "Council not initialized")
    
    council.set_chairman(request.chairman)
    return {"status": "updated", "chairman": request.chairman}


@router.get("/availability")
async def check_availability():
    """Check availability of all council members."""
    if not council:
        raise HTTPException(500, "Council not initialized")
    
    results = await council.check_availability()
    return {"availability": results}


@router.get("/config")
async def get_config():
    """Get full council configuration."""
    if not council:
        raise HTTPException(500, "Council not initialized")
    
    return {
        "council_members": council.get_members(),
        "chairman": council.chairman_id
    }
