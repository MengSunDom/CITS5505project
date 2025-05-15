# CITS5505project

## 📘 Project Overview

This is a web-based expense tracking application developed for the University of Western Australia’s CITS5505 course. The application allows users to register, log in, and record and analyze their daily expenses. It offers powerful chart-based analysis tools to help users understand their spending habits and enables data sharing between users.

## 🔧 Features

- 🧑‍💻 User registration and login system
- 💰 Add, manage, and delete expense records
- 📊 Data visualization and expense insights
- 🤝 Share expense data with other users
- 📸 Add expenses via receipt images using OCR technology
- 📑 Support for bulk importing expense data
- 🔍 Expense filtering and search functionality

## 🛠️ Tech Stack

- **Backend:** Python 3, Flask, SQLAlchemy, OpenAI API  
- **Frontend:** HTML, CSS, JavaScript, Bootstrap  
- **Database:** SQLite  
- **Other Tools:** EasyOCR, Plotly.js

## 🚀 Getting Started

### Prerequisites

Ensure Python 3 and pip are installed.

### Installation

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

### Configuration

Copy `config-example.py` to `config.py`, and add your OpenAI API key:

```bash
cp config-example.py config.py
# Edit config.py to add your openai API key and flask secret key.
```

You can generate a secure Flask secret key by running the following in Python:

```python
import secrets
print(secrets.token_hex(32))
```

Copy the generated value and set it as your `SECRET_KEY` in `config.py` to ensure session security.

### Running the App

```bash
# Apply database migrations, initializing the database
flask db upgrade

# Run the application
python app.py
```

Open your browser and go to `http://localhost:5001`.

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
│   ├── llm.py               # OpenAI integration
│   └── ocr.py               # OCR functionality
├── tests/
│    ├── __init__.py                               
│    ├── test_api.py                               
│    ├── test_pages.py                             
│    ├── selenium_add_expense_test.py              # Adds a new expense via UI (offcanvas form)
│    ├── selenium_delete_expense_test.py           # Deletes a specific expense through modal confirmation
│    ├── selenium_home_page_test.py                # Verifies the home page loads and title is correct
│    ├── selenium_login_and_register_test.py       # Registers and logs in a user via UI
│    ├── selenium_login_bypass_test.py             # Tests redirect when accessing pages without login
│    ├── selenium_register_page_load_test.py       # Checks if the register page loads correctly
│    ├── selenium_wrong_login_test.py              # Attempts login with wrong credentials
│    ├── e2e/
│    │   └── test_selenium.py                      
│    └── unit/
│        └── test_app.py                           
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

⚙️ How to Run the Selenium Tests
	1.	Place the chromedriver executable in the project root directory.
	2.	Start the Flask server in one terminal by executing:

            python app.py

    3.	Open another terminal and run tests like:

            python tests/selenium_add_expense_test.py




## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.