# -*- coding: utf-8 -*-
"""幸运小站：一个用 Flask 写的像素风小游戏合集。

页面：
    /         主页
    /dice     幸运抽奖
    /guess    猜数字
    /weather  天气（实时 + 24 小时 + 7 天）
    /pong     乒乓球
    /snake    贪吃蛇

运行：python app.py
"""

import random

from flask import Flask, jsonify, redirect, render_template, request, session

from area_search import find_places
from sprites import SPR, WX_ICONS

app = Flask(__name__)
# 本地练习用的密钥；正式部署请换成随机字符串，并从环境变量读取
app.secret_key = "dev-secret-change-me"

LOW, HIGH = 1, 100

NAV = [
    ("/", "主页", "home"),
    ("/dice", "抽奖", "dice"),
    ("/guess", "猜数字", "guess"),
    ("/weather", "天气", "weather"),
    ("/pong", "乒乓球", "pong"),
    ("/snake", "贪吃蛇", "snake"),
]


@app.context_processor
def inject_layout():
    """所有模板都能直接使用导航和像素图标。"""
    return {"nav": NAV, "sprites": SPR, "wx_icons": WX_ICONS}


@app.route("/")
def home():
    return render_template(
        "home.html",
        title="首页",
        active="home",
        draws=session.get("dice_times", 0),
        best=session.get("best"),
    )


@app.route("/dice")
def dice():
    number = random.randint(LOW, HIGH)

    times = session.get("dice_times", 0) + 1
    session["dice_times"] = times

    previous = session.get("dice_history", [])[:3]
    session["dice_history"] = ([number] + previous)[:4]

    return render_template(
        "dice.html",
        title="幸运抽奖",
        active="dice",
        number=number,
        times=times,
        previous=previous,
        low=LOW,
        high=HIGH,
    )


def start_guess_game():
    """在 session 里开一局新游戏。"""
    session["target"] = random.randint(LOW, HIGH)
    session["count"] = 0
    session["low"] = LOW
    session["high"] = HIGH


@app.route("/guess", methods=["GET", "POST"])
def guess():
    if "target" not in session:
        start_guess_game()

    # 兼容旧版本留下的 session
    session.setdefault("count", 0)
    session.setdefault("low", LOW)
    session.setdefault("high", HIGH)

    target = session["target"]
    message = None
    won = False

    if request.method == "POST":
        raw = (request.form.get("num") or "").strip()
        try:
            number = int(raw)
        except ValueError:
            message = {"kind": "info", "text": "先输入一个数字，再点“确认猜”。"}
        else:
            if not LOW <= number <= HIGH:
                message = {
                    "kind": "info",
                    "text": f"请输入 {LOW} 到 {HIGH} 之间的数字。",
                }
            else:
                session["count"] += 1

                if number > target:
                    session["high"] = min(session["high"], number - 1)
                    message = {
                        "kind": "bad",
                        "text": f"你猜了 {number}，大了！",
                        "tip": "往小一点的方向再试试。",
                    }
                elif number < target:
                    session["low"] = max(session["low"], number + 1)
                    message = {
                        "kind": "bad",
                        "text": f"你猜了 {number}，小了！",
                        "tip": "往大一点的方向再试试。",
                    }
                else:
                    won = True
                    best = session.get("best")
                    session["best"] = (
                        session["count"] if best is None
                        else min(best, session["count"])
                    )
                    session.pop("target", None)

    count = session.get("count", 0)
    low = session.get("low", LOW)
    high = session.get("high", HIGH)

    return render_template(
        "guess.html",
        title="猜数字",
        active="guess",
        message=message,
        won=won,
        target=target,
        count=count,
        low=low,
        high=high,
        span=max(high - low + 1, 0),
        low_limit=LOW,
        high_limit=HIGH,
    )


@app.route("/guess/reset")
def guess_reset():
    for key in ("target", "count", "low", "high"):
        session.pop(key, None)
    return redirect("/guess")


@app.route("/weather")
def weather():
    return render_template("weather.html", title="天气", active="weather")


@app.route("/api/geo")
def api_geo():
    """地址搜索接口：返回省、市、区、坐标和完整名称。"""
    query = (request.args.get("q") or "").strip()[:60]
    if not query:
        return jsonify({"results": []})
    return jsonify({"results": find_places(query)})


@app.route("/pong")
def pong():
    return render_template("pong.html", title="乒乓球", active="pong")


@app.route("/snake")
def snake():
    return render_template("snake.html", title="贪吃蛇", active="snake")


@app.errorhandler(404)
def not_found(_error):
    return render_template("404.html", title="页面走丢了"), 404


if __name__ == "__main__":
    app.run(debug=True)
