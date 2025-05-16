以下是根据你的要求修改后的 `README.md` 文件，添加了项目目的、设计说明、组员信息表格、运行及测试说明等内容，符合CITS5505课程的评估要求：

---

# 📦 CITS5505project

## 📘 Project Overview

This is a web-based expense tracking application developed as part of the **CITS5505 Software Development** course at the **University of Western Australia**.

### 🎯 Purpose and Design

The primary purpose of this application is to help users **record, manage, and analyze their personal financial data**, including daily expenses and income. It provides tools to **visualize spending patterns**, gain insights, and **share financial data with other users**.

The application is designed with usability and modularity in mind. It uses **Flask** as the web framework, with a clear separation between authentication, data management, and analytics functionality. The interface is simple and intuitive, powered by **Bootstrap** and **Plotly.js** for interactive charts.

OCR support is also integrated, allowing users to quickly extract expense data from receipt images using **EasyOCR** and the **OpenAI API**.

## 👥 Group Members

| UWA ID     | Name           | GitHub Username    |
| ---------- | -------------- | ------------------ |
| \24002421 | \Meng Sun   | \MengSunDom    |
| \23764722  | \Yapei Chen | \Transparencency |
| \24022534 | \Runzhi Zhao| \Reilkay|
| \24644535  | \Chowdhury Ramim Bin Azam| \chowdhuryramimbinazam/ramim1813|

## 🔧 Features

* 🧑‍💻 User registration and login system
* 💰 Add, manage, and delete expense records
* 📊 Data visualization and expense insights
* 🔗 Share expense data with other users
* 🧾 Add expenses via receipt images using OCR technology
* 📂 Bulk import of expenses
* 🔍 Expense filtering and search functionality

## 🛠️ Tech Stack

* **Backend:** Python 3, Flask, SQLAlchemy, OpenAI API
* **Frontend:** HTML, CSS, JavaScript, Bootstrap
* **Database:** SQLite
* **Other Tools:** EasyOCR, Plotly.js

---

## 🚀 Getting Started

### 📦 Prerequisites

Ensure Python 3 and pip are installed.

### ⚙️ Installation

```bash
# Clone the repository
git clone https://github.com/your-team-name/CITS5505project.git
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

Copy `config-example.py` to `config.py`, and add your OpenAI API key and Flask secret key:

```bash
cp config-example.py config.py
```

Generate a secure Flask secret key:

```python
import secrets
print(secrets.token_hex(32))
```

Then, paste the generated value into your `config.py` as `SECRET_KEY`.

---

### ▶️ Launching the Application

```bash
# Apply database migrations (initialize the database)
flask db upgrade

# Run the application
python app.py
```

Open your browser and go to: [http://localhost:5001](http://localhost:5001)

---

## 🧪 Running Tests

### ✅ Unit Tests

Run unit tests for individual modules:

```bash
pytest tests/
```

* `tests/conftest.py` sets up a temporary test database and app context for isolated testing.

### ✅ System Tests

Run end-to-end system tests:

```bash
pytest tests_e2e/
```

* `tests_e2e/conftest.py` starts the Flask development server before tests and shuts it down afterward.
* Tests assume the app runs on `http://127.0.0.1:5001`.

---

## 📁 Project Structure

```plaintext
CITS5505project/
├── app.py                   # Application entry point
├── config.py                # Configuration file (contains API keys)
├── models/                  # Database models
│   └── models.py            
├── routes/                  # Route definitions
│   ├── auth_routes.py       
│   ├── error_routes.py      
│   ├── expense_routes.py    
│   ├── income_routes.py     
│   ├── insights_routes.py   
│   ├── page_routes.py       
│   ├── share_routes.py      
│   └── shareIncome_routes.py
├── static/                  # CSS & JS files
├── templates/               # HTML templates
├── utils/                   # Utility functions
├── tests/                   # Unit tests
├── tests_e2e/               # End-to-end tests
├── requirements.txt         # Python dependencies
└── README.md                # Project documentation
```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

