#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")"

PORT=5195
URL="http://127.0.0.1:${PORT}"

if curl -fsS "$URL" >/dev/null 2>&1; then
  open "$URL"
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm이 필요합니다. Node.js 18 이상을 설치한 뒤 다시 실행해 주세요."
  read -r -p "엔터 키를 누르면 종료합니다."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "[1/3] 최초 실행 의존성 설치 중..."
  npm install
fi

echo "[2/3] 최신 게임 빌드 중..."
npm run build

echo "[3/3] 게임 서버 시작 중..."
(
  for _ in $(seq 1 80); do
    if curl -fsS "$URL" >/dev/null 2>&1; then
      open "$URL"
      exit 0
    fi
    sleep 0.25
  done
) &

echo "게임 주소: $URL"
echo "이 터미널을 닫거나 Ctrl+C를 누르면 게임 서버가 종료됩니다."
npm run preview -- --host 127.0.0.1 --port "$PORT" --strictPort
