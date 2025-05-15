import time

from tests_e2e.driver_utils import get_test_driver


def test_register_page_loads():
    driver = get_test_driver()

    try:
        driver.get("http://127.0.0.1:5001/register")
        assert "Register" in driver.page_source
        print("Register page loaded successfully.")
    finally:
        time.sleep(2)
        driver.quit()


if __name__ == "__main__":
    test_register_page_loads()
