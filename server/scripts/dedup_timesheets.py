import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGODB_URI = os.getenv('MONGODB_URL')
DB_NAME = os.getenv('DATABASE_NAME', 'ExpenseTrack')

async def cleanup():
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]

    print('Fetching all timesheets...')
    cursor = db.timesheets.find({}, {'_id': 1, 'user_id': 1, 'date': 1}).sort('_id', 1)
    all_docs = await cursor.to_list(length=10000)
    print(f'Total: {len(all_docs)}')

    seen = {}
    to_delete = []
    for doc in all_docs:
        uid = str(doc['user_id'])
        date = str(doc.get('date', ''))
        key = uid + '|' + date
        if key in seen:
            to_delete.append(doc['_id'])
        else:
            seen[key] = doc['_id']

    print(f'Duplicates to remove: {len(to_delete)}')
    if to_delete:
        result = await db.timesheets.delete_many({'_id': {'$in': to_delete}})
        print(f'Deleted: {result.deleted_count}')
    else:
        print('No duplicates found.')

    print('Creating indexes...')
    await db.timesheets.create_index([('user_id', 1), ('date', 1)], unique=True)
    await db.timesheets.create_index([('user_id', 1), ('date', -1)])
    await db.notifications.create_index([('user_id', 1), ('created_at', -1)])
    await db.notifications.create_index([('user_id', 1), ('is_read', 1)])
    print('All done!')
    client.close()

asyncio.run(cleanup())
