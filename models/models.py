from sqlalchemy import inspect
from werkzeug.security import generate_password_hash
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    permission = db.Column(db.String(20), default='basic')
    expenses = db.relationship('Expense', backref='user', lazy=True)
    incomes = db.relationship('Income', backref='user', lazy=True)

class Expense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime,
                     nullable=False,
                     default=lambda: datetime.now().astimezone())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(10), nullable=False, default='expense')


class Income(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.String(200))
    date = db.Column(db.DateTime,
                     nullable=False,
                     default=lambda: datetime.now().astimezone())
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    type = db.Column(db.String(10), nullable=False, default='income')


class SharedExpense(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    expense_id = db.Column(db.Integer, db.ForeignKey('expense.id'), nullable=False)
    shared_with_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date_shared = db.Column(db.DateTime, default=datetime.utcnow)
    is_bulk_share = db.Column(db.Boolean, default=False)
    bulk_expense_ids = db.Column(db.String(500))  # Store comma-separated expense IDs for bulk shares
    is_repeat = db.Column(db.Boolean, default=False)  # Flag to indicate if this is a repeat share

    # Define relationships with backrefs
    expense = db.relationship('Expense', backref='shares')
    shared_with = db.relationship('User', backref='shared_expenses')

class SharedIncome(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    income_id = db.Column(db.Integer, db.ForeignKey('income.id'), nullable=False)
    shared_with_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date_shared = db.Column(db.DateTime, default=datetime.utcnow)
    is_bulk_share = db.Column(db.Boolean, default=False)
    bulk_income_ids = db.Column(db.String(500))  # Store comma-separated expense IDs for bulk shares
    is_repeat = db.Column(db.Boolean, default=False)  # Flag to indicate if this is a repeat share

    # Define relationships with backrefs
    income = db.relationship('Income', backref='shares')
    shared_with = db.relationship('User', backref='shared_income')


def init_db():
    # This function should be called after the database is created
    inspector = inspect(db.engine)
    if not inspector.has_table("user"):
        print("User table does not exist yet. Skipping admin creation.")
        return
    
    # Create default admin user if not exists
    admin = User.query.filter_by(username='admin').first()
    if not admin:
        admin = User(username='admin',
                     password=generate_password_hash('admin'),
                     role='admin',
                     permission='admin')
        db.session.add(admin)
        db.session.commit()
