import pytest
import subprocess
import time
import os
import signal
import socket
import sys
import platform

PORT = 5001


def wait_for_server(port, host="127.0.0.1", timeout=10):
    """Wait until the server is up and the port is accepting connections."""
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except (ConnectionRefusedError, OSError):
            time.sleep(0.2)
    return False


@pytest.fixture(scope="session", autouse=True)
def flask_server():
    """Start the Flask server before tests and stop it after."""
    cmd = [sys.executable, "app.py"]

    if platform.system() == "Windows":
        proc = subprocess.Popen(
            cmd, creationflags=subprocess.CREATE_NEW_PROCESS_GROUP)
    else:
        proc = subprocess.Popen(cmd, preexec_fn=os.setsid)

    if not wait_for_server(PORT):
        raise RuntimeError("Flask server did not start.")

    yield

    if platform.system() == "Windows":
        proc.send_signal(signal.CTRL_BREAK_EVENT)
    else:
        os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
