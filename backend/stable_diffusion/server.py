from datetime import datetime
from flask import Flask, request, jsonify
from stable_diffusion import generate_image
from threading import Thread, Lock

app = Flask(__name__)
port = 8081
lock = Lock()

@app.route("/", methods=["POST"])
def process():
    data = request.json
    print("data", data)
    prompt = data['prompt'] 
    n_iterations = data['n_iterations']
    source_width = data['source_width']
    source_height = data['source_height']
    with lock:
        results = generate_image(prompt, 1, n_iterations, source_height, source_width)
    return jsonify(results)

if __name__ == '__main__':
    print(f"Running stable diffusion at port {port}")
    app.run(host="0.0.0.0", port=port)
