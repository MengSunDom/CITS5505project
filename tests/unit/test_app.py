from app import app

def test_home():
    client = app.test_client()
    response = client.get('/')
    assert response.status_code == 200

def test_data():
    client = app.test_client()
    response = client.get('/data')
    assert response.get_json()['value'] == 42
