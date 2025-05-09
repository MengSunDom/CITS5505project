import logging
from flask import Flask
import secrets

from models.models import db, init_db
from routes.auth_routes import auth_bp
from routes.expense_routes import expense_bp
from routes.page_routes import page_bp
from routes.share_routes import share_bp
from routes.insights_routes import insights_bp

import config

def create_app():
    app = Flask(__name__)
    app.secret_key = secrets.token_hex(16)
    app.config.from_object(config)

    db.init_app(app)

    with app.app_context():
        init_db()
        app.register_blueprint(auth_bp)
        app.register_blueprint(expense_bp)
        app.register_blueprint(page_bp)
        app.register_blueprint(share_bp)
        app.register_blueprint(insights_bp)

    return app


if __name__ == '__main__':
    app = create_app()

    logging.basicConfig(level=logging.DEBUG)
    app.logger.setLevel(logging.DEBUG)

    app.run(debug=True, port=5001)
