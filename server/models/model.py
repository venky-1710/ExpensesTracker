from pydantic import BaseModel, EmailStr
from datetime import datetime

class User(BaseModel):
    name: str
    age: int
    email: EmailStr

# User creation model (signUP)
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserInDB(BaseModel):
    id: str | None = None
    username: str
    email: EmailStr
    hashed_password: str
    created_at: datetime

# User Login model
class UserLogin(BaseModel):
    username: str
    password : str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True

# Token model
class Token(BaseModel):
    access_token: str
    token_type: str
    


