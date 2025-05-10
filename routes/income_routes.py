from flask import Blueprint, session, jsonify, request
from datetime import datetime
from models.models import db, Income

income_bp = Blueprint('income', __name__)


@income_bp.route('/api/incomes', methods=['GET'])
def get_income():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    income = Income.query.filter_by(user_id=user_id).order_by(Income.date.desc()).all()
    return jsonify([{
        'id': e.id,
        'amount': e.amount,
        'category': e.category,
        'description': e.description,
        'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
    } for e in income])


@income_bp.route('/api/incomes', methods=['POST'])
def add_income():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    try:
        date = datetime.strptime(data['date'], '%Y-%m-%dT%H:%M:%S')
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400

    if date > datetime.now():
        return jsonify({'error': 'Date cannot be in the future'}), 400

    new_income = Income(amount=float(data['amount']),
                        category=data['category'],
                        description=data.get('description', ''),
                        date=date,
                        user_id=session['user']['id'])

    db.session.add(new_income)
    db.session.commit()

    return jsonify({
        'message': 'Income added successfully',
        'income': {
            'id': new_income.id,
            'amount': new_income.amount,
            'category': new_income.category,
            'description': new_income.description,
            'date': new_income.date.strftime('%Y-%m-%d %H:%M:%S')
        }
    })


@income_bp.route('/api/incomes/bulk', methods=['POST'])
def add_incomes_bulk():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data_list = request.get_json()
    new_incomes = []

    for data in data_list:
        new_income = Income(amount=float(data['amount']),
                              category=data['category'],
                              description=data.get('description', ''),
                              user_id=session['user']['id'],
                              date=datetime.strptime(data['date'], '%Y-%m-%dT%H:%M'))
        db.session.add(new_income)
        new_incomes.append(new_income)

    db.session.commit()

    return jsonify({
        'message':
        'Incomes added successfully',
        'incomes': [{
            'id': e.id,
            'amount': e.amount,
            'category': e.category,
            'description': e.description,
            'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
        } for e in new_incomes]
    })


@income_bp.route('/api/incomes/delete', methods=['POST'])
def delete_income():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    income_id = data.get('id')

    income = Income.query.filter_by(id=income_id, user_id=session['user']['id']).first()
    if not income:
        return jsonify({'error': 'Income not found'}), 404

    db.session.delete(income)
    db.session.commit()

    return jsonify({'message': 'Income deleted successfully'})


@income_bp.route('/api/incomes/bulk-delete', methods=['POST'])
def bulk_delete_incomes():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    income_ids = data.get('ids', [])

    if not income_ids:
        return jsonify({'error': 'No income IDs provided'}), 400

    incomes = Income.query.filter(
        Income.id.in_(income_ids),
        Income.user_id == session['user']['id']).all()

    if not incomes:
        return jsonify({'error': 'No matching incomes found'}), 404

    for income in incomes:
        db.session.delete(income)

    db.session.commit()

    return jsonify({'message': 'Selected incomes deleted successfully'})
