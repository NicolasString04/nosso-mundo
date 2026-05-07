from flask import Flask, render_template

app = Flask(__name__, template_folder="pages")

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/home")
def home():
    return render_template("home.html")

@app.route("/album")
def album():
    return render_template("album.html")

@app.route("/config")
def config():
    return render_template("config.html")

if __name__ == "__main__":
    app.run(debug=True)