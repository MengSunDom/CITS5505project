import secrets
from flask import Blueprint, session, redirect, url_for, render_template

page_bp = Blueprint('page', __name__)


@page_bp.route('/')
def index():
    if 'user' in session:
        return redirect(url_for('page.dashboard'))
    return render_template('home.html')


@page_bp.route('/login')
def login_page():
    if 'user' in session:
        return redirect(url_for('page.dashboard'))
    csrf_token = secrets.token_hex(16)
    session['csrf_token'] = csrf_token
    return render_template('login.html', csrf_token=csrf_token)


@page_bp.route('/register')
def register_page():
    if 'user' in session:
        return redirect(url_for('page.dashboard'))
    csrf_token = secrets.token_hex(16)
    session['csrf_token'] = csrf_token
    return render_template('register.html', csrf_token=csrf_token)


@page_bp.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('page.index'))


@page_bp.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('page.login_page'))
    return render_template('dashboard.html')


@page_bp.route('/expenses')
def expenses():
    if 'user' not in session:
        return redirect(url_for('page.login_page'))
    return render_template('expenses.html')


@page_bp.route('/shared-data')
def shared_data():
    if 'user' not in session:
        return redirect(url_for('page.login_page'))
    return render_template('shared_data.html')


@page_bp.route('/insights')
def insights():
    if 'user' not in session:
        return redirect(url_for('page.login_page'))
    return render_template('insight.html')
