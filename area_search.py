# -*- coding: utf-8 -*-
"""中文地址搜索：在本地省市区坐标表里查找区县，必要时退回在线地理编码。"""

import gzip
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parent / "data" / "areas.json.gz"

# 去掉这些后缀后，“广东省 / 深圳市 / 宝安区”就能和“广东 / 深圳 / 宝安”匹配
SUFFIXES = (
    "特别行政区", "自治区", "自治州", "自治县", "地区", "林区", "矿区",
    "省", "市", "区", "县", "旗",
)
# 少数民族自治区常见写法，例如“广西壮族自治区”也可以直接用“广西”搜到
ETHNIC_WORDS = (
    "维吾尔", "壮族", "回族", "藏族", "蒙古族", "朝鲜族", "土家族",
    "苗族", "侗族", "白族", "傣族", "彝族", "哈尼族",
)


def area_base(name):
    """去掉行政级别后缀：宝安区 -> 宝安，深圳市 -> 深圳。"""
    name = (name or "").strip()
    for suffix in SUFFIXES:
        if name.endswith(suffix):
            return name[: -len(suffix)]
    return name


def area_aliases(name):
    """生成可匹配的别名，例如“广西壮族自治区”同时支持“广西”。"""
    base = area_base(name)
    values = {base}
    for word in ETHNIC_WORDS:
        base = base.replace(word, "")
    values.add(base)
    return {value for value in values if value}


def load_records():
    """读取 data/areas.json.gz：每行是 [名称, 省, 市, 级别, 经度, 纬度]。"""
    try:
        with gzip.open(DATA_FILE, "rt", encoding="utf-8") as fh:
            records = json.load(fh)
        return records if isinstance(records, list) else []
    except (OSError, ValueError):
        return []


RECORDS = load_records()

INDEX = {}
for _index, _record in enumerate(RECORDS):
    for _alias in area_aliases(_record[0]):
        INDEX.setdefault(_alias, []).append(_index)


def area_label(province, city, district):
    """拼成“广东省 · 深圳市 · 宝安区”，自动去掉重复的直辖市层级。"""
    parts = []
    for value in (province, city, district):
        if value and all(area_base(value) != area_base(item) for item in parts):
            parts.append(value)
    return " · ".join(parts)


def split_query(query):
    """把“广东-深圳-宝安”“重庆市渝北区”拆成多个关键词。"""
    query = re.sub(r"[\s\-—–_/,，、·]+", " ", (query or "").strip())
    tokens = []
    for part in query.split():
        buffer = ""
        for char in part:
            buffer += char
            if char in "省市区县旗":
                tokens.append(buffer)
                buffer = ""
        if buffer:
            tokens.append(buffer)
    return [token for token in tokens if token]


def matches(record, token):
    """一条区划记录是否匹配某个关键词。"""
    target = area_base(token)
    if not target:
        return False
    for value in (record[0], record[1], record[2]):
        if not value:
            continue
        for alias in area_aliases(value):
            if target == alias or target in alias or alias in target:
                return True
    return False


def search_areas(query):
    """在本地区划表中搜索，返回最多 8 条结果。"""
    tokens = split_query(query)
    if not tokens or not RECORDS:
        return []

    bases = [area_base(token) for token in tokens]
    candidates = []

    # 从最后一个关键词开始找（通常最具体），再用其他关键词过滤
    for index in range(len(tokens) - 1, -1, -1):
        found = INDEX.get(bases[index], [])
        if not found:
            continue
        if len(tokens) == 1:
            if tokens[index].endswith(("区", "县")):
                district_only = [i for i in found if RECORDS[i][3] == "district"]
                if district_only:
                    found = district_only
            candidates = found
            break
        filtered = [
            i for i in found
            if all(matches(RECORDS[i], bases[j])
                   for j in range(len(tokens)) if j != index)
        ]
        if filtered:
            candidates = filtered
            break
        if not candidates:
            candidates = found

    # 兼容“广东深圳宝安”这种没有分隔符的写法
    if not candidates:
        compact = re.sub(r"[\s\-—–_/,，、·]+", "", query)
        for size in (4, 3, 2):
            if len(compact) <= size:
                continue
            suffix = compact[-size:]
            found = INDEX.get(suffix, [])
            if not found:
                continue
            prefix = compact[:-size]
            filtered = []
            for i in found:
                record = RECORDS[i]
                if any(
                    value and (area_base(value) in prefix or prefix in area_base(value))
                    for value in (record[1], record[2])
                ):
                    filtered.append(i)
            if filtered:
                candidates = filtered
                break

    results = []
    seen = set()
    for i in candidates:
        name, province, city, level, longitude, latitude = RECORDS[i]
        district = name if level == "district" else ""
        label = area_label(province, city, district) or name
        key = (label, round(latitude, 3), round(longitude, 3))
        if key in seen:
            continue
        seen.add(key)
        results.append({
            "name": district or city or province or name,
            "province": province,
            "city": city,
            "district": district,
            "lat": latitude,
            "lon": longitude,
            "label": label,
            "source": "local",
        })
    return results[:8]


def geocode_online(query):
    """本地表没有时退回 Open-Meteo，主要用于国外城市。"""
    url = (
        "https://geocoding-api.open-meteo.com/v1/search?name="
        + urllib.parse.quote(query)
        + "&count=8&language=zh&format=json"
    )
    request_obj = urllib.request.Request(
        url, headers={"User-Agent": "LuckyFarmWeather/1.0"}
    )
    try:
        with urllib.request.urlopen(request_obj, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
    except Exception:
        return []

    results = []
    for item in data.get("results", []) or []:
        name = item.get("name", "") or ""
        province = item.get("admin1", "") or ""
        city = item.get("admin2", "") or ""
        district = "" if area_base(name) in (area_base(province), area_base(city)) else name
        latitude = item.get("latitude")
        longitude = item.get("longitude")
        if latitude is None or longitude is None:
            continue
        results.append({
            "name": district or city or name,
            "province": province,
            "city": city,
            "district": district,
            "lat": latitude,
            "lon": longitude,
            "label": area_label(province, city, district) or name,
            "source": "online",
        })
    return results


def find_places(query):
    """先查本地，再查在线。"""
    places = search_areas(query)
    return places or geocode_online(query)
