from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.models import db, Expense, SharedExpense, User

share_bp = Blueprint('share', __name__)

@share_bp.route('/api/share/<int:expense_id>', methods=['POST'])
@jwt_required()
def share_expense(expense_id):
    user_id = get_jwt_identity()

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

    if expense.user_id != int(user_id):
        return jsonify({'error': 'Unauthorized to share this expense'}), 403

    existing_share = SharedExpense.query.filter_by(
        expense_id=expense_id,
        shared_with_id=shared_with_user.id,
        is_bulk_share=False
    ).first()

    if existing_share:
        return jsonify({'error': 'This expense is already shared with this user'}), 400

    try:
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
@jwt_required()
def bulk_share_expenses():
    user_id = get_jwt_identity()

    data = request.get_json()
    expense_ids = data.get('ids', [])
    shared_with_username = data.get('username')

    if not expense_ids or not shared_with_username:
        return jsonify({'error': 'Missing expense IDs or username'}), 400

    shared_with_user = User.query.filter_by(username=shared_with_username).first()
    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    expenses = Expense.query.filter(
        Expense.id.in_(expense_ids),
        Expense.user_id == int(user_id)
    ).all()

    if not expenses:
        return jsonify({'error': 'No matching expenses found'}), 404

    try:
        if len(expense_ids) == 1:
            existing_share = SharedExpense.query.filter_by(
                expense_id=expense_ids[0],
                shared_with_id=shared_with_user.id,
                is_bulk_share=False
            ).first()

            if existing_share:
                return jsonify({'error': 'This expense is already shared with this user'}), 400

            shared_expense = SharedExpense(
                expense_id=expense_ids[0],
                shared_with_id=shared_with_user.id,
                is_bulk_share=False,
                is_repeat=False
            )
        else:
            sorted_expense_ids = sorted(map(int, expense_ids))
            expense_ids_str = ','.join(map(str, sorted_expense_ids))

            existing_bulk_share = SharedExpense.query.filter(
                SharedExpense.shared_with_id == shared_with_user.id,
                SharedExpense.is_bulk_share == True,
                SharedExpense.bulk_expense_ids == expense_ids_str
            ).first()

            if existing_bulk_share:
                return jsonify({'error': 'These expenses are already shared with this user'}), 400

            individually_shared = SharedExpense.query.filter(
                SharedExpense.expense_id.in_(expense_ids),
                SharedExpense.shared_with_id == shared_with_user.id,
                SharedExpense.is_bulk_share == False
            ).all()

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

from flask_jwt_extended import jwt_required, get_jwt_identity

@share_bp.route('/api/share/by-me', methods=['GET'])
@jwt_required()
def get_shared_by_me_expenses():
    user_id = get_jwt_identity()

    shared_expenses = SharedExpense.query.join(Expense).filter(
        Expense.user_id == user_id
    ).order_by(SharedExpense.date_shared.desc()).all()
    
    expenses = []

    for se in shared_expenses:
        shared_with_user = User.query.get(se.shared_with_id)
        if not shared_with_user:
            continue

        if se.is_bulk_share and se.bulk_expense_ids:
            expense_ids = se.bulk_expense_ids.split(',')
            bulk_expenses = Expense.query.filter(Expense.id.in_(expense_ids)).all()
            total_amount = sum(e.amount for e in bulk_expenses)
            categories = list(set(e.category for e in bulk_expenses))
            details = []

            for e in bulk_expenses:
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
            expense = Expense.query.get(se.expense_id)
            if expense:
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
@jwt_required()
def get_shared_with_me_expenses():
    try:
        user_id = get_jwt_identity()
        shared_expenses = SharedExpense.query.filter_by(shared_with_id=user_id).all()
        
        bulk_shares = {}
        single_shares = []
        
        for share in shared_expenses:
            if share.is_bulk_share and share.bulk_expense_ids:
                key = share.bulk_expense_ids
                if key not in bulk_shares:
                    expense_ids = [int(id) for id in key.split(',')]
                    expenses = Expense.query.filter(Expense.id.in_(expense_ids)).all()
                    total_amount = sum(expense.amount for expense in expenses)
                    categories = list(set(expense.category for expense in expenses))
                    is_repeat = any(
                        SharedExpense.query.filter_by(
                            expense_id=expense.id,
                            shared_with_id=user_id,
                            is_bulk_share=False
                        ).first() is not None
                        for expense in expenses
                    )
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
                expense = Expense.query.get(share.expense_id)
                if expense:
                    is_repeat = SharedExpense.query.filter(
                        SharedExpense.bulk_expense_ids.like(f'%{expense.id}%'),
                        SharedExpense.shared_with_id == user_id,
                        SharedExpense.is_bulk_share == True
                    ).first() is not None
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

        result = list(bulk_shares.values()) + single_shares
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@share_bp.route('/api/share/cancel', methods=['POST'])
@jwt_required()
def cancel_shared_expense():
    data = request.get_json()
    shared_id = data.get('shared_id')
    if not shared_id:
        return jsonify({'error': 'Shared expense ID is required'}), 400

    shared_expense = SharedExpense.query.get(shared_id)
    if not shared_expense:
        return jsonify({'error': 'Shared expense not found'}), 404

    user_id = get_jwt_identity()
    
    if shared_expense.is_bulk_share:
        expense_ids = [int(id) for id in shared_expense.bulk_expense_ids.split(',')]
        first_expense = Expense.query.get(expense_ids[0])
        if not first_expense or (first_expense.user_id != user_id and shared_expense.shared_with_id != user_id):
            return jsonify({'error': 'Unauthorized to cancel this shared expense'}), 403
    else:
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
@jwt_required()
def bulk_cancel_shares():
    data = request.get_json()
    expense_ids = data.get('ids', [])

    if not expense_ids:
        return jsonify({'error': 'No expense IDs provided'}), 400

    user_id = get_jwt_identity()

    shared_expenses = SharedExpense.query.join(Expense).filter(
        Expense.id.in_(expense_ids),
        Expense.user_id == user_id
    ).all()

    if not shared_expenses:
        return jsonify({'error': 'No shared expenses found'}), 404

    for shared_expense in shared_expenses:
        db.session.delete(shared_expense)

    db.session.commit()

    return jsonify({
        'message': f'Successfully canceled sharing for {len(shared_expenses)} expenses'
    })