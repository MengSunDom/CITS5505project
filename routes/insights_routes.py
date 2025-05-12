import logging
from flask import Blueprint, jsonify, request, redirect, url_for, render_template
from datetime import datetime, timedelta
from models.models import db, Expense, Income
from sqlalchemy import func
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request

insights_bp = Blueprint('insights', __name__)

# Helper function to parse date range from request
def parse_date_range(user_id):
    """
    Parse date range from request parameters.
    Handles date range in a consistent way with the frontend.
    """
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    logging.debug(f"Raw date parameters: startDate={start_date}, endDate={end_date}")

    if not start_date or not end_date:
        today = datetime.now()
        start_date = datetime(today.year, today.month, 1).strftime('%Y-%m-%d')
        next_month = datetime(today.year + 1 if today.month == 12 else today.year,
                              1 if today.month == 12 else today.month + 1, 1)
        end_date = next_month.strftime('%Y-%m-%d')
        logging.debug(f"Using default dates: startDate={start_date}, endDate={end_date}")

    try:
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')

        start_date_obj = datetime(start_date_obj.year, start_date_obj.month, start_date_obj.day, 0, 0, 0)

        if end_date_obj.day != 1 or (start_date_obj.month == end_date_obj.month and start_date_obj.year == end_date_obj.year):
            end_date_obj = datetime(end_date_obj.year, end_date_obj.month, end_date_obj.day, 0, 0, 0)
            end_date_obj += timedelta(days=1)

        # Logging for diagnostics
        expense_count = Expense.query.filter(
            Expense.user_id == user_id,
            Expense.date >= start_date_obj,
            Expense.date < end_date_obj
        ).count()

        income_count = Income.query.filter(
            Income.user_id == user_id,
            Income.date >= start_date_obj,
            Income.date < end_date_obj
        ).count()

        logging.debug(f"Parsed date range: {start_date_obj} to {end_date_obj}")
        logging.debug(f"Data counts in range: expenses={expense_count}, income={income_count}")

        return start_date_obj, end_date_obj

    except ValueError as e:
        logging.error(f"Date parsing error: {e}")
        raise ValueError('Invalid date format. Use YYYY-MM-DD.')

@insights_bp.route('/api/insights', methods=['GET'])
@jwt_required()
def get_insights():
    user_id = get_jwt_identity()
    
    try:
        start_date, end_date = parse_date_range(user_id)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    category_expenses = db.session.query(
        Expense.category,
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
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
        Expense.type == 'expense',
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
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(func.date(Expense.date)).order_by(func.date(Expense.date)).all()

    date_labels = []
    date_values = []

    for expense_date, expense_total in expenses:
        date_str = expense_date.strftime('%Y-%m-%d') if hasattr(expense_date, 'strftime') else str(expense_date)
        date_labels.append(date_str)
        date_values.append(float(expense_total))

    totalAmount = sum(date_values)

    return jsonify({
        'category': {'labels': category_labels, 'values': category_values},
        'date_category': date_category_data,
        'date': {'labels': date_labels, 'values': date_values},
        'totalAmount': totalAmount
    })

@insights_bp.route('/api/insights/summary', methods=['GET'])
@jwt_required()
def get_expense_summary():
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = get_jwt_identity()

    total_entries = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).count()

    total_amount = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).scalar() or 0.0

    category_distribution = db.session.query(
        Expense.category, func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(Expense.category).all()

    labels = [item[0] for item in category_distribution]
    values = [float(item[1]) for item in category_distribution]

    return jsonify({
        'totalEntries': total_entries,
        'totalAmount': float(total_amount),
        'categoryDistribution': {'labels': labels, 'values': values}
    })

@insights_bp.route('/api/income-summary', methods=['GET'])
@jwt_required()
def get_income_summary():
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = get_jwt_identity()

    total_income = db.session.query(func.sum(Income.amount)).filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).scalar() or 0.0

    category_distribution = db.session.query(
        Income.category, func.sum(Income.amount)
    ).filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).group_by(Income.category).all()

    labels = [item[0] for item in category_distribution]
    values = [float(item[1]) for item in category_distribution]

    return jsonify({
        'totalAmount': float(total_income),
        'categoryDistribution': {'labels': labels, 'values': values}
    })

