"""
User profile router: view and update the current user's profile.
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from auth import get_current_user, get_password_hash
from database import get_db
from models import User
from schemas import UserResponse

router = APIRouter(prefix="/api/users", tags=["Users"])

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2 MB


# ---------------------------------------------------------------------------
# GET /api/users/me  –  current user profile
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


# ---------------------------------------------------------------------------
# PUT /api/users/me  –  update profile
# ---------------------------------------------------------------------------


@router.put("/me", response_model=UserResponse)
async def update_me(
    nickname: str | None = Form(None),
    password: str | None = Form(None),
    avatar: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the current user's profile.

    Accepts multipart form data.  All fields are optional — only supplied
    fields are updated.  When a new avatar is uploaded the previous file
    (if any) is deleted from disk.
    """
    # --- nickname -----------------------------------------------------------
    if nickname is not None:
        if len(nickname.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nickname cannot be empty.",
            )
        current_user.nickname = nickname.strip()

    # --- password -----------------------------------------------------------
    if password is not None:
        if len(password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 6 characters.",
            )
        current_user.password_hash = get_password_hash(password)

    # --- avatar -------------------------------------------------------------
    if avatar and avatar.filename:
        # Validate extension
        ext = avatar.filename.rsplit(".", 1)[-1].lower() if "." in avatar.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type '{ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        # Validate size
        content = await avatar.read()
        if len(content) > MAX_AVATAR_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Avatar file too large. Maximum size is {MAX_AVATAR_SIZE // (1024 * 1024)} MB.",
            )

        # Delete old avatar file if it exists
        if current_user.avatar_path:
            old_path = Path(current_user.avatar_path)
            if old_path.exists():
                try:
                    os.remove(old_path)
                except OSError:
                    pass  # best effort

        # Save new avatar
        filename = f"{uuid.uuid4().hex}.{ext}"
        filepath = UPLOADS_DIR / filename
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(content)

        current_user.avatar_path = f"uploads/{filename}"

    db.commit()
    db.refresh(current_user)

    return UserResponse.model_validate(current_user)
