import json
from pathlib import Path
from datetime import datetime

from backend.mongo_db import get_collection, ping

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def import_json_to_mongo(file_path: Path, collection_name: str):
    collection = get_collection(collection_name)
    with open(file_path, encoding="utf-8") as f:
        records = json.load(f)

    if not records:
        print(f"  ⚠️ {file_path.name}: vacío, no se importó nada")
        return 0

    count = 0
    for record in records:
        record["_imported_at"] = datetime.utcnow()
        collection.update_one(
            {"id": record["id"]},
            {"$set": record},
            upsert=True,
        )
        count += 1

    print(f"  ✅ {file_path.name}: {count} registros importados/actualizados")
    return count


def import_all():
    if not ping():
        print("⚠️ MongoDB no está disponible. No se importaron datos.")
        return False

    total = 0
    for fpath in sorted(DATA_DIR.glob("*.json")):
        collection_name = fpath.stem  # Feria, torneo, ajedrez
        total += import_json_to_mongo(fpath, collection_name)

    print(f"📦 Importación completada: {total} registros en total")
    return True


def run():
    print("🔄 Importando JSONs a MongoDB...")
    import_all()


if __name__ == "__main__":
    run()