@insights_bp.route('/api/income-expense-comparison', methods=['GET'])
@jwt_required()
def income_expense_comparison():
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = get_jwt_identity()

    # Get income data
    income_data = db.session.query(
        func.date(Income.date).label('date'),
        func.sum(Income.amount).label('total')
    ).filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).group_by(func.date(Income.date)).all()

    # Get expense data
    expense_data = db.session.query(
        func.date(Expense.date).label('date'),
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(func.date(Expense.date)).all()

    date_set = set()

    income_map = {}
    for date_val, amount in income_data:
        date_str = date_val.strftime('%Y-%m-%d') if hasattr(date_val, 'strftime') else str(date_val)
        date_set.add(date_str)
        income_map[date_str] = float(amount)

    expense_map = {}
    for date_val, amount in expense_data:
        date_str = date_val.strftime('%Y-%m-%d') if hasattr(date_val, 'strftime') else str(date_val)
        date_set.add(date_str)
        expense_map[date_str] = float(amount)

    date_list = sorted(date_set)
    income_list = [income_map.get(d, 0.0) for d in date_list]
    expense_list = [expense_map.get(d, 0.0) for d in date_list]

    return jsonify({
        'labels': date_list,
        'income': income_list,
        'expense': expense_list
    })

@insights_bp.route('/insights')
@jwt_required()
def insights_page():
    return render_template('insight.html')

@insights_bp.route('/api/insights/debug', methods=['GET'])
@jwt_required()
def debug_insights():
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')

    try:
        start_date, end_date = parse_date_range()
        user_id = get_jwt_identity()

        expenses = Expense.query.filter(
            Expense.user_id == user_id,
            Expense.type == 'expense',
            Expense.date >= start_date,
            Expense.date < end_date
        ).order_by(Expense.date).all()

        incomes = Income.query.filter(
            Income.user_id == user_id,
            Income.date >= start_date,
            Income.date < end_date
        ).order_by(Income.date).all()

        oldest_expense = db.session.query(func.min(Expense.date)).filter(
            Expense.user_id == user_id
        ).scalar()

        newest_expense = db.session.query(func.max(Expense.date)).filter(
            Expense.user_id == user_id
        ).scalar()

        oldest_income = db.session.query(func.min(Income.date)).filter(
            Income.user_id == user_id
        ).scalar()

        newest_income = db.session.query(func.max(Income.date)).filter(
            Income.user_id == user_id
        ).scalar()

        expense_details = [{
            'id': e.id,
            'date': e.date.strftime('%Y-%m-%d'),
            'amount': float(e.amount),
            'category': e.category,
            'description': e.description
        } for e in expenses]

        income_details = [{
            'id': i.id,
            'date': i.date.strftime('%Y-%m-%d'),
            'amount': float(i.amount),
            'category': i.category,
            'description': i.description
        } for i in incomes]

        today = datetime.now()
        prev_month_start = datetime(today.year, today.month - 1, 1) if today.month > 1 else datetime(today.year - 1, 12, 1)
        prev_month_end = datetime(today.year, today.month, 1)

        prev_month_expenses = Expense.query.filter(
            Expense.user_id == user_id,
            Expense.type == 'expense',
            Expense.date >= prev_month_start,
            Expense.date < prev_month_end
        ).order_by(Expense.date).all()

        prev_month_expense_details = [{
            'id': e.id,
            'date': e.date.strftime('%Y-%m-%d'),
            'amount': float(e.amount),
            'category': e.category,
            'description': e.description
        } for e in prev_month_expenses]

        return jsonify({
            'request': {
                'startDate': start_date_str,
                'endDate': end_date_str,
            },
            'processed': {
                'startDate': start_date.isoformat() if start_date else None,
                'endDate': end_date.isoformat() if end_date else None,
            },
            'counts': {
                'expenses': len(expenses),
                'income': len(incomes)
            },
            'dataRange': {
                'expenses': {
                    'oldest': oldest_expense.isoformat() if oldest_expense else None,
                    'newest': newest_expense.isoformat() if newest_expense else None
                },
                'income': {
                    'oldest': oldest_income.isoformat() if oldest_income else None,
                    'newest': newest_income.isoformat() if newest_income else None
                }
            },
            'expenseDetails': expense_details,
            'incomeDetails': income_details,
            'previousMonth': {
                'startDate': prev_month_start.isoformat(),
                'endDate': prev_month_end.isoformat(),
                'expenses': prev_month_expense_details,
                'count': len(prev_month_expense_details)
            }
        })
    except Exception as e:
        logging.error(f"Debug API error: {str(e)}")
        return jsonify({
            'error': str(e),
            'request': {
                'startDate': start_date_str,
                'endDate': end_date_str
            }
        }), 400

@insights_bp.route('/api/insights/date-diagnostic', methods=['GET'])
@jwt_required()
def date_diagnostic():
    """
    Diagnostic endpoint to help understand date assignment to months.
    This shows how dates are parsed and which month they belong to.
    """
    user_id = get_jwt_identity()
    
    # Get all dates with expenses or income for this user
    expense_dates = db.session.query(func.date(Expense.date)).filter(
        Expense.user_id == user_id
    ).group_by(func.date(Expense.date)).order_by(func.date(Expense.date)).all()
    
    income_dates = db.session.query(func.date(Income.date)).filter(
        Income.user_id == user_id
    ).group_by(func.date(Income.date)).order_by(func.date(Income.date)).all()
    
    # Combine and sort all dates
    all_dates = set([d[0] for d in expense_dates] + [d[0] for d in income_dates])
    sorted_dates = sorted(all_dates)
    
    # For each date, determine which month period it belongs to
    date_assignments = []
    
    for date_val in sorted_dates:
        # Get expense amounts for this date
        expense_amount = db.session.query(func.sum(Expense.amount)).filter(
            Expense.user_id == user_id,
            func.date(Expense.date) == date_val
        ).scalar() or 0.0
        
        # Get income amounts for this date
        income_amount = db.session.query(func.sum(Income.amount)).filter(
            Income.user_id == user_id,
            func.date(Income.date) == date_val
        ).scalar() or 0.0
        
        # Create month ranges to test
        date_obj = date_val
        current_year = date_obj.year
        current_month = date_obj.month
        
        # This month range
        this_month_start = datetime(current_year, current_month, 1)
        this_month_end = datetime(current_year + 1, 1, 1) if current_month == 12 else datetime(current_year, current_month + 1, 1)
        
        # Previous month range
        if current_month == 1:
            prev_month_start = datetime(current_year - 1, 12, 1)
            prev_month_end = datetime(current_year, 1, 1)
        else:
            prev_month_start = datetime(current_year, current_month - 1, 1)
            prev_month_end = datetime(current_year, current_month, 1)
        
        # Check which periods this date falls into
        in_this_month = this_month_start <= date_obj < this_month_end
        in_prev_month = prev_month_start <= date_obj < prev_month_end
        
        date_assignments.append({
            'date': date_val.strftime('%Y-%m-%d'),
            'expenses': float(expense_amount),
            'income': float(income_amount),
            'monthName': date_obj.strftime('%B'),
            'year': date_obj.year,
            'month': date_obj.month,
            'day': date_obj.day,
            'periods': {
                'thisMonth': in_this_month,
                'prevMonth': in_prev_month
            }
        })
    
    return jsonify({
        'dateAssignments': date_assignments
    })

@insights_bp.route('/api/income-by-month', methods=['GET'])
@jwt_required()
def get_income_by_month():
    """
    Get income data aggregated by month.
    This endpoint provides real monthly income data for charts.
    """
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = get_jwt_identity()
    
    income_by_month = db.session.query(
        func.extract('year', Income.date).label('year'),
        func.extract('month', Income.date).label('month'),
        func.sum(Income.amount).label('total')
    ).filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).group_by(
        func.extract('year', Income.date),
        func.extract('month', Income.date)
    ).order_by(
        func.extract('year', Income.date),
        func.extract('month', Income.date)
    ).all()
    
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    labels = []
    values = []
    
    for year, month, total in income_by_month:
        month_idx = int(month) - 1
        if 0 <= month_idx < 12:
            month_name = month_names[month_idx]
            labels.append(f"{month_name} {int(year)}")
            values.append(float(total))
    
    logging.debug(f"Income by month: {list(zip(labels, values))}")
    
    return jsonify({'labels': labels, 'values': values})


