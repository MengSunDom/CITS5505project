from flask import Blueprint, jsonify, request
from datetime import datetime
from models.models import db, Income, SharedIncome
from flask_jwt_extended import jwt_required, get_jwt_identity

income_bp = Blueprint('income', __name__)


@income_bp.route('/api/incomes', methods=['GET'])
@jwt_required()
def get_income():
    user_id = get_jwt_identity()
    income = Income.query.filter_by(user_id=user_id).order_by(Income.date.desc()).all()
    return jsonify([{
        'id': e.id,
        'amount': e.amount,
        'category': e.category,
        'description': e.description,
        'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
    } for e in income])


@income_bp.route('/api/incomes', methods=['POST'])
@jwt_required()
def add_income():
    user_id = get_jwt_identity()
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
                        user_id=user_id)

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
@jwt_required()
def add_incomes_bulk():
    user_id = get_jwt_identity()
    data_list = request.get_json()
    new_incomes = []

    for data in data_list:
        new_income = Income(amount=float(data['amount']),
                            category=data['category'],
                            description=data.get('description', ''),
                            user_id=user_id,
                            date=datetime.strptime(data['date'], '%Y-%m-%dT%H:%M'))
        db.session.add(new_income)
        new_incomes.append(new_income)

    db.session.commit()

    return jsonify({
        'message': 'Incomes added successfully',
        'incomes': [{
            'id': e.id,
            'amount': e.amount,
            'category': e.category,
            'description': e.description,
            'date': e.date.astimezone().strftime('%Y-%m-%d %H:%M:%S')
        } for e in new_incomes]
    })


@income_bp.route('/api/incomes/delete', methods=['POST'])
@jwt_required()
def delete_income():
    user_id = get_jwt_identity()
    data = request.get_json()
    income_id = data.get('id')

    income = Income.query.filter_by(id=income_id, user_id=user_id).first()
    if not income:
        return jsonify({'error': 'Income not found'}), 404

    try:
        bulk_shares = SharedIncome.query.filter(
            SharedIncome.is_bulk_share == True,
            SharedIncome.bulk_income_ids.like(f'%{income_id}%')
        ).all()

        for bulk_share in bulk_shares:
            income_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',')]
            income_ids.remove(income_id)
            if len(income_ids) == 1:
                remaining_id = income_ids[0]
                existing = SharedIncome.query.filter_by(
                    income_id=remaining_id,
                    shared_with_id=bulk_share.shared_with_id,
                    is_bulk_share=False
                ).first()
                if existing:
                    db.session.delete(bulk_share)
                else:
                    db.session.add(SharedIncome(
                        income_id=remaining_id,
                        shared_with_id=bulk_share.shared_with_id,
                        is_bulk_share=False,
                        is_repeat=False
                    ))
                    db.session.delete(bulk_share)
            else:
                bulk_share.bulk_income_ids = ','.join(map(str, sorted(income_ids)))
                bulk_share.is_repeat = any(
                    SharedIncome.query.filter_by(
                        income_id=id,
                        shared_with_id=bulk_share.shared_with_id,
                        is_bulk_share=False
                    ).first() for id in income_ids
                )

        SharedIncome.query.filter_by(income_id=income_id).delete()
        db.session.delete(income)
        db.session.commit()
        return jsonify({'message': 'Income deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete income: {str(e)}'}), 500


@income_bp.route('/api/incomes/bulk-delete', methods=['POST'])
@jwt_required()
def bulk_delete_incomes():
    user_id = get_jwt_identity()
    data = request.get_json()
    income_ids = data.get('ids', [])

    if not income_ids:
        return jsonify({'error': 'No income IDs provided'}), 400

    try:
        incomes = Income.query.filter(
            Income.id.in_(income_ids),
            Income.user_id == user_id
        ).all()

        if not incomes:
            return jsonify({'error': 'No matching incomes found'}), 404

        for income in incomes:
            bulk_shares = SharedIncome.query.filter(
                SharedIncome.is_bulk_share == True,
                SharedIncome.bulk_income_ids.like(f'%{income.id}%')
            ).all()
            for share in bulk_shares:
                ids = [int(id) for id in share.bulk_income_ids.split(',') if int(id) != income.id]
                if len(ids) == 1:
                    remaining_id = ids[0]
                    existing = SharedIncome.query.filter_by(
                        income_id=remaining_id,
                        shared_with_id=share.shared_with_id,
                        is_bulk_share=False
                    ).first()
                    if existing:
                        db.session.delete(share)
                    else:
                        db.session.add(SharedIncome(
                            income_id=remaining_id,
                            shared_with_id=share.shared_with_id,
                            is_bulk_share=False,
                            is_repeat=False
                        ))
                        db.session.delete(share)
                else:
                    share.bulk_income_ids = ','.join(map(str, sorted(ids)))
                    share.is_repeat = any(
                        SharedIncome.query.filter_by(
                            income_id=id,
                            shared_with_id=share.shared_with_id,
                            is_bulk_share=False
                        ).first() for id in ids
                    )
            SharedIncome.query.filter_by(income_id=income.id).delete()
            db.session.delete(income)

        db.session.commit()
        return jsonify({'message': 'Selected incomes deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete incomes: {str(e)}'}), 500
