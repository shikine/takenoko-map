import React, { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "takenoko-location-map-points-v1";

const TAG_OPTIONS = [
  "太い",
  "細い",
  "複数あり",
  "採取済み",
  "未採取",
  "再確認",
  "斜面",
  "沢沿い",
  "入口近く",
  "足場注意",
  "目印あり",
  "来週確認",
];

const initialPoints = [
  {
    id: 1,
    title: "竹林入口の斜面",
    tags: ["細い", "複数あり", "再確認", "斜面"],
    memo: "細めが3本。来週もう一度確認。",
    lat: 35.9148,
    lng: 138.2381,
    date: "2026-05-23 09:12",
    photo: null,
  },
  {
    id: 2,
    title: "沢沿いの奥",
    tags: ["太い", "沢沿い", "未採取"],
    memo: "大きめ。周辺にまだありそう。",
    lat: 35.9162,
    lng: 138.2414,
    date: "2026-05-23 09:31",
    photo: null,
  },
  {
    id: 3,
    title: "西側の竹やぶ",
    tags: ["足場注意", "目印あり", "再確認"],
    memo: "足場注意。目印は倒木。",
    lat: 35.9135,
    lng: 138.2368,
    date: "2026-05-23 10:04",
    photo: null,
  },
];

function formatNow(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getValidPoints(points) {
  if (!Array.isArray(points)) return [];
  return points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function getBounds(points) {
  const validPoints = getValidPoints(points);
  if (validPoints.length === 0) return null;

  const lats = validPoints.map((point) => point.lat);
  const lngs = validPoints.map((point) => point.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function getMapCenter(points) {
  const bounds = getBounds(points);
  if (!bounds) return { lat: 35.915, lng: 138.239 };

  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

function buildOpenStreetMapUrl(point) {
  return `https://www.openstreetmap.org/?mlat=${point.lat}&mlon=${point.lng}#map=18/${point.lat}/${point.lng}`;
}

function buildNavigationUrl(point) {
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}`;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
}

function toggleTag(tags, tag) {
  const normalized = normalizeTags(tags);
  if (normalized.includes(tag)) {
    return normalized.filter((item) => item !== tag);
  }
  return [...normalized, tag];
}

function createTakenokoPoint({ title, tags, memo, lat, lng, photo }) {
  return {
    id: Date.now(),
    title: title.trim() || "筍ポイント",
    tags: normalizeTags(tags),
    memo: memo.trim(),
    lat,
    lng,
    date: formatNow(),
    photo: photo || null,
  };
}

function serializePoints(points) {
  return JSON.stringify(
    getValidPoints(points).map((point) => ({
      ...point,
      tags: normalizeTags(point.tags),
      title: String(point.title || "筍ポイント"),
      memo: String(point.memo || ""),
      photo: point.photo || null,
    }))
  );
}

function parseStoredPoints(rawValue) {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    const validPoints = getValidPoints(parsed).map((point) => ({
      id: point.id || Date.now() + Math.random(),
      title: String(point.title || "筍ポイント"),
      tags: normalizeTags(point.tags),
      memo: String(point.memo || ""),
      lat: Number(point.lat),
      lng: Number(point.lng),
      date: String(point.date || ""),
      photo: point.photo || null,
    }));
    return validPoints;
  } catch {
    return null;
  }
}

function loadStoredPoints() {
  if (typeof window === "undefined" || !window.localStorage) return initialPoints;
  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (rawValue === null) return initialPoints;
  const stored = parseStoredPoints(rawValue);
  return stored || initialPoints;
}

function savePointsToStorage(points) {
  if (typeof window === "undefined" || !window.localStorage) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, serializePoints(points));
    return true;
  } catch {
    return false;
  }
}

function getInitialSelectedId() {
  const loaded = loadStoredPoints();
  return loaded[0]?.id ?? initialPoints[0]?.id ?? null;
}

function runBasicTests() {
  const approxEqual = (actual, expected, epsilon = 0.0001) => Math.abs(actual - expected) < epsilon;

  const bounds = getBounds(initialPoints);
  console.assert(bounds !== null, "getBounds should return bounds for valid points");
  console.assert(approxEqual(bounds.minLat, 35.9135), `Expected minLat to be 35.9135, got ${bounds?.minLat}`);
  console.assert(approxEqual(bounds.maxLat, 35.9162), `Expected maxLat to be 35.9162, got ${bounds?.maxLat}`);
  console.assert(approxEqual(bounds.minLng, 138.2368), `Expected minLng to be 138.2368, got ${bounds?.minLng}`);
  console.assert(approxEqual(bounds.maxLng, 138.2414), `Expected maxLng to be 138.2414, got ${bounds?.maxLng}`);

  const emptyBounds = getBounds([]);
  console.assert(emptyBounds === null, "getBounds should return null for empty array");

  const invalidBounds = getBounds([{ lat: NaN, lng: 138 }]);
  console.assert(invalidBounds === null, "getBounds should return null for invalid points");

  const center = getMapCenter(initialPoints);
  console.assert(approxEqual(center.lat, 35.91485), `Expected center.lat to be 35.91485, got ${center.lat}`);
  console.assert(approxEqual(center.lng, 138.2391), `Expected center.lng to be 138.2391, got ${center.lng}`);

  const fixedDate = new Date(2026, 4, 23, 9, 5);
  console.assert(formatNow(fixedDate) === "2026-05-23 09:05", `Expected formatted date to be 2026-05-23 09:05, got ${formatNow(fixedDate)}`);

  const osmUrl = buildOpenStreetMapUrl({ lat: 35.1, lng: 138.2 });
  console.assert(
    osmUrl === "https://www.openstreetmap.org/?mlat=35.1&mlon=138.2#map=18/35.1/138.2",
    `Expected OpenStreetMap URL to be correct, got ${osmUrl}`
  );

  const navigationUrl = buildNavigationUrl({ lat: 35.1, lng: 138.2 });
  console.assert(
    navigationUrl === "https://www.google.com/maps/dir/?api=1&destination=35.1,138.2",
    `Expected navigation URL to be correct, got ${navigationUrl}`
  );

  const tags = normalizeTags(["太い", "太い", " ", "沢沿い"]);
  console.assert(tags.length === 2 && tags.includes("太い") && tags.includes("沢沿い"), "normalizeTags should remove duplicates and empty values");

  const toggledOn = toggleTag(["太い"], "沢沿い");
  console.assert(toggledOn.includes("太い") && toggledOn.includes("沢沿い"), "toggleTag should add missing tag");

  const toggledOff = toggleTag(["太い", "沢沿い"], "太い");
  console.assert(!toggledOff.includes("太い") && toggledOff.includes("沢沿い"), "toggleTag should remove existing tag");

  const point = createTakenokoPoint({
    title: "  ",
    tags: ["太い", "太い", "未採取"],
    memo: "  メモ  ",
    lat: 35,
    lng: 138,
    photo: null,
  });
  console.assert(point.title === "筍ポイント", "Blank title should fallback to 筍ポイント");
  console.assert(point.memo === "メモ", "Memo should be trimmed");
  console.assert(point.tags.length === 2, "Tags should be normalized when creating a point");

  const serialized = serializePoints([point, { lat: NaN, lng: 138 }]);
  const parsed = parseStoredPoints(serialized);
  console.assert(Array.isArray(parsed) && parsed.length === 1, "Stored points should round-trip and skip invalid points");

  const emptyStoredPoints = parseStoredPoints("[]");
  console.assert(Array.isArray(emptyStoredPoints) && emptyStoredPoints.length === 0, "Empty stored points should stay empty after reload");

  const brokenStorage = parseStoredPoints("not-json");
  console.assert(brokenStorage === null, "Broken storage JSON should safely return null");

  const noDuplicate = normalizeTags(["未採取", "未採取", "再確認"]);
  console.assert(noDuplicate.length === 2, "Mobile tag selector should not create duplicate tags");
}

runBasicTests();

function Icon({ type, className = "" }) {
  const icons = {
    pin: "📍",
    camera: "📷",
    plus: "＋",
    navigation: "🧭",
    trash: "🗑️",
    list: "☰",
    image: "🖼️",
    bamboo: "🎍",
    tag: "🏷️",
    map: "🗺️",
    memo: "📝",
    route: "↗️",
    save: "💾",
    export: "⬇️",
    detail: "📌",
    close: "×",
  };
  return (
    <span className={`inline-block leading-none ${className}`} aria-hidden="true">
      {icons[type] || "•"}
    </span>
  );
}

function SectionCard({ children, className = "" }) {
  return <div className={`rounded-3xl border border-stone-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function AppButton({ children, onClick, className = "", type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition active:scale-[0.99] ${className}`}
    >
      {children}
    </button>
  );
}

function TagButton({ tag, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3 py-2 text-xs font-bold transition ${active ? "border-lime-600 bg-lime-600 text-white" : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
        }`}
    >
      {tag}
    </button>
  );
}

function MobileTabButton({ active, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition ${active ? "bg-lime-600 text-white shadow-sm" : "text-stone-500"
        }`}
    >
      <Icon type={icon} className="text-base" />
      {label}
    </button>
  );
}

function loadLeafletAssets() {
  return new Promise((resolve, reject) => {
    if (window.L) {
      resolve(window.L);
      return;
    }

    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const scriptId = "leaflet-js";
    const existingScript = document.getElementById(scriptId);

    const handleLoad = () => {
      if (window.L) resolve(window.L);
      else reject(new Error("Leaflet could not be loaded"));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleLoad, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = handleLoad;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function LeafletMapPanel({ points, selectedId, onSelectPoint, compact = false }) {
  const mapElRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const [mapStatus, setMapStatus] = useState("地図を読み込み中...");
  const selected = points.find((point) => point.id === selectedId) || points[0] || null;

  useEffect(() => {
    let isMounted = true;

    loadLeafletAssets()
      .then((L) => {
        if (!isMounted || !mapElRef.current || mapInstanceRef.current) return;

        const center = selected || getMapCenter(points);
        const map = L.map(mapElRef.current, {
          center: [center.lat, center.lng],
          zoom: 17,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;
        setMapStatus("OpenStreetMapを表示中");
        setTimeout(() => map.invalidateSize(), 80);
      })
      .catch(() => {
        if (isMounted) setMapStatus("Leafletの読み込みに失敗しました。ネットワーク接続を確認してください。");
      });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = window.L;
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!L || !map || !layer) return;

    layer.clearLayers();
    const validPoints = getValidPoints(points);
    const bounds = [];

    validPoints.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        title: point.title,
      });

      const tagsHtml = normalizeTags(point.tags)
        .map(
          (tag) =>
            `<span style="display:inline-block;margin:2px;padding:3px 7px;border-radius:999px;background:#ecfccb;color:#365314;font-weight:700;font-size:11px;">${tag}</span>`
        )
        .join("");

      marker.bindPopup(`
        <div style="min-width:180px;">
          <div style="font-weight:800;margin-bottom:4px;">${index + 1}. ${point.title}</div>
          <div style="margin-bottom:6px;">${tagsHtml}</div>
          <div style="font-size:12px;color:#666;">${point.date}</div>
        </div>
      `);
      marker.on("click", () => onSelectPoint(point.id));
      marker.addTo(layer);
      bounds.push([point.lat, point.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 18);
    } else if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
    }

    setTimeout(() => map.invalidateSize(), 0);
  }, [points, onSelectPoint]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selected) return;
    map.panTo([selected.lat, selected.lng]);
    setTimeout(() => map.invalidateSize(), 0);
  }, [selectedId, selected]);

  return (
    <div className={`relative w-full overflow-hidden bg-stone-100 ${compact ? "h-[42vh] min-h-[300px]" : "h-[520px]"}`}>
      <div ref={mapElRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-3 top-3 z-[500] rounded-2xl bg-white/95 px-3 py-2 text-[11px] font-bold text-stone-700 shadow-sm ring-1 ring-stone-200 sm:left-4 sm:top-4 sm:px-4 sm:py-3 sm:text-xs">
        <Icon type="map" className="mr-1" /> {mapStatus}
      </div>
    </div>
  );
}

function PointForm({
  title,
  setTitle,
  selectedTags,
  setSelectedTags,
  customTag,
  setCustomTag,
  memo,
  setMemo,
  manualLat,
  setManualLat,
  manualLng,
  setManualLng,
  photo,
  handlePhoto,
  getCurrentLocation,
  locationStatus,
  addCustomTag,
  addPoint,
}) {
  return (
    <SectionCard>
      <div className="p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-2xl bg-lime-100 p-2 text-lime-900">
            <Icon type="plus" className="text-lg font-black" />
          </div>
          <div>
            <h2 className="font-black">新しい地点を記録</h2>
            <p className="text-xs text-stone-500">スマホ撮影・現在地取得・タグ保存</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-stone-600">地点名</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-lime-500 focus:bg-white sm:text-sm"
              placeholder="例：竹林入口の斜面"
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1 text-xs font-bold text-stone-600">
                <Icon type="tag" /> タグ
              </span>
              <span className="text-xs text-stone-400">{selectedTags.length}個選択中</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TAG_OPTIONS.map((tag) => (
                <TagButton key={tag} tag={tag} active={selectedTags.includes(tag)} onClick={() => setSelectedTags((prev) => toggleTag(prev, tag))} />
              ))}
            </div>
            <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
              <input
                value={customTag}
                onChange={(event) => setCustomTag(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomTag();
                  }
                }}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-base outline-none transition focus:border-lime-500 focus:bg-white sm:text-sm"
                placeholder="タグ追加"
              />
              <AppButton onClick={addCustomTag} className="bg-stone-900 text-white hover:bg-stone-800">
                追加
              </AppButton>
            </div>
          </div>

          <details className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
            <summary className="cursor-pointer text-sm font-bold text-stone-700">
              <Icon type="memo" className="mr-1" /> 補助メモを書く
            </summary>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              className="mt-3 min-h-[78px] w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none transition focus:border-lime-500 sm:text-sm"
              placeholder="例：倒木の右側、雨の後に確認、獣道ありなど"
            />
          </details>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-stone-600">緯度</span>
              <input
                value={manualLat}
                onChange={(event) => setManualLat(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-base outline-none transition focus:border-lime-500 focus:bg-white sm:text-sm"
                inputMode="decimal"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-stone-600">経度</span>
              <input
                value={manualLng}
                onChange={(event) => setManualLng(event.target.value)}
                className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-base outline-none transition focus:border-lime-500 focus:bg-white sm:text-sm"
                inputMode="decimal"
              />
            </label>
          </div>

          <AppButton onClick={getCurrentLocation} className="w-full bg-stone-900 py-4 text-white hover:bg-stone-800">
            <Icon type="navigation" className="mr-2" />
            現在地を取得する
          </AppButton>

          <p className="rounded-2xl bg-stone-50 px-3 py-2 text-xs text-stone-600">{locationStatus}</p>

          <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-4 py-4 text-sm font-bold text-stone-700 transition hover:bg-stone-100">
            <Icon type="camera" />
            写真を撮る・選択する
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" />
          </label>

          {photo && (
            <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
              <img src={photo} alt="選択した筍写真" className="h-44 w-full object-cover" />
            </div>
          )}

          <AppButton onClick={addPoint} className="w-full bg-lime-600 py-4 text-white hover:bg-lime-700">
            <Icon type="pin" className="mr-2" />
            この地点を保存する
          </AppButton>
        </div>
      </div>
    </SectionCard>
  );
}

function PointList({ allTags, activeFilterTag, setActiveFilterTag, filteredPoints, selectedId, setSelectedId }) {
  return (
    <SectionCard>
      <div className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon type="list" className="text-stone-600" />
            <h2 className="font-black">記録した地点</h2>
          </div>
          <div className="text-xs text-stone-400">{filteredPoints.length}件表示</div>
        </div>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveFilterTag(tag)}
              className={`min-h-10 whitespace-nowrap rounded-full border px-3 py-2 text-xs font-bold transition ${activeFilterTag === tag ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                }`}
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="max-h-[58vh] space-y-2 overflow-auto pr-1 [-webkit-overflow-scrolling:touch] lg:max-h-[500px]">
          {filteredPoints.map((point) => (
            <button
              key={point.id}
              onClick={() => setSelectedId(point.id)}
              className={`w-full rounded-2xl border p-3 text-left transition ${selectedId === point.id ? "border-lime-500 bg-lime-50" : "border-stone-200 bg-stone-50 hover:bg-stone-100"
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-black">{point.title}</div>
                  <div className="mt-1 text-xs text-stone-500">{point.date}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(point.tags || []).map((tag) => (
                      <span key={tag} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-lime-800 ring-1 ring-lime-200">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                {point.photo ? <Icon type="image" className="text-lime-700" /> : <Icon type="pin" className="text-stone-400" />}
              </div>
            </button>
          ))}

          {filteredPoints.length === 0 && <div className="rounded-2xl bg-stone-50 px-4 py-6 text-center text-sm text-stone-500">このタグの地点はまだありません。</div>}
        </div>
      </div>
    </SectionCard>
  );
}

function PointDetail({ selected, deletePoint }) {
  if (!selected) {
    return (
      <SectionCard>
        <div className="p-5 text-center text-sm text-stone-500">地点を選択してください。</div>
      </SectionCard>
    );
  }

  return (
    <SectionCard>
      <div className="grid gap-4 p-4 sm:grid-cols-[220px_1fr] sm:p-5">
        <div className="flex h-44 items-center justify-center overflow-hidden rounded-3xl bg-stone-100">
          {selected.photo ? (
            <img src={selected.photo} alt={selected.title} className="h-full w-full object-cover" />
          ) : (
            <div className="text-center text-stone-400">
              <div className="mb-2 text-4xl" aria-hidden="true">
                📷
              </div>
              <div className="text-xs font-bold">写真なし</div>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 inline-flex rounded-full bg-lime-100 px-3 py-1 text-xs font-bold text-lime-900">選択中の地点</div>
          <h2 className="text-2xl font-black">{selected.title}</h2>

          <div className="mt-3 flex flex-wrap gap-2">
            {(selected.tags || []).map((tag) => (
              <span key={tag} className="rounded-full bg-lime-50 px-3 py-1.5 text-xs font-bold text-lime-800 ring-1 ring-lime-200">
                <Icon type="tag" className="mr-1" />
                {tag}
              </span>
            ))}
          </div>

          {selected.memo && (
            <p className="mt-3 rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">
              <span className="font-bold text-stone-800">補助メモ：</span>
              {selected.memo}
            </p>
          )}

          <div className="mt-4 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
            <div className="rounded-2xl bg-stone-50 px-3 py-2">
              <span className="font-bold">緯度：</span>
              {selected.lat.toFixed(6)}
            </div>
            <div className="rounded-2xl bg-stone-50 px-3 py-2">
              <span className="font-bold">経度：</span>
              {selected.lng.toFixed(6)}
            </div>
            <div className="rounded-2xl bg-stone-50 px-3 py-2 sm:col-span-2">
              <span className="font-bold">記録日時：</span>
              {selected.date}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
            <a
              href={buildOpenStreetMapUrl(selected)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-stone-900 px-4 py-3 text-sm font-bold text-white hover:bg-stone-800"
            >
              <Icon type="map" className="mr-2" />
              OSMで開く
            </a>
            <a
              href={buildNavigationUrl(selected)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-lime-600 px-4 py-3 text-sm font-bold text-white hover:bg-lime-700"
            >
              <Icon type="route" className="mr-2" />
              ここへ行く
            </a>
            <AppButton onClick={() => deletePoint(selected.id)} className="border border-stone-300 bg-white text-stone-700 hover:bg-stone-50">
              <Icon type="trash" className="mr-2" />
              削除
            </AppButton>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export default function TakenokoLocationMapApp() {
  const [points, setPoints] = useState(() => loadStoredPoints());
  const [title, setTitle] = useState("筍ポイント");
  const [selectedTags, setSelectedTags] = useState(["未採取"]);
  const [customTag, setCustomTag] = useState("");
  const [memo, setMemo] = useState("");
  const [photo, setPhoto] = useState(null);
  const [manualLat, setManualLat] = useState("35.9150");
  const [manualLng, setManualLng] = useState("138.2390");
  const [selectedId, setSelectedId] = useState(() => getInitialSelectedId());
  const [locationStatus, setLocationStatus] = useState("現在地未取得");
  const [storageStatus, setStorageStatus] = useState("localStorageに自動保存します");
  const [activeFilterTag, setActiveFilterTag] = useState("すべて");
  const [mobileTab, setMobileTab] = useState("record");

  useEffect(() => {
    const saved = savePointsToStorage(points);
    setStorageStatus(saved ? "保存済み：この端末のlocalStorage" : "保存失敗：写真が大きすぎる可能性があります");
  }, [points]);

  const allTags = useMemo(() => {
    const pointTags = points.flatMap((point) => point.tags || []);
    return ["すべて", ...normalizeTags([...TAG_OPTIONS, ...pointTags])];
  }, [points]);

  const filteredPoints = useMemo(() => {
    if (activeFilterTag === "すべて") return points;
    return points.filter((point) => (point.tags || []).includes(activeFilterTag));
  }, [points, activeFilterTag]);

  const selected = points.find((point) => point.id === selectedId) || points[0] || null;

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setPhoto(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("この端末では位置情報が使えません");
      return;
    }

    setLocationStatus("現在地を取得中...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        setManualLat(lat);
        setManualLng(lng);
        setLocationStatus(`現在地取得済み：${lat}, ${lng}`);
      },
      () => {
        setLocationStatus("位置情報の取得に失敗しました。ブラウザの位置情報許可を確認してください。");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const addCustomTag = () => {
    const tag = customTag.trim();
    if (!tag) return;
    setSelectedTags((prev) => normalizeTags([...prev, tag]));
    setCustomTag("");
  };

  const addPoint = () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setLocationStatus("緯度・経度の入力が正しくありません");
      return;
    }

    if (selectedTags.length === 0) {
      setLocationStatus("タグを1つ以上選んでください");
      return;
    }

    const newPoint = createTakenokoPoint({ title, tags: selectedTags, memo, lat, lng, photo });

    setPoints((prev) => [newPoint, ...prev]);
    setSelectedId(newPoint.id);
    setTitle("筍ポイント");
    setSelectedTags(["未採取"]);
    setMemo("");
    setPhoto(null);
    setLocationStatus("地点を保存しました");
    setMobileTab("detail");
  };

  const deletePoint = (id) => {
    setPoints((prev) => {
      const nextPoints = prev.filter((point) => point.id !== id);
      if (selectedId === id) {
        setSelectedId(nextPoints[0]?.id ?? null);
      }
      return nextPoints;
    });
    setMobileTab("list");
  };

  const resetDemoData = () => {
    setPoints(initialPoints);
    setSelectedId(initialPoints[0]?.id ?? null);
    setActiveFilterTag("すべて");
  };

  const clearAllData = () => {
    setPoints([]);
    setSelectedId(null);
    setActiveFilterTag("すべて");
  };

  const exportJson = () => {
    const blob = new Blob([serializePoints(points)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `takenoko-points-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const formProps = {
    title,
    setTitle,
    selectedTags,
    setSelectedTags,
    customTag,
    setCustomTag,
    memo,
    setMemo,
    manualLat,
    setManualLat,
    manualLng,
    setManualLng,
    photo,
    handlePhoto,
    getCurrentLocation,
    locationStatus,
    addCustomTag,
    addPoint,
  };

  return (
    <div className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <div className="mx-auto max-w-7xl px-3 pb-24 pt-3 sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-3 flex items-start justify-between gap-3 sm:mb-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-lime-100 px-3 py-1 text-[11px] font-bold text-lime-900 ring-1 ring-lime-200 sm:text-xs">
              <Icon type="bamboo" />
              スマホ対応・無料地図
            </div>
            <h1 className="text-xl font-black tracking-tight sm:text-4xl">筍ポイント記録マップ</h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-stone-600 sm:mt-2 sm:text-sm sm:leading-6">
              Leaflet + OpenStreetMapでAPIキー不要。スマホで撮影・現在地取得・タグ保存できます。
            </p>
          </div>

          <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-stone-200 sm:px-4 sm:py-3">
            <div className="text-[10px] text-stone-500 sm:text-xs">記録数</div>
            <div className="text-2xl font-black sm:text-3xl">{points.length}</div>
          </div>
        </header>

        <div className="lg:hidden">
          <SectionCard className="mb-3 overflow-hidden">
            <LeafletMapPanel points={filteredPoints} selectedId={selectedId} onSelectPoint={setSelectedId} compact />
          </SectionCard>

          <div className="mb-3 rounded-3xl border border-stone-200 bg-white p-2 shadow-sm">
            <div className="grid grid-cols-3 gap-2">
              <MobileTabButton active={mobileTab === "record"} icon="plus" label="記録" onClick={() => setMobileTab("record")} />
              <MobileTabButton active={mobileTab === "list"} icon="list" label="一覧" onClick={() => setMobileTab("list")} />
              <MobileTabButton active={mobileTab === "detail"} icon="detail" label="詳細" onClick={() => setMobileTab("detail")} />
            </div>
          </div>

          {mobileTab === "record" && <PointForm {...formProps} />}
          {mobileTab === "list" && (
            <PointList
              allTags={allTags}
              activeFilterTag={activeFilterTag}
              setActiveFilterTag={setActiveFilterTag}
              filteredPoints={filteredPoints}
              selectedId={selectedId}
              setSelectedId={(id) => {
                setSelectedId(id);
                setMobileTab("detail");
              }}
            />
          )}
          {mobileTab === "detail" && <PointDetail selected={selected} deletePoint={deletePoint} />}

          <SectionCard className="mt-3">
            <div className="p-4">
              <div className="mb-1 flex items-center gap-1 text-xs font-bold text-stone-600">
                <Icon type="save" /> 保存方式
              </div>
              <p className="text-sm font-bold text-stone-800">{storageStatus}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <AppButton onClick={exportJson} className="bg-stone-900 px-2 text-xs text-white hover:bg-stone-800">
                  JSON
                </AppButton>
                <AppButton onClick={resetDemoData} className="border border-stone-300 bg-white px-2 text-xs text-stone-700 hover:bg-stone-50">
                  復元
                </AppButton>
                <AppButton onClick={clearAllData} className="border border-red-200 bg-white px-2 text-xs text-red-700 hover:bg-red-50">
                  全削除
                </AppButton>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="hidden lg:block">
          <SectionCard className="mb-4">
            <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center sm:p-5">
              <div>
                <div className="mb-1 flex items-center gap-1 text-xs font-bold text-stone-600">
                  <Icon type="save" /> 保存方式
                </div>
                <p className="text-sm font-bold text-stone-800">{storageStatus}</p>
                <p className="mt-1 text-xs leading-5 text-stone-500">
                  まずは無料・登録不要のlocalStorage保存です。同じ端末・同じブラウザで再表示できます。将来、複数端末同期が必要ならFirebase無料枠やSupabase無料枠に差し替えます。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <AppButton onClick={exportJson} className="bg-stone-900 text-white hover:bg-stone-800">
                  <Icon type="export" className="mr-2" /> JSON出力
                </AppButton>
                <AppButton onClick={resetDemoData} className="border border-stone-300 bg-white text-stone-700 hover:bg-stone-50">
                  デモ復元
                </AppButton>
                <AppButton onClick={clearAllData} className="border border-red-200 bg-white text-red-700 hover:bg-red-50">
                  全削除
                </AppButton>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-[410px_1fr]">
            <section className="space-y-4">
              <PointForm {...formProps} />
              <PointList allTags={allTags} activeFilterTag={activeFilterTag} setActiveFilterTag={setActiveFilterTag} filteredPoints={filteredPoints} selectedId={selectedId} setSelectedId={setSelectedId} />
            </section>

            <section className="space-y-4">
              <SectionCard className="overflow-hidden">
                <LeafletMapPanel points={filteredPoints} selectedId={selectedId} onSelectPoint={setSelectedId} />
              </SectionCard>
              <PointDetail selected={selected} deletePoint={deletePoint} />
            </section>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[700] border-t border-stone-200 bg-white/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
          <MobileTabButton active={mobileTab === "record"} icon="plus" label="記録" onClick={() => setMobileTab("record")} />
          <MobileTabButton active={mobileTab === "list"} icon="list" label="一覧" onClick={() => setMobileTab("list")} />
          <MobileTabButton active={mobileTab === "detail"} icon="detail" label="詳細" onClick={() => setMobileTab("detail")} />
        </div>
      </div>
    </div>
  );
}
