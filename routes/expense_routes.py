from flask import Blueprint, jsonify, request
from datetime import datetime
from models.models import db, Expense, User, SharedExpense
from utils.llm import process_receipt
from utils.ocr import ocr_image
from flask_jwt_extended import jwt_required, get_jwt_identity

expense_bp = Blueprint('expense', __name__)


@expense_bp.route('/api/expenses', methods=['GET'])
@jwt_required()
def get_expenses():
    user_id = get_jwt_identity()
    expenses = Expense.query.filter_by(user_id=user_id).order_by(Expense.date.desc()).all()
    return jsonify([{
        'id': e.id,
        'amount': e.amount,
        'category': e.category,
        'description': e.description,
        'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
    } for e in expenses])


@expense_bp.route('/api/expenses', methods=['POST'])
@jwt_required()
def add_expense():
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        date = datetime.strptime(data['date'], '%Y-%m-%dT%H:%M:%S')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    if date > datetime.now():
        return jsonify({'error': 'Date cannot be in the future'}), 400

    new_expense = Expense(
        amount=float(data['amount']),
        category=data['category'],
        description=data.get('description', ''),
        date=date,
        user_id=user_id
    )

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
@jwt_required()
def add_expenses_bulk():
    user_id = get_jwt_identity()
    data_list = request.get_json()
    new_expenses = []

    for data in data_list:
        new_expense = Expense(
            amount=float(data['amount']),
            category=data['category'],
            description=data.get('description', ''),
            user_id=user_id,
            date=datetime.strptime(data['date'], '%Y-%m-%dT%H:%M')
        )
        db.session.add(new_expense)
        new_expenses.append(new_expense)

    db.session.commit()

    return jsonify({
        'message': 'Expenses added successfully',
        'expenses': [{
            'id': e.id,
            'amount': e.amount,
            'category': e.category,
            'description': e.description,
            'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
        } for e in new_expenses]
    })


@expense_bp.route('/api/expenses/delete', methods=['POST'])
@jwt_required()
def delete_expense():
    user_id = get_jwt_identity()
    data = request.get_json()
    expense_id = data.get('id')
    expense = Expense.query.filter_by(id=expense_id, user_id=user_id).first()
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    try:
        SharedExpense.query.filter_by(expense_id=expense_id).delete()
        bulk_shares = SharedExpense.query.filter(
            SharedExpense.is_bulk_share == True,
            SharedExpense.bulk_expense_ids.like(f'%{expense_id}%')
        ).all()
        for share in bulk_shares:
            ids = [int(i) for i in share.bulk_expense_ids.split(',') if i and int(i) != int(expense_id)]
            if len(ids) == 0:
                db.session.delete(share)
            elif len(ids) == 1:
                existing = SharedExpense.query.filter_by(
                    expense_id=ids[0],
                    shared_with_id=share.shared_with_id,
                    is_bulk_share=False
                ).first()
                if existing:
                    db.session.delete(share)
                else:
                    share.is_bulk_share = False
                    share.expense_id = ids[0]
                    share.bulk_expense_ids = None
            else:
                share.bulk_expense_ids = ','.join(map(str, ids))
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Expense deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete expense: {str(e)}'}), 500


@expense_bp.route('/api/expenses/bulk-delete', methods=['POST'])
@jwt_required()
def bulk_delete_expenses():
    user_id = get_jwt_identity()
    data = request.get_json()
    expense_ids = data.get('ids', [])
    if not expense_ids:
        return jsonify({'error': 'No expense IDs provided'}), 400

    expenses = Expense.query.filter(
        Expense.id.in_(expense_ids),
        Expense.user_id == user_id
    ).all()
    if not expenses:
        return jsonify({'error': 'No matching expenses found'}), 404

    try:
        for expense in expenses:
            SharedExpense.query.filter_by(expense_id=expense.id).delete()
            bulk_shares = SharedExpense.query.filter(
                SharedExpense.is_bulk_share == True,
                SharedExpense.bulk_expense_ids.like(f'%{expense.id}%')
            ).all()
            for share in bulk_shares:
                ids = [int(i) for i in share.bulk_expense_ids.split(',') if i and int(i) != int(expense.id)]
                if len(ids) == 0:
                    db.session.delete(share)
                elif len(ids) == 1:
                    existing = SharedExpense.query.filter_by(
                        expense_id=ids[0],
                        shared_with_id=share.shared_with_id,
                        is_bulk_share=False
                    ).first()
                    if existing:
                        db.session.delete(share)
                    else:
                        share.is_bulk_share = False
                        share.expense_id = ids[0]
                        share.bulk_expense_ids = None
                else:
                    share.bulk_expense_ids = ','.join(map(str, ids))
            db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Selected expenses deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete expense: {str(e)}'}), 500


@expense_bp.route('/api/expenses/by-ocr', methods=['POST'])
@jwt_required()
def ocr_receipt():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    try:
        file_stream = file.read()
        text = ocr_image(file_stream)
        result = process_receipt(text)
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@expense_bp.route('/api/expenses/<int:expense_id>/share', methods=['POST'])
@jwt_required()
def share_expense(expense_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    shared_with_username = data.get('username')
    shared_with_user = User.query.filter_by(username=shared_with_username).first()
    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    expense = Expense.query.get(expense_id)
    if not expense or expense.user_id != user_id:
        return jsonify({'error': 'Expense not found or unauthorized'}), 404

    existing_share = SharedExpense.query.filter_by(
        expense_id=expense_id,
        shared_with_id=shared_with_user.id
    ).first()
    if existing_share:
        return jsonify({'error': 'This expense is already shared with this user'}), 400

    shared_expense = SharedExpense(expense_id=expense_id, shared_with_id=shared_with_user.id)
    db.session.add(shared_expense)
    db.session.commit()
    return jsonify({'message': 'Expense shared successfully'})


@expense_bp.route('/api/expenses/bulk-share', methods=['POST'])
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
        Expense.user_id == user_id
    ).all()
    if not expenses:
        return jsonify({'error': 'No matching expenses found'}), 404

    shared_count = 0
    already_shared = []
    for expense in expenses:
        existing_share = SharedExpense.query.filter_by(
            expense_id=expense.id,
            shared_with_id=shared_with_user.id
        ).first()
        if not existing_share:
            shared_expense = SharedExpense(expense_id=expense.id, shared_with_id=shared_with_user.id)
            db.session.add(shared_expense)
            shared_count += 1
        else:
            already_shared.append(expense.id)

    db.session.commit()
    message = f'Shared {shared_count} expenses. {len(already_shared)} already shared.' if already_shared else f'Successfully shared {shared_count} expenses.'
    return jsonify({
        'message': message,
        'shared_count': shared_count,
        'already_shared': already_shared
    })
