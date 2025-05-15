import logging
from flask import Flask, render_template, jsonify, request
import secrets
from flask_migrate import Migrate
import traceback
from flask_wtf import CSRFProtect

from models.models import db, init_db
from routes.auth_routes import auth_bp
from routes.expense_routes import expense_bp
from routes.page_routes import page_bp
from routes.share_routes import share_bp
from routes.insights_routes import insights_bp
from routes.income_routes import income_bp
from routes.shareIncome_routes import shareIncome_bp
from routes.error_routes import error_bp

import config

migrate = Migrate()
csrf = CSRFProtect()


def register_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)


def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(expense_bp)
    app.register_blueprint(income_bp)
    app.register_blueprint(page_bp)
    app.register_blueprint(share_bp)
    app.register_blueprint(shareIncome_bp)
    app.register_blueprint(insights_bp)
    app.register_blueprint(error_bp)


def register_error_handlers(app):

    @app.errorhandler(500)
    def handle_500_error(e):
        app.logger.error(f"500 error: {str(e)}")
        app.logger.error(traceback.format_exc())

        if request.path.startswith('/api/'):
            return jsonify({
                "error": "Internal Server Error",
                "message": str(e),
                "traceback": traceback.format_exc()
            }), 500

        return render_template('error.html',
                               error=str(e),
                               traceback=traceback.format_exc()), 500


def create_app(testing=False):
    app = Flask(__name__)
    app.config.from_object(config)
    app.secret_key = app.config.get('SECRET_KEY', secrets.token_hex(32))

    if testing:
        app.config["TESTING"] = True
        app.config["PROPAGATE_EXCEPTIONS"] = False
        # Use in-memory SQLite database for testing
        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        app.config["WTF_CSRF_ENABLED"] = False

    register_extensions(app)

    with app.app_context():
        init_db()
        register_blueprints(app)
        register_error_handlers(app)

    return app


if __name__ == '__main__':
    app = create_app()

    logging.basicConfig(level=logging.DEBUG)
    app.logger.setLevel(logging.DEBUG)

    app.run(debug=False, port=5001)
