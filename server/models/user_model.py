from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    """User registration payload"""
    full_name: str = Field(..., min_length=2, max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    phone: Optional[str] = None



class UserLogin(BaseModel):
    """User login payload"""
    email: str
    password: str


class UserProfileResponse(BaseModel):
    """Complete user profile response"""
    id: str
    full_name: str
    username: Optional[str] = None  # Optional for backward compatibility
    email: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None  # Base64 encoded
    role: str = "user"
    currency_preference: str = "USD"
    theme_preference: str = "light"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """Update user profile"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    phone: Optional[str] = None
    profile_image: Optional[str] = None


class PasswordChange(BaseModel):
    """Change password payload"""
    old_password: str
    new_password: str = Field(..., min_length=8, max_length=72)


class UserPreferences(BaseModel):
    """User preferences update"""
    currency_preference: Optional[str] = None
    theme_preference: Optional[str] = Field(None, pattern="^(light|dark)$")


class UserInDB(BaseModel):
    """User document in database"""
    id: Optional[str] = None
    full_name: str
    username: Optional[str] = None  # Optional for backward compatibility
    email: EmailStr
    password_hash: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    role: str = "user"
    currency_preference: str = "USD"
    theme_preference: str = "light"
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True




class Token(BaseModel):
    """JWT token response"""
    access_token: str
    token_type: str
