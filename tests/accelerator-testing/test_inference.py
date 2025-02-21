# make sure the pytorch is and tensorrt is installed correctly
import time
import numpy as np
try:
    import torch
    import torchvision.models as models
    from torchvision.models import ResNet50_Weights
    import tensorrt as trt
except ImportError as err:
    raise Exception(f"{err}")

import unittest
from unittest.mock import MagicMock, patch
import os

def load_pytorch_model():
    """Loads a Pytorch model from a given path"""
    # Toy example of ResNet50
    model = models.resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
    model.eval() # set that to inference mode
    return model

def load_trt_model(engine_path):
    """Loads a TensorRT engine"""
    TRT_LOGGER = trt.Logger(trt.Logger.WARNINGS)
    with open(engine_path,"rb") as f, trt.Runtime(TRT_LOGGER) as runtime:
        return runtime.deserialize_cuda_engine(f.read())

def infer_pytorch(model, input_tensor):
    """Performs PyTorch inference and measures latency"""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    input_tensor = input_tensor.to(device)

    with torch.no_grad():
        start_time = time.time()
        output = model(input_tensor)
        latency = (time.time()-start_time) * 1000 # convert to milliseconds
        # print(output)
    return output.cpu().numpy(), latency


def infer_trt(context, input_tensor):
    """Performs inference using TensorRT and measures latency"""
    start_time = time.time()
    input_tensor = input_tensor.numpy().astype(np.float32)
    output = np.empty_like(input_tensor)

    # Assuming input shape is fixed; needs an execution context
    context.execute_v2([input_tensor, output])

    latency = (time.time()-start_time) * 1000

    return output, latency

class TestLowLatencyInference(unittest.TestCase):
    # def setUp(self):
    #     self.model_path = "model_repo/FCN_ResNet50.pth" # get the model path
    #     # should we get the model path or all the paths (depends)
    #     assert os.path.exists(self.model_path)

    def test_pytorch_inference_latency(self,):
        """Fail if PyTorch inference takes too long"""

        # do it for one model
        model = load_pytorch_model()
        # add iteration
        iteration = 100
        total_latency = 0.0
        for i in range(iteration):
            input_tensor = torch.rand(1,3,224,224) # Simulate image tensor
            output, latency = infer_pytorch(model, input_tensor)
            total_latency += latency
        self.assertLess(total_latency/iteration, 10,"PyTorch inference took too long: {latency} ms")

    @patch("numpy.random.rand", return_value=np.zeros((1, 1000)))
    def test_trt_inference_latency(self, mock_output):
        """Fail if TensorRT inference takes too long"""
        mock_context = MagicMock()
        input_tensor = torch.rand(1,3,1024,1024) # Simulate input
        output, latency = infer_trt(mock_context, input_tensor)
        self.assertLess(latency, 20,f"TensorRT inference took too long: {latency}ms")

if __name__=="__main__":
    unittest.main()