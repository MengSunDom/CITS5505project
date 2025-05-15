from app import create_app

app = create_app()


def test_home():
    client = app.test_client()
    response = client.get('/')
    assert response.status_code == 200


def test_dashboard_redirect():
    client = app.test_client()
    response = client.get('/dashboard', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data  # Check if redirected to login page


def test_expenses_redirect():
    client = app.test_client()
    response = client.get('/expenses', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data  # Check if redirected to login page


def test_income_redirect():
    client = app.test_client()
    response = client.get('/income', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_shared_data_redirect():
    client = app.test_client()
    response = client.get('/shared-data', follow_redirects=True)
    assert response.status_code == 200
    assert b'Login' in response.data


def test_404_error():
    client = app.test_client()
    response = client.get('/nonexistent-page')
    assert response.status_code == 404


def test_login_page():
    client = app.test_client()
    response = client.get('/login')
    assert response.status_code == 200
    assert b'Login' in response.data


def test_register_page():
    client = app.test_client()
    response = client.get('/register')
    assert response.status_code == 200
    assert b'Register' in response.data
