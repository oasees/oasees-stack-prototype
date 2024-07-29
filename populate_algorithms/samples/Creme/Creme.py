import signal
import sys

def signal_handler(sig, frame):
    print("\nExiting gracefully...")
    sys.exit(0)

signal.signal(signal.SIGINT, signal_handler)

while True:
    print("this is algorithm3")
