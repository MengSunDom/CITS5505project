import logging
from flask import Blueprint, session, jsonify, request, redirect, url_for, render_template
from datetime import datetime, timedelta
from models.models import db, Expense, Income, SharedExpense, SharedIncome, User
from sqlalchemy import func, or_

insights_bp = Blueprint('insights', __name__)

# Helper function to parse date range from request
def parse_date_range():
    """
    Parse date range from request parameters.
    Handles date range in a consistent way with the frontend.
    """
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    
    logging.debug(f"Raw date parameters: startDate={start_date}, endDate={end_date}")
    
    if not start_date or not end_date:
        # Default to current month if no dates provided
        today = datetime.now()
        start_date = datetime(today.year, today.month, 1).strftime('%Y-%m-%d')
        
        # For current month, use today as end date
        end_date = today.strftime('%Y-%m-%d')
        logging.debug(f"Using default dates: startDate={start_date}, endDate={end_date}")
    
    try:
        # Parse the date strings into datetime objects
        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d')
        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d')
        
        # Set start date to beginning of day (00:00:00)
        start_date_obj = datetime(start_date_obj.year, start_date_obj.month, start_date_obj.day, 0, 0, 0)
        
        # Check if end date is today
        today = datetime.now()
        logging.debug(f"Current time is: {today.isoformat()}")
        
        is_today = (end_date_obj.year == today.year and 
                   end_date_obj.month == today.month and 
                   end_date_obj.day == today.day)
        
        if is_today:
            # If end date is today, ensure we include all of today's data
            # Set end_date_obj to today at 23:59:59 instead of current time + 1 minute
            end_date_obj = datetime(today.year, today.month, today.day, 23, 59, 59)
            logging.debug(f"End date is today, using end of day: {end_date_obj}")
            
            # For today, next_day should be tomorrow at 00:00:00
            tomorrow = datetime(today.year, today.month, today.day, 0, 0, 0) + timedelta(days=1)
            next_day = tomorrow
            logging.debug(f"End date is today, setting next_day to tomorrow at midnight: {next_day}")
        else:
            # For non-today dates, set end date to end of day (23:59:59)
            end_date_obj = datetime(end_date_obj.year, end_date_obj.month, end_date_obj.day, 23, 59, 59)
            logging.debug(f"End date is not today, using end of day: {end_date_obj}")
            
            # Make sure to include the entire end day by setting the comparison to the next day at 00:00:00
            next_day = datetime(end_date_obj.year, end_date_obj.month, end_date_obj.day, 0, 0, 0) + timedelta(days=1)
            logging.debug(f"End date is not today, setting next_day to day after end date: {next_day}")
        
        logging.debug(f"Parsed date range: {start_date_obj} to {end_date_obj} (query will use < {next_day})")
        
        # Check if we have data in this date range (for debugging)
        if 'user' in session:
            user_id = session['user']['id']
            
            # Check specifically for today's data
            today_start = datetime(today.year, today.month, today.day, 0, 0, 0)
            today_end = today_start + timedelta(days=1)
            
            today_expense_count = Expense.query.filter(
                Expense.user_id == user_id,
                Expense.date >= today_start,
                Expense.date < today_end
            ).count()
            
            today_income_count = Income.query.filter(
                Income.user_id == user_id,
                Income.date >= today_start,
                Income.date < today_end
            ).count()
            
            logging.debug(f"Today's data counts: expenses={today_expense_count}, income={today_income_count}")
            
            # Check if today's data is included in the date range
            today_in_range = (start_date_obj <= today_start < next_day)
            logging.debug(f"Is today in the selected date range? {today_in_range}")
            
            # Get data for the full date range
            expense_count = Expense.query.filter(
                Expense.user_id == user_id,
                Expense.date >= start_date_obj,
                Expense.date < next_day
            ).count()
            
            income_count = Income.query.filter(
                Income.user_id == user_id,
                Income.date >= start_date_obj,
                Income.date < next_day
            ).count()
            
            logging.debug(f"Data counts in full range: expenses={expense_count}, income={income_count}")
        
        # Return start date and the next day at 00:00:00 for proper comparison
        return start_date_obj, next_day
    except ValueError as e:
        logging.error(f"Date parsing error: {e}")
        raise ValueError('Invalid date format. Use YYYY-MM-DD.')

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

        if hasattr(expense_date, 'strftime'):

            date_str = expense_date.strftime('%Y-%m-%d')
        else:

            date_str = str(expense_date)
        
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
def get_income_summary():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']

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
def income_expense_comparison():
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']
    
    # Get period parameter (daily, weekly, monthly)
    period = request.args.get('period', 'daily')
    
    # Handle different periods for data aggregation
    if period == 'weekly':
        # Weekly aggregation
        # Get income data by week
        income_data = db.session.query(
            func.date_trunc('week', Income.date).label('week_start'),
            func.sum(Income.amount).label('total')
        ).filter(
            Income.user_id == user_id,
            Income.date >= start_date,
            Income.date < end_date
        ).group_by(func.date_trunc('week', Income.date)).order_by(func.date_trunc('week', Income.date)).all()
        
        # Get expense data by week
        expense_data = db.session.query(
            func.date_trunc('week', Expense.date).label('week_start'),
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.user_id == user_id,
            Expense.type == 'expense',
            Expense.date >= start_date,
            Expense.date < end_date
        ).group_by(func.date_trunc('week', Expense.date)).order_by(func.date_trunc('week', Expense.date)).all()
        
        # Create maps for date values to amounts
        date_set = set()
        income_map = {}
        for date_val, amount in income_data:
            if hasattr(date_val, 'strftime'):
                # Format as "Week of YYYY-MM-DD"
                date_str = f"Week of {date_val.strftime('%Y-%m-%d')}"
            else:
                date_str = f"Week of {str(date_val)}"
            
            date_set.add(date_str)
            income_map[date_str] = float(amount)
        
        expense_map = {}
        for date_val, amount in expense_data:
            if hasattr(date_val, 'strftime'):
                date_str = f"Week of {date_val.strftime('%Y-%m-%d')}"
            else:
                date_str = f"Week of {str(date_val)}"
            
            date_set.add(date_str)
            expense_map[date_str] = float(amount)
        
    elif period == 'monthly':
        # Monthly aggregation
        # Get income data by month
        income_data = db.session.query(
            func.date_trunc('month', Income.date).label('month_start'),
            func.sum(Income.amount).label('total')
        ).filter(
            Income.user_id == user_id,
            Income.date >= start_date,
            Income.date < end_date
        ).group_by(func.date_trunc('month', Income.date)).order_by(func.date_trunc('month', Income.date)).all()
        
        # Get expense data by month
        expense_data = db.session.query(
            func.date_trunc('month', Expense.date).label('month_start'),
            func.sum(Expense.amount).label('total')
        ).filter(
            Expense.user_id == user_id,
            Expense.type == 'expense',
            Expense.date >= start_date,
            Expense.date < end_date
        ).group_by(func.date_trunc('month', Expense.date)).order_by(func.date_trunc('month', Expense.date)).all()
        
        # Create maps for date values to amounts
        date_set = set()
        income_map = {}
        for date_val, amount in income_data:
            if hasattr(date_val, 'strftime'):
                date_str = date_val.strftime('%b %Y')  # e.g. "Jan 2023"
            else:
                date_str = str(date_val)
            
            date_set.add(date_str)
            income_map[date_str] = float(amount)
        
        expense_map = {}
        for date_val, amount in expense_data:
            if hasattr(date_val, 'strftime'):
                date_str = date_val.strftime('%b %Y')  # e.g. "Jan 2023"
            else:
                date_str = str(date_val)
            
            date_set.add(date_str)
            expense_map[date_str] = float(amount)
        
    else:  # Default to daily
        # Daily aggregation (existing implementation)
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
            if hasattr(date_val, 'strftime'):
                date_str = date_val.strftime('%Y-%m-%d')
            else:
                date_str = str(date_val)
            
            date_set.add(date_str)
            income_map[date_str] = float(amount)
        
        expense_map = {}
        for date_val, amount in expense_data:
            if hasattr(date_val, 'strftime'):
                date_str = date_val.strftime('%Y-%m-%d')
            else:
                date_str = str(date_val)
            
            date_set.add(date_str)
            expense_map[date_str] = float(amount)
  
    date_list = sorted(date_set)
    income_list = [income_map.get(d, 0.0) for d in date_list]
    expense_list = [expense_map.get(d, 0.0) for d in date_list]

    return jsonify({
        'labels': date_list,
        'income': income_list,
        'expense': expense_list,
        'period': period
    })

