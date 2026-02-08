"""
Auth Service - Business logic for authentication
"""
from datetime import datetime
from fastapi import HTTPException, status
from database.queries.user_queries import get_user_by_email_query, get_user_by_username_query, create_user_query
from utils.auth import get_password_hash, verify_password, create_access_token
from models.payloads import UserCreate, Token
from typing import Dict, Any

class AuthService:
    """Authentication business logic"""

    @staticmethod
    async def signup(payload: UserCreate) -> Dict[str, Any]:
        """Register a new user"""
        
        # Check email
        existing_email = await get_user_by_email_query(payload.email)
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
            
        # Check username
        existing_username = await get_user_by_username_query(payload.username)
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
            
        hashed_password = get_password_hash(payload.password)
        
        user_doc = {
            "full_name": payload.full_name,
            "username": payload.username,
            "email": payload.email,
            "password_hash": hashed_password,
            "phone": payload.phone,
            "profile_image": None,
            "role": "user",
            "currency_preference": "USD",
            "theme_preference": "light",
            "is_deleted": False,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        
        created_user = await create_user_query(user_doc)
        created_user.pop("password_hash", None)
        
        return created_user

    @staticmethod
    async def login(form_data) -> Dict[str, str]:
        """Login user and return token"""
        # User auth.py utils for verification but query here
        user = await get_user_by_email_query(form_data.username) # Using email as username
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Incorrect email or password"
            )
            
        if not verify_password(form_data.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Incorrect email or password"
            )
            
        access_token = create_access_token(data={"sub": user["id"]})
        return {"access_token": access_token, "token_type": "bearer"}
