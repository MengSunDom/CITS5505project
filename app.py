from flask import Flask, render_template, request, redirect, session, jsonify, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from flask_sqlalchemy import SQLAlchemy
import sqlite3, os, secrets
from datetime import datetime
import json

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    permission = db.Column(db.String(20), default='basic')
    expenses = db.relationship('Expense', backref='user', lazy=True)
    shared_expenses = db.relationship('SharedExpense',
                                      backref='shared_with',
                                      lazy=True)


class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime,
                     nullable=False,
                     default=lambda: datetime.now().astimezone())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)


class SharedExpense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer,
                           db.ForeignKey('expense.id'),
                           nullable=False)
    shared_with_id = db.Column(db.Integer,
                               db.ForeignKey('user.id'),
                               nullable=False)
    date_shared = db.Column(db.DateTime,
                            nullable=False,
                            default=lambda: datetime.now().astimezone())


def init_db():
    with app.app_context():
        db.create_all()
        # Create default categories
        default_categories = [
            'Food', 'Transportation', 'Entertainment', 'Shopping', 'Bills',
            'Other'
        ]

        # Create default admin user if not exists
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin',
                         password=generate_password_hash('admin_salt'),
                         role='admin',
                         permission='admin')
            db.session.add(admin)
            db.session.commit()


@app.route('/')
def index():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    return render_template('home.html')


@app.route('/login')
def login_page():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    csrf_token = secrets.token_hex(16)
    session['csrf_token'] = csrf_token
    return render_template('login.html', csrf_token=csrf_token)


@app.route('/register')
def register_page():
    if 'user' in session:
        return redirect(url_for('dashboard'))
    csrf_token = secrets.token_hex(16)
    session['csrf_token'] = csrf_token
    return render_template('register.html', csrf_token=csrf_token)


@app.route('/register', methods=['POST'])
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


@app.route('/login', methods=['POST'])
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


@app.route('/dashboard')
def dashboard():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('dashboard.html')


@app.route('/expenses')
def expenses():
    if 'user' not in session:
        return redirect(url_for('login_page'))
    return render_template('expenses.html')


@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    expenses = Expense.query.filter_by(user_id=user_id).all()
    return jsonify([{
        'id': e.id,
        'amount': e.amount,
        'category': e.category,
        'description': e.description,
        'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
    } for e in expenses])


@app.route('/api/expenses', methods=['POST'])
def add_expense():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    new_expense = Expense(amount=float(data['amount']),
                          category=data['category'],
                          description=data.get('description', ''),
                          user_id=session['user']['id'])

    db.session.add(new_expense)
    db.session.commit()

    return jsonify({
        'message': 'Expense added successfully',
        'expense': {
            'id': new_expense.id,
            'amount': new_expense.amount,
            'category': new_expense.category,
            'description': new_expense.description,
            'date': new_expense.date.strftime('%Y-%m-%d %H:%M:%S')
        }
    })


@app.route('/api/expenses/bulk', methods=['POST'])
def add_expenses_bulk():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data_list = request.get_json()
    new_expenses = []

    for data in data_list:
        new_expense = Expense(amount=float(data['amount']),
                              category=data['category'],
                              description=data.get('description', ''),
                              user_id=session['user']['id'])
        db.session.add(new_expense)
        new_expenses.append(new_expense)

    db.session.commit()

    return jsonify({
        'message':
        'Expenses added successfully',
        'expenses': [{
            'id': e.id,
            'amount': e.amount,
            'category': e.category,
            'description': e.description,
            'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
        } for e in new_expenses]
    })


@app.route('/api/expenses/delete', methods=['POST'])
def delete_expense():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    expense_id = data.get('id')

    expense = Expense.query.filter_by(id=expense_id,
                                      user_id=session['user']['id']).first()
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    db.session.delete(expense)
    db.session.commit()

    return jsonify({'message': 'Expense deleted successfully'})


@app.route('/api/expenses/<int:expense_id>/share', methods=['POST'])
def share_expense(expense_id):
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    shared_with_username = data.get('username')

    shared_with_user = User.query.filter_by(
        username=shared_with_username).first()
    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    expense = Expense.query.get(expense_id)
    if not expense or expense.user_id != session['user']['id']:
        return jsonify({'error': 'Expense not found or unauthorized'}), 404

    shared_expense = SharedExpense(expense_id=expense_id,
                                   shared_with_id=shared_with_user.id)

    db.session.add(shared_expense)
    db.session.commit()

    return jsonify({'message': 'Expense shared successfully'})


@app.route('/api/shared-expenses', methods=['GET'])
def get_shared_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    shared_expenses = SharedExpense.query.filter_by(
        shared_with_id=session['user']['id']).all()
    expenses = []

    for se in shared_expenses:
        expense = Expense.query.get(se.expense_id)
        if expense:
            user = User.query.get(expense.user_id)
            expenses.append({
                'id':
                expense.id,
                'amount':
                expense.amount,
                'category':
                expense.category,
                'description':
                expense.description,
                'date':
                expense.date.astimezone().strftime('%Y-%m-%d %H:%M:%S'),
                'shared_by':
                user.username
            })

    return jsonify(expenses)


@app.route('/api/users', methods=['GET'])
def get_users():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    users = User.query.all()
    return jsonify([{'id': u.id, 'username': u.username} for u in users])


@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('index'))


if __name__ == '__main__':
    init_db()
    app.run(debug=True)
