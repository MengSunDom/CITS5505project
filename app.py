import logging
import secrets
import traceback
from flask import Flask, render_template, jsonify, request
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager, verify_jwt_in_request, get_jwt_identity

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

    jwt = JWTManager(app)
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


    @app.context_processor
    def inject_user():
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            if user_id:
                user = User.query.get(int(user_id))
                return dict(current_user=user)
        except:
            pass
        return dict(current_user=None)

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

    return app

if __name__ == '__main__':
    app = create_app()

    logging.basicConfig(level=logging.DEBUG)
    app.logger.setLevel(logging.DEBUG)

    app.run(debug=True, port=5001)
