import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.getenv("SQLALCHEMY_DATABASE_URI")
    SQLALCHEMY_TRACK_MODIFICATIONS = os.getenv(
        "SQLALCHEMY_TRACK_MODIFICATIONS",
        "False").lower() in ("true", "1", "t")
    WTF_CSRF_ENABLED = os.getenv("WTF_CSRF_ENABLED",
                                 "True").lower() in ("true", "1", "t")
    DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
