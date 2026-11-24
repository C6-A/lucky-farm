(function () {
    "use strict";

    const $ = function (id) { return document.getElementById(id); };
    let place = WX.loadPlace();
    let data = null;
    let loading = false;

    function show(el, visible) {
        if (el) el.classList.toggle("hidden", !visible);
    }

    function setStatus(text) {
        $("wxStatus").textContent = text;
        show($("wxStatus"), true);
        show($("wxError"), false);
    }

    function showError(text) {
        $("wxErrorText").textContent = text;
        show($("wxStatus"), false);
        show($("wxError"), true);
    }

    function placeLabel() {
        return WX.labelsFor(place).full;
    }

    function renderCurrent() {
        const cur = data.current;
        const daily = data.daily;

        $("wxBig").innerHTML = WX.iconHTML(WX.groupOf(cur.weather_code, cur.is_day));
        $("curTemp").textContent = String(Math.round(cur.temperature_2m));
        $("curDesc").textContent = WX.describe(cur.weather_code);
        $("curPlace").textContent = placeLabel();

        $("feels").textContent = String(Math.round(cur.apparent_temperature));
        $("humidity").textContent = String(Math.round(cur.relative_humidity_2m));
        $("wind").textContent = String(Math.round(cur.wind_speed_10m));
        $("pop").textContent = String(Math.round(daily.precipitation_probability_max[0] || 0));
        $("todayTemp").textContent = Math.round(daily.temperature_2m_max[0])
            + "° / " + Math.round(daily.temperature_2m_min[0]) + "°";
        const rise = daily.sunrise[0];
        const set = daily.sunset[0];
        $("sun").textContent = (rise && set)
            ? "日出 " + rise.slice(11, 16) + " · 日落 " + set.slice(11, 16)
            : "极昼 / 极夜";

        $("updated").textContent = "更新于 " + new Date().toLocaleTimeString("zh-CN", {
            hour: "2-digit", minute: "2-digit"
        });
        show($("wxNow"), true);
    }

    function renderHourly() {
        const hourly = data.hourly;
        const nowKey = data.current.time.slice(0, 13);
        let start = hourly.time.findIndex(function (t) { return t.slice(0, 13) === nowKey; });
        if (start < 0) start = 0;

        const frag = document.createDocumentFragment();
        const end = Math.min(start + 24, hourly.time.length);
        for (let i = start; i < end; i += 1) {
            const label = i === start ? "现在" : hourly.time[i].slice(11, 13) + "时";
            const pop = hourly.precipitation_probability
                ? Math.round(hourly.precipitation_probability[i] || 0) : 0;
            const el = document.createElement("div");
            el.className = "hour";
            el.innerHTML =
                '<span class="hour-time">' + label + '</span>'
                + '<span class="hour-icon">'
                + WX.iconHTML(WX.groupOf(hourly.weather_code[i], hourly.is_day[i]))
                + '</span>'
                + '<b class="hour-temp">' + Math.round(hourly.temperature_2m[i]) + '°</b>'
                + '<span class="hour-pop" title="降水概率 ' + pop + '%">'
                + '<i style="width:' + Math.max(2, pop) + '%"></i></span>';
            frag.appendChild(el);
        }

        $("hours").innerHTML = "";
        $("hours").appendChild(frag);
        $("hourlyNote").textContent = "未来 24 小时 · 小条是降水概率";
    }

    function renderDaily() {
        const daily = data.daily;
        const mins = daily.temperature_2m_min.slice(0, 7);
        const maxs = daily.temperature_2m_max.slice(0, 7);
        const low = Math.min.apply(null, mins);
        const high = Math.max.apply(null, maxs);
        const span = Math.max(1, high - low);

        const frag = document.createDocumentFragment();
        for (let i = 0; i < 7; i += 1) {
            const day = new Date(daily.time[i] + "T12:00:00");
            const name = i === 0 ? "今天"
                : i === 1 ? "明天"
                : "周" + "日一二三四五六"[day.getDay()];
            const min = Math.round(mins[i]);
            const max = Math.round(maxs[i]);
            const left = ((mins[i] - low) / span) * 100;
            const width = Math.max(6, ((maxs[i] - mins[i]) / span) * 100);

            const el = document.createElement("div");
            el.className = "day";
            el.innerHTML =
                '<span class="day-name">' + name
                + '<br><small>' + daily.time[i].slice(5).replace("-", "/") + '</small></span>'
                + '<span class="day-icon">'
                + WX.iconHTML(WX.groupOf(daily.weather_code[i], 1))
                + '</span>'
                + '<span class="day-desc">' + WX.describe(daily.weather_code[i]) + '</span>'
                + '<span class="day-range"><i style="left:' + left + '%;width:' + width + '%"></i></span>'
                + '<span class="day-temp"><b>' + max + '°</b> / ' + min + '°</span>';
            frag.appendChild(el);
        }

        $("days").innerHTML = "";
        $("days").appendChild(frag);
        $("dailyNote").textContent = "未来 7 天 · 最高 / 最低";
    }

    async function load() {
        if (loading) return;
        loading = true;
        setStatus("正在获取 " + place.name + " 的天气…");
        $("placeName").textContent = placeLabel();

        try {
            if (!place.province && !place.city && !place.district) {
                place = await WX.refinePlace(place);
                WX.savePlace(place);
                $("placeName").textContent = placeLabel();
            }
            data = await WX.fetchWeather(place.lat, place.lon);
            renderCurrent();
            renderHourly();
            renderDaily();
            show($("wxStatus"), false);
            show($("wxError"), false);
            show($("hourlySection"), true);
            show($("dailySection"), true);
        } catch (err) {
            showError("天气获取失败（" + err.message + "），请检查网络后重试。");
        } finally {
            loading = false;
        }
    }

    async function choosePlace(next) {
        place = next;
        $("placeName").textContent = placeLabel();
        $("cityInput").value = next.name === "网络定位" ? "" : next.name;
        show($("results"), false);

        if (next.source === "local") {
            WX.savePlace(place);
            load();
            return;
        }

        setStatus("正在获取地址和天气…");
        place = await WX.refinePlace(place);
        WX.savePlace(place);
        $("placeName").textContent = placeLabel();
        if (place.name && place.name !== "当前位置" && place.name !== "网络定位") {
            $("cityInput").value = place.name;
        }
        load();
    }

    function renderResults(hits) {
        const results = $("results");
        results.innerHTML = "";
        if (hits.length > 1) {
            const tip = document.createElement("p");
            tip.className = "result-tip";
            tip.textContent = "找到多个地点，请按“省 · 市 · 区”选择：";
            results.appendChild(tip);
        }
        hits.forEach(function (hit) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "result-item";
            const label = hit.label || WX.labelsFor({
                province: hit.province,
                city: hit.city,
                district: hit.district,
                name: hit.name
            }).full;
            btn.textContent = label;
            btn.addEventListener("click", function () { choosePlace(hit); });
            results.appendChild(btn);
        });
        show(results, true);
    }

    $("searchForm").addEventListener("submit", async function (event) {
        event.preventDefault();
        const query = $("cityInput").value.trim();
        if (!query) return;
        $("results").innerHTML = "";
        show($("results"), false);
        show($("locNote"), false);
        setStatus("正在搜索“" + query + "”…");
        try {
            const hits = await WX.geocode(query);
            if (!hits.length) {
                showError("没有找到这个地点，可以试试“广东-深圳-宝安”或“渝北区”这种写法。");
                return;
            }
            show($("wxStatus"), false);
            renderResults(hits);
        } catch (err) {
            showError("地址搜索失败（" + err.message + "），请稍后重试。");
        }
    });

    async function useIpLocation(reason) {
        setStatus("正在按网络位置定位…");
        try {
            const ipPlace = await WX.ipLocate();
            $("locNote").textContent = reason + "，已按网络位置显示，可能不够精确；也可以直接输入“省-市-区”。";
            show($("locNote"), true);
            choosePlace(ipPlace);
        } catch (err) {
            showError(reason + "。可以手动输入“省-市-区”搜索，例如“广东-深圳-宝安”。");
        }
    }

    async function locate() {
        show($("locNote"), false);
        if (!navigator.geolocation) {
            await useIpLocation("这个浏览器不支持定位");
            return;
        }
        if (!window.isSecureContext) {
            await useIpLocation("当前是 HTTP 页面，浏览器禁止定位");
            return;
        }
        setStatus("正在定位…");
        navigator.geolocation.getCurrentPosition(
            function (position) {
                choosePlace({
                    name: "当前位置",
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            function () {
                useIpLocation("浏览器定位失败或未授权");
            },
            { timeout: 8000, maximumAge: 60000 }
        );
    }

    $("locateBtn").addEventListener("click", locate);
    $("locateRetryBtn").addEventListener("click", locate);
    $("retryBtn").addEventListener("click", load);

    $("placeName").textContent = placeLabel();
    $("cityInput").value = (place.name === "当前位置" || place.name === "网络定位")
        ? "" : place.name;
    load();
})();