# HTML route for insights page
@insights_bp.route('/insights')
def insights_page():
    if 'user' not in session:
        return redirect(url_for('auth.login'))
    
    return render_template('insight.html')

@insights_bp.route('/api/insights/debug', methods=['GET'])
def debug_insights():
    """
    Diagnostic endpoint to help understand date handling and data availability.
    This is especially useful for debugging "Last Month" data issues.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    # Parse date parameters from the request
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    
    try:
        # Process dates using our parsing function
        start_date, end_date = parse_date_range()
        
        # Get user_id
        user_id = session['user']['id']
        
        # Get all expenses in the range
        expenses = Expense.query.filter(
            Expense.user_id == user_id,
            Expense.type == 'expense',
            Expense.date >= start_date,
            Expense.date < end_date
        ).order_by(Expense.date).all()
        
        # Get all incomes in the range
        incomes = Income.query.filter(
            Income.user_id == user_id,
            Income.date >= start_date,
            Income.date < end_date
        ).order_by(Income.date).all()
        
        # Get date range of all existing data
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
        
        # Format expense and income data
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
        
        # Get all expenses in the previous month (for Last Month debugging)
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
        
        # Return debug info
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
def date_diagnostic():
    """
    Diagnostic endpoint to help understand date assignment to months.
    This shows how dates are parsed and which month they belong to.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user']['id']
    
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
        if current_month == 12:
            this_month_end = datetime(current_year + 1, 1, 1)
        else:
            this_month_end = datetime(current_year, current_month + 1, 1)
        
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
def get_income_by_month():
    """
    Get income data aggregated by month.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    
    # Query to get income by month
    income_by_month = db.session.query(
        func.strftime('%Y-%m', Income.date).label('month'),
        func.sum(Income.amount).label('total')
    ).filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).group_by(
        func.strftime('%Y-%m', Income.date)
    ).order_by(
        func.strftime('%Y-%m', Income.date)
    ).all()
    
    # Format the results
    labels = []
    values = []
    
    for month, total in income_by_month:
        # Format month as "Mon YYYY"
        try:
            date_obj = datetime.strptime(month, '%Y-%m')
            month_label = date_obj.strftime('%b %Y')
        except:
            month_label = month
            
        labels.append(month_label)
        values.append(float(total))
    
    # Log for debugging
    logging.debug(f"Income by month: {list(zip(labels, values))}")
    
    return jsonify({
        'labels': labels,
        'values': values
    })

@insights_bp.route('/api/expenses-by-month', methods=['GET'])
def get_expenses_by_month():
    """
    Get expense data aggregated by month.
    This endpoint provides real monthly expense data for charts.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']
    
    # Extract month and year from expense dates
    # Use date_trunc to ensure correct month assignment
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
    
    # Format the results
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    labels = []
    values = []
    
    for year, month, total in expenses_by_month:
        # Month from SQL is 1-indexed
        month_idx = int(month) - 1  # Convert to 0-indexed for our array
        if 0 <= month_idx < 12:
            month_name = month_names[month_idx]
            labels.append(f"{month_name} {int(year)}")
            values.append(float(total))
    
    # Log for debugging
    logging.debug(f"Expenses by month: {list(zip(labels, values))}")
    
    return jsonify({
        'labels': labels,
        'values': values
    })

@insights_bp.route('/api/insights/period-summary', methods=['GET'])
def get_period_summary():
    """
    Get summary data for a specific period (This Month, Last Month, This Year)
    This is a specialized endpoint to ensure consistent period data.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    period = request.args.get('period', 'month')  # Default to this month
    logging.debug(f"Getting period summary for: {period}")
    
    # Calculate date range based on period
    today = datetime.now()
    
    if period == 'month':
        # This month - from 1st of current month to today
        start_date = datetime(today.year, today.month, 1)
        end_date = datetime(today.year, today.month + 1, 1)
    elif period == 'prev-month':
        # Last month - from 1st to last day of previous month
        if today.month == 1:
            # If January, previous month is December of last year
            start_date = datetime(today.year - 1, 12, 1)
            end_date = datetime(today.year, 1, 1)
        else:
            start_date = datetime(today.year, today.month - 1, 1)
            end_date = datetime(today.year, today.month, 1)
    elif period == 'year':
        # This year - from January 1st to today
        start_date = datetime(today.year, 1, 1)
        end_date = datetime(today.year + 1, 1, 1)
    else:
        return jsonify({'error': 'Invalid period specified'}), 400
    
    logging.debug(f"Period {period} date range: {start_date} to {end_date}")
    
    user_id = session['user']['id']
    
    # Get expense summary
    total_expense_amount = db.session.query(func.sum(Expense.amount)).filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).scalar() or 0.0
    
    # Get income summary
    total_income_amount = db.session.query(func.sum(Income.amount)).filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).scalar() or 0.0
    
    # Get expense category distribution
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
    
    # Get expense count
    expense_count = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= start_date,
        Expense.date < end_date
    ).count()
    
    # Get income count
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
def expense_summary_api():
    """
    Alias for /api/insights/summary to maintain compatibility with frontend.
    This endpoint provides expense summary data with the same format as /api/insights/summary.
    """
    return get_expense_summary()

@insights_bp.route('/api/insights/top-categories', methods=['GET'])
def get_top_expense_categories():
    """
    Get top 5 expense categories by amount.
    This endpoint provides data for the Top 5 Categories chart.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']

    # Get top 5 expense categories
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

@insights_bp.route('/api/insights/top-income-categories', methods=['GET'])
def get_top_income_categories():
    """
    Get top 5 income categories by amount.
    This endpoint provides data for the Top 5 Income Categories chart.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    user_id = session['user']['id']

    # Get top 5 income categories
    top_categories = db.session.query(
        Income.category, func.sum(Income.amount).label('total')
    ).filter(
        Income.user_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).group_by(Income.category).order_by(db.desc('total')).limit(5).all()

    labels = [item[0] for item in top_categories]
    values = [float(item[1]) for item in top_categories]

    return jsonify({
        'labels': labels,
        'values': values
    })

@insights_bp.route('/api/shared-insights/users', methods=['GET'])
def get_shared_insight_users():
    """
    Get list of users who have shared data with the current user.
    This provides the list of users to select from for shared insights.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user_id = session['user']['id']
    
    # Get users who shared expenses with current user
    expense_sharers = db.session.query(
        User.id, User.username
    ).join(
        Expense, User.id == Expense.user_id
    ).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        SharedExpense.shared_with_id == user_id
    ).distinct().all()
    
    # Get users who shared income with current user
    income_sharers = db.session.query(
        User.id, User.username
    ).join(
        Income, User.id == Income.user_id
    ).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        SharedIncome.shared_with_id == user_id
    ).distinct().all()
    
    # Combine and deduplicate
    all_sharers = {}
    for user_id, username in expense_sharers + income_sharers:
        all_sharers[user_id] = username
    
    result = [{"id": user_id, "username": username} for user_id, username in all_sharers.items()]
    
    return jsonify(result)

