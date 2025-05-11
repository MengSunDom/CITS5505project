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

import config

def create_app():
    app = Flask(__name__)
    app.secret_key = secrets.token_hex(16)
    app.config.from_object(config)

    db.init_app(app)
    migrate = Migrate(app, db)

    with app.app_context():
        init_db()
        app.register_blueprint(auth_bp)
        app.register_blueprint(expense_bp)
        app.register_blueprint(income_bp)
        app.register_blueprint(page_bp)
        app.register_blueprint(share_bp)
        app.register_blueprint(shareIncome_bp)
        app.register_blueprint(insights_bp)
        app.register_blueprint(shared_data_bp)

    # Custom error handler for 500 errors
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
        return render_template('error.html', error=str(e), traceback=traceback.format_exc()), 500

    # 在这里定义路由，确保app已经创建
    @app.route('/')
    def index():
        if 'user' in session:
            return redirect(url_for('dashboard'))
        return render_template('home.html')

    @app.route('/dashboard')
    def dashboard():
        if 'user' not in session:
            return redirect(url_for('auth.login'))
        return render_template('dashboard.html')

    @app.route('/expenses')
    def expenses():
        if 'user' not in session:
            return redirect(url_for('auth.login'))
        return render_template('expenses.html')

    @app.route('/income')
    def income():
        if 'user' not in session:
            return redirect(url_for('auth.login'))
        return render_template('income.html')

    @app.route('/shared-data')
    def shared_data():
        if 'user' not in session:
            return redirect(url_for('auth.login'))
        return render_template('shared_data.html')

    return app

if __name__ == '__main__':
    app = create_app()

    logging.basicConfig(level=logging.DEBUG)
    app.logger.setLevel(logging.DEBUG)

    app.run(debug=True, port=5001)
