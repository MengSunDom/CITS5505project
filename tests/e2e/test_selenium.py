from selenium import webdriver
import time

driver = webdriver.Chrome()
driver.get("http://localhost:5000")

btn = driver.find_element("id", "btn")
btn.click()
time.sleep(1)

result = driver.find_element("id", "result").text
assert "Received" in result

driver.quit()
