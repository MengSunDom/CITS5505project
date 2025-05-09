from flask import Blueprint, session, jsonify, request
from models.models import db, Expense, SharedExpense, User

share_bp = Blueprint('share', __name__)

@share_bp.route('/api/share/<int:expense_id>', methods=['POST'])
def share_expense(expense_id):
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    shared_with_username = data.get('username')

    if not shared_with_username:
        return jsonify({'error': 'Username is required'}), 400

    shared_with_user = User.query.filter_by(username=shared_with_username).first()
    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    expense = Expense.query.get(expense_id)
    if not expense or expense.user_id != session['user']['id']:
        return jsonify({'error': 'Expense not found or unauthorized'}), 404

    # Check if the expense is already shared with the user
    existing_share = SharedExpense.query.filter_by(
        expense_id=expense_id,
        shared_with_id=shared_with_user.id,
        is_bulk_share=False
    ).first()
    
    if existing_share:
        return jsonify({'error': 'Expense already shared with this user'}), 400

    # Create a single share record
    shared_expense = SharedExpense(
        expense_id=expense_id,
        shared_with_id=shared_with_user.id,
        is_bulk_share=False
    )
    
    db.session.add(shared_expense)
    db.session.commit()

    return jsonify({'message': 'Expense shared successfully'})

@share_bp.route('/api/share/bulk', methods=['POST'])
def bulk_share_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    expense_ids = data.get('ids', [])
    shared_with_username = data.get('username')

    if not expense_ids or not shared_with_username:
        return jsonify({'error': 'Missing expense IDs or username'}), 400

    shared_with_user = User.query.filter_by(username=shared_with_username).first()
    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    # Get all expenses that belong to the current user
    expenses = Expense.query.filter(
        Expense.id.in_(expense_ids),
        Expense.user_id == session['user']['id']
    ).all()

    if not expenses:
        return jsonify({'error': 'No matching expenses found'}), 404

    try:
        # Create a single share record for all expenses
        shared_expense = SharedExpense(
            expense_id=expense_ids[0],  # Use the first expense ID as reference
            shared_with_id=shared_with_user.id,
            is_bulk_share=True,  # Mark as bulk share
            bulk_expense_ids=','.join(map(str, expense_ids))  # Store all expense IDs
        )
        
        db.session.add(shared_expense)
        db.session.commit()

        return jsonify({
            'message': f'Successfully shared {len(expenses)} expenses with {shared_with_username}',
            'shared_id': shared_expense.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@share_bp.route('/api/share/by-me', methods=['GET'])
def get_shared_by_me_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    # Get all shared expenses where the current user is the owner
    shared_expenses = SharedExpense.query.join(Expense).filter(
        Expense.user_id == user_id
    ).order_by(SharedExpense.date_shared.desc()).all()
    
    expenses = []

    for se in shared_expenses:
        shared_with_user = User.query.get(se.shared_with_id)
        if not shared_with_user:
            continue

        if se.is_bulk_share and se.bulk_expense_ids:
            # Handle bulk shared expenses
            expense_ids = se.bulk_expense_ids.split(',')
            bulk_expenses = Expense.query.filter(Expense.id.in_(expense_ids)).all()
            
            # Get total amount and categories
            total_amount = sum(e.amount for e in bulk_expenses)
            categories = list(set(e.category for e in bulk_expenses))
            
            # Get detailed information for each expense
            details = [{
                'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S'),
                'category': e.category,
                'description': e.description,
                'amount': e.amount
            } for e in bulk_expenses]
            
            expenses.append({
                'id': se.id,
                'is_bulk': True,
                'expense_count': len(bulk_expenses),
                'total_amount': total_amount,
                'categories': categories,
                'date': se.date_shared.strftime('%Y-%m-%d %H:%M:%S'),
                'shared_with': shared_with_user.username,
                'shared_id': se.id,
                'details': details
            })
        else:
            # Handle single shared expense
            expense = Expense.query.get(se.expense_id)
            if expense:
                expenses.append({
                    'id': se.expense_id,
                    'is_bulk': False,
                    'amount': expense.amount,
                    'category': expense.category,
                    'description': expense.description,
                    'date': expense.date.astimezone().strftime('%Y-%m-%d %H:%M:%S'),
                    'shared_with': shared_with_user.username,
                    'shared_id': se.id
                })
    
    return jsonify(expenses)

@share_bp.route('/api/share/with-me', methods=['GET'])
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

@share_bp.route('/api/share/cancel', methods=['POST'])
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

@share_bp.route('/api/share/bulk-cancel', methods=['POST'])
def bulk_cancel_shares():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    expense_ids = data.get('ids', [])

    if not expense_ids:
        return jsonify({'error': 'No expense IDs provided'}), 400

    # Get all shared expenses for the current user
    shared_expenses = SharedExpense.query.join(Expense).filter(
        Expense.id.in_(expense_ids),
        Expense.user_id == session['user']['id']
    ).all()

    if not shared_expenses:
        return jsonify({'error': 'No shared expenses found'}), 404

    # Delete all shared expenses
    for shared_expense in shared_expenses:
        db.session.delete(shared_expense)

    db.session.commit()

    return jsonify({
        'message': f'Successfully canceled sharing for {len(shared_expenses)} expenses'
    })