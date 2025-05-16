import json


def test_post_register(client):
    response = client.post('/api/register',
                           data=json.dumps({
                               'username': 'testuser',
                               'password': 'testpassword'
                           }),
                           content_type='application/json')
    assert response.status_code == 200


def test_post_login(client):
    response = client.post('/api/login',
                           data=json.dumps({
                               'username': 'testuser',
                               'password': 'testpassword'
                           }),
                           content_type='application/json')
    assert response.status_code == 200


def test_post_register_failure_empty_username(client):
    response = client.post(
        '/api/register',
        data=json.dumps({
            'username': '',  # Invalid username
            'password': 'testpassword'
        }),
        content_type='application/json')
    assert response.status_code == 400
    assert b'cannot be empty' in response.data


def test_post_register_failure_empty_password(client):
    response = client.post(
        '/api/register',
        data=json.dumps({
            'username': 'testuser',
            'password': ''  # Invalid password
        }),
        content_type='application/json')
    assert response.status_code == 400
    assert b'cannot be empty' in response.data


def test_post_login_failure(client):
    response = client.post('/api/login',
                           data=json.dumps({
                               'username': 'nonexistentuser',
                               'password': 'wrongpassword'
                           }),
                           content_type='application/json')
    assert response.status_code == 401
    assert b'Wrong account or password' in response.data


def test_api_add_expense_authenticated(client):
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


def test_api_delete_expense_authenticated(client):
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    # Delete an expense with ID 1 for testing
    response = client.post('/api/expenses/delete',
                           data=json.dumps({'id': 1}),
                           content_type='application/json')
    assert response.status_code in [200, 404]


def test_api_get_expenses_authenticated(client):
    with client.session_transaction() as session:
        session['user'] = {
            'id': 3,
            'username': 'testuser',
            'role': 'user',
            'permission': 'basic'
        }
    response = client.get('/api/expenses')
    assert response.status_code == 200


def test_api_endpoint_unauthenticated(client):
    response = client.get('/api/expenses')
    assert response.status_code == 401
    assert b'Not authenticated' in response.data


def test_api_add_income_authenticated(client):
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


def test_api_get_income_authenticated(client):
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


def test_api_delete_income_authenticated(client):
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


def test_api_share_expense_user_not_found_authenticated(client):
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


def test_500_error_handling(client):
    response = client.get('/error')
    print(response.data)
    assert response.status_code == 500
    assert b"Internal Server Error" in response.data or b"error" in response.data


def test_api_500_error_handling(client):
    response = client.get('/api/error')

    assert response.status_code == 500
    json_data = response.get_json()
    assert json_data['error'] == "Internal Server Error"
    assert "Simulated API error" in json_data['traceback']
