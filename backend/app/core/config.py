import os


class Settings:
    def __init__(self):
        self.database_url: str = os.getenv(
            "DATABASE_URL",
            "postgresql://postgres:dacia@172.23.160.1:5432/postgres",
        )
        self.mongo_url: str = os.getenv(
            "MONGO_URL",
            "mongodb://172.23.160.1:27017",
        )
        self.mongo_db_name: str = os.getenv("MONGO_DB_NAME", "Personas")
        self.webhook_secret: str = os.getenv("WEBHOOK_SECRET", "")


settings = Settings()
