from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# Auth
class LoginRequest(BaseModel):
    password: str


class LoginResponse(BaseModel):
    message: str = "logged in"


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=1)


class ChangePasswordResponse(BaseModel):
    message: str = "password changed"


class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ApiKeyResponse(BaseModel):
    id: int
    name: str
    created_at: datetime
    last_used: Optional[datetime]


class ApiKeyCreated(ApiKeyResponse):
    key: str  # Only returned on creation, never stored


# Transfers
TransferType = Literal["text", "file"]


class BatchDeleteRequest(BaseModel):
    ids: list[int] = Field(..., max_length=1000)


class TransferCreate(BaseModel):
    type: TransferType
    content: str = Field(..., min_length=1)


class TransferRename(BaseModel):
    content: str = Field(..., min_length=1)


class TransferResponse(BaseModel):
    id: int
    type: TransferType
    content: str
    created_at: datetime
    size: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
