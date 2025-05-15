from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import time

def test_dashboard_requires_login():
    service = Service('../chromedriver')
    driver = webdriver.Chrome(service=service)

    try:
        driver.get("http://127.0.0.1:5001/dashboard")
        time.sleep(1)

        assert "Login" in driver.page_source
        print("Redirect to login when unauthenticated passed.")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_dashboard_requires_login()