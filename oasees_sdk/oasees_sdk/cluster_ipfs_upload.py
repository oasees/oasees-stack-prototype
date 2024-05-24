import os
import requests
import json
from requests_toolbelt.multipart.encoder import MultipartEncoder

def assets_to_ipfs(api_url, directory_path):
    m = MultipartEncoder(
        fields={os.path.basename(file_path): (os.path.basename(file_path), open(file_path, "rb"), 'text/plain')
                for file_path in [os.path.join(directory_path, f) for f in os.listdir(directory_path) if os.path.isfile(os.path.join(directory_path, f))]}
    )

    headers = {'Content-Type': m.content_type}
    response = requests.post(f"{api_url}/api/v0/add?wrap-with-directory=true", headers=headers, data=m, stream=True)
    response.raise_for_status()

    result=""
    for line in response.iter_lines():
        if line:
            decoded_line = line.decode('utf-8')
            j=json.loads(decoded_line)
            if(j["Name"]==''):
                result= j["Hash"]

    return result
