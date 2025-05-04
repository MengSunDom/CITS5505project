from flask import Blueprint, session, jsonify, request
from datetime import datetime
from models.models import db, Expense, SharedExpense, User

expense_bp = Blueprint('expense', __name__)


@expense_bp.route('/api/expenses', methods=['GET'])
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


@expense_bp.route('/api/expenses/<int:expense_id>/share', methods=['POST'])
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


@expense_bp.route('/api/shared-expenses/by-me', methods=['GET'])
def get_shared_by_me_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    shared_expenses = SharedExpense.query.join(Expense).filter(
        Expense.user_id == user_id).all()
    expenses = []
    print("SHAREDATA:________", shared_expenses)

    for se in shared_expenses:
        shared_with_user = User.query.get(se.shared_with_id)
        expense = Expense.query.get(se.expense_id)
        if expense:
            expenses.append({
                'id':
                se.expense_id,
                'amount':
                expense.amount,
                'category':
                expense.category,
                'description':
                expense.description,
                'date':
                expense.date.astimezone().strftime('%Y-%m-%d %H:%M:%S'),
                'shared_with':
                shared_with_user.username
            })
    return jsonify(expenses)


@expense_bp.route('/api/shared-expenses/with-me', methods=['GET'])
def get_shared_with_me_expenses():
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
                'shared_by':
                user.username,
                'date':
                expense.date.astimezone().strftime('%Y-%m-%d %H:%M:%S'),
                'category':
                expense.category,
                'description':
                expense.description,
                'amount':
                expense.amount
            })

    return jsonify(expenses)
