"""
Authentication router: registration, login, and password reset.
"""

import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from auth import create_access_token, get_password_hash, verify_password
from database import get_db
from models import User
from schemas import ResetPassword, TokenResponse, UserLogin, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

UPLOADS_DIR = Path("uploads")
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
MAX_AVATAR_SIZE = 2 * 1024 * 1024  # 2 MB


def _validate_avatar(file: UploadFile) -> None:
    """Validate that the uploaded file is an allowed image type and within size limits."""
    if file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type '{ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
            )
    # Read content to check size
    content = file.file.read()
    if len(content) > MAX_AVATAR_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Avatar file too large. Maximum size is {MAX_AVATAR_SIZE // (1024 * 1024)} MB.",
        )
    # Rewind so the caller can read again
    file.file.seek(0)
    return content


async def _save_avatar(file: UploadFile) -> str:
    """Save an uploaded avatar and return the relative path."""
    content = _validate_avatar(file)
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = UPLOADS_DIR / filename
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(content)
    return f"uploads/{filename}"


# ---------------------------------------------------------------------------
# POST /api/auth/register
# ---------------------------------------------------------------------------


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    email: str = Form(...),
    nickname: str = Form(...),
    password: str = Form(...),
    avatar: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """Register a new user.

    Accepts multipart form data with an optional avatar image upload.
    Returns a JWT access token and the created user object.
    """
    # Check email uniqueness
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists.",
        )

    if len(password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters.",
        )

    avatar_path: str | None = None
    if avatar and avatar.filename:
        avatar_path = await _save_avatar(avatar)

    user = User(
        email=email,
        nickname=nickname,
        password_hash=get_password_hash(password),
        avatar_path=avatar_path,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access_token = create_access_token({"user_id": user.id})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /api/auth/login
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse)
def login(
    payload: UserLogin,
    db: Session = Depends(get_db),
):
    """Authenticate a user with email and password.

    Returns a JWT access token and the user object on success.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    access_token = create_access_token({"user_id": user.id})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /api/auth/reset-password
# ---------------------------------------------------------------------------


@router.post("/reset-password")
def reset_password(
    payload: ResetPassword,
    db: Session = Depends(get_db),
):
    """Reset a user's password by email.

    In a production system this would involve email verification; here we
    allow direct reset for simplicity.
    """
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found with this email address.",
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters.",
        )

    user.password_hash = get_password_hash(payload.new_password)
    db.commit()

    return {"message": "Password has been reset successfully."}