@insights_bp.route('/api/shared-insights/summary', methods=['GET'])
def get_shared_insights_summary():
    """
    Get summary of shared data from a specific user.
    This is similar to expense_summary_api but for shared data.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    sharer_id = request.args.get('sharer_id')
    
    if not sharer_id:
        return jsonify({'error': 'No sharer ID provided'}), 400
    
    try:
        sharer_id = int(sharer_id)
    except ValueError:
        return jsonify({'error': 'Invalid sharer ID'}), 400
    
    # Process all shared expenses, including those in bulk shares
    all_shared_expenses = []
    
    # Get directly shared expenses
    direct_shared_expenses = db.session.query(Expense).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        Expense.user_id == sharer_id,
        SharedExpense.shared_with_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).all()
    
    all_shared_expenses.extend(direct_shared_expenses)
    
    # Get bulk shared expenses from this specific sharer
    bulk_shares = db.session.query(SharedExpense).filter(
        SharedExpense.shared_with_id == user_id,
        SharedExpense.is_bulk_share == True
    ).join(
        Expense, Expense.id == SharedExpense.expense_id
    ).filter(
        Expense.user_id == sharer_id
    ).all()
    
    # Process each bulk share
    for bulk_share in bulk_shares:
        if bulk_share.bulk_expense_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_expenses = db.session.query(Expense).filter(
                        Expense.id.in_(bulk_ids),
                        Expense.user_id == sharer_id,
                        Expense.date >= start_date,
                        Expense.date < end_date
                    ).all()
                    all_shared_expenses.extend(bulk_expenses)
            except Exception as e:
                logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    
    # Process all shared incomes, including those in bulk shares
    all_shared_incomes = []
    
    # Get directly shared incomes
    direct_shared_incomes = db.session.query(Income).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        Income.user_id == sharer_id,
        SharedIncome.shared_with_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).all()
    
    all_shared_incomes.extend(direct_shared_incomes)
    
    # Get bulk shared incomes from this specific sharer
    bulk_income_shares = db.session.query(SharedIncome).filter(
        SharedIncome.shared_with_id == user_id,
        SharedIncome.is_bulk_share == True
    ).join(
        Income, Income.id == SharedIncome.income_id
    ).filter(
        Income.user_id == sharer_id
    ).all()
    
    # Process each bulk income share
    for bulk_share in bulk_income_shares:
        if bulk_share.bulk_income_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_incomes = db.session.query(Income).filter(
                        Income.id.in_(bulk_ids),
                        Income.user_id == sharer_id,
                        Income.date >= start_date,
                        Income.date < end_date
                    ).all()
                    all_shared_incomes.extend(bulk_incomes)
            except Exception as e:
                logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Deduplicate expenses and incomes
    unique_expense_ids = set()
    unique_expenses = []
    for expense in all_shared_expenses:
        if expense.id not in unique_expense_ids:
            unique_expense_ids.add(expense.id)
            unique_expenses.append(expense)
    
    unique_income_ids = set()
    unique_incomes = []
    for income in all_shared_incomes:
        if income.id not in unique_income_ids:
            unique_income_ids.add(income.id)
            unique_incomes.append(income)
    
    # Calculate expense summary
    total_expense_entries = len(unique_expenses)
    total_expense_amount = sum(float(expense.amount) for expense in unique_expenses)
    
    # Calculate expense category distribution
    expense_category_totals = {}
    for expense in unique_expenses:
        category = expense.category
        if category not in expense_category_totals:
            expense_category_totals[category] = 0
        expense_category_totals[category] += float(expense.amount)
    
    expense_labels = list(expense_category_totals.keys())
    expense_values = [expense_category_totals[category] for category in expense_labels]
    
    # Calculate income summary
    total_income_entries = len(unique_incomes)
    total_income_amount = sum(float(income.amount) for income in unique_incomes)
    
    # Calculate income category distribution
    income_category_totals = {}
    for income in unique_incomes:
        category = income.category
        if category not in income_category_totals:
            income_category_totals[category] = 0
        income_category_totals[category] += float(income.amount)
    
    income_labels = list(income_category_totals.keys())
    income_values = [income_category_totals[category] for category in income_labels]
    
    # Get sharer's username
    sharer = User.query.get(sharer_id)
    sharer_name = sharer.username if sharer else "Unknown User"
    
    return jsonify({
        'expense': {
            'totalEntries': total_expense_entries,
            'totalAmount': total_expense_amount,
            'categoryDistribution': {'labels': expense_labels, 'values': expense_values}
        },
        'income': {
            'totalEntries': total_income_entries,
            'totalAmount': total_income_amount,
            'categoryDistribution': {'labels': income_labels, 'values': income_values}
        },
        'sharer': {
            'id': sharer_id,
            'name': sharer_name
        },
        'debug': {
            'direct_expenses': len(direct_shared_expenses),
            'bulk_expenses': len(all_shared_expenses) - len(direct_shared_expenses),
            'unique_expenses': len(unique_expenses),
            'direct_incomes': len(direct_shared_incomes),
            'bulk_incomes': len(all_shared_incomes) - len(direct_shared_incomes),
            'unique_incomes': len(unique_incomes)
        }
    })

@insights_bp.route('/api/shared-insights/top-income-categories', methods=['GET'])
def get_shared_insights_top_income_categories():
    """
    Get top income categories from shared data.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    sharer_id = request.args.get('sharer_id')
    
    if not sharer_id:
        return jsonify({'error': 'No sharer ID provided'}), 400
    
    try:
        sharer_id = int(sharer_id)
    except ValueError:
        return jsonify({'error': 'Invalid sharer ID'}), 400
    
    # Process all shared incomes, including those in bulk shares
    all_shared_incomes = []
    
    # Get directly shared incomes
    direct_shared_incomes = db.session.query(Income).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        Income.user_id == sharer_id,
        SharedIncome.shared_with_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).all()
    
    all_shared_incomes.extend(direct_shared_incomes)
    
    # Get bulk shared incomes from this specific sharer
    bulk_income_shares = db.session.query(SharedIncome).filter(
        SharedIncome.shared_with_id == user_id,
        SharedIncome.is_bulk_share == True
    ).join(
        Income, Income.id == SharedIncome.income_id
    ).filter(
        Income.user_id == sharer_id
    ).all()
    
    # Process each bulk income share
    for bulk_share in bulk_income_shares:
        if bulk_share.bulk_income_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_incomes = db.session.query(Income).filter(
                        Income.id.in_(bulk_ids),
                        Income.user_id == sharer_id,
                        Income.date >= start_date,
                        Income.date < end_date
                    ).all()
                    all_shared_incomes.extend(bulk_incomes)
            except Exception as e:
                logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Deduplicate incomes
    unique_income_ids = set()
    unique_incomes = []
    for income in all_shared_incomes:
        if income.id not in unique_income_ids:
            unique_income_ids.add(income.id)
            unique_incomes.append(income)
    
    # Calculate category distribution
    category_totals = {}
    for income in unique_incomes:
        category = income.category
        if category not in category_totals:
            category_totals[category] = 0
        category_totals[category] += float(income.amount)
    
    # Sort categories by total amount
    sorted_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    
    # Take top 10 categories
    top_categories = sorted_categories[:10]
    
    # Format results
    labels = [category for category, _ in top_categories]
    values = [total for _, total in top_categories]
    
    return jsonify({
        'labels': labels,
        'values': values,
        'debug': {
            'direct_incomes': len(direct_shared_incomes),
            'bulk_incomes': len(all_shared_incomes) - len(direct_shared_incomes),
            'unique_incomes': len(unique_incomes)
        }
    })

