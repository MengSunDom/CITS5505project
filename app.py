import logging
from flask import Flask, render_template, redirect, url_for, session, jsonify, request
import secrets
from flask_migrate import Migrate
import traceback

from models.models import db, init_db, User
from routes.auth_routes import auth_bp
from routes.expense_routes import expense_bp
from routes.page_routes import page_bp
from routes.share_routes import share_bp
from routes.insights_routes import insights_bp
from routes.income_routes import income_bp
from routes.shareIncome_routes import shareIncome_bp
from routes.shared_data_routes import shared_data_bp
from flask_sqlalchemy import SQLAlchemy

import config

def create_app():
    app = Flask(__name__)
    app.secret_key = secrets.token_hex(16)
    app.config.from_object(config)
    app.config['SECRET_KEY'] = 'a3f38c9d6b7e423e97b2c1d9a1f7c9f5e8e4388e6cfb8b9831c2fbd1f40c9b20'
    app.config['WTF_CSRF_ENABLED'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///user.db'

    db.init_app(app)
    Migrate(app, db)

    with app.app_context():
        # init_db()
        app.register_blueprint(auth_bp)
        app.register_blueprint(expense_bp)
        app.register_blueprint(income_bp)
        app.register_blueprint(page_bp)
        app.register_blueprint(share_bp)
        app.register_blueprint(shareIncome_bp)
        app.register_blueprint(insights_bp)
        app.register_blueprint(shared_data_bp)

    return app

if __name__ == '__main__':
    app = create_app()

    logging.basicConfig(level=logging.DEBUG)
    app.logger.setLevel(logging.DEBUG)

    app.run(debug=True, port=5001)
