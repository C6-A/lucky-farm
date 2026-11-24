(function () {
    "use strict";

    const card = document.getElementById("homeWeather");
    if (!card) return;

    const iconEl = document.getElementById("homeWxIcon");
    const tempEl = document.getElementById("homeWxTemp");
    const descEl = document.getElementById("homeWxDesc");
    const placeEl = document.getElementById("homeWxPlace");

    async function refresh() {
        let place = WX.loadPlace();
        placeEl.textContent = WX.labelsFor(place).short;
        descEl.textContent = "正在获取天气…";
        card.classList.remove("is-error");

        try {
            if (!place.province && !place.city && !place.district) {
                place = await WX.refinePlace(place);
                WX.savePlace(place);
            }
            placeEl.textContent = WX.labelsFor(place).short;

            const data = await WX.fetchWeather(place.lat, place.lon);
            const cur = data.current;
            iconEl.innerHTML = WX.iconHTML(WX.groupOf(cur.weather_code, cur.is_day));
            tempEl.textContent = String(Math.round(cur.temperature_2m));
            descEl.textContent = WX.describe(cur.weather_code)
                + " · 体感 " + Math.round(cur.apparent_temperature) + "°";
            placeEl.textContent = WX.labelsFor(place).short;
        } catch (err) {
            iconEl.innerHTML = WX.iconHTML("cloudy");
            descEl.textContent = "天气获取失败，点此重试";
            card.classList.add("is-error");
        }
    }

    card.addEventListener("click", function () {
        if (card.classList.contains("is-error")) refresh();
        else window.location.href = "/weather";
    });
    card.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            card.click();
        }
    });

    refresh();
})();
