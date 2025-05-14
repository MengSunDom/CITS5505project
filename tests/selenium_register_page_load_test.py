from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import time

def test_register_page_loads():
    service = Service('../chromedriver')
    driver = webdriver.Chrome(service=service)

    try:
        driver.get("http://127.0.0.1:5001/register")
        assert "Register" in driver.page_source
        print("Register page loaded successfully.")
    finally:
        time.sleep(2)
        driver.quit()

if __name__ == "__main__":
    test_register_page_loads()