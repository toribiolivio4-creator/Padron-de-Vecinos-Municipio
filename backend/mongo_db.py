from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

MONGO_URL = "mongodb://172.23.160.1:27017"
MONGO_DB_NAME = "padron_vecinos"

_client = None
_db = None


def get_mongo_client():
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=3000)
    return _client


def get_db():
    global _db
    if _db is None:
        client = get_mongo_client()
        _db = client[MONGO_DB_NAME]
    return _db


def ping():
    try:
        get_mongo_client().admin.command("ping")
        return True
    except ConnectionFailure:
        return False


def get_collection(name):
    return get_db()[name]


def close():
    global _client, _db
    if _client:
        _client.close()
    _client = None
    _db = None
