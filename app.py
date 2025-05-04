from flask import Flask
import secrets

from models.models import db, init_db
from routes.auth_routes import auth_bp
from routes.expense_routes import expense_bp
from routes.page_routes import page_bp


def create_app():
    app = Flask(__name__)
    app.secret_key = secrets.token_hex(16)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        init_db()
        app.register_blueprint(auth_bp)
        app.register_blueprint(expense_bp)
        app.register_blueprint(page_bp)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
