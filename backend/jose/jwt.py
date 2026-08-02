import json
import base64

def encode(payload, key, algorithm="HS256"):
    # Mock jwt encode: just base64 encode the json payload
    json_str = json.dumps(payload, default=str)
    b64 = base64.b64encode(json_str.encode()).decode()
    return f"mock.{b64}.signature"

def decode(token, key, algorithms=None):
    # Mock jwt decode: just base64 decode the middle part
    parts = token.split('.')
    if len(parts) != 3:
        raise Exception("Invalid token")
    json_str = base64.b64decode(parts[1]).decode()
    return json.loads(json_str)
