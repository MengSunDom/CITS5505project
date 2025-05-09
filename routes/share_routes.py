from flask import Blueprint, session, jsonify, request
from models.models import db, Expense, SharedExpense, User

from flask_login import login_required, current_user


share_bp = Blueprint('share', __name__)

@share_bp.route('/api/share/<int:expense_id>', methods=['POST'])
def share_expense(expense_id):
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    shared_with_username = data.get('username')
    if not shared_with_username:
        return jsonify({'error': 'Username is required'}), 400

    shared_with_user = User.query.filter_by(username=shared_with_username).first()

    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    expense = Expense.query.get(expense_id)

    if not expense:
        return jsonify({'error': 'Expense not found'}), 404
    
    if expense.user_id != session['user']['id']:
        return jsonify({'error': 'Unauthorized to share this expense'}), 403

    # Check if the expense is already shared with the user
    existing_share = SharedExpense.query.filter_by(
        expense_id=expense_id,
        shared_with_id=shared_with_user.id,
        is_bulk_share=False
    ).first()
    
    if existing_share:
        return jsonify({'error': 'This expense is already shared with this user'}), 400

    try:
        # Create a single share record
        shared_expense = SharedExpense(
            expense_id=expense_id,
            shared_with_id=shared_with_user.id,
            is_bulk_share=False,
            is_repeat=False
        )
        
        db.session.add(shared_expense)
        db.session.commit()

        return jsonify({
            'message': 'Expense shared successfully',
            'shared_id': shared_expense.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to share expense: {str(e)}'}), 500


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
        # If only one expense is selected, treat it as a single share
        if len(expense_ids) == 1:
            # Check if already shared
            existing_share = SharedExpense.query.filter_by(
                expense_id=expense_ids[0],
                shared_with_id=shared_with_user.id,
                is_bulk_share=False
            ).first()
            
            if existing_share:
                return jsonify({'error': 'This expense is already shared with this user'}), 400

            # Create single share record
            shared_expense = SharedExpense(
                expense_id=expense_ids[0],
                shared_with_id=shared_with_user.id,
                is_bulk_share=False,
                is_repeat=False
            )
        else:
            # Sort expense IDs for consistent comparison
            sorted_expense_ids = sorted(map(int, expense_ids))
            expense_ids_str = ','.join(map(str, sorted_expense_ids))

            # Check if the exact same combination of expenses is already shared
            existing_bulk_share = SharedExpense.query.filter(
                SharedExpense.shared_with_id == shared_with_user.id,
                SharedExpense.is_bulk_share == True,
                SharedExpense.bulk_expense_ids == expense_ids_str
            ).first()

            if existing_bulk_share:
                return jsonify({'error': 'These expenses are already shared with this user'}), 400

            # Check if any of the expenses are already shared individually
            individually_shared = SharedExpense.query.filter(
                SharedExpense.expense_id.in_(expense_ids),
                SharedExpense.shared_with_id == shared_with_user.id,
                SharedExpense.is_bulk_share == False
            ).all()

            # Create bulk share record
            shared_expense = SharedExpense(
                expense_id=expense_ids[0],
                shared_with_id=shared_with_user.id,
                is_bulk_share=True,
                bulk_expense_ids=expense_ids_str,
                is_repeat=bool(individually_shared)
            )
        
        db.session.add(shared_expense)
        db.session.commit()

        return jsonify({
            'message': f'Successfully shared {len(expenses)} expenses with {shared_with_username}',
            'shared_id': shared_expense.id,
            'is_repeat': shared_expense.is_repeat
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
            details = []
            for e in bulk_expenses:
                # Check if this expense is shared individually with the same user
                individual_share = SharedExpense.query.filter_by(
                    expense_id=e.id,
                    shared_with_id=se.shared_with_id,
                    is_bulk_share=False
                ).first()
                
                details.append({
                    'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S'),
                    'category': e.category,
                    'description': e.description,
                    'amount': e.amount,
                    'is_repeat': bool(individual_share)
                })
            
            expenses.append({
                'id': se.id,
                'is_bulk': True,
                'expense_count': len(bulk_expenses),
                'total_amount': total_amount,
                'categories': categories,
                'date': se.date_shared.strftime('%Y-%m-%d %H:%M:%S'),
                'shared_with': shared_with_user.username,
                'shared_id': se.id,
                'details': details,
                'is_repeat': se.is_repeat
            })
        else:
            # Handle single shared expense
            expense = Expense.query.get(se.expense_id)
            if expense:
                # Check if this expense is part of any bulk share with the same user
                bulk_share = SharedExpense.query.filter(
                    SharedExpense.shared_with_id == se.shared_with_id,
                    SharedExpense.is_bulk_share == True,
                    SharedExpense.bulk_expense_ids.like(f'%{se.expense_id}%')
                ).first()

                expenses.append({
                    'id': se.expense_id,
                    'is_bulk': False,
                    'amount': expense.amount,
                    'category': expense.category,
                    'description': expense.description,
                    'date': expense.date.astimezone().strftime('%Y-%m-%d %H:%M:%S'),
                    'shared_with': shared_with_user.username,
                    'shared_id': se.id,
                    'is_repeat': bool(bulk_share)
                })
    

    return jsonify(expenses)

@share_bp.route('/api/share/with-me', methods=['GET'])
def get_shared_with_me_expenses():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        user_id = session['user']['id']
        print(f"Fetching shared expenses for user {user_id}")  # Debug log

        # Get all expenses shared with the current user
        shared_expenses = SharedExpense.query.filter_by(shared_with_id=user_id).all()
        print(f"Found {len(shared_expenses)} shared expenses")  # Debug log
        
        # Group bulk shares
        bulk_shares = {}
        single_shares = []
        
        for share in shared_expenses:
            print(f"Processing share {share.id}")  # Debug log
            if share.is_bulk_share and share.bulk_expense_ids:
                # For bulk shares, group by the combination of expenses
                key = share.bulk_expense_ids
                if key not in bulk_shares:
                    # Get all expenses in this bulk share
                    expense_ids = [int(id) for id in key.split(',')]
                    expenses = Expense.query.filter(Expense.id.in_(expense_ids)).all()
                    
                    # Calculate total amount and get all categories
                    total_amount = sum(expense.amount for expense in expenses)
                    categories = list(set(expense.category for expense in expenses))
                    
                    # Check if any of these expenses are already shared individually
                    is_repeat = any(
                        SharedExpense.query.filter_by(
                            expense_id=expense.id,
                            shared_with_id=user_id,
                            is_bulk_share=False
                        ).first() is not None
                        for expense in expenses
                    )
                    
                    # Get the user who shared these expenses (from the first expense)
                    shared_by_user = User.query.get(expenses[0].user_id) if expenses else None
                    
                    bulk_shares[key] = {
                        'id': share.id,
                        'shared_id': share.id,
                        'is_bulk': True,
                        'expense_count': len(expenses),
                        'total_amount': total_amount,
                        'categories': categories,
                        'date': share.date_shared.strftime('%Y-%m-%d'),
                        'shared_by': shared_by_user.username if shared_by_user else 'Unknown',
                        'is_repeat': is_repeat,
                        'details': [{
                            'date': expense.date.strftime('%Y-%m-%d'),
                            'category': expense.category,
                            'description': expense.description,
                            'amount': expense.amount,
                            'is_repeat': SharedExpense.query.filter_by(
                                expense_id=expense.id,
                                shared_with_id=user_id,
                                is_bulk_share=False
                            ).first() is not None
                        } for expense in expenses]
                    }
            else:
                # For single shares
                expense = Expense.query.get(share.expense_id)
                if expense:
                    # Check if this expense is part of any bulk share
                    is_repeat = SharedExpense.query.filter(
                        SharedExpense.bulk_expense_ids.like(f'%{expense.id}%'),
                        SharedExpense.shared_with_id == user_id,
                        SharedExpense.is_bulk_share == True
                    ).first() is not None
                    
                    # Get the user who shared this expense
                    shared_by_user = User.query.get(expense.user_id)
                    
                    single_shares.append({
                        'id': expense.id,
                        'shared_id': share.id,
                        'is_bulk': False,
                        'description': expense.description,
                        'category': expense.category,
                        'amount': expense.amount,
                        'date': expense.date.strftime('%Y-%m-%d'),
                        'shared_by': shared_by_user.username if shared_by_user else 'Unknown',
                        'is_repeat': is_repeat
                    })
        
        # Combine bulk and single shares
        result = list(bulk_shares.values()) + single_shares
        print(f"Returning {len(result)} total shares")  # Debug log
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_shared_with_me_expenses: {str(e)}")  # Debug log
        return jsonify({'error': str(e)}), 500


@share_bp.route('/api/share/cancel', methods=['POST'])
def cancel_shared_expense():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()

    shared_id = data.get('shared_id')
    if not shared_id:
        return jsonify({'error': 'Shared expense ID is required'}), 400

    shared_expense = SharedExpense.query.get(shared_id)
    if not shared_expense:
        return jsonify({'error': 'Shared expense not found'}), 404

    user_id = session['user']['id']
    
    # For bulk shares, allow both the sharer and the recipient to cancel
    if shared_expense.is_bulk_share:
        expense_ids = [int(id) for id in shared_expense.bulk_expense_ids.split(',')]
        first_expense = Expense.query.get(expense_ids[0])
        if not first_expense or (first_expense.user_id != user_id and shared_expense.shared_with_id != user_id):
            return jsonify({'error': 'Unauthorized to cancel this shared expense'}), 403
    else:
        # For single shares, check if the user is either the sharer or the recipient
        expense = Expense.query.get(shared_expense.expense_id)
        if not expense or (expense.user_id != user_id and shared_expense.shared_with_id != user_id):
            return jsonify({'error': 'Unauthorized to cancel this shared expense'}), 403

    try:
        db.session.delete(shared_expense)
        db.session.commit()
        return jsonify({'message': 'Shared expense canceled successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to cancel shared expense: {str(e)}'}), 500

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

