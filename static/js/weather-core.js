(function () {
    "use strict";

    const ICONS = window.__WX_ICONS__ || {};
    const DEFAULT_PLACE = { name: "上海", lat: 31.2304, lon: 121.4737, admin1: "" };
    const PLACE_KEY = "lucky-farm-weather-place";

    const DESCR = {
        0: "晴", 1: "大致晴朗", 2: "局部多云", 3: "阴",
        45: "雾", 48: "雾凇",
        51: "小毛毛雨", 53: "毛毛雨", 55: "大毛毛雨",
        56: "冻毛毛雨", 57: "强冻毛毛雨",
        61: "小雨", 63: "中雨", 65: "大雨",
        66: "冻雨", 67: "强冻雨",
        71: "小雪", 73: "中雪", 75: "大雪", 77: "米雪",
        80: "小阵雨", 81: "阵雨", 82: "强阵雨",
        85: "小阵雪", 86: "阵雪",
        95: "雷阵雨", 96: "雷暴伴冰雹", 99: "强雷暴伴冰雹"
    };

    function groupOf(code, isDay) {
        const day = isDay !== 0 && isDay !== false;
        if (code === 0 || code === 1) return day ? "clear" : "night";
        if (code === 2) return day ? "partly" : "night-partly";
        if (code === 3) return "cloudy";
        if (code === 45 || code === 48) return "fog";
        if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].indexOf(code) >= 0) return "rain";
        if ([71, 73, 75, 77, 85, 86].indexOf(code) >= 0) return "snow";
        if ([95, 96, 99].indexOf(code) >= 0) return "thunder";
        return "cloudy";
    }

    function describe(code) {
        return DESCR[code] || "未知天气";
    }

    function iconHTML(group) {
        return ICONS[group] || ICONS.cloudy || "";
    }

    function adminBase(value) {
        return (value || "").trim().replace(/[省市区县镇乡]+$/g, "");
    }

    function sameAdmin(a, b) {
        const x = adminBase(a);
        const y = adminBase(b);
        return !!x && x === y;
    }

    function uniqueAdmins(values) {
        const out = [];
        values.forEach(function (value) {
            const v = (value || "").trim();
            if (!v) return;
            for (let i = 0; i < out.length; i += 1) {
                if (sameAdmin(out[i], v)) return;
            }
            out.push(v);
        });
        return out;
    }

    function labelsFor(place) {
        let parts = uniqueAdmins([place.province, place.city, place.district, place.street]);
        if (!parts.length) {
            parts = uniqueAdmins([place.admin1, place.name]);
        }
        const fallback = (place.name || parts[parts.length - 1] || "").trim();
        const shortParts = parts.slice(-2);
        return {
            full: parts.join(" · ") || fallback,
            short: shortParts.join(" · ") || fallback
        };
    }

    function loadPlace() {
        try {
            const raw = localStorage.getItem(PLACE_KEY);
            if (raw) {
                const place = JSON.parse(raw);
                if (place && typeof place.lat === "number" && typeof place.lon === "number") {
                    return place;
                }
            }
        } catch (err) { /* 忽略损坏的缓存 */ }
        return DEFAULT_PLACE;
    }

    function savePlace(place) {
        try {
            localStorage.setItem(PLACE_KEY, JSON.stringify(place));
        } catch (err) { /* 隐私模式可能不可写 */ }
    }

    async function fetchWeather(lat, lon) {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat
            + "&longitude=" + lon
            + "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m"
            + "&hourly=temperature_2m,weather_code,precipitation_probability,is_day"
            + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset"
            + "&timezone=auto&forecast_days=8";
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
    }

    async function reverseGeocode(lat, lon) {
        const url = "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude="
            + lat + "&longitude=" + lon + "&localityLanguage=zh-Hans";
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();

        const admin = (data.localityInfo && data.localityInfo.administrative) || [];
        let street = "";
        if (admin.length) {
            const last = admin[admin.length - 1] || {};
            const name = (last.name || "").trim();
            if (name && !sameAdmin(name, data.locality)) street = name;
        }

        return {
            province: (data.principalSubdivision || "").trim(),
            city: (data.city || "").trim(),
            district: (data.locality || "").trim(),
            street: street
        };
    }

    async function refinePlace(place) {
        if (place.province && place.city && place.district) return place;

        // 搜索“渝北”这类区县时，保留用户搜索的区县名，
        // 避免反查结果只给出“两江新区”这类功能区，看起来像换了个地方。
        const hint = (place.name || "").trim();
        const hintIsDistrict = !!hint && !!place.admin2
            && adminBase(hint) !== adminBase(place.admin2)
            && adminBase(hint) !== adminBase(place.admin1);

        try {
            const addr = await reverseGeocode(place.lat, place.lon);
            if (addr.province || addr.city || addr.district) {
                place.province = addr.province;
                place.city = addr.city;
                place.district = addr.district;
                place.street = addr.street;
                if (addr.district) place.name = addr.district;

                if (hintIsDistrict && addr.district && !sameAdmin(hint, addr.district)) {
                    place.district = hint;
                    place.name = hint;
                    if (sameAdmin(addr.city, addr.district)) place.city = "";
                }
            }
        } catch (err) { /* 反查失败时保留搜索结果的层级 */ }
        return place;
    }

    async function geocode(name) {
        const response = await fetch("/api/geo?q=" + encodeURIComponent(name));
        if (!response.ok) throw new Error("HTTP " + response.status);
        const data = await response.json();
        return data.results || [];
    }

    async function ipLocate() {
        const providers = [
            {
                url: "https://ipwho.is/",
                read: function (data) {
                    return typeof data.latitude === "number" && typeof data.longitude === "number"
                        ? { lat: data.latitude, lon: data.longitude } : null;
                }
            },
            {
                url: "https://freeipapi.com/api/json",
                read: function (data) {
                    return typeof data.latitude === "number" && typeof data.longitude === "number"
                        ? { lat: data.latitude, lon: data.longitude } : null;
                }
            },
            {
                url: "https://ipinfo.io/json",
                read: function (data) {
                    const parts = (data.loc || "").split(",");
                    const lat = Number(parts[0]);
                    const lon = Number(parts[1]);
                    return Number.isFinite(lat) && Number.isFinite(lon)
                        ? { lat: lat, lon: lon } : null;
                }
            }
        ];

        for (let i = 0; i < providers.length; i += 1) {
            try {
                const response = await fetch(providers[i].url, { cache: "no-store" });
                if (!response.ok) continue;
                const data = await response.json();
                const location = providers[i].read(data);
                if (location) {
                    return {
                        name: "网络定位",
                        lat: location.lat,
                        lon: location.lon,
                        source: "ip"
                    };
                }
            } catch (err) { /* 换下一个服务 */ }
        }
        throw new Error("无法获取网络位置");
    }

    function tickClock() {
        const now = new Date();
        const pad = function (n) { return (n < 10 ? "0" : "") + n; };
        const time = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
        const week = "日一二三四五六"[now.getDay()];
        const date = now.getFullYear() + "年" + (now.getMonth() + 1) + "月"
            + now.getDate() + "日 周" + week;

        const clock = document.getElementById("clock");
        if (clock) clock.textContent = time;
        const dateEl = document.getElementById("date");
        if (dateEl) dateEl.textContent = date;
        const homeClock = document.getElementById("homeClock");
        if (homeClock) homeClock.textContent = time;
        const homeDate = document.getElementById("homeDate");
        if (homeDate) homeDate.textContent = date;
    }

    tickClock();
    setInterval(tickClock, 1000);

    window.WX = {
        groupOf: groupOf,
        describe: describe,
        iconHTML: iconHTML,
        labelsFor: labelsFor,
        loadPlace: loadPlace,
        savePlace: savePlace,
        fetchWeather: fetchWeather,
        geocode: geocode,
        ipLocate: ipLocate,
        refinePlace: refinePlace
    };
})();
