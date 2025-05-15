import time

from tests_e2e.driver_utils import get_test_driver


def test_dashboard_requires_login():
    driver = get_test_driver()

    try:
        driver.get("http://127.0.0.1:5001/dashboard")
        time.sleep(1)

        assert "Login" in driver.page_source
        print("Redirect to login when unauthenticated passed.")
    finally:
        driver.quit()


if __name__ == "__main__":
    test_dashboard_requires_login()
