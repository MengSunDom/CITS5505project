from flask import Blueprint, session, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models.models import db, User
from datetime import timedelta
from utils.decorators import csrf_required

auth_bp = Blueprint('auth', __name__)

# Set session expiration time to 30 minutes
auth_bp.permanent_session_lifetime = timedelta(minutes=30)


@auth_bp.route('/api/register', methods=['POST'])
@csrf_required
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Username and password cannot be empty'}), 400

    hashed_pw = generate_password_hash(password + "_salt")

    try:
        new_user = User(username=username, password=hashed_pw, role='user')
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'message': 'Registration successful!'})
    except:
        db.session.rollback()
        return jsonify({'error': 'Username already exists'}), 400


@auth_bp.route('/api/login', methods=['POST'])
@csrf_required
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    remember_me = data.get('rememberMe', False)

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password, password):
        session.permanent = bool(remember_me)
        session['user'] = {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'permission': user.permission
        }
        return jsonify({'message': f"Welcome {user.username}!"})
    return jsonify({'error': 'Wrong account or password'}), 401


@auth_bp.route('/api/users', methods=['GET'])
def get_users():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    users = User.query.all()
    return jsonify([{'id': u.id, 'username': u.username} for u in users])
