from functools import wraps
from flask import request, jsonify
from flask_wtf.csrf import validate_csrf, CSRFError

def csrf_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        data = request.get_json(silent=True)
        token = (data or {}).get('csrf_token')

        try:
            validate_csrf(token)
        except CSRFError as e:
            return jsonify({'error': 'Invalid CSRF token'}), 400
        return f(*args, **kwargs)
    return decorated_function
