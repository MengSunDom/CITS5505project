from flask import Blueprint, session, jsonify, request
from datetime import datetime
from models.models import db, Income, SharedIncome
from utils.decorators import csrf_required

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
@csrf_required
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

    try:
        # Find all bulk shares containing this income
        bulk_shares = SharedIncome.query.filter(
            SharedIncome.is_bulk_share == True,
            SharedIncome.bulk_income_ids.like(f'%{income_id}%')
        ).all()

        for bulk_share in bulk_shares:
            # Get all income IDs in this bulk share
            income_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',')]
            # Remove the deleted income from the list
            income_ids.remove(income_id)
            if len(income_ids) == 1:
                # If only one income remains, check if it's already shared individually
                remaining_income_id = income_ids[0]
                existing_single_share = SharedIncome.query.filter_by(
                    income_id=remaining_income_id,
                    shared_with_id=bulk_share.shared_with_id,
                    is_bulk_share=False
                ).first()
                if existing_single_share:
                    # If already shared individually, delete the bulk share
                    db.session.delete(bulk_share)
                else:
                    # Convert to single share
                    new_single_share = SharedIncome(
                        income_id=remaining_income_id,
                        shared_with_id=bulk_share.shared_with_id,
                        is_bulk_share=False,
                        is_repeat=False
                    )
                    db.session.add(new_single_share)
                    db.session.delete(bulk_share)
            else:
                # Update the bulk share with remaining income IDs
                bulk_share.bulk_income_ids = ','.join(map(str, sorted(income_ids)))
                # Update is_repeat flag
                bulk_share.is_repeat = any(
                    SharedIncome.query.filter_by(
                        income_id=id,
                        shared_with_id=bulk_share.shared_with_id,
                        is_bulk_share=False
                    ).first() is not None
                    for id in income_ids
                )
        # Delete all single shares of this income
        SharedIncome.query.filter_by(income_id=income_id).delete()
        # Delete the income
        db.session.delete(income)
        db.session.commit()
        return jsonify({'message': 'Income deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete income: {str(e)}'}), 500


@income_bp.route('/api/incomes/bulk-delete', methods=['POST'])
def bulk_delete_incomes():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    income_ids = data.get('ids', [])

    if not income_ids:
        return jsonify({'error': 'No income IDs provided'}), 400

    try:
        # Get all incomes to be deleted
        incomes = Income.query.filter(
            Income.id.in_(income_ids),
            Income.user_id == session['user']['id']
        ).all()
        if not incomes:
            return jsonify({'error': 'No matching incomes found'}), 404
        # Process each income
        for income in incomes:
            # Find all bulk shares containing this income
            bulk_shares = SharedIncome.query.filter(
                SharedIncome.is_bulk_share == True,
                SharedIncome.bulk_income_ids.like(f'%{income.id}%')
            ).all()
            for bulk_share in bulk_shares:
                # Get all income IDs in this bulk share
                share_income_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',')]
                # Remove the deleted income from the list
                share_income_ids.remove(income.id)
                if len(share_income_ids) == 1:
                    # If only one income remains, check if it's already shared individually
                    remaining_income_id = share_income_ids[0]
                    existing_single_share = SharedIncome.query.filter_by(
                        income_id=remaining_income_id,
                        shared_with_id=bulk_share.shared_with_id,
                        is_bulk_share=False
                    ).first()
                    if existing_single_share:
                        # If already shared individually, delete the bulk share
                        db.session.delete(bulk_share)
                    else:
                        # Convert to single share
                        new_single_share = SharedIncome(
                            income_id=remaining_income_id,
                            shared_with_id=bulk_share.shared_with_id,
                            is_bulk_share=False,
                            is_repeat=False
                        )
                        db.session.add(new_single_share)
                        db.session.delete(bulk_share)
                else:
                    # Update the bulk share with remaining income IDs
                    bulk_share.bulk_income_ids = ','.join(map(str, sorted(share_income_ids)))
                    # Update is_repeat flag
                    bulk_share.is_repeat = any(
                        SharedIncome.query.filter_by(
                            income_id=id,
                            shared_with_id=bulk_share.shared_with_id,
                            is_bulk_share=False
                        ).first() is not None
                        for id in share_income_ids
                    )
            # Delete all single shares of this income
            SharedIncome.query.filter_by(income_id=income.id).delete()
            # Delete the income
            db.session.delete(income)
        db.session.commit()
        return jsonify({'message': 'Selected incomes deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete incomes: {str(e)}'}), 500
