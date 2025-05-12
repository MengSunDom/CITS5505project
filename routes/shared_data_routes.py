from flask import Blueprint, jsonify, request
from models.models import db, Expense, Income, SharedExpense, SharedIncome, User
from flask_jwt_extended import jwt_required, get_jwt_identity

shared_data_bp = Blueprint('shared_data', __name__)

@shared_data_bp.route('/api/shared-expenses/by-me')
@jwt_required()
def get_shared_expenses_by_me():
    user_id = get_jwt_identity()

    shared_expenses = db.session.query(
        SharedExpense, Expense, User
    ).join(
        Expense, SharedExpense.expense_id == Expense.id
    ).join(
        User, SharedExpense.shared_with_id == User.id
    ).filter(
        Expense.user_id == user_id
    ).all()
    
    result = []
    for shared, expense, user in shared_expenses:
        result.append({
            'id': shared.id,
            'expense_id': expense.id,
            'description': expense.description,
            'category': expense.category,
            'amount': float(expense.amount),
            'date': expense.date.strftime('%Y-%m-%d %H:%M:%S'),
            'shared_with': user.username,
            'shared_with_id': user.id,
            'is_repeat': shared.is_repeat,
            'is_bulk_share': shared.is_bulk_share
        })
    
    return jsonify(result)

@shared_data_bp.route('/api/shared-expenses/with-me')
@jwt_required()
def get_shared_expenses_with_me():
    user_id = get_jwt_identity()

    shared_expenses = db.session.query(
        SharedExpense, Expense, User
    ).join(
        Expense, SharedExpense.expense_id == Expense.id
    ).join(
        User, Expense.user_id == User.id
    ).filter(
        SharedExpense.shared_with_id == user_id
    ).all()
    
    result = []
    for shared, expense, user in shared_expenses:
        result.append({
            'id': shared.id,
            'expense_id': expense.id,
            'description': expense.description,
            'category': expense.category,
            'amount': float(expense.amount),
            'date': expense.date.strftime('%Y-%m-%d %H:%M:%S'),
            'shared_by': user.username,
            'shared_by_id': user.id,
            'is_repeat': shared.is_repeat,
            'is_bulk_share': shared.is_bulk_share
        })
    
    return jsonify(result)

@shared_data_bp.route('/api/shared-incomes/by-me')
@jwt_required()
def get_shared_incomes_by_me():
    user_id = get_jwt_identity()

    shared_incomes = db.session.query(
        SharedIncome, Income, User
    ).join(
        Income, SharedIncome.income_id == Income.id
    ).join(
        User, SharedIncome.shared_with_id == User.id
    ).filter(
        Income.user_id == user_id
    ).all()
    
    result = []
    for shared, income, user in shared_incomes:
        result.append({
            'id': shared.id,
            'income_id': income.id,
            'description': income.description,
            'category': income.category,
            'amount': float(income.amount),
            'date': income.date.strftime('%Y-%m-%d %H:%M:%S'),
            'shared_with': user.username,
            'shared_with_id': user.id,
            'is_repeat': shared.is_repeat,
            'is_bulk_share': shared.is_bulk_share
        })
    
    return jsonify(result)

@shared_data_bp.route('/api/shared-incomes/with-me')
@jwt_required()
def get_shared_incomes_with_me():
    user_id = get_jwt_identity()

    shared_incomes = db.session.query(
        SharedIncome, Income, User
    ).join(
        Income, SharedIncome.income_id == Income.id
    ).join(
        User, Income.user_id == User.id
    ).filter(
        SharedIncome.shared_with_id == user_id
    ).all()
    
    result = []
    for shared, income, user in shared_incomes:
        result.append({
            'id': shared.id,
            'income_id': income.id,
            'description': income.description,
            'category': income.category,
            'amount': float(income.amount),
            'date': income.date.strftime('%Y-%m-%d %H:%M:%S'),
            'shared_by': user.username,
            'shared_by_id': user.id,
            'is_repeat': shared.is_repeat,
            'is_bulk_share': shared.is_bulk_share
        })
    
    return jsonify(result)

@shared_data_bp.route('/api/shared-expenses/cancel/<int:share_id>', methods=['DELETE'])
@jwt_required()
def cancel_shared_expense(share_id):
    user_id = get_jwt_identity()

    shared_expense = SharedExpense.query.join(
        Expense, SharedExpense.expense_id == Expense.id
    ).filter(
        SharedExpense.id == share_id,
        Expense.user_id == user_id
    ).first()
    
    if not shared_expense:
        return jsonify({'error': 'Share not found or not authorized'}), 404
    
    db.session.delete(shared_expense)
    db.session.commit()
    
    return jsonify({'message': 'Share canceled successfully'})

@shared_data_bp.route('/api/shared-incomes/cancel/<int:share_id>', methods=['DELETE'])
@jwt_required()
def cancel_shared_income(share_id):
    user_id = get_jwt_identity()

    shared_income = SharedIncome.query.join(
        Income, SharedIncome.income_id == Income.id
    ).filter(
        SharedIncome.id == share_id,
        Income.user_id == user_id
    ).first()
    
    if not shared_income:
        return jsonify({'error': 'Share not found or not authorized'}), 404
    
    db.session.delete(shared_income)
    db.session.commit()
    
    return jsonify({'message': 'Share canceled successfully'})
