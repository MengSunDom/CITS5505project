def test_home(client):
    response = client.get('/')
    assert response.status_code == 200


def test_dashboard_unauthenticated(client):
    response = client.get('/dashboard', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data  # Check if redirected to login page


def test_expenses_redirect(client):
    response = client.get('/expenses', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data  # Check if redirected to login page


def test_income_redirect(client):
    response = client.get('/income', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_shared_data_redirect(client):
    response = client.get('/shared-data', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_404_error(client):
    response = client.get('/nonexistent-page')
    assert response.status_code == 404


def test_login_page(client):
    response = client.get('/login')
    assert response.status_code == 200
    assert b'Login' in response.data


def test_register_page(client):
    response = client.get('/register')
    assert response.status_code == 200
    assert b'Register' in response.data


def test_logout_authenticated(client):
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/logout', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_dashboard_authenticated(client):
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/dashboard')
    assert response.status_code == 200
    assert b'Dashboard' in response.data


def test_expenses_authenticated(client):
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/expenses')
    assert response.status_code == 200
    assert b'Expenses' in response.data


def test_income_authenticated(client):
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/income')
    assert response.status_code == 200
    assert b'Income' in response.data


def test_shared_data_authenticated(client):
    with client.session_transaction() as session:
        session['user'] = 'testuser'
    response = client.get('/shared-data')
    assert response.status_code == 200
    assert b'Share' in response.data
