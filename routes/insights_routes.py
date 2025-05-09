import logging
from flask import Blueprint, session, jsonify, request
from datetime import datetime, timedelta
from models.models import db, Expense
from sqlalchemy import func

insights_bp = Blueprint('insights', __name__)

def parse_date_range():
    try:
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d') + timedelta(days=1)  # 包含整天
        return start_date, end_date
    except Exception as e:
        raise ValueError("Invalid or missing date range parameters")

@insights_bp.route('/api/insights', methods=['GET'])
def get_insights():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']

    category_expenses = db.session.query(
        Expense.category,
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(Expense.category).all()

    category_labels = [item[0] for item in category_expenses]
    category_values = [float(item[1]) for item in category_expenses]

    date_category_expenses = db.session.query(
        func.date(Expense.date).label('date'),
        Expense.category,
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(func.date(Expense.date), Expense.category).all()

    date_category_data = {}
    for date, category, total in date_category_expenses:
        if date not in date_category_data:
            date_category_data[date] = {}
        date_category_data[date][category] = float(total)

    expenses = db.session.query(
        func.date(Expense.date).label('date'),
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(func.date(Expense.date)).order_by(func.date(Expense.date)).all()

    date_labels = [e.date for e in expenses]
    date_values = [e.total for e in expenses]
    totalAmount = sum(date_values)
    
    return jsonify({
        'category': {'labels': category_labels, 'values': category_values},
        'date_category': date_category_data,
        'date': {'labels': date_labels, 'values': date_values},
        'totalAmount': totalAmount
    })

@insights_bp.route('/api/insights/summary', methods=['GET'])
def get_expense_summary():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']

    total_entries = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).count()

    total_amount = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).scalar() or 0.0

    category_distribution = db.session.query(
        Expense.category, func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(Expense.category).all()

    labels = [item[0] for item in category_distribution]
    values = [item[1] for item in category_distribution]

    return jsonify({
        'totalEntries': total_entries,
        'totalAmount': total_amount,
        'categoryDistribution': {'labels': labels, 'values': values}
    })


@insights_bp.route('/api/income-summary', methods=['GET'])
def get_income_summary():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']

    total_income = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.type == 'income',
        Expense.date >= start_date,
        Expense.date < end_date
    ).scalar() or 0.0

    category_distribution = db.session.query(
        Expense.category, func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'income',
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(Expense.category).all()

    labels = [item[0] for item in category_distribution]
    values = [item[1] for item in category_distribution]

    return jsonify({
        'totalAmount': total_income,
        'categoryDistribution': {'labels': labels, 'values': values}
    })

@insights_bp.route('/api/income-expense-comparison', methods=['GET'])
def income_expense_comparison():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']

    income_data = db.session.query(
        func.date(Expense.date).label('date'),
        func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'income',
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(func.date(Expense.date)).all()

    expense_data = db.session.query(
        func.date(Expense.date).label('date'),
        func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
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
