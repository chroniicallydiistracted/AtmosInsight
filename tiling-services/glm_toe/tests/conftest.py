import os
import sys

# Ensure the service package (app) is importable when running pytest directly
THIS_DIR = os.path.dirname(__file__)
SERVICE_ROOT = os.path.abspath(os.path.join(THIS_DIR, '..'))
if SERVICE_ROOT not in sys.path:
    sys.path.insert(0, SERVICE_ROOT)
