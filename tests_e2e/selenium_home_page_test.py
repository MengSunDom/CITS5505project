from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import time

def test_home_page_loads():
    service = Service('../chromedriver')
    driver = webdriver.Chrome(service=service)

    try:
        driver.get("http://127.0.0.1:5001/")
        assert "Expense Tracker" in driver.title or "Login" in driver.page_source
        print("Home page loaded successfully.")
    finally:
        time.sleep(2)  # Just to visually confirm it opened
        driver.quit()


if __name__ == "__main__":
    test_home_page_loads()