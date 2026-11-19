# GameHub

純靜態的遊戲/產品圖書館,部署於 GitHub Pages:https://altcow.github.io/GameHub/

## 登記簿 registry/games.json

- `updated`:ISO 時間(最後更新)
- `categories`:`[{id, name}]`
- `games[]`:
  - `id`、`name`、`category`(對應 categories.id)、`url`、`summary`
  - `links`(可選):`[{label, url, kind}]`,`kind` 為 `public` / `admin`(需密碼)/ `other`;多網址(如訪客版、後台版)時填入,`url` 仍為主要連結;沒填則以 `url` 為唯一連結
  - `versionUrl`(可選):線上 `version.json` 網址,內容 `{"version":"v61"}`,網站會比對是否與 `version` 一致
  - `version`、`status`(`dev` / `live` / `paused`)、`cover`(可選)、`updatedAt`(ISO)
  - `changelog`:`[{version, date(YYYY-MM-DD), notes:[...]}]`,最新在前

## 用法

直接編輯 games.json,或在各遊戲專案中使用全域 skill `gamehub-report` 報到。本機預覽:`python -m http.server` 後開啟 http://localhost:8000/ 。
