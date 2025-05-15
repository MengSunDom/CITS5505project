import json
from app import create_app

app = create_app()


def test_post_login():
    client = app.test_client()
    response = client.post('/api/login',
                           data=json.dumps({
                               'username': 'admin',
                               'password': 'admin'
                           }),
                           content_type='application/json')
    assert response.status_code in [200, 401]


def test_post_register():
    client = app.test_client()
    response = client.post('/api/register',
                           data=json.dumps({
                               'username': 'testuser',
                               'password': 'testpassword'
                           }),
                           content_type='application/json')
    assert response.status_code in [200, 400]


def test_logout():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/logout', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_dashboard_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/dashboard')
    assert response.status_code == 200
    assert b'Dashboard' in response.data


def test_expenses_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/expenses')
    assert response.status_code == 200
    assert b'Expenses' in response.data


def test_income_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/income')
    assert response.status_code == 200
    assert b'Income' in response.data


def test_shared_data_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/shared-data')
    assert response.status_code == 200
    assert b'Shared Data' in response.data


def test_500_error_handling():
    client = app.test_client()
    response = client.get('/error')
    assert response.status_code == 500
    assert b"Internal Server Error" in response.data or b"error" in response.data


def test_api_500_error_handling():
    client = app.test_client()
    response = client.get('/api/error')

    assert response.status_code == 500
    json_data = response.get_json()
    assert json_data['error'] == "Internal Server Error"
    assert "Simulated API error" in json_data['traceback']


def test_post_register_failure_empty_username():
    client = app.test_client()
    response = client.post(
        '/api/register',
        data=json.dumps({
            'username': '',  # Invalid username
            'password': 'testpassword'
        }),
        content_type='application/json')
    assert response.status_code == 400
    assert b'cannot be empty' in response.data


def test_post_register_failure_empty_password():
    client = app.test_client()
    response = client.post(
        '/api/register',
        data=json.dumps({
            'username': 'testuser',
            'password': ''  # Invalid password
        }),
        content_type='application/json')
    assert response.status_code == 400
    assert b'cannot be empty' in response.data


def test_post_login_failure():
    client = app.test_client()
    response = client.post('/api/login',
                           data=json.dumps({
                               'username': 'nonexistentuser',
                               'password': 'wrongpassword'
                           }),
                           content_type='application/json')
    assert response.status_code == 401
    assert b'Wrong account or password' in response.data


def test_dashboard_unauthenticated():
    client = app.test_client()
    response = client.get('/dashboard', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data  # Redirects to login page


def test_expenses_unauthenticated():
    client = app.test_client()
    response = client.get('/expenses', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data  # Redirects to login page


def test_api_add_expense_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    response = client.post('/api/expenses',
                           data=json.dumps({
                               'date': '2025-01-01T12:00:00',
                               'amount': 100,
                               'description': 'Test expense',
                               'category': 'Other',
                           }),
                           content_type='application/json')
    assert response.status_code == 200


def test_api_delete_expense_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    # Assuming expense ID 1 exists for testing
    response = client.post('/api/expenses/delete',
                           data=json.dumps({'id': 1}),
                           content_type='application/json')
    assert response.status_code in [200, 404]


def test_api_get_expenses_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    response = client.get('/api/expenses')
    assert response.status_code == 200


def test_api_endpoint_unauthenticated():
    client = app.test_client()
    response = client.get('/api/expenses')
    assert response.status_code == 401
    assert b'Not authenticated' in response.data


def test_api_add_income_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    response = client.post('/api/incomes',
                           data=json.dumps({
                               'date': '2025-01-01T12:00:00',
                               'amount': 500,
                               'description': 'Test income',
                               'category': 'Salary',
                           }),
                           content_type='application/json')
    assert response.status_code == 200
    assert b'Income added successfully' in response.data


def test_api_get_income_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    response = client.get('/api/incomes')
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)


def test_api_delete_income_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    # Assuming income ID 1 exists for testing
    response = client.post('/api/incomes/delete',
                           data=json.dumps({'id': 1}),
                           content_type='application/json')
    assert response.status_code in [200, 404]


def test_api_share_expense_user_not_found_authenticated():
    client = app.test_client()
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    response = client.post('/api/share/1',
                           data=json.dumps({'username': 'shareduser'}),
                           content_type='application/json')
    assert response.status_code == 404
    assert b'User not found' in response.data
