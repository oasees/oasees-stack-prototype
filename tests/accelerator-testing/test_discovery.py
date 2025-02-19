# imports
import unittest
from unittest.mock import patch

import subprocess
import shutil
import os
import re
"""
This test file is dedicated to Hardware discovery in OASEES Stack
1. Hardware Discovery function
2. Multiple Accelerator Support
3. Incorrect Hardware Detection
4. Fallback to CPU

Total 8 test cases
"""

def discover_hardware():
    """
    Detect available accelerators: NVIDIA GPU, AMD GPU, Intel GPU or TPU
    """
    devices = []
    # check for NVIDIA GPU using nvidia-smi
    if shutil.which("nvidia-smi"):
        try:
            output = subprocess.check_output(["nvidia-smi","-L"], encoding="utf-8")
            if "GPU" in output:
                devices.append("NVIDIA GPU")
        except subprocess.CalledProcessError:
            pass
    
    # check for AMD GPU using rocinfo
    if shutil.which("rocminfo"):
        try:
            output = subprocess.check_output(["rocminfo"], encoding="utf-8",stderr = subprocess.DEVNULL)
            if "GPU" in output:
                devices.append("AMD GPU")
        except subprocess.CalledProcessError:pass

    # check for intel GPU using lspci
    if shutil.which("lspci"):
        try:
            output = subprocess.check_output(["lspci"], encoding="utf-8")
            if "VGA compatible controller: Intel" in output or "Intel Corporation" in output:
                devices.append("Intel GPU")
        except subprocess.CalledProcessError:
            pass
    
    # Check for Google TPU (Cloud TPU or Edge TPU)
    if os.path.exists("/dev/accel") or os.path.exists("/dev/apex_0"):
        devices.append("Google TPU")

    return devices if devices else ["CPU"]

class TestHardwareDiscovery(unittest.TestCase):

    @patch("shutil.which", return_value="/usr/bin/nvidia-smi")
    @patch("subprocess.check_output", return_value="GPU 0: NVIDIA RTX 3090")
    def test_nvidia_gpu_detection(self, mock_which, mock_output):
        """Fail if NVIDIA GPU is NOT detected"""
        result = discover_hardware()
        self.assertIn("NVIDIA GPU", result, "NVIDIA GPU was NOT detected but should be.")

    @patch("shutil.which", return_value="/usr/bin/rocminfo")
    @patch("subprocess.check_output", return_value="AMD GPU Found")
    def test_amd_gpu_detection(self, mock_which, mock_output):
        """Fail if AMD GPU is NOT detected"""
        result = discover_hardware()
        self.assertIn("AMD GPU", result, "AMD GPU was NOT detected but should be.")

    @patch("shutil.which", return_value="/usr/bin/lspci")
    @patch("subprocess.check_output", return_value="VGA compatible controller: Intel Corporation")
    def test_intel_gpu_detection(self, mock_which, mock_output):
        """Fail if Intel GPU is NOT detected"""
        result = discover_hardware()
        self.assertIn("Intel GPU", result, "Intel GPU was NOT detected but should be.")

    @patch("os.path.exists", return_value=True)
    def test_tpu_detection(self, mock_exists):
        """Fail if TPU is NOT detected"""
        result = discover_hardware()
        self.assertIn("Google TPU", result, "Google TPU was NOT detected but should be.")

    @patch("shutil.which", return_value=None)
    def test_cpu_fallback(self, mock_which):
        """Fail if CPU is NOT selected when no accelerators are found"""
        result = discover_hardware()
        self.assertEqual(result, ["CPU"], "CPU should be selected when no GPU/TPU is found.")

    @patch("shutil.which", return_value="/usr/bin/nvidia-smi")
    @patch("subprocess.check_output", return_value="")  # Mock empty output
    def test_nvidia_gpu_not_detected(self, mock_which, mock_output):
        """Fail if NVIDIA GPU is incorrectly detected when not available"""
        result = discover_hardware()
        self.assertNotIn("NVIDIA GPU", result, "NVIDIA GPU was detected incorrectly.")

    @patch("shutil.which", return_value="/usr/bin/rocminfo")
    @patch("subprocess.check_output", return_value="")  # Mock empty output
    def test_amd_gpu_not_detected(self, mock_which, mock_output):
        """Fail if AMD GPU is incorrectly detected when not available"""
        result = discover_hardware()
        self.assertNotIn("AMD GPU", result, "AMD GPU was detected incorrectly.")

    @patch("shutil.which", return_value="/usr/bin/lspci")
    @patch("subprocess.check_output", return_value="")  # Mock empty output
    def test_intel_gpu_not_detected(self, mock_which, mock_output):
        """Fail if Intel GPU is incorrectly detected when not available"""
        result = discover_hardware()
        self.assertNotIn("Intel GPU", result, "Intel GPU was detected incorrectly.")

if __name__=="__main__":
    unittest.main()