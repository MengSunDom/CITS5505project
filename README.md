# 📦 CITS5505project

## 📘 Project Overview

This is a web-based expense tracking application developed for the University of Western Australia’s CITS5505 course. The application allows users to register, log in, and record and analyze their daily expenses. It offers powerful chart-based analysis tools to help users understand their spending habits and enables data sharing between users.

## 🔧 Features

- 🧑‍💻 User registration and login system
- 💰 Add, manage, and delete expense records
- 📊 Data visualization and expense insights
- 🔗 Share expense data with other users
- 🧾 Add expenses via receipt images using OCR technology
- 💑 Support for bulk importing expense data
- 🔍 Expense filtering and search functionality

## 🛠️ Tech Stack

- **Backend:** Python 3, Flask, SQLAlchemy, OpenAI API  
- **Frontend:** HTML, CSS, JavaScript, Bootstrap  
- **Database:** SQLite  
- **Other Tools:** EasyOCR, Plotly.js

## 🚀 Getting Started

### 📦 Prerequisites

Ensure Python 3 and pip are installed.

### ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/reilkay/CITS5505project.git
cd CITS5505project

# Create and activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 🔐 Configuration

Copy `config-example.py` to `config.py`, and add your OpenAI API key:

```bash
cp config-example.py config.py
# Edit config.py to add your OpenAI API key and Flask secret key.
```

Generate a secure Flask secret key:

```python
import secrets
print(secrets.token_hex(32))
```

Copy the generated value and set it as your `SECRET_KEY` in `config.py` to ensure session security.

### ▶️ Running the App

```bash
# Apply database migrations, initializing the database
flask db upgrade

# Run the application
python app.py
```

Open your browser and go to: `http://localhost:5001`

## 📁 Project Structure

```plaintext
CITS5505project/
├── app.py                   # Application entry point
├── config.py                # Configuration file (contains API keys)
├── models/                  # Database models
│   └── models.py            # User, expense and sharing models
├── routes/                  # Flask route definitions
│   ├── auth_routes.py       # Authentication-related routes
│   ├── error_routes.py      # Error testing routes
│   ├── expense_routes.py    # Expense management routes
│   ├── income_routes.py     # Income management routes
│   ├── insights_routes.py   # Data analysis routes
│   ├── page_routes.py       # Page routes
│   ├── share_routes.py      # Expense data sharing routes
│   └── shareIncome_routes.py# Income data sharing routes
├── static/                  # Static assets
│   ├── css/                 # CSS stylesheets
│   └── js/                  # JavaScript files
├── templates/               # HTML templates
├── utils/                   # Utility functions
├── tests/                   # Unit tests
├── tests_e2e/               # System tests
├── requirements.txt         # Python dependencies
└── README.md                # Project documentation
```

## ✅ Usage Instructions

1. Visit the homepage to learn about the project  
2. Register a new account or log in  
3. After logging in, you can add and manage your expenses/income  
4. View charts and insights to analyze your spending habits  
5. Share your expense/income data with other users  
6. Quickly add expenses using receipt photos via OCR  

## 🧪 Running Tests

### 🧰 Unit Tests

```bash
pytest tests/
```

The `tests/conftest.py` file contains fixtures for setting up the Flask application and database for testing purposes. It ensures that the database is properly initialized and cleaned up after each test module.

### 🧰 System Tests

```bash
pytest tests_e2e/
```

The `tests_e2e/conftest.py` file is responsible for starting the Flask server before the tests and shutting it down afterward. It ensures that the server is running on `http://127.0.0.1:5001` during the tests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.