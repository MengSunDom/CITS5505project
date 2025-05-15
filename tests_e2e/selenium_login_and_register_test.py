from selenium.webdriver.common.by import By
import time

from tests_e2e.driver_utils import get_test_driver


def test_register_and_login_flow():
    driver = get_test_driver()

    try:
        driver.get("http://127.0.0.1:5001/register")
        time.sleep(1)

        driver.find_element(By.ID, "username").send_keys("seleniumuser")
        driver.find_element(By.ID, "password").send_keys("testpass123")
        driver.find_element(By.ID, "confirmPassword").send_keys("testpass123")
        driver.find_element(By.ID, "registerForm").submit()
        time.sleep(2)

        assert "Login" in driver.page_source or "successfully" in driver.page_source
        print("Registration test passed.")

        driver.get("http://127.0.0.1:5001/login")
        driver.find_element(By.ID, "username").send_keys("seleniumuser")
        driver.find_element(By.ID, "password").send_keys("testpass123")
        driver.find_element(By.ID, "loginForm").submit()
        time.sleep(2)

        assert "Dashboard" in driver.page_source or "Welcome" in driver.page_source
        print("Login test passed.")
    finally:
        driver.quit()


if __name__ == "__main__":
    test_register_and_login_flow()
