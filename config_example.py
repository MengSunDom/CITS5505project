SQLALCHEMY_DATABASE_URI = 'sqlite:///users.db'  # Example: SQLite database
SQLALCHEMY_TRACK_MODIFICATIONS = False

from datetime import timedelta

JWT_SECRET_KEY = "super-secret-key"  # Use os.environ.get() in production
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
JWT_TOKEN_LOCATION = ["cookies"]
JWT_COOKIE_SECURE = False  # Set to True when using HTTPS
JWT_COOKIE_CSRF_PROTECT = False
JWT_ACCESS_COOKIE_PATH = "/"  # ← Required to make the cookie valid for all routes
