from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_add_expense():
    service = Service('../chromedriver')
    driver = webdriver.Chrome(service=service)
    wait = WebDriverWait(driver, 10)

    try:
        driver.get("http://127.0.0.1:5001/login")
        wait.until(EC.presence_of_element_located((By.ID, "username"))).send_keys("test_admin")
        driver.find_element(By.ID, "password").send_keys("test_admin", Keys.ENTER)

        wait.until(EC.url_contains("/dashboard"))
        driver.get("http://127.0.0.1:5001/expenses")

        wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(),'Add New Expense')]"))).click()

        wait.until(EC.visibility_of_element_located((By.ID, "amount"))).send_keys("123")
        driver.find_element(By.ID, "category").send_keys("Other")
        driver.find_element(By.ID, "description").send_keys("Test Selenium Expense")

        driver.find_element(By.XPATH, "//button[text()='Add Expense']").click()
        time.sleep(2)
        assert "Test Selenium Expense" in driver.page_source
        print("Expense added and visible in list.")
    finally:
        driver.quit()

if __name__ == "__main__":
    test_add_expense()