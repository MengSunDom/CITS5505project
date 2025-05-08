import logging
from flask import Blueprint, session, jsonify, request
from datetime import datetime, timedelta
from models.models import db, Expense
from sqlalchemy import func

insights_bp = Blueprint('insights', __name__)

@insights_bp.route('/api/insights', methods=['GET'])
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

    # Total amount by category
    category_expenses = db.session.query(
        Expense.category,
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.date >= start_date
    ).group_by(Expense.category).all()

    category_labels = [item[0] for item in category_expenses]
    category_values = [float(item[1]) for item in category_expenses]

    # Total amount by date and category
    date_category_expenses = db.session.query(
        func.date(Expense.date).label('date'),
        Expense.category,
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.date >= start_date
    ).group_by(func.date(Expense.date), Expense.category).all()

    date_category_data = {}
    for date, category, total in date_category_expenses:
        if date not in date_category_data:
            date_category_data[date] = {}
        date_category_data[date][category] = float(total)

    # Total amount by date
    expenses = db.session.query(
        func.date(Expense.date).label('date'),
        func.sum(Expense.amount).label('total')).filter(
            Expense.user_id == user_id, Expense.date
            >= start_date).group_by(func.date(Expense.date)).order_by(
                func.date(Expense.date)).all()

    # Ensure `e.date` is parsed as a `datetime` object
    date_labels = [
        datetime.strptime(e.date, '%Y-%m-%d').strftime('%Y-%m-%d')
        if isinstance(e.date, str) else e.date.strftime('%Y-%m-%d')
        for e in expenses
    ]
    date_values = [e.total for e in expenses]

    logging.debug({
        'category': {
            'labels': category_labels,
            'values': category_values
        },
        'date_category': date_category_data,
        'date': {
            'labels': date_labels,
            'values': date_values
        }
    })
    return jsonify({
        'category': {
            'labels': category_labels,
            'values': category_values
        },
        'date_category': date_category_data,
        'date': {
            'labels': date_labels,
            'values': date_values
        }
    })


@insights_bp.route('/api/insights/summary', methods=['GET'])
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

@insights_bp.route('/api/income-summary', methods=['GET'])
def get_income_summary():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    days = int(request.args.get('days', 7))
    start_date = datetime.now() - timedelta(days=days)

    total_income = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.type == 'income',
        Expense.date >= start_date
    ).scalar() or 0.0

    category_distribution = db.session.query(
        Expense.category, func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'income',
        Expense.date >= start_date
    ).group_by(Expense.category).all()

    labels = [item[0] for item in category_distribution]
    values = [item[1] for item in category_distribution]

    return jsonify({
        'totalAmount': total_income,
        'categoryDistribution': {
            'labels': labels,
            'values': values
        }
    })

@insights_bp.route('/api/income-expense-comparison', methods=['GET'])
def income_expense_comparison():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    user_id = session['user']['id']
    days = int(request.args.get('days', 7))
    start_date = datetime.now() - timedelta(days=days)

    income_data = db.session.query(
        func.date(Expense.date).label('date'),
        func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'income',
        Expense.date >= start_date
    ).group_by(func.date(Expense.date)).all()

    expense_data = db.session.query(
        func.date(Expense.date).label('date'),
        func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date
    ).group_by(func.date(Expense.date)).all()

    date_set = set([d for d, _ in income_data] + [d for d, _ in expense_data])
    date_list = sorted(date_set)

    income_map = {d: float(a) for d, a in income_data}
    expense_map = {d: float(a) for d, a in expense_data}

    income_list = [income_map.get(d, 0.0) for d in date_list]
    expense_list = [expense_map.get(d, 0.0) for d in date_list]

    return jsonify({
        'labels': [d.strftime('%Y-%m-%d') for d in date_list],
        'income': income_list,
        'expense': expense_list
    })
