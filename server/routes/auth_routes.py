from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from database.database import db
from models.model import UserCreate, UserResponse, Token
from utils.auth import *

auth_router = APIRouter(prefix="/auth", tags=["auth"])

@auth_router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(payload: UserCreate):
    existing = await db["auth_users"].find_one(
        {"$or": [{"username": payload.username}, {"email": payload.email}]}
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username or email already exists",
        )

    hashed_password = get_password_hash(payload.password)

    doc = {
        "username": payload.username,
        "email": payload.email,
        "hashed_password": hashed_password,
        "created_at": datetime.now(),
    }

    result = await db["auth_users"].insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("hashed_password")
    return UserResponse(**doc)

@auth_router.options("/signup")
async def signup_options():
    return {"message": "OK"}


@auth_router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):  # [web:5]
    # validate_password_length(form_data.password)
    user = await get_user_by_username_or_email(form_data.username)
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect username or password")

    access_token = create_access_token(data={"sub": user["id"]})
    return {"access_token": access_token, "token_type": "bearer"}

@auth_router.options("/login")
async def login_options():
    return {"message": "OK"}

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await db["auth_users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise credentials_exception

    user["id"] = str(user.pop("_id"))
    return user

@auth_router.get("/me", response_model=UserResponse)
async def read_me(current_user: dict = Depends(get_current_user)):
    return current_user
