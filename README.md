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
# Edit config.py to add your API key
```

### Running the App

```bash
python app.py
```

Open your browser and go to `http://localhost:5001`.

## 📁 Project Structure

```plaintext
CITS5505project/
├── app.py                  # Application entry point
├── config.py               # Configuration file (contains API keys)
├── models/                 # Database models
│   └── models.py           # User, expense and sharing models
├── routes/                 # Flask route definitions
│   ├── auth_routes.py      # Authentication-related routes
│   ├── expense_routes.py   # Expense management routes
│   ├── insights_routes.py  # Data analysis routes
│   ├── page_routes.py      # Page routes
│   └── share_routes.py     # Data sharing routes
├── static/                 # Static assets
│   ├── css/                # CSS stylesheets
│   └── js/                 # JavaScript files
├── templates/              # HTML templates
├── utils/                  # Utility functions
│   ├── llm.py              # OpenAI integration
│   └── ocr.py              # OCR functionality
├── tests/                  # Unit tests
├── requirements.txt        # Python dependencies
└── README.md               # Project documentation
```

## ✅ Usage Instructions

1. Visit the homepage to learn about the project  
2. Register a new account or log in  
3. After logging in, you can add and manage your expenses  
4. View charts and insights to analyze your spending habits  
5. Share your expense data with other users  
6. Quickly add expenses using receipt photos via OCR  

## 🧪 Running Tests

(To be added as applicable)


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.