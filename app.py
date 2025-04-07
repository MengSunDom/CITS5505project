from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
socketio = SocketIO(app)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/data', methods=['GET'])
def get_data():
    return jsonify({'value': 42})

@socketio.on('message')
def handle_message(msg):
    print(f'Received message: {msg}')
    emit('response', f'Server received: {msg}', broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True)
