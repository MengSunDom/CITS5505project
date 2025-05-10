from flask import Blueprint, session, jsonify, request
from datetime import datetime
from models.models import db, Expense, User, SharedExpense
from utils.llm import process_receipt
from utils.ocr import ocr_image


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
        date = datetime.strptime(data['date'], '%Y-%m-%dT%H:%M:%S')
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

    # Find the expense belonging to the current user
    expense = Expense.query.filter_by(id=expense_id, user_id=session['user']['id']).first()
    if not expense:
        return jsonify({'error': 'Expense not found'}), 404

    try:
        # Delete all related SharedExpense records before deleting the expense itself
        SharedExpense.query.filter_by(expense_id=expense_id).delete()
        db.session.delete(expense)
        db.session.commit()
        return jsonify({'message': 'Expense deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete expense: {str(e)}'}), 500


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


@expense_bp.route('/api/expenses/by-ocr', methods=['POST'])
def ocr_receipt():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        # Read file directly into memory
        file_stream = file.read()
        text = ocr_image(file_stream)  # Pass the file stream to the OCR function
        result = process_receipt(text)
        return jsonify({'result': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@expense_bp.route('/api/expenses/<int:expense_id>/share', methods=['POST'])
def share_expense(expense_id):
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    shared_with_username = data.get('username')

    shared_with_user = User.query.filter_by(username=shared_with_username).first()
    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    expense = Expense.query.get(expense_id)
    if not expense or expense.user_id != session['user']['id']:
        return jsonify({'error': 'Expense not found or unauthorized'}), 404

    # Check if already shared
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

    expenses = Expense.query.filter(
        Expense.id.in_(expense_ids),
        Expense.user_id == session['user']['id']
    ).all()

    if not expenses:
        return jsonify({'error': 'No matching expenses found'}), 404

    # Check for existing shares and create new ones
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

    # Prepare response message
    if already_shared:
        message = f'Shared {shared_count} expenses. {len(already_shared)} expenses were already shared.'
    else:
        message = f'Successfully shared {shared_count} expenses.'

    return jsonify({
        'message': message,
        'shared_count': shared_count,
        'already_shared': already_shared
    })
