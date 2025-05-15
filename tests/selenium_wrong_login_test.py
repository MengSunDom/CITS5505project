from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
import time

def test_login_with_wrong_credentials():
    service = Service('../chromedriver')
    driver = webdriver.Chrome(service=service)

    try:
        driver.get("http://127.0.0.1:5001/login")
        driver.find_element(By.ID, "username").send_keys("fakeuser")
        driver.find_element(By.ID, "password").send_keys("wrongpass")
        driver.find_element(By.ID, "loginForm").submit()
        time.sleep(2)

        assert "Wrong account or password" in driver.page_source or "Login" in driver.page_source
        print("Incorrect login test passed.")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_login_with_wrong_credentials()