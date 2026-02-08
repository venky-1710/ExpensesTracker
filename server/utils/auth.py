import os
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
from database.database import db
from jose import jwt

SECRET_KEY = os.getenv("SECRET_KEY", "change_this_dev_secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# IMPORTANT: use bcrypt_sha256, not bcrypt
pwd_context = CryptContext(
    schemes=["bcrypt_sha256"],
    deprecated="auto",
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

MAX_PASSWORD_BYTES = 72

def ensure_password_length(password: str) -> None:
    if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password too long; must be 72 bytes or less",
        )

def get_password_hash(password: str) -> str:
    ensure_password_length(password)
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    ensure_password_length(plain_password)
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.now() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_user_by_username_or_email(identifier: str):
    user = await db["auth_users"].find_one({"$or": [{"username": identifier}, {"email": identifier}]})
    if user:
        user["id"] = str(user.pop("_id"))
    return user


async def get_user_by_email(email: str):
    """Get user by email only"""
    user = await db["auth_users"].find_one({"email": email, "is_deleted": False})
    if user:
        user["id"] = str(user.pop("_id"))
    return user


# Dependency for getting current authenticated user

# Dependency for getting current authenticated user
async def get_current_user(request: Request = None, token: str = Depends(oauth2_scheme)):
    """Get current user from JWT token (Header or Cookie)"""
    from bson import ObjectId
    from jose import JWTError
    from fastapi import HTTPException, status
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # If token is not in header (oauth2_scheme), check cookie
    if not token and request:
        token = request.cookies.get("access_token")
        if token and token.startswith("Bearer "):
             token = token.split(" ")[1]
    
    if not token:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db["auth_users"].find_one({"_id": ObjectId(user_id), "is_deleted": False})
    if not user:
        raise credentials_exception
    
    user["id"] = str(user.pop("_id"))
    return user


def require_role(required_role: str):
    """Decorator to require specific role"""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        if current_user.get("role") != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. {required_role} role required."
            )
        return current_user
    return role_checker