@insights_bp.route('/api/expenses-by-month', methods=['GET'])
@jwt_required()
def get_expenses_by_month():
    """
    Get expense data aggregated by month.
    This endpoint provides real monthly expense data for charts.
    """
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = get_jwt_identity()
    
    expenses_by_month = db.session.query(
        func.extract('year', Expense.date).label('year'),
        func.extract('month', Expense.date).label('month'),
        func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(
        func.extract('year', Expense.date),
        func.extract('month', Expense.date)
    ).order_by(
        func.extract('year', Expense.date),
        func.extract('month', Expense.date)
    ).all()
    
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    labels = []
    values = []
    
    for year, month, total in expenses_by_month:
        month_idx = int(month) - 1
        if 0 <= month_idx < 12:
            month_name = month_names[month_idx]
            labels.append(f"{month_name} {int(year)}")
            values.append(float(total))
    
    logging.debug(f"Expenses by month: {list(zip(labels, values))}")
    
    return jsonify({'labels': labels, 'values': values})

@insights_bp.route('/api/insights/period-summary', methods=['GET'])
@jwt_required()
def get_period_summary():
    """
    Get summary data for a specific period (This Month, Last Month, This Year)
    This is a specialized endpoint to ensure consistent period data.
    """
    period = request.args.get('period', 'month')
    logging.debug(f"Getting period summary for: {period}")
    
    today = datetime.now()
    
    if period == 'month':
        start_date = datetime(today.year, today.month, 1)
        end_date = datetime(today.year, today.month + 1, 1)
    elif period == 'prev-month':
        if today.month == 1:
            start_date = datetime(today.year - 1, 12, 1)
            end_date = datetime(today.year, 1, 1)
        else:
            start_date = datetime(today.year, today.month - 1, 1)
            end_date = datetime(today.year, today.month, 1)
    elif period == 'year':
        start_date = datetime(today.year, 1, 1)
        end_date = datetime(today.year + 1, 1, 1)
    else:
        return jsonify({'error': 'Invalid period specified'}), 400

    logging.debug(f"Period {period} date range: {start_date} to {end_date}")
    user_id = get_jwt_identity()

    total_expense_amount = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).scalar() or 0.0

    total_income_amount = db.session.query(func.sum(Income.amount)).filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).scalar() or 0.0

    category_distribution = db.session.query(
        Expense.category, func.sum(Expense.amount)
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(Expense.category).all()

    labels = [item[0] for item in category_distribution]
    values = [float(item[1]) for item in category_distribution]

    expense_count = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).count()

    income_count = Income.query.filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).count()

    logging.debug(f"Period {period} summary - Expenses: {total_expense_amount}, Income: {total_income_amount}")
    logging.debug(f"Period {period} counts - Expenses: {expense_count}, Income: {income_count}")

    return jsonify({
        'period': period,
        'dateRange': {
            'startDate': start_date.isoformat(),
            'endDate': end_date.isoformat()
        },
        'expense': {
            'totalAmount': float(total_expense_amount),
            'count': expense_count,
            'categoryDistribution': {
                'labels': labels,
                'values': values
            }
        },
        'income': {
            'totalAmount': float(total_income_amount),
            'count': income_count
        },
        'netBalance': float(total_income_amount) - float(total_expense_amount)
    })


@insights_bp.route('/api/expense-summary', methods=['GET'])
@jwt_required()
def expense_summary_api():
    return get_expense_summary()


@insights_bp.route('/api/insights/top-categories', methods=['GET'])
@jwt_required()
def get_top_categories():
    """
    Get top 5 expense categories by amount.
    This endpoint provides data for the Top 5 Categories chart.
    """
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = get_jwt_identity()

    top_categories = db.session.query(
        Expense.category, func.sum(Expense.amount).label('total')
    ).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).group_by(Expense.category).order_by(db.desc('total')).limit(5).all()

    labels = [item[0] for item in top_categories]
    values = [float(item[1]) for item in top_categories]

    return jsonify({
        'labels': labels,
        'values': values
    })
