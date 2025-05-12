from flask import Blueprint, session, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models.models import db, User
from datetime import timedelta
from flask_jwt_extended import (
    create_access_token, set_access_cookies, jwt_required, get_jwt_identity
)
from flask_jwt_extended import unset_jwt_cookies
from flask_jwt_extended import get_jwt_identity


auth_bp = Blueprint('auth', __name__)

# Set session expiration time to 30 minutes
auth_bp.permanent_session_lifetime = timedelta(minutes=30)


@auth_bp.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
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
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password, password + "_salt"):
        access_token = create_access_token(identity=str(user.id))
        response = jsonify({"message": f"Welcome {user.username}!"})
        set_access_cookies(response, access_token)
        return response
    return jsonify({'error': 'Wrong account or password'}), 401

@auth_bp.route('/api/users', methods=['GET'])
@jwt_required()
def get_users():
    users = User.query.all()
    return jsonify([{'id': u.id, 'username': u.username} for u in users])


@auth_bp.route('/api/logout', methods=['POST'])
def logout():
    response = jsonify({"message": "Logout successful"})
    unset_jwt_cookies(response)
    return response



@auth_bp.route('/api/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    return jsonify({
        'id': user.id,
        'username': user.username,
        'role': user.role
    })
