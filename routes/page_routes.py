import secrets
from flask import Blueprint, render_template, session, redirect, url_for
from flask_jwt_extended import jwt_required, verify_jwt_in_request, get_jwt_identity

page_bp = Blueprint('page', __name__)

@page_bp.route('/')
def index():
    try:
        verify_jwt_in_request()  # Require valid JWT token
        return redirect(url_for('page.dashboard'))
    except:
        return render_template('home.html')


@page_bp.route('/login')
def login_page():
    csrf_token = secrets.token_hex(16)
    session['csrf_token'] = csrf_token
    return render_template('login.html', csrf_token=csrf_token)


@page_bp.route('/register')
def register_page():
    csrf_token = secrets.token_hex(16)
    session['csrf_token'] = csrf_token
    return render_template('register.html', csrf_token=csrf_token)


@page_bp.route('/logout')
def logout():
    # With JWT, logout is now handled by a backend route that clears the cookie.
    return render_template('home.html')


@page_bp.route('/dashboard')
@jwt_required()
def dashboard():
    return render_template('dashboard.html')


@page_bp.route('/expenses')
@jwt_required()
def expenses():
    return render_template('expenses.html')


@page_bp.route('/income')
@jwt_required()
def income():
    return render_template('income.html')


@page_bp.route('/shared-data')
@jwt_required()
def shared_data():
    return render_template('shared_data.html')


@page_bp.route('/insights')
@jwt_required()
def insights():
    return render_template('insight.html')
