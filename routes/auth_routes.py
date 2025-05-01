from flask import Blueprint, session, redirect, url_for, render_template, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from models.models import db, User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if data.get('csrf_token') != session.get('csrf_token'):
        return jsonify({'error': 'CSRF token mismatch'}), 403

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


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if data.get('csrf_token') != session.get('csrf_token'):
        return jsonify({'error': 'CSRF token mismatch'}), 403

    username = data.get('username')
    password = data.get('password')

    user = User.query.filter_by(username=username).first()
    if user and check_password_hash(user.password, password + "_salt"):
        session['user'] = {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'permission': user.permission
        }
        return jsonify({'message': f"Welcome {user.username}!"})
    return jsonify({'error': 'Wrong account or password'}), 401
