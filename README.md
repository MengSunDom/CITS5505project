# 📦 CITS5505project

## 📘 Project Overview

This is a web-based expense tracking application developed as part of the **CITS5505 Software Development** course at the **University of Western Australia**. 

### 🎯 Purpose and Design

The primary purpose of this application is to help users **record, manage, and analyze their personal financial data**, including daily expenses and income. It provides tools to **visualize spending patterns**, gain insights, and **share financial data with other users**.

The application is designed with usability and modularity in mind. It uses **Flask** as the web framework, with a clear separation between authentication, data management, and analytics functionality. The interface is simple and intuitive, powered by **Bootstrap** and **Plotly.js** for interactive charts.

OCR support is also integrated, allowing users to quickly extract expense data from receipt images using **EasyOCR** and the **OpenAI API**.

### 👥 Contributors (Group Members)

| UWA ID     | Name           | GitHub             |
| ---------- | -------------- | ------------------ |
| 24002421   | Meng Sun       | [MengSunDom](https://github.com/MengSunDom)        |
| 23764722   | Yapei Chen     | [Transparencency](https://github.com/Transparencency)    |
| 24022534   | Runzhi Zhao    | [Reilkay](https://github.com/Reilkay)|
| 24644535   | Chowdhury Ramim Bin Azam| [ramim1813](https://github.com/Ramim1813)|

## 🔧 Features

- 🧑‍💻 User registration and login system
- 💰 Add, manage, and delete expense/income records
- 📊 Data visualization and expense/income insights
- 🔗 Share expense/income data with other users
- 🧾 Add expenses via receipt images using OCR technology
- 📂 Bulk import of expenses/income
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
git clone https://github.com/MengSunDom/CITS5505project.git
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

Copy `.env-example` to `.env`, and add your OpenAI API key:

```bash
cp .env-example .env
# Edit .env to add your OpenAI API key and Flask secret key.
```

Generate a secure Flask secret key:

```python
import secrets
print(secrets.token_hex(32))
```

Copy the generated value and set it as your `SECRET_KEY` in `.env` to ensure session security.

### ▶️ Running the App

```bash
# Apply database migrations (initialize the database)
flask db upgrade

# Run the application
python app.py
```

### 🏁 Quickstart Guide

1. Visit the [homepage](http://localhost:5001)
2. Register a new account or log in
3. After logging in, you can add and manage your expenses/income
4. View charts and insights to analyze your spending habits
5. Share your expense/income data with other users
6. Quickly add expenses using receipt photos via OCR

---

## 🧪 Running Tests

### ✅ Unit Tests

```bash
pytest tests/
```

The `tests/conftest.py` file contains fixtures for setting up the Flask application and database for testing purposes. It ensures that the database is properly initialized and cleaned up after each test module.

### ✅ System Tests

```bash
pytest tests_e2e/
```

The `tests_e2e/conftest.py` file is responsible for starting the Flask server before the tests and shutting it down afterward. It ensures that the server is running on `http://127.0.0.1:5001` during the tests. 

---

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

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.