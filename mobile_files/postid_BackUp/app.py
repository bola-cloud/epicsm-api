from flask import Flask, request, jsonify
from werkzeug.exceptions import HTTPException
from info_api import get_page_or_account_and_post
import os

app = Flask(__name__)

API_TOKEN = os.environ.get("API_TOKEN")

@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, HTTPException):
        return jsonify(ok=False, error=e.description), e.code
    return jsonify(ok=False, error=str(e)), 500

@app.route("/extract", methods=["GET", "POST"])
def extract():
    # ----- token check -----
    token = None
    if request.method == "GET":
        token = request.args.get("token")
    elif request.method == "POST":
        if request.is_json:
            data = request.get_json(silent=True) or {}
            token = data.get("token")
        else:
            token = request.form.get("token")

    if API_TOKEN and token != API_TOKEN:
        return jsonify(ok=False, error="unauthorized"), 401

    # ----- extract params -----
    url = None
    cookie = None
    only_owner = False

    if request.method == "GET":
        url = request.args.get("url")
        cookie = request.args.get("cookie")
        only_owner = request.args.get("only_owner", "0").lower() in ("1", "true", "yes")

    elif request.method == "POST":
        if request.is_json:
            data = request.get_json(silent=True) or {}
            url = data.get("url")
            cookie = data.get("cookie")
            only_owner = str(data.get("only_owner", "0")).lower() in ("1", "true", "yes")
        else:
            url = request.form.get("url")
            cookie = request.form.get("cookie")
            only_owner = request.form.get("only_owner", "0").lower() in ("1", "true", "yes")

    if not url:
        return jsonify(ok=False, error="missing 'url'"), 400

    try:
        result = get_page_or_account_and_post(url.strip(), cookies=cookie, only_owner=only_owner)
        # return jsonify(ok=True, id=result, final_url=url.strip(), only_owner=only_owner)
        id_value = result if only_owner else result.get("id")
        return jsonify(ok=True, id=id_value, final_url=url.strip(), only_owner=only_owner)

    except Exception as e:
        return jsonify(ok=False, error=str(e)), 400

@app.get("/health")
def health():
    return jsonify(ok=True, status="healthy")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
