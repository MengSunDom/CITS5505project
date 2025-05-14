import secrets
from flask import Blueprint, session, render_template, redirect, url_for, flash
from forms.auth_forms import RegisterForm
from models.models import User
from werkzeug.security import generate_password_hash
from models.models import db

page_bp = Blueprint('page', __name__)


@page_bp.route('/')
def index():
    return render_template('home.html')


@page_bp.route('/login')
def login_page():
    if 'user' in session:
        return redirect(url_for('page.dashboard'))
    csrf_token = secrets.token_hex(16)
    session['csrf_token'] = csrf_token
    return render_template('login.html', csrf_token=csrf_token)


@page_bp.route('/register', methods=['GET', 'POST'])
def register_page():
    form = RegisterForm()
    if form.validate_on_submit():
        existing_user = User.query.filter_by(username=form.username.data).first()
        if existing_user:
            flash('Username already exists', 'danger')
        else:
            new_user = User(
                username=form.username.data,
                password=generate_password_hash(form.password.data),
                role='user'
            )
            db.session.add(new_user)
            db.session.commit()
            flash('Registration successful!', 'success')
            return redirect(url_for('page.login_page'))
    return render_template('register.html', form=form)


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


@page_bp.route('/income')
def income():
    if 'user' not in session:
        return redirect(url_for('page.login_page'))
    return render_template('income.html')


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
