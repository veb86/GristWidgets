from flask import Flask

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello from PORTABLE Flask 🚀"

if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=3333,
        debug=True
    )
