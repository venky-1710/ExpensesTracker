import os
import json
from bson import ObjectId
from bson.json_util import dumps
from database.database import db
from models.model import User 
import requests
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.get("/get-mobiles")
async def display():
    API_URL = os.getenv("url") # API URL fetch
    response = requests.get(API_URL) # To get response from API_URL
    return {"fetched data": response.json()}

@router.post("/add-user") # post request to /add-user
async def add_user(user: User): # User is a Pydantic model injected from request body (auto validates)
    user_dict = user.model_dump()
    result = await db["users"].insert_one(user_dict)
    user_dict["_id"] = str(result.inserted_id)
    return user_dict

@router.get('/get-user')
async def get_users():
    cursor = db.users.find({})
    users_list = await cursor.to_list(length=None)
    json_data = json.loads(dumps(users_list))
    return json_data

@router.put('/users/{user_id}')
async def update_user(user_id: str, body: User):
    update_data = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")

    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    updated_user["id"] = str(updated_user.pop("_id"))
    return updated_user


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(user_id: str):
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return None


