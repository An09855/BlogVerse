from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserCreate(BaseModel):

    email: str = Field(..., min_length=1, max_length=255)
    nickname: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=6)


class UserLogin(BaseModel):

    email: str
    password: str


class UserResponse(BaseModel):

    id: int
    email: str
    nickname: str
    avatar_path: Optional[str] = None
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):

    nickname: Optional[str] = None
    password: Optional[str] = None



class PostCreate(BaseModel):

    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)


class PostUpdate(BaseModel):

    title: Optional[str] = None
    content: Optional[str] = None


class PostResponse(BaseModel):

    id: int
    title: str
    content: str
    author_id: int
    author_nickname: str
    author_avatar: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}



class TokenResponse(BaseModel):

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ResetPassword(BaseModel):

    email: str
    new_password: str = Field(..., min_length=6)
