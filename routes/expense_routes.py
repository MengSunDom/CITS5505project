from flask import Blueprint, session, jsonify, request
from datetime import datetime
from models.models import db, Expense

expense_bp = Blueprint('expense', __name__)


@expense_bp.route('/api/expenses', methods=['GET'])
def get_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    expenses = Expense.query.filter_by(user_id=user_id).order_by(
        Expense.date.desc()).all()
    return jsonify([{
        'id': e.id,
        'amount': e.amount,
        'category': e.category,
        'description': e.description,
        'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
    } for e in expenses])


@expense_bp.route('/api/expenses', methods=['POST'])
def add_expense():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    try:
        date = datetime.strptime(data['date'], '%Y-%m-%dT%H:%M')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    if date > datetime.now():
        return jsonify({'error': 'Date cannot be in the future'}), 400

    new_expense = Expense(amount=float(data['amount']),
                          category=data['category'],
                          description=data.get('description', ''),
                          date=date,
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


@expense_bp.route('/api/expenses/bulk', methods=['POST'])
def add_expenses_bulk():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data_list = request.get_json()
    new_expenses = []

    for data in data_list:
        new_expense = Expense(amount=float(data['amount']),
                              category=data['category'],
                              description=data.get('description', ''),
                              user_id=session['user']['id'],
                              date=datetime.strptime(data['date'], '%Y-%m-%dT%H:%M'))
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


@expense_bp.route('/api/expenses/delete', methods=['POST'])
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


@expense_bp.route('/api/expenses/bulk-delete', methods=['POST'])
def bulk_delete_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    expense_ids = data.get('ids', [])

    if not expense_ids:
        return jsonify({'error': 'No expense IDs provided'}), 400

    expenses = Expense.query.filter(
        Expense.id.in_(expense_ids),
        Expense.user_id == session['user']['id']).all()

    if not expenses:
        return jsonify({'error': 'No matching expenses found'}), 404

    for expense in expenses:
        db.session.delete(expense)

    db.session.commit()

    return jsonify({'message': 'Selected expenses deleted successfully'})
