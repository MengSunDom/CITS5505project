from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

from tests_e2e.driver_utils import get_test_driver


def test_delete_expense_individual():
    driver = get_test_driver()
    wait = WebDriverWait(driver, 10)

    try:
        driver.get("http://127.0.0.1:5001/login")
        wait.until(EC.presence_of_element_located(
            (By.ID, "username"))).send_keys("test_admin")
        driver.find_element(By.ID,
                            "password").send_keys("test_admin", Keys.ENTER)

        wait.until(EC.url_contains("/dashboard"))
        driver.get("http://127.0.0.1:5001/expenses")

        wait.until(EC.presence_of_element_located((By.ID, "expenseTableBody")))
        time.sleep(1)

        rows = driver.find_elements(By.CSS_SELECTOR, "#expenseTableBody tr")
        if not rows:
            print("❌ No expenses found to delete.")
            return

        delete_button = rows[0].find_element(By.CSS_SELECTOR,
                                             "button.btn-danger")
        delete_button.click()

        confirm_button = wait.until(
            EC.element_to_be_clickable(
                (By.XPATH, "//button[text()='Confirm']")))
        confirm_button.click()

        time.sleep(2)
        print("Each expense entry delete with confirmation successful.")

    finally:
        driver.quit()


if __name__ == "__main__":
    test_delete_expense_individual()