@insights_bp.route('/api/shared-insights/top-categories', methods=['GET'])
def get_shared_insights_top_categories():
    """
    Get top categories from shared data.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    sharer_id = request.args.get('sharer_id')
    
    if not sharer_id:
        return jsonify({'error': 'No sharer ID provided'}), 400
    
    try:
        sharer_id = int(sharer_id)
    except ValueError:
        return jsonify({'error': 'Invalid sharer ID'}), 400
    
    # Process all shared expenses, including those in bulk shares
    all_shared_expenses = []
    
    # Get directly shared expenses
    direct_shared_expenses = db.session.query(Expense).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        Expense.user_id == sharer_id,
        SharedExpense.shared_with_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).all()
    
    all_shared_expenses.extend(direct_shared_expenses)
    
    # Get bulk shared expenses from this specific sharer
    bulk_shares = db.session.query(SharedExpense).filter(
        SharedExpense.shared_with_id == user_id,
        SharedExpense.is_bulk_share == True
    ).join(
        Expense, Expense.id == SharedExpense.expense_id
    ).filter(
        Expense.user_id == sharer_id
    ).all()
    
    # Process each bulk share
    for bulk_share in bulk_shares:
        if bulk_share.bulk_expense_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_expenses = db.session.query(Expense).filter(
                        Expense.id.in_(bulk_ids),
                        Expense.user_id == sharer_id,
                        Expense.date >= start_date,
                        Expense.date < end_date
                    ).all()
                    all_shared_expenses.extend(bulk_expenses)
            except Exception as e:
                logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    
    # Deduplicate expenses
    unique_expense_ids = set()
    unique_expenses = []
    for expense in all_shared_expenses:
        if expense.id not in unique_expense_ids:
            unique_expense_ids.add(expense.id)
            unique_expenses.append(expense)
    
    # Calculate category distribution
    category_totals = {}
    for expense in unique_expenses:
        category = expense.category
        if category not in category_totals:
            category_totals[category] = 0
        category_totals[category] += float(expense.amount)
    
    # Sort categories by total amount
    sorted_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    
    # Take top 10 categories
    top_categories = sorted_categories[:10]
    
    # Format results
    labels = [category for category, _ in top_categories]
    values = [total for _, total in top_categories]
    
    return jsonify({
        'labels': labels,
        'values': values,
        'debug': {
            'direct_expenses': len(direct_shared_expenses),
            'bulk_expenses': len(all_shared_expenses) - len(direct_shared_expenses),
            'unique_expenses': len(unique_expenses)
        }
    })

@insights_bp.route('/api/shared-insights/by-month', methods=['GET'])
def get_shared_insights_by_month():
    """
    Get monthly data for shared expenses and incomes.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    sharer_id = request.args.get('sharer_id')
    data_type = request.args.get('type', 'expense')  # 'expense' or 'income'
    
    if not sharer_id:
        return jsonify({'error': 'No sharer ID provided'}), 400
    
    try:
        sharer_id = int(sharer_id)
    except ValueError:
        return jsonify({'error': 'Invalid sharer ID'}), 400
    
    # Determine which model and shared model to use based on data_type
    if data_type == 'expense':
        # Process all shared expenses, including those in bulk shares
        all_shared_items = []
        
        # Get directly shared expenses
        direct_shared_items = db.session.query(Expense).join(
            SharedExpense, SharedExpense.expense_id == Expense.id
        ).filter(
            Expense.user_id == sharer_id,
            SharedExpense.shared_with_id == user_id,
            Expense.date >= start_date,
            Expense.date < end_date
        ).all()
        
        all_shared_items.extend(direct_shared_items)
        
        # Get bulk shared expenses from this specific sharer
        bulk_shares = db.session.query(SharedExpense).filter(
            SharedExpense.shared_with_id == user_id,
            SharedExpense.is_bulk_share == True
        ).join(
            Expense, Expense.id == SharedExpense.expense_id
        ).filter(
            Expense.user_id == sharer_id
        ).all()
        
        # Process each bulk share
        for bulk_share in bulk_shares:
            if bulk_share.bulk_expense_ids:
                try:
                    bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                    if bulk_ids:
                        bulk_items = db.session.query(Expense).filter(
                            Expense.id.in_(bulk_ids),
                            Expense.user_id == sharer_id,
                            Expense.date >= start_date,
                            Expense.date < end_date
                        ).all()
                        all_shared_items.extend(bulk_items)
                except Exception as e:
                    logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    else:
        # Process all shared incomes, including those in bulk shares
        all_shared_items = []
        
        # Get directly shared incomes
        direct_shared_items = db.session.query(Income).join(
            SharedIncome, SharedIncome.income_id == Income.id
        ).filter(
            Income.user_id == sharer_id,
            SharedIncome.shared_with_id == user_id,
            Income.date >= start_date,
            Income.date < end_date
        ).all()
        
        all_shared_items.extend(direct_shared_items)
        
        # Get bulk shared incomes from this specific sharer
        bulk_shares = db.session.query(SharedIncome).filter(
            SharedIncome.shared_with_id == user_id,
            SharedIncome.is_bulk_share == True
        ).join(
            Income, Income.id == SharedIncome.income_id
        ).filter(
            Income.user_id == sharer_id
        ).all()
        
        # Process each bulk share
        for bulk_share in bulk_shares:
            if bulk_share.bulk_income_ids:
                try:
                    bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                    if bulk_ids:
                        bulk_items = db.session.query(Income).filter(
                            Income.id.in_(bulk_ids),
                            Income.user_id == sharer_id,
                            Income.date >= start_date,
                            Income.date < end_date
                        ).all()
                        all_shared_items.extend(bulk_items)
                except Exception as e:
                    logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Deduplicate items
    unique_item_ids = set()
    unique_items = []
    for item in all_shared_items:
        if item.id not in unique_item_ids:
            unique_item_ids.add(item.id)
            unique_items.append(item)
    
    # Group by month
    data_by_month = {}
    for item in unique_items:
        year = item.date.year
        month = item.date.month
        month_key = f"{year}-{month:02d}"
        
        if month_key not in data_by_month:
            data_by_month[month_key] = 0
        
        data_by_month[month_key] += float(item.amount)
    
    # Format results
    months = []
    values = []
    
    # Sort month keys
    sorted_months = sorted(data_by_month.keys())
    
    for month_key in sorted_months:
        year, month = month_key.split('-')
        month_date = datetime(int(year), int(month), 1)
        month_name = month_date.strftime('%b %Y')  # e.g. "Jan 2023"
        months.append(month_name)
        values.append(data_by_month[month_key])
    
    return jsonify({
        'labels': months,
        'values': values,
        'debug': {
            'data_type': data_type,
            'unique_items': len(unique_items)
        }
    })

@insights_bp.route('/api/shared-insights/comparison', methods=['GET'])
def get_shared_insights_comparison():
    """
    Get date-wise income & expense comparison for shared data.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    sharer_id = request.args.get('sharer_id')
    
    if not sharer_id:
        return jsonify({'error': 'No sharer ID provided'}), 400
    
    try:
        sharer_id = int(sharer_id)
    except ValueError:
        return jsonify({'error': 'Invalid sharer ID'}), 400
    
    # Process all shared expenses, including those in bulk shares
    all_shared_expenses = []
    
    # Get directly shared expenses
    direct_shared_expenses = db.session.query(Expense).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        Expense.user_id == sharer_id,
        SharedExpense.shared_with_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).all()
    
    all_shared_expenses.extend(direct_shared_expenses)
    
    # Get bulk shared expenses from this specific sharer
    bulk_shares = db.session.query(SharedExpense).filter(
        SharedExpense.shared_with_id == user_id,
        SharedExpense.is_bulk_share == True
    ).join(
        Expense, Expense.id == SharedExpense.expense_id
    ).filter(
        Expense.user_id == sharer_id
    ).all()
    
    # Process each bulk share
    for bulk_share in bulk_shares:
        if bulk_share.bulk_expense_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_expenses = db.session.query(Expense).filter(
                        Expense.id.in_(bulk_ids),
                        Expense.user_id == sharer_id,
                        Expense.date >= start_date,
                        Expense.date < end_date
                    ).all()
                    all_shared_expenses.extend(bulk_expenses)
            except Exception as e:
                logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    
    # Process all shared incomes, including those in bulk shares
    all_shared_incomes = []
    
    # Get directly shared incomes
    direct_shared_incomes = db.session.query(Income).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        Income.user_id == sharer_id,
        SharedIncome.shared_with_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).all()
    
    all_shared_incomes.extend(direct_shared_incomes)
    
    # Get bulk shared incomes from this specific sharer
    bulk_income_shares = db.session.query(SharedIncome).filter(
        SharedIncome.shared_with_id == user_id,
        SharedIncome.is_bulk_share == True
    ).join(
        Income, Income.id == SharedIncome.income_id
    ).filter(
        Income.user_id == sharer_id
    ).all()
    
    # Process each bulk income share
    for bulk_share in bulk_income_shares:
        if bulk_share.bulk_income_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_incomes = db.session.query(Income).filter(
                        Income.id.in_(bulk_ids),
                        Income.user_id == sharer_id,
                        Income.date >= start_date,
                        Income.date < end_date
                    ).all()
                    all_shared_incomes.extend(bulk_incomes)
            except Exception as e:
                logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Deduplicate expenses and incomes
    unique_expense_ids = set()
    unique_expenses = []
    for expense in all_shared_expenses:
        if expense.id not in unique_expense_ids:
            unique_expense_ids.add(expense.id)
            unique_expenses.append(expense)
    
    unique_income_ids = set()
    unique_incomes = []
    for income in all_shared_incomes:
        if income.id not in unique_income_ids:
            unique_income_ids.add(income.id)
            unique_incomes.append(income)
    
    # Group expenses by date
    expense_by_date = {}
    for expense in unique_expenses:
        date_str = expense.date.strftime('%Y-%m-%d')
        if date_str not in expense_by_date:
            expense_by_date[date_str] = 0
        expense_by_date[date_str] += float(expense.amount)
    
    # Group incomes by date
    income_by_date = {}
    for income in unique_incomes:
        date_str = income.date.strftime('%Y-%m-%d')
        if date_str not in income_by_date:
            income_by_date[date_str] = 0
        income_by_date[date_str] += float(income.amount)
    
    # Combine all dates
    all_dates = sorted(set(list(expense_by_date.keys()) + list(income_by_date.keys())))
    
    # Create expense and income arrays
    expense_values = [expense_by_date.get(date_str, 0) for date_str in all_dates]
    income_values = [income_by_date.get(date_str, 0) for date_str in all_dates]
    
    return jsonify({
        'labels': all_dates,
        'income': income_values,
        'expense': expense_values,
        'series': [
            {'name': 'Income', 'data': income_values},
            {'name': 'Expenses', 'data': expense_values}
        ],
        'debug': {
            'direct_expenses': len(direct_shared_expenses),
            'bulk_expenses': len(all_shared_expenses) - len(direct_shared_expenses),
            'unique_expenses': len(unique_expenses),
            'direct_incomes': len(direct_shared_incomes),
            'bulk_incomes': len(all_shared_incomes) - len(direct_shared_incomes),
            'unique_incomes': len(unique_incomes)
        }
    })

@insights_bp.route('/api/shared-insights/top-categories-all', methods=['GET'])
def get_shared_insights_top_categories_all():
    """
    Get top categories from all shared data combined.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    
    # Process all shared expenses, including those in bulk shares
    all_shared_expenses = []
    
    # Get directly shared expenses
    direct_shared_expenses = db.session.query(Expense).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        SharedExpense.shared_with_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).all()
    
    all_shared_expenses.extend(direct_shared_expenses)
    
    # Get bulk shared expenses
    bulk_shares = db.session.query(SharedExpense).filter(
        SharedExpense.shared_with_id == user_id,
        SharedExpense.is_bulk_share == True
    ).all()
    
    # Process each bulk share
    for bulk_share in bulk_shares:
        if bulk_share.bulk_expense_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_expenses = db.session.query(Expense).filter(
                        Expense.id.in_(bulk_ids),
                        Expense.date >= start_date,
                        Expense.date < end_date
                    ).all()
                    all_shared_expenses.extend(bulk_expenses)
            except Exception as e:
                logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    
    # Deduplicate expenses
    unique_expense_ids = set()
    unique_expenses = []
    for expense in all_shared_expenses:
        if expense.id not in unique_expense_ids:
            unique_expense_ids.add(expense.id)
            unique_expenses.append(expense)
    
    # Calculate category distribution
    category_totals = {}
    for expense in unique_expenses:
        category = expense.category
        if category not in category_totals:
            category_totals[category] = 0
        category_totals[category] += float(expense.amount)
    
    # Sort categories by total amount
    sorted_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    
    # Take top 10 categories
    top_categories = sorted_categories[:10]
    
    # Format results
    labels = [category for category, _ in top_categories]
    values = [total for _, total in top_categories]
    
    return jsonify({
        'labels': labels,
        'values': values,
        'debug': {
            'direct_expenses': len(direct_shared_expenses),
            'bulk_expenses': len(all_shared_expenses) - len(direct_shared_expenses),
            'unique_expenses': len(unique_expenses)
        }
    })

@insights_bp.route('/api/shared-insights/top-income-categories-all', methods=['GET'])
def get_shared_insights_top_income_categories_all():
    """
    Get top income categories from all shared data combined.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    
    # Process all shared incomes, including those in bulk shares
    all_shared_incomes = []
    
    # Get directly shared incomes
    direct_shared_incomes = db.session.query(Income).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        SharedIncome.shared_with_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).all()
    
    all_shared_incomes.extend(direct_shared_incomes)
    
    # Get bulk shared incomes
    bulk_income_shares = db.session.query(SharedIncome).filter(
        SharedIncome.shared_with_id == user_id,
        SharedIncome.is_bulk_share == True
    ).all()
    
    # Process each bulk income share
    for bulk_share in bulk_income_shares:
        if bulk_share.bulk_income_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_incomes = db.session.query(Income).filter(
                        Income.id.in_(bulk_ids),
                        Income.date >= start_date,
                        Income.date < end_date
                    ).all()
                    all_shared_incomes.extend(bulk_incomes)
            except Exception as e:
                logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Deduplicate incomes
    unique_income_ids = set()
    unique_incomes = []
    for income in all_shared_incomes:
        if income.id not in unique_income_ids:
            unique_income_ids.add(income.id)
            unique_incomes.append(income)
    
    # Calculate category distribution
    category_totals = {}
    for income in unique_incomes:
        category = income.category
        if category not in category_totals:
            category_totals[category] = 0
        category_totals[category] += float(income.amount)
    
    # Sort categories by total amount
    sorted_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
    
    # Take top 10 categories
    top_categories = sorted_categories[:10]
    
    # Format results
    labels = [category for category, _ in top_categories]
    values = [total for _, total in top_categories]
    
    return jsonify({
        'labels': labels,
        'values': values,
        'debug': {
            'direct_incomes': len(direct_shared_incomes),
            'bulk_incomes': len(all_shared_incomes) - len(direct_shared_incomes),
            'unique_incomes': len(unique_incomes)
        }
    })

@insights_bp.route('/api/shared-insights/comparison-all', methods=['GET'])
def get_shared_insights_comparison_all():
    """
    Get date-wise income & expense comparison for all shared data combined.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    
    # Process all shared expenses, including those in bulk shares
    all_shared_expenses = []
    
    # Get directly shared expenses
    direct_shared_expenses = db.session.query(Expense).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        SharedExpense.shared_with_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).all()
    
    all_shared_expenses.extend(direct_shared_expenses)
    
    # Get bulk shared expenses
    bulk_shares = db.session.query(SharedExpense).filter(
        SharedExpense.shared_with_id == user_id,
        SharedExpense.is_bulk_share == True
    ).all()
    
    # Process each bulk share
    for bulk_share in bulk_shares:
        if bulk_share.bulk_expense_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_expenses = db.session.query(Expense).filter(
                        Expense.id.in_(bulk_ids),
                        Expense.date >= start_date,
                        Expense.date < end_date
                    ).all()
                    all_shared_expenses.extend(bulk_expenses)
            except Exception as e:
                logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    
    # Process all shared incomes, including those in bulk shares
    all_shared_incomes = []
    
    # Get directly shared incomes
    direct_shared_incomes = db.session.query(Income).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        SharedIncome.shared_with_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).all()
    
    all_shared_incomes.extend(direct_shared_incomes)
    
    # Get bulk shared incomes
    bulk_income_shares = db.session.query(SharedIncome).filter(
        SharedIncome.shared_with_id == user_id,
        SharedIncome.is_bulk_share == True
    ).all()
    
    # Process each bulk income share
    for bulk_share in bulk_income_shares:
        if bulk_share.bulk_income_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_incomes = db.session.query(Income).filter(
                        Income.id.in_(bulk_ids),
                        Income.date >= start_date,
                        Income.date < end_date
                    ).all()
                    all_shared_incomes.extend(bulk_incomes)
            except Exception as e:
                logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Deduplicate expenses and incomes
    unique_expense_ids = set()
    unique_expenses = []
    for expense in all_shared_expenses:
        if expense.id not in unique_expense_ids:
            unique_expense_ids.add(expense.id)
            unique_expenses.append(expense)
    
    unique_income_ids = set()
    unique_incomes = []
    for income in all_shared_incomes:
        if income.id not in unique_income_ids:
            unique_income_ids.add(income.id)
            unique_incomes.append(income)
    
    # Group expenses by date
    expense_by_date = {}
    for expense in unique_expenses:
        date_str = expense.date.strftime('%Y-%m-%d')
        if date_str not in expense_by_date:
            expense_by_date[date_str] = 0
        expense_by_date[date_str] += float(expense.amount)
    
    # Group incomes by date
    income_by_date = {}
    for income in unique_incomes:
        date_str = income.date.strftime('%Y-%m-%d')
        if date_str not in income_by_date:
            income_by_date[date_str] = 0
        income_by_date[date_str] += float(income.amount)
    
    # Combine all dates
    all_dates = sorted(set(list(expense_by_date.keys()) + list(income_by_date.keys())))
    
    # Create expense and income arrays
    expense_values = [expense_by_date.get(date_str, 0) for date_str in all_dates]
    income_values = [income_by_date.get(date_str, 0) for date_str in all_dates]
    
    return jsonify({
        'labels': all_dates,
        'income': income_values,
        'expense': expense_values,
        'debug': {
            'direct_expenses': len(direct_shared_expenses),
            'bulk_expenses': len(all_shared_expenses) - len(direct_shared_expenses),
            'unique_expenses': len(unique_expenses),
            'direct_incomes': len(direct_shared_incomes),
            'bulk_incomes': len(all_shared_incomes) - len(direct_shared_incomes),
            'unique_incomes': len(unique_incomes)
        }
    })

@insights_bp.route('/api/shared-insights/raw-data', methods=['GET'])
def get_shared_insights_raw_data():
    """
    Get raw shared data for debugging purposes.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    sharer_id = request.args.get('sharer_id')
    
    # Get all shared expenses
    all_shared_expenses = []
    
    # Direct shared expenses query
    direct_expenses_query = db.session.query(
        Expense.id, 
        Expense.amount, 
        Expense.category, 
        Expense.date,
        Expense.user_id.label('sharer_id'),
        SharedExpense.id.label('share_id'),
        SharedExpense.is_bulk_share,
        SharedExpense.bulk_expense_ids
    ).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        SharedExpense.shared_with_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    )
    
    # Filter by sharer if specified
    if sharer_id and sharer_id != 'all':
        try:
            sharer_id = int(sharer_id)
            direct_expenses_query = direct_expenses_query.filter(Expense.user_id == sharer_id)
        except ValueError:
            pass
    
    direct_expenses = direct_expenses_query.all()
    
    # Convert to dictionaries for JSON serialization
    result = []
    for expense in direct_expenses:
        expense_dict = {
            'id': expense.id,
            'amount': float(expense.amount),
            'category': expense.category,
            'date': expense.date.strftime('%Y-%m-%d'),
            'sharer_id': expense.sharer_id,
            'share_id': expense.share_id,
            'is_bulk_share': expense.is_bulk_share,
            'type': 'expense'
        }
        
        if expense.is_bulk_share and expense.bulk_expense_ids:
            expense_dict['bulk_ids'] = expense.bulk_expense_ids
        
        result.append(expense_dict)
    
    # Get all bulk shared expenses
    bulk_shares = db.session.query(SharedExpense).filter(
        SharedExpense.shared_with_id == user_id,
        SharedExpense.is_bulk_share == True
    )
    
    if sharer_id and sharer_id != 'all':
        bulk_shares = bulk_shares.join(Expense, Expense.id == SharedExpense.expense_id).filter(Expense.user_id == sharer_id)
    
    bulk_shares = bulk_shares.all()
    
    # Add bulk shared expenses to result
    for bulk_share in bulk_shares:
        if bulk_share.bulk_expense_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_expenses = db.session.query(
                        Expense.id, 
                        Expense.amount, 
                        Expense.category, 
                        Expense.date,
                        Expense.user_id.label('sharer_id')
                    ).filter(
                        Expense.id.in_(bulk_ids),
                        Expense.date >= start_date,
                        Expense.date < end_date
                    ).all()
                    
                    for expense in bulk_expenses:
                        # Check if this expense is already in the result (to avoid duplicates)
                        if not any(e['id'] == expense.id and e['type'] == 'expense' for e in result):
                            expense_dict = {
                                'id': expense.id,
                                'amount': float(expense.amount),
                                'category': expense.category,
                                'date': expense.date.strftime('%Y-%m-%d'),
                                'sharer_id': expense.sharer_id,
                                'share_id': bulk_share.id,
                                'is_bulk_share': True,
                                'from_bulk_share': True,
                                'type': 'expense'
                            }
                            result.append(expense_dict)
            except Exception as e:
                logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    
    # Similar process for incomes
    direct_incomes_query = db.session.query(
        Income.id, 
        Income.amount, 
        Income.category, 
        Income.date,
        Income.user_id.label('sharer_id'),
        SharedIncome.id.label('share_id'),
        SharedIncome.is_bulk_share,
        SharedIncome.bulk_income_ids
    ).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        SharedIncome.shared_with_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    )
    
    if sharer_id and sharer_id != 'all':
        direct_incomes_query = direct_incomes_query.filter(Income.user_id == sharer_id)
    
    direct_incomes = direct_incomes_query.all()
    
    for income in direct_incomes:
        income_dict = {
            'id': income.id,
            'amount': float(income.amount),
            'category': income.category,
            'date': income.date.strftime('%Y-%m-%d'),
            'sharer_id': income.sharer_id,
            'share_id': income.share_id,
            'is_bulk_share': income.is_bulk_share,
            'type': 'income'
        }
        
        if income.is_bulk_share and income.bulk_income_ids:
            income_dict['bulk_ids'] = income.bulk_income_ids
        
        result.append(income_dict)
    
    # Get all bulk shared incomes
    bulk_income_shares = db.session.query(SharedIncome).filter(
        SharedIncome.shared_with_id == user_id,
        SharedIncome.is_bulk_share == True
    )
    
    if sharer_id and sharer_id != 'all':
        bulk_income_shares = bulk_income_shares.join(Income, Income.id == SharedIncome.income_id).filter(Income.user_id == sharer_id)
    
    bulk_income_shares = bulk_income_shares.all()
    
    # Add bulk shared incomes to result
    for bulk_share in bulk_income_shares:
        if bulk_share.bulk_income_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_incomes = db.session.query(
                        Income.id, 
                        Income.amount, 
                        Income.category, 
                        Income.date,
                        Income.user_id.label('sharer_id')
                    ).filter(
                        Income.id.in_(bulk_ids),
                        Income.date >= start_date,
                        Income.date < end_date
                    ).all()
                    
                    for income in bulk_incomes:
                        # Check if this income is already in the result (to avoid duplicates)
                        if not any(i['id'] == income.id and i['type'] == 'income' for i in result):
                            income_dict = {
                                'id': income.id,
                                'amount': float(income.amount),
                                'category': income.category,
                                'date': income.date.strftime('%Y-%m-%d'),
                                'sharer_id': income.sharer_id,
                                'share_id': bulk_share.id,
                                'is_bulk_share': True,
                                'from_bulk_share': True,
                                'type': 'income'
                            }
                            result.append(income_dict)
            except Exception as e:
                logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    return jsonify(result)

@insights_bp.route('/api/shared-insights/by-month-all', methods=['GET'])
def get_shared_insights_by_month_all():
    """
    Get monthly data for all shared expenses and incomes combined.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    data_type = request.args.get('type', 'expense')  # 'expense' or 'income'
    
    # Process all shared items, including those in bulk shares
    all_shared_items = []
    
    if data_type == 'expense':
        # Get directly shared expenses
        direct_shared_items = db.session.query(Expense).join(
            SharedExpense, SharedExpense.expense_id == Expense.id
        ).filter(
            SharedExpense.shared_with_id == user_id,
            Expense.date >= start_date,
            Expense.date < end_date
        ).all()
        
        all_shared_items.extend(direct_shared_items)
        
        # Get bulk shared expenses
        bulk_shares = db.session.query(SharedExpense).filter(
            SharedExpense.shared_with_id == user_id,
            SharedExpense.is_bulk_share == True
        ).all()
        
        # Process each bulk share
        for bulk_share in bulk_shares:
            if bulk_share.bulk_expense_ids:
                try:
                    bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                    if bulk_ids:
                        bulk_items = db.session.query(Expense).filter(
                            Expense.id.in_(bulk_ids),
                            Expense.date >= start_date,
                            Expense.date < end_date
                        ).all()
                        all_shared_items.extend(bulk_items)
                except Exception as e:
                    logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    else:
        # Get directly shared incomes
        direct_shared_items = db.session.query(Income).join(
            SharedIncome, SharedIncome.income_id == Income.id
        ).filter(
            SharedIncome.shared_with_id == user_id,
            Income.date >= start_date,
            Income.date < end_date
        ).all()
        
        all_shared_items.extend(direct_shared_items)
        
        # Get bulk shared incomes
        bulk_shares = db.session.query(SharedIncome).filter(
            SharedIncome.shared_with_id == user_id,
            SharedIncome.is_bulk_share == True
        ).all()
        
        # Process each bulk share
        for bulk_share in bulk_shares:
            if bulk_share.bulk_income_ids:
                try:
                    bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                    if bulk_ids:
                        bulk_items = db.session.query(Income).filter(
                            Income.id.in_(bulk_ids),
                            Income.date >= start_date,
                            Income.date < end_date
                        ).all()
                        all_shared_items.extend(bulk_items)
                except Exception as e:
                    logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Deduplicate items
    unique_item_ids = set()
    unique_items = []
    for item in all_shared_items:
        if item.id not in unique_item_ids:
            unique_item_ids.add(item.id)
            unique_items.append(item)
    
    # Group by month
    data_by_month = {}
    for item in unique_items:
        year = item.date.year
        month = item.date.month
        month_key = f"{year}-{month:02d}"
        
        if month_key not in data_by_month:
            data_by_month[month_key] = 0
        
        data_by_month[month_key] += float(item.amount)
    
    # Format results
    months = []
    values = []
    
    # Sort month keys
    sorted_months = sorted(data_by_month.keys())
    
    for month_key in sorted_months:
        year, month = month_key.split('-')
        month_date = datetime(int(year), int(month), 1)
        month_name = month_date.strftime('%b %Y')  # e.g. "Jan 2023"
        months.append(month_name)
        values.append(data_by_month[month_key])
    
    return jsonify({
        'labels': months,
        'values': values,
        'debug': {
            'data_type': data_type,
            'unique_items': len(unique_items)
        }
    })

@insights_bp.route('/api/shared-insights/summary-all', methods=['GET'])
def get_shared_insights_summary_all():
    """
    Get summary of all shared data combined.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        start_date, end_date = parse_date_range()
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    
    user_id = session['user']['id']
    
    # Process all shared expenses, including those in bulk shares
    all_shared_expenses = []
    
    # Get directly shared expenses
    direct_shared_expenses = db.session.query(Expense).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        SharedExpense.shared_with_id == user_id,
        Expense.date >= start_date,
        Expense.date < end_date
    ).all()
    
    all_shared_expenses.extend(direct_shared_expenses)
    
    # Get bulk shared expenses
    bulk_shares = db.session.query(SharedExpense).filter(
        SharedExpense.shared_with_id == user_id,
        SharedExpense.is_bulk_share == True
    ).all()
    
    # Process each bulk share
    for bulk_share in bulk_shares:
        if bulk_share.bulk_expense_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_expenses = db.session.query(Expense).filter(
                        Expense.id.in_(bulk_ids),
                        Expense.date >= start_date,
                        Expense.date < end_date
                    ).all()
                    all_shared_expenses.extend(bulk_expenses)
            except Exception as e:
                logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    
    # Process all shared incomes, including those in bulk shares
    all_shared_incomes = []
    
    # Get directly shared incomes
    direct_shared_incomes = db.session.query(Income).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        SharedIncome.shared_with_id == user_id,
        Income.date >= start_date,
        Income.date < end_date
    ).all()
    
    all_shared_incomes.extend(direct_shared_incomes)
    
    # Get bulk shared incomes
    bulk_income_shares = db.session.query(SharedIncome).filter(
        SharedIncome.shared_with_id == user_id,
        SharedIncome.is_bulk_share == True
    ).all()
    
    # Process each bulk income share
    for bulk_share in bulk_income_shares:
        if bulk_share.bulk_income_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                if bulk_ids:
                    bulk_incomes = db.session.query(Income).filter(
                        Income.id.in_(bulk_ids),
                        Income.date >= start_date,
                        Income.date < end_date
                    ).all()
                    all_shared_incomes.extend(bulk_incomes)
            except Exception as e:
                logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Deduplicate expenses and incomes
    unique_expense_ids = set()
    unique_expenses = []
    for expense in all_shared_expenses:
        if expense.id not in unique_expense_ids:
            unique_expense_ids.add(expense.id)
            unique_expenses.append(expense)
    
    unique_income_ids = set()
    unique_incomes = []
    for income in all_shared_incomes:
        if income.id not in unique_income_ids:
            unique_income_ids.add(income.id)
            unique_incomes.append(income)
    
    # Calculate expense summary
    total_expense_entries = len(unique_expenses)
    total_expense_amount = sum(float(expense.amount) for expense in unique_expenses)
    
    # Calculate expense category distribution
    expense_category_totals = {}
    for expense in unique_expenses:
        category = expense.category
        if category not in expense_category_totals:
            expense_category_totals[category] = 0
        expense_category_totals[category] += float(expense.amount)
    
    expense_labels = list(expense_category_totals.keys())
    expense_values = [expense_category_totals[category] for category in expense_labels]
    
    # Calculate income summary
    total_income_entries = len(unique_incomes)
    total_income_amount = sum(float(income.amount) for income in unique_incomes)
    
    # Calculate income category distribution
    income_category_totals = {}
    for income in unique_incomes:
        category = income.category
        if category not in income_category_totals:
            income_category_totals[category] = 0
        income_category_totals[category] += float(income.amount)
    
    income_labels = list(income_category_totals.keys())
    income_values = [income_category_totals[category] for category in income_labels]
    
    return jsonify({
        'expense': {
            'totalEntries': total_expense_entries,
            'totalAmount': total_expense_amount,
            'categoryDistribution': {'labels': expense_labels, 'values': expense_values}
        },
        'income': {
            'totalEntries': total_income_entries,
            'totalAmount': total_income_amount,
            'categoryDistribution': {'labels': income_labels, 'values': income_values}
        },
        'sharer': {
            'id': 'all',
            'name': 'All Shared Data'
        },
        'debug': {
            'direct_expenses': len(direct_shared_expenses),
            'bulk_expenses': len(all_shared_expenses) - len(direct_shared_expenses),
            'unique_expenses': len(unique_expenses),
            'direct_incomes': len(direct_shared_incomes),
            'bulk_incomes': len(all_shared_incomes) - len(direct_shared_incomes),
            'unique_incomes': len(unique_incomes)
        }
    })

@insights_bp.route('/api/insights/today-debug', methods=['GET'])
def today_debug():
    """
    Debug endpoint to specifically check if today's data is being found and processed correctly.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    # Get current date
    today = datetime.now()
    today_start = datetime(today.year, today.month, today.day, 0, 0, 0)
    today_end = datetime(today.year, today.month, today.day, 23, 59, 59)
    tomorrow = today_start + timedelta(days=1)
    
    user_id = session['user']['id']
    
    # Check personal data for today
    personal_expenses = Expense.query.filter(
        Expense.user_id == user_id,
        Expense.type == 'expense',
        Expense.date >= today_start,
        Expense.date < tomorrow
    ).all()
    
    personal_incomes = Income.query.filter(
        Income.user_id == user_id,
        Income.date >= today_start,
        Income.date < tomorrow
    ).all()
    
    # Check shared data for today
    # Direct shared expenses
    direct_shared_expenses = db.session.query(Expense).join(
        SharedExpense, SharedExpense.expense_id == Expense.id
    ).filter(
        SharedExpense.shared_with_id == user_id,
        Expense.date >= today_start,
        Expense.date < tomorrow
    ).all()
    
    # Bulk shared expenses
    bulk_shares = db.session.query(SharedExpense).filter(
        SharedExpense.shared_with_id == user_id,
        SharedExpense.is_bulk_share == True
    ).all()
    
    bulk_shared_expenses = []
    for bulk_share in bulk_shares:
        if bulk_share.bulk_expense_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_expense_ids.split(',') if id.strip()]
                if bulk_ids:
                    expenses = db.session.query(Expense).filter(
                        Expense.id.in_(bulk_ids),
                        Expense.date >= today_start,
                        Expense.date < tomorrow
                    ).all()
                    bulk_shared_expenses.extend(expenses)
            except Exception as e:
                logging.error(f"Error processing bulk expense share {bulk_share.id}: {str(e)}")
    
    # Direct shared incomes
    direct_shared_incomes = db.session.query(Income).join(
        SharedIncome, SharedIncome.income_id == Income.id
    ).filter(
        SharedIncome.shared_with_id == user_id,
        Income.date >= today_start,
        Income.date < tomorrow
    ).all()
    
    # Bulk shared incomes
    bulk_income_shares = db.session.query(SharedIncome).filter(
        SharedIncome.shared_with_id == user_id,
        SharedIncome.is_bulk_share == True
    ).all()
    
    bulk_shared_incomes = []
    for bulk_share in bulk_income_shares:
        if bulk_share.bulk_income_ids:
            try:
                bulk_ids = [int(id) for id in bulk_share.bulk_income_ids.split(',') if id.strip()]
                if bulk_ids:
                    incomes = db.session.query(Income).filter(
                        Income.id.in_(bulk_ids),
                        Income.date >= today_start,
                        Income.date < tomorrow
                    ).all()
                    bulk_shared_incomes.extend(incomes)
            except Exception as e:
                logging.error(f"Error processing bulk income share {bulk_share.id}: {str(e)}")
    
    # Format the data for the response
    personal_expense_details = [{
        'id': e.id,
        'date': e.date.isoformat(),
        'amount': float(e.amount),
        'category': e.category,
        'description': e.description
    } for e in personal_expenses]
    
    personal_income_details = [{
        'id': i.id,
        'date': i.date.isoformat(),
        'amount': float(i.amount),
        'category': i.category,
        'description': i.description
    } for i in personal_incomes]
    
    direct_shared_expense_details = [{
        'id': e.id,
        'date': e.date.isoformat(),
        'amount': float(e.amount),
        'category': e.category,
        'description': e.description,
        'user_id': e.user_id
    } for e in direct_shared_expenses]
    
    bulk_shared_expense_details = [{
        'id': e.id,
        'date': e.date.isoformat(),
        'amount': float(e.amount),
        'category': e.category,
        'description': e.description,
        'user_id': e.user_id
    } for e in bulk_shared_expenses]
    
    direct_shared_income_details = [{
        'id': i.id,
        'date': i.date.isoformat(),
        'amount': float(i.amount),
        'category': i.category,
        'description': i.description,
        'user_id': i.user_id
    } for i in direct_shared_incomes]
    
    bulk_shared_income_details = [{
        'id': i.id,
        'date': i.date.isoformat(),
        'amount': float(i.amount),
        'category': i.category,
        'description': i.description,
        'user_id': i.user_id
    } for i in bulk_shared_incomes]
    
    # Get date range used in parse_date_range for comparison
    current_start_date, current_end_date = parse_date_range()
    
    return jsonify({
        'today': today.isoformat(),
        'today_start': today_start.isoformat(),
        'today_end': today_end.isoformat(),
        'tomorrow': tomorrow.isoformat(),
        'current_date_range': {
            'start_date': current_start_date.isoformat(),
            'end_date': current_end_date.isoformat(),
            'today_included': today_start >= current_start_date and today_end < current_end_date
        },
        'personal_data': {
            'expenses': {
                'count': len(personal_expenses),
                'details': personal_expense_details
            },
            'incomes': {
                'count': len(personal_incomes),
                'details': personal_income_details
            }
        },
        'shared_data': {
            'expenses': {
                'direct': {
                    'count': len(direct_shared_expenses),
                    'details': direct_shared_expense_details
                },
                'bulk': {
                    'count': len(bulk_shared_expenses),
                    'details': bulk_shared_expense_details
                },
                'total': len(direct_shared_expenses) + len(bulk_shared_expenses)
            },
            'incomes': {
                'direct': {
                    'count': len(direct_shared_incomes),
                    'details': direct_shared_income_details
                },
                'bulk': {
                    'count': len(bulk_shared_incomes),
                    'details': bulk_shared_income_details
                },
                'total': len(direct_shared_incomes) + len(bulk_shared_incomes)
            }
        }
    })

@insights_bp.route('/api/insights/date-debug', methods=['GET'])
def date_debug():
    """
    Debug endpoint to specifically check date handling logic.
    This endpoint helps diagnose issues with date parsing and filtering.
    """
    if 'user' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    # Get raw date parameters
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    
    # Current time
    now = datetime.now()
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0)
    today_end = datetime(now.year, now.month, now.day, 23, 59, 59)
    tomorrow = today_start + timedelta(days=1)
    
    # Process dates using our parsing function
    try:
        start_date_obj, end_date_obj = parse_date_range()
        
        # Get user_id
        user_id = session['user']['id']
        
        # Check for today's data
        today_expense_count = Expense.query.filter(
            Expense.user_id == user_id,
            Expense.date >= today_start,
            Expense.date < tomorrow
        ).count()
        
        today_income_count = Income.query.filter(
            Income.user_id == user_id,
            Income.date >= today_start,
            Income.date < tomorrow
        ).count()
        
        # Check for data in the requested range
        range_expense_count = Expense.query.filter(
            Expense.user_id == user_id,
            Expense.date >= start_date_obj,
            Expense.date < end_date_obj
        ).count()
        
        range_income_count = Income.query.filter(
            Income.user_id == user_id,
            Income.date >= start_date_obj,
            Income.date < end_date_obj
        ).count()
        
        # Get sample data for today
        today_expenses = Expense.query.filter(
            Expense.user_id == user_id,
            Expense.date >= today_start,
            Expense.date < tomorrow
        ).order_by(Expense.date).limit(5).all()
        
        today_incomes = Income.query.filter(
            Income.user_id == user_id,
            Income.date >= today_start,
            Income.date < tomorrow
        ).order_by(Income.date).limit(5).all()
        
        # Format sample data
        today_expense_samples = [{
            'id': e.id,
            'date': e.date.isoformat(),
            'amount': float(e.amount),
            'category': e.category,
            'description': e.description
        } for e in today_expenses]
        
        today_income_samples = [{
            'id': i.id,
            'date': i.date.isoformat(),
            'amount': float(i.amount),
            'category': i.category,
            'description': i.description
        } for i in today_incomes]
        
        # Return debug info
        return jsonify({
            'request': {
                'startDate': start_date_str,
                'endDate': end_date_str,
            },
            'processed': {
                'startDate': start_date_obj.isoformat() if start_date_obj else None,
                'endDate': end_date_obj.isoformat() if end_date_obj else None,
                'is_today_included': (start_date_obj <= today_start < end_date_obj),
            },
            'current_time': {
                'now': now.isoformat(),
                'today_start': today_start.isoformat(),
                'today_end': today_end.isoformat(),
                'tomorrow': tomorrow.isoformat()
            },
            'data_counts': {
                'today': {
                    'expenses': today_expense_count,
                    'income': today_income_count
                },
                'requested_range': {
                    'expenses': range_expense_count,
                    'income': range_income_count
                }
            },
            'today_samples': {
                'expenses': today_expense_samples,
                'incomes': today_income_samples
            }
        })
    except Exception as e:
        logging.error(f"Date debug error: {str(e)}")
        return jsonify({
            'error': str(e),
            'request': {
                'startDate': start_date_str,
                'endDate': end_date_str
            }
        }), 400
