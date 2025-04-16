from flask import Flask, render_template, request, redirect, session, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3, os, secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(16)

DATABASE = 'users.db'

def init_db():
    if not os.path.exists(DATABASE):
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL,
                permission TEXT DEFAULT 'basic'
            )
        ''')

        
        for role in ['admin', 'reviewer', 'worker']:
            try:
                hashed_pw = generate_password_hash(role + "_salt")  
                c.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                        (role, hashed_pw, role))
            except sqlite3.IntegrityError:
                continue

        conn.commit()
        conn.close()
        print("Database initialized with default users.")
    else:
        print("Database already exists.")

def get_user(username):
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    conn.close()
    return user

@app.route('/')
def index():
    csrf_token = secrets.token_hex(16)
    session['csrf_token'] = csrf_token
    return render_template('introductory.html', csrf_token=csrf_token)

@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if data.get('csrf_token') != session.get('csrf_token'):
        return jsonify({'error': 'CSRF token mismatch'}), 403

    username = data.get('username')
    password = data.get('password')
    hashed_pw = generate_password_hash(password + "_salt")

    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                  (username, hashed_pw, 'worker'))
        conn.commit()
        conn.close()
        return jsonify({'message': 'Registration successful!'})
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Username already exists'}), 400

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if data.get('csrf_token') != session.get('csrf_token'):
        return jsonify({'error': 'CSRF token mismatch'}), 403

    username = data.get('username')
    password = data.get('password')

    user = get_user(username)
    if user and check_password_hash(user[2], password + "_salt"):
        session['user'] = {'username': user[1], 'role': user[3], 'permission': user[4]}
        return jsonify({'message': f"Welcome {user[1]}, Role: {user[3]}！"})
    return jsonify({'error': 'Wrong account or password'}), 401

if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        init_db()
    app.run(debug=True)
