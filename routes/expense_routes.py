from flask import Blueprint, session, jsonify, request

from datetime import datetime, timedelta
from models.models import db, Expense, SharedExpense, User
from sqlalchemy import func


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



@expense_bp.route('/api/expenses/bulk-share', methods=['POST'])
def bulk_share_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    expense_ids = data.get('ids', [])
    shared_with_username = data.get('username')

    if not expense_ids or not shared_with_username:
        return jsonify({'error': 'Missing expense IDs or username'}), 400

    shared_with_user = User.query.filter_by(
        username=shared_with_username).first()
    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    expenses = Expense.query.filter(
        Expense.id.in_(expense_ids),
        Expense.user_id == session['user']['id']).all()

    if not expenses:
        return jsonify({'error': 'No matching expenses found'}), 404

    for expense in expenses:
        shared_expense = SharedExpense(expense_id=expense.id,
                                       shared_with_id=shared_with_user.id)
        db.session.add(shared_expense)

    db.session.commit()

    return jsonify({'message': 'Selected expenses shared successfully'})


@expense_bp.route('/api/shared-expenses/by-me', methods=['GET'])
def get_shared_by_me_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    shared_expenses = SharedExpense.query.join(Expense).filter(
        Expense.user_id == user_id).all()
    expenses = []

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
                shared_with_user.username,
                'shared_id':
                se.id
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
                expense.amount,
                'shared_id':
                se.id
            })

    return jsonify(expenses)


@expense_bp.route('/api/shared-expenses/cancel', methods=['POST'])
def cancel_shared_expense():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    shared_expense_id = data.get('id')
    print(shared_expense_id)

    shared_expense = SharedExpense.query.get(shared_expense_id)
    print(shared_expense)
    if not shared_expense:
        return jsonify({'error': 'Shared expense not found'}), 400

    user_id = session['user']['id']
    expense = Expense.query.get(shared_expense.expense_id)

    # Check if the user is either the sharer or the recipient
    if expense.user_id != user_id and shared_expense.shared_with_id != user_id:
        return jsonify({'error':
                        'Unauthorized to cancel this shared expense'}), 400

    db.session.delete(shared_expense)
    db.session.commit()

    return jsonify({'message': 'Shared expense canceled successfully'})


@expense_bp.route('/api/insights', methods=['GET'])
def get_insights():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    days_param = request.args.get('days', '7')
    try:
        days = int(days_param)
    except ValueError:
        return jsonify({'error': f"Invalid 'days' parameter: '{days_param}'. Must be an integer."}), 400
    start_date = datetime.now() - timedelta(days=days)

    expenses = db.session.query(
        func.date(Expense.date).label('date'),
        func.sum(Expense.amount).label('total')).filter(
            Expense.user_id == user_id, Expense.date
            >= start_date).group_by(func.date(Expense.date)).order_by(
                func.date(Expense.date)).all()

    # Ensure `e.date` is parsed as a `datetime` object
    labels = [
        datetime.strptime(e.date, '%Y-%m-%d').strftime('%Y-%m-%d')
        if isinstance(e.date, str) else e.date.strftime('%Y-%m-%d')
        for e in expenses
    ]
    values = [e.total for e in expenses]

    logging.debug("Insights data: %s", {'labels': labels, 'values': values})  # Debug information

    return jsonify({'labels': labels, 'values': values})


@expense_bp.route('/api/insights/summary', methods=['GET'])
def get_expense_summary():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    days = int(request.args.get('days', 7))
    start_date = datetime.now() - timedelta(days=days)

    # Total entries and total amount
    total_entries = Expense.query.filter(Expense.user_id == user_id,
                                         Expense.date >= start_date).count()
    total_amount = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id, Expense.date >= start_date).scalar() or 0.0

    # Category distribution
    category_distribution = db.session.query(
        Expense.category, func.sum(Expense.amount)).filter(
            Expense.user_id == user_id, Expense.date
            >= start_date).group_by(Expense.category).all()

    labels = [item[0] for item in category_distribution]
    values = [item[1] for item in category_distribution]

    return jsonify({
        'totalEntries': total_entries,
        'totalAmount': total_amount,
        'categoryDistribution': {
            'labels': labels,
            'values': values
        }
    })

