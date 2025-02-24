# make sure the pytorch is and tensorrt is installed correctly
import time
import numpy as np
try:
    import torch
    import torchaudio
    import torchvision.models as models
    from torchvision.models import ResNet50_Weights
    import tensorrt as trt
except ImportError as err:
    raise Exception(f"{err}")
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification

import unittest
from unittest.mock import MagicMock, patch
import os

def load_pytorch_model():
    """Loads a Pytorch model from a given path"""
    # Toy example of ResNet50
    model = models.resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
    model.eval() # set that to inference mode
    return model

def load_torchaudio_model():
    """Loads a pretrained Wav2vec2 model from TorchAudio"""
    model = torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H.get_model()
    model.eval()
    return model

def load_trt_model(engine_path):
    """Loads a TensorRT engine"""
    TRT_LOGGER = trt.Logger(trt.Logger.WARNINGS)
    with open(engine_path,"rb") as f, trt.Runtime(TRT_LOGGER) as runtime:
        return runtime.deserialize_cuda_engine(f.read())

def load_sklearn_model():
    """Creates and trains a simple RandomForestClassifier"""
    X,y = make_classification(n_samples=1000, n_features=20, random_state=104)
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    model.fit(X,y)
    return model

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
    return output, latency

def infer_torchaudio(model, waveform):
    """Performs inference using Wav2Vec2 and measures latency"""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)

    waveform = waveform.to(device)
    with torch.no_grad():
        start_time = time.time()
        output = model(waveform)
        latency = (time.time()-start_time) * 1000
    return output, latency

def infer_sklearn(model, X_test):
    """Performs inference using a Scikit-learn model and measures latency"""
    start_time = time.time()
    output = model.predict(X_test)
    latency = time.time()-start_time

    return output, latency
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

    def setUp(self):
        self.iteration = 10
    def test_pytorch_inference_latency(self,):
        """Fail if PyTorch inference takes too long"""

        # do it for one model
        model = load_pytorch_model()
        # add iteration
        # iteration = 100
        total_latency = 0.0
        for i in range(self.iteration):
            input_tensor = torch.rand(1,3,224,224) # Simulate image tensor
            output, latency = infer_pytorch(model, input_tensor)
            total_latency += latency
        self.assertLess(total_latency/self.iteration, 10,"PyTorch inference took too long: {latency} ms")

    @patch("numpy.random.rand", return_value=np.zeros((1, 1000)))
    def test_trt_inference_latency(self, mock_output):
        """Fail if TensorRT inference takes too long"""
        mock_context = MagicMock()
        input_tensor = torch.rand(1,3,1024,1024) # Simulate input
        output, latency = infer_trt(mock_context, input_tensor)
        self.assertLess(latency, 20,f"TensorRT inference took too long: {latency}ms")

    # def test_sklearn_inference_test(self,):
    #     """Fails if Scikit-Learn inference takes too long"""
    #     # iteration = 10
    #     model = load_sklearn_model()
    #     total_latency = 0.0
    #     for i in range(self.iteration):
    #         X_test = make_classification(n_samples=1, n_features=20)
    #         output, latency = infer_sklearn(model, X_test)
    #         total_latency += latency
    #     self.assertLess(total_latency/self.iteration, 10)

    def test_torchaudio_inference_latency(self,):
        """Fails if the torch audio inference takes too long"""
        model = load_torchaudio_model()
        sample_rate = 16000
        total_latency = 0.0
        for i in range(self.iteration):
            device = "cuda" if torch.cuda.is_available() else "cpu"
            model.to(device)
            waveform = torch.rand(1, sample_rate).to(device)
            _, latency = infer_torchaudio(model, waveform)
            total_latency += latency
        self.assertLess(total_latency/self.iteration, 100, f"Torchaudio inference took too long : {total_latency/self.iteration}ms")

    
if __name__=="__main__":
    unittest.main()