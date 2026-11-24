# -*- coding: utf-8 -*-
"""像素图标：用字符画生成 SVG，供页面和天气图标使用。"""

PIXEL_COLORS = {
    "k": "#3d2717",  # 描边深棕
    "w": "#fff6da",  # 奶油白
    "W": "#ffffff",  # 纯白
    "y": "#ffd45e",  # 阳光黄
    "o": "#f2a03d",  # 橙色
    "r": "#d9534f",  # 苹果红
    "R": "#a83a37",  # 深红
    "g": "#6fbf4a",  # 草绿
    "G": "#3f7a2e",  # 深绿
    "l": "#9ada66",  # 浅绿
    "b": "#4f8fd6",  # 蓝色
    "B": "#2f5f9e",  # 深蓝
    "t": "#c08a52",  # 木色
    "T": "#7a4a22",  # 深木色
    "s": "#8ed6ff",  # 天空蓝
}


def px(rows, scale=4, label=""):
    """把字符画转成 inline SVG，同一行连续同色像素会合并成一个矩形。"""
    width = len(rows[0])
    if any(len(row) != width for row in rows):
        raise ValueError("像素图每一行的长度必须一致")

    parts = [
        f'<svg class="px" viewBox="0 0 {width * scale} {len(rows) * scale}" '
        f'shape-rendering="crispEdges" role="img" aria-label="{label}" '
        'xmlns="http://www.w3.org/2000/svg">'
    ]
    for y, row in enumerate(rows):
        x = 0
        while x < width:
            char = row[x]
            if char == ".":
                x += 1
                continue
            run = 1
            while x + run < width and row[x + run] == char:
                run += 1
            parts.append(
                f'<rect x="{x * scale}" y="{y * scale}" '
                f'width="{run * scale}" height="{scale}" '
                f'fill="{PIXEL_COLORS[char]}"/>'
            )
            x += run
    parts.append("</svg>")
    return "".join(parts)


SPR = {
    "dice": px([
        "..kkkkkkkkkk..",
        ".kwwwwwwwwwwk.",
        ".kwwwwwwwwwwk.",
        ".kwwkkwwkkwwk.",
        ".kwwkkwwkkwwk.",
        ".kwwwwwwwwwwk.",
        ".kwwwwkkwwwwk.",
        ".kwwwwkkwwwwk.",
        ".kwwwwwwwwwwk.",
        ".kwwkkwwkkwwk.",
        ".kwwkkwwkkwwk.",
        ".kwwwwwwwwwwk.",
        ".kwwwwwwwwwwk.",
        "..kkkkkkkkkk..",
    ], label="骰子"),
    "quiz": px([
        "..kkkkkkkkkk..",
        ".kGGGGGGGGGGk.",
        ".kGGGwwwwGGGk.",
        ".kGGwwGGwwGGk.",
        ".kGGwwGGwwGGk.",
        ".kGGGGGGwwGGk.",
        ".kGGGGGwwGGGk.",
        ".kGGGGwwGGGGk.",
        ".kGGGGwwGGGGk.",
        ".kGGGGGGGGGGk.",
        ".kGGGGwwGGGGk.",
        ".kGGGGwwGGGGk.",
        ".kGGGGGGGGGGk.",
        "..kkkkkkkkkk..",
    ], label="问号"),
    "pong": px([
        "..................",
        ".kkk..........kkk.",
        ".kwk..........kok.",
        ".kwk..........kok.",
        ".kwk..........kok.",
        ".kwk....kk....kok.",
        ".kwk...kWwk...kok.",
        ".kwk....kk....kok.",
        ".kwk..........kok.",
        ".kwk..........kok.",
        ".kkk..........kkk.",
        "..................",
    ], label="乒乓球"),
    "snake": px([
        "..................",
        "..............kk..",
        ".............krrk.",
        ".............krWk.",
        "..............kk..",
        "....kkkk..........",
        "...kggggk.........",
        "..kggkkggk........",
        "..kgk..kggkkk.....",
        "..kgk...kggggkk...",
        "...kk....kkkkkk...",
        "..................",
    ], label="贪吃蛇"),
    "tree": px([
        "....kkkk....",
        "..kkGGGGkk..",
        ".kGGGlGGGGk.",
        ".kGGGGGGGGk.",
        "kGGlGGGGGGGk",
        "kGGGGGGGGGGk",
        ".kGGGGGGGGk.",
        "..kkGGGGkk..",
        "....kTTk....",
        "....kTTk....",
        "...kkTTkk...",
    ], label="树"),
    "sun": px([
        "....kkkk....",
        "....kyyk....",
        "..kkyyyykk..",
        "..kyyWWyyk..",
        "kkyyWWWWyykk",
        "kkyyWWWWyykk",
        "..kyyWWyyk..",
        "..kkyyyykk..",
        "....kyyk....",
        "....kkkk....",
    ], label="太阳"),
    "cloud": px([
        "....WWWWW.......",
        "..WWWWWWWWW.....",
        ".WWWWWWWWWWWW...",
        "WWWWWWWWWWWWWWW.",
        ".WWWWWWWWWWWWW..",
        "..WWWWWWWWWWW...",
    ], label="云"),
    "star": px([
        "..k..",
        ".kyk.",
        "kyyyk",
        ".kyk.",
        "..k..",
    ], label="星星"),
    "trophy": px([
        "..kkkkkkkkkk..",
        ".kyyyyyyyyyyk.",
        ".kyyyyyyyyyyk.",
        ".kykkkkkkkkyk.",
        "..kyyyyyyyyk..",
        "...kyyyyyyk...",
        "....kyyyyk....",
        ".....kyyk.....",
        ".....kyyk.....",
        "....kkyykk....",
        "...kkkkkkkk...",
        "..kkkkkkkkkk..",
    ], label="奖杯"),
    "moon": px([
        "....kkkk....",
        "..kkyyyykk..",
        ".kyyyyyykk..",
        ".kyyyykk....",
        "kyyyyk......",
        "kyyyyk......",
        "kyyyyk......",
        ".kyyyykk....",
        ".kyyyyyykk..",
        "..kkyyyykk..",
        "....kkkk....",
        "............",
    ], label="月亮"),
    "w_cloud": px([
        "..............",
        "....kkkkkk....",
        "..kkWWWWWWkk..",
        ".kWWWWWWWWWWk.",
        "kWWWWWWWWWWWWk",
        "kWWWWWWWWWWWWk",
        ".kkkkkkkkkkkk.",
        "..............",
    ], label="云朵"),
    "bolt": px([
        "...kyy..",
        "..kyy...",
        "..kyyy..",
        ".kyyyk..",
        ".kyyk...",
        "kyyk....",
        "kyk.....",
        "kk......",
    ], label="闪电"),
}

# 天气图标：用上面的像素图组合出不同的天气，交给 JS 动态插入页面
WX_ICONS = {
    "clear": f'<span class="wx wxc">{SPR["sun"]}</span>',
    "night": f'<span class="wx wxn">{SPR["moon"]}<span class="wxstar">{SPR["star"]}</span></span>',
    "partly": f'<span class="wx wxp">{SPR["sun"]}<span class="wxcld">{SPR["w_cloud"]}</span></span>',
    "night-partly": f'<span class="wx wxp">{SPR["moon"]}<span class="wxcld">{SPR["w_cloud"]}</span></span>',
    "cloudy": f'<span class="wx wxcloud">{SPR["w_cloud"]}</span>',
    "rain": f'<span class="wx wxrain">{SPR["w_cloud"]}<i></i><i></i><i></i></span>',
    "thunder": f'<span class="wx wxthunder">{SPR["w_cloud"]}{SPR["bolt"]}</span>',
    "snow": f'<span class="wx wxsnow">{SPR["w_cloud"]}<i></i><i></i><i></i></span>',
    "fog": '<span class="wx wxfog"><i></i><i></i><i></i></span>',
}
