from datetime import datetime
from flask import Flask, request, jsonify
from get_painting import PaintingPicker
app = Flask(__name__)
port = 8082

@app.route("/", methods=["POST"])
def process():
    data = request.json

    p = PaintingPicker()
    results = p.get_painting()
    return jsonify(results)
if __name__ == '__main__':
    print(f"Running wikipedia fetch at port {port}")
    app.run(host="0.0.0.0", port=port)