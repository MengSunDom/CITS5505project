from flask import Blueprint, session, jsonify, request
from models.models import db, Income, SharedIncome, User

shareIncome_bp = Blueprint('shareIncome', __name__)

@shareIncome_bp.route('/api/share/income/<int:income_id>', methods=['POST'])
def share_Income(income_id):
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

    income  = Income.query.get(income_id)
    if not income :
        return jsonify({'error': 'Income not found'}), 404
    
    if income.user_id != session['user']['id']:
        return jsonify({'error': 'Unauthorized to share this Income'}), 403

    # Check if the Income is already shared with the user
    existing_share = SharedIncome.query.filter_by(
        income_id=income_id,
        shared_with_id=shared_with_user.id,
        is_bulk_share=False
    ).first()
    
    if existing_share:
        return jsonify({'error': 'This Income is already shared with this user'}), 400

    try:
        # Create a single share record
        shared_Income = SharedIncome(
            income_id=income_id,
            shared_with_id=shared_with_user.id,
            is_bulk_share=False,
            is_repeat=False
        )
        
        db.session.add(shared_Income)
        db.session.commit()

        return jsonify({
            'message': 'Income shared successfully',
            'shared_id': shared_Income.id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to share Income: {str(e)}'}), 500

@shareIncome_bp.route('/api/share/income/bulk', methods=['POST'])
def bulk_share_Incomes():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    Income_ids = data.get('ids', [])
    shared_with_username = data.get('username')

    if not Income_ids or not shared_with_username:
        return jsonify({'error': 'Missing Income IDs or username'}), 400

    shared_with_user = User.query.filter_by(username=shared_with_username).first()
    if not shared_with_user:
        return jsonify({'error': 'User not found'}), 404

    # Get all Incomes that belong to the current user
    Incomes = Income.query.filter(
        Income.id.in_(Income_ids),
        Income.user_id == session['user']['id']
    ).all()

    if not Incomes:
        return jsonify({'error': 'No matching Incomes found'}), 404

    try:
        # If only one Income is selected, treat it as a single share
        if len(Income_ids) == 1:
            # Check if already shared
            existing_share = SharedIncome.query.filter_by(
                Income_id=Income_ids[0],
                shared_with_id=shared_with_user.id,
                is_bulk_share=False
            ).first()
            
            if existing_share:
                return jsonify({'error': 'This Income is already shared with this user'}), 400

            # Create single share record
            shared_Income = SharedIncome(
                Income_id=Income_ids[0],
                shared_with_id=shared_with_user.id,
                is_bulk_share=False,
                is_repeat=False
            )
        else:
            # Sort Income IDs for consistent comparison
            sorted_Income_ids = sorted(map(int, Income_ids))
            Income_ids_str = ','.join(map(str, sorted_Income_ids))

            # Check if the exact same combination of Incomes is already shared
            existing_bulk_share = SharedIncome.query.filter(
                SharedIncome.shared_with_id == shared_with_user.id,
                SharedIncome.is_bulk_share == True,
                SharedIncome.bulk_Income_ids == Income_ids_str
            ).first()

            if existing_bulk_share:
                return jsonify({'error': 'These Incomes are already shared with this user'}), 400

            # Check if any of the Incomes are already shared individually
            individually_shared = SharedIncome.query.filter(
                SharedIncome.Income_id.in_(Income_ids),
                SharedIncome.shared_with_id == shared_with_user.id,
                SharedIncome.is_bulk_share == False
            ).all()

            # Create bulk share record
            shared_Income = SharedIncome(
                Income_id=Income_ids[0],
                shared_with_id=shared_with_user.id,
                is_bulk_share=True,
                bulk_Income_ids=Income_ids_str,
                is_repeat=bool(individually_shared)
            )
        
        db.session.add(shared_Income)
        db.session.commit()

        return jsonify({
            'message': f'Successfully shared {len(Incomes)} Incomes with {shared_with_username}',
            'shared_id': shared_Income.id,
            'is_repeat': shared_Income.is_repeat
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@shareIncome_bp.route('/api/share/income/by-me', methods=['GET'])
def get_shared_by_me_Incomes():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    # Get all shared Incomes where the current user is the owner
    shared_incomes = SharedIncome.query.join(Income).filter(
        Income.user_id == user_id
    ).order_by(SharedIncome.date_shared.desc()).all()
    
    incomes = []

    for se in shared_incomes:
        shared_with_user = User.query.get(se.shared_with_id)
        if not shared_with_user:
            continue

        if se.is_bulk_share and se.bulk_income_ids:
            # Handle bulk shared Incomes
            income_ids = se.bulk_income_ids.split(',')
            bulk_incomes = Income.query.filter(Income.id.in_(income_ids)).all()
            
            # Get total amount and categories
            total_amount = sum(e.amount for e in bulk_incomes)
            categories = list(set(e.category for e in bulk_incomes))
            
            # Get detailed information for each Income
            details = []
            for e in bulk_incomes:
                # Check if this Income is shared individually with the same user
                individual_share = SharedIncome.query.filter_by(
                    income_id=e.id,
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
            
            incomes.append({
                'id': se.id,
                'is_bulk': True,
                'Income_count': len(bulk_incomes),
                'total_amount': total_amount,
                'categories': categories,
                'date': se.date_shared.strftime('%Y-%m-%d %H:%M:%S'),
                'shared_with': shared_with_user.username,
                'shared_id': se.id,
                'details': details,
                'is_repeat': se.is_repeat
            })
        else:
            # Handle single shared Income
            income = Income.query.get(se.income_id)
            if income:
                # Check if this income is part of any bulk share with the same user
                bulk_share = SharedIncome.query.filter(
                    SharedIncome.shared_with_id == se.shared_with_id,
                    SharedIncome.is_bulk_share == True,
                    SharedIncome.bulk_income_ids.like(f'%{se.income_id}%')
                ).first()

                incomes.append({
                    'id': se.income_id,
                    'is_bulk': False,
                    'amount': income.amount,
                    'category': income.category,
                    'description': income.description,
                    'date': income.date.astimezone().strftime('%Y-%m-%d %H:%M:%S'),
                    'shared_with': shared_with_user.username,
                    'shared_id': se.id,
                    'is_repeat': bool(bulk_share)
                })
    
    return jsonify(incomes)

@shareIncome_bp.route('/api/share/income/with-me', methods=['GET'])
def get_shared_with_me_Incomes():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        user_id = session['user']['id']
        print(f"Fetching shared Incomes for user {user_id}")  # Debug log

        # Get all Incomes shared with the current user
        shared_Incomes = SharedIncome.query.filter_by(shared_with_id=user_id).all()
        print(f"Found {len(shared_Incomes)} shared Incomes")  # Debug log
        
        # Group bulk shares
        bulk_shares = {}
        single_shares = []
        
        for share in shared_Incomes:
            print(f"Processing share {share.id}")  # Debug log
            if share.is_bulk_share and share.bulk_Income_ids:
                # For bulk shares, group by the combination of Incomes
                key = share.bulk_Income_ids
                if key not in bulk_shares:
                    # Get all Incomes in this bulk share
                    Income_ids = [int(id) for id in key.split(',')]
                    incomes = Income.query.filter(Income.id.in_(Income_ids)).all()
                    
                    # Calculate total amount and get all categories
                    total_amount = sum(income.amount for income in incomes)
                    categories = list(set(income.category for income in incomes))
                    
                    # Check if any of these Incomes are already shared individually
                    is_repeat = any(
                        SharedIncome.query.filter_by(
                            income_id=income.id,
                            shared_with_id=user_id,
                            is_bulk_share=False
                        ).first() is not None
                        for income in incomes
                    )
                    
                    # Get the user who shared these Incomes (from the first Income)
                    shared_by_user = User.query.get(incomes[0].user_id) if incomes else None
                    
                    bulk_shares[key] = {
                        'id': share.id,
                        'shared_id': share.id,
                        'is_bulk': True,
                        'Income_count': len(incomes),
                        'total_amount': total_amount,
                        'categories': categories,
                        'date': share.date_shared.strftime('%Y-%m-%d'),
                        'shared_by': shared_by_user.username if shared_by_user else 'Unknown',
                        'is_repeat': is_repeat,
                        'details': [{
                            'date': income.date.strftime('%Y-%m-%d'),
                            'category': income.category,
                            'description': income.description,
                            'amount': income.amount,
                            'is_repeat': SharedIncome.query.filter_by(
                                income_id=income.id,
                                shared_with_id=user_id,
                                is_bulk_share=False
                            ).first() is not None
                        } for income in incomes]
                    }
            else:
                # For single shares
                income = Income.query.get(share.income_id)
                if income:
                    # Check if this Income is part of any bulk share
                    is_repeat = SharedIncome.query.filter(
                        SharedIncome.bulk_income_ids.like(f'%{income.id}%'),
                        SharedIncome.shared_with_id == user_id,
                        SharedIncome.is_bulk_share == True
                    ).first() is not None
                    
                    # Get the user who shared this income
                    shared_by_user = User.query.get(income.user_id)
                    
                    single_shares.append({
                        'id': income.id,
                        'shared_id': share.id,
                        'is_bulk': False,
                        'description': income.description,
                        'category': income.category,
                        'amount': income.amount,
                        'date': income.date.strftime('%Y-%m-%d'),
                        'shared_by': shared_by_user.username if shared_by_user else 'Unknown',
                        'is_repeat': is_repeat
                    })
        
        # Combine bulk and single shares
        result = list(bulk_shares.values()) + single_shares
        print(f"Returning {len(result)} total shares")  # Debug log
        
        return jsonify(result)
    except Exception as e:
        print(f"Error in get_shared_with_me_Incomes: {str(e)}")  # Debug log
        return jsonify({'error': str(e)}), 500

@shareIncome_bp.route('/api/share/income/cancel', methods=['POST'])
def cancel_shared_Income():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    shared_id = data.get('shared_id')
    if not shared_id:
        return jsonify({'error': 'Shared income ID is required'}), 400

    shared_Income = SharedIncome.query.get(shared_id)
    if not shared_Income:
        return jsonify({'error': 'Shared income not found'}), 404

    user_id = session['user']['id']
    
    # For bulk shares, allow both the sharer and the recipient to cancel
    if shared_Income.is_bulk_share:
        Income_ids = [int(id) for id in shared_Income.bulk_Income_ids.split(',')]
        first_Income = Income.query.get(Income_ids[0])
        if not first_Income or (first_Income.user_id != user_id and shared_Income.shared_with_id != user_id):
            return jsonify({'error': 'Unauthorized to cancel this shared Income'}), 403
    else:
        # For single shares, check if the user is either the sharer or the recipient
        income = Income.query.get(shared_Income.income_id)
        if not income or (income.user_id != user_id and shared_Income.shared_with_id != user_id):
            return jsonify({'error': 'Unauthorized to cancel this shared income'}), 403

    try:
        db.session.delete(shared_Income)
        db.session.commit()
        return jsonify({'message': 'Shared income canceled successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to cancel shared income: {str(e)}'}), 500

@shareIncome_bp.route('/api/share/income/bulk-cancel', methods=['POST'])
def bulk_cancel_shares():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    data = request.get_json()
    Income_ids = data.get('ids', [])

    if not Income_ids:
        return jsonify({'error': 'No income IDs provided'}), 400

    # Get all shared Incomes for the current user
    shared_Incomes = SharedIncome.query.join(Income).filter(
        Income.id.in_(Income_ids),
        Income.user_id == session['user']['id']
    ).all()

    if not shared_Incomes:
        return jsonify({'error': 'No shared Incomes found'}), 404

    # Delete all shared Incomes
    for shared_Income in shared_Incomes:
        db.session.delete(shared_Income)

    db.session.commit()

    return jsonify({
        'message': f'Successfully canceled sharing for {len(shared_Incomes)} Incomes'
    })