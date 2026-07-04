# 🧩 확장 & 라이브옵스 개발 가이드 (Extensibility & Live-Ops Dev Guide)

> **본 문서는 "향후 확장 방향" 제안입니다.** 여기에 정리된 아키텍처/기능은
> 현재 리포에 **아직 구현되어 있지 않으며**, 실제 개발·운영은 **이 프로젝트를
> 이어받는 개발자(사용자)의 몫**입니다. 각 단계는 독립적으로 채택할 수 있습니다.

---

## 0. 목표

한 문장으로:

> **로컬(오프라인)에서 실행되고 · 에셋/시나리오를 인터넷으로 업데이트하며 ·
> 추후 백엔드와 정보를 교환하고 공지를 받아오는** 하이브리드 라이브옵스 구조.

이 세 가지 요구를 3개 계층으로 분리한다.

```
┌──────────────────────────────────────────────────────────────┐
│ ① Shell (설치형/오프라인)   — PWA · (추후) Capacitor / Tauri     │
│    앱 껍데기 + 엔진 + "기본 콘텐츠팩"을 캐시 → 오프라인 실행       │
├──────────────────────────────────────────────────────────────┤
│ ② Content (OTA 원격 업데이트) — CDN의 manifest.json + 에셋        │
│    스테이지/보스/밸런스/신규 에셋을 앱 재설치 없이 갱신           │
├──────────────────────────────────────────────────────────────┤
│ ③ Backend (정보교환/공지)    — API 서버 (단계적)                 │
│    공지 · 랭킹 · 클라우드 세이브 · 리모트 설정 · 푸시             │
└──────────────────────────────────────────────────────────────┘
      온라인이면 ②③ 갱신 · 오프라인이면 캐시/기본팩으로 계속 플레이
```

핵심 원칙: **오프라인 우선(Offline-first)** — 네트워크가 없거나 서버가 죽어도
게임은 항상 실행되어야 하며, 원격 자원은 "있으면 갱신" 하는 부가 요소다.

---

## 1. 현재 구조와 제약

- 스택: **Phaser 3 + Vite (ESM)**, 콘텐츠 상수는 [`src/config/gameConfig.js`](../src/config/gameConfig.js)에 **하드코딩**.
- 에셋 로딩은 [`src/scenes/BootScene.js`](../src/scenes/BootScene.js)의 `assetUrl()`로 **중앙화**되어 있음 → 원격 소스로 교체하기 좋음.
- 제약: `file://` 직접 실행 불가(ESM/XHR CORS). 지금은 웹 서버(dev/preview) 또는 GitHub Pages 필요.

이 가이드는 위 제약을 없애고(①) 콘텐츠를 코드에서 분리해(②) 서버 연동(③)까지
확장하는 경로를 다룬다.

---

## 2. ① Shell — 로컬 실행 / 오프라인

> `file://`(더블클릭) 직접 실행이 막히는 이유는 §1 참고(ESM·XHR CORS, 절대 base 경로).
> 아래는 **"웹 서버 없이 로컬에서 실행/배포"** 를 달성하는 방식들의 비교다.

### 2-0. 실행 / 배포 방식 비교 (Packaging Options)

| # | 방안 | 실행 방식 | 오프라인 | 용량 | 작업량 | 적합한 목표 |
|---|------|-----------|:---:|------|------|------|
| 1 | **단일 HTML 원파일** (코드+에셋 전부 인라인) | `game.html` 더블클릭 | ✅ | ~50MB(에셋 base64) | 중 | "파일 하나로 그냥 실행" |
| 2 | **Tauri 데스크톱 앱** ⭐ | `.dmg`/`.exe` 더블클릭 | ✅ | 작음(OS 웹뷰, ~수 MB) | 중 | PC 설치형 배포 |
| 3 | **Electron 데스크톱 앱** | `.app`/`.exe` | ✅ | 큼(~100MB+) | 중(간단) | PC 앱 · 호환성 우선 |
| 4 | **Capacitor 모바일 앱** | iOS/Android 설치 | ✅ | 앱 표준 | 중상 | 모바일 설치형 |
| 5 | **PWA(설치형 웹)** | 브라우저 "설치" → 오프라인 실행 | △(최초 1회 웹) | 작음 | 낮음 | 최소 작업으로 앱처럼 |
| 6 | **원클릭 로컬 서버** | `npx serve dist` / 포터블 바이너리 | ✅ | 작음 | 매우 낮음 | 개발/시연 간편 |

**선택 가이드**
- 파일 하나로 전달/실행 → **①**
- PC 설치형 배포 → **② Tauri(권장)** / ③ Electron
- 모바일 스토어 → **④ Capacitor**
- 최소 작업으로 "앱 느낌" → **⑤ PWA** (본 가이드의 시작점)
- 개발/시연 간편 → **⑥**

> 참고: ①(단일 HTML)은 `vite-plugin-singlefile`로 JS/CSS를 인라인하고, Phaser가
> 런타임에 불러오는 에셋은 **data URI로 임베드**(BootScene 로더를 에셋맵 기반으로 소폭 수정)해야
> `file://`에서도 동작한다. 에셋 35MB 탓에 파일이 커지므로 **PNG 압축/webp 변환**과 병행 권장.

### 2-1. PWA (권장 시작점)
- `vite-plugin-pwa` 추가 → **서비스 워커**로 앱 셸 + 기본 콘텐츠팩 precache.
- 브라우저 "홈 화면에 추가/설치" → **오프라인 실행**, 서버 불필요.
- 업데이트: SW `autoUpdate` 또는 "새 버전 있음" 프롬프트.

```bash
npm i -D vite-plugin-pwa
```
```js
// vite.config.js (발췌)
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/mini-web-game/' : './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: "Don't Get Pooped!",
        short_name: 'DGP',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#0b0d1a',
        theme_color: '#0b0d1a',
        icons: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        // 원격/대용량 에셋은 runtimeCaching으로 (아래 ② 참고)
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
}));
```

### 2-2. 네이티브 래핑 (추후)
| 대상 | 도구 | 비고 |
|------|------|------|
| iOS / Android 스토어 앱 | **Capacitor** | 같은 웹 빌드 재사용 + 네이티브 푸시 |
| PC 설치형(.dmg/.exe) | **Tauri**(경량) / Electron | 오프라인 데스크톱 |

---

## 3. ② Content — 원격 OTA 업데이트 (핵심)

### 3-1. 콘텐츠 외부화 (데이터 주도)
`gameConfig`의 `STAGES / BOSSES / POWERUPS / DIFF / COIN …` 등 **콘텐츠 값**을
코드에서 분리해 **원격 manifest**로 옮긴다. 코드는 값을 참조만 한다.

```jsonc
// CDN: /content/manifest.json
{
  "contentVersion": "2026.07.10",
  "minAppVersion": "0.1.0",
  "config": {
    "stages": [ /* gameConfig.STAGES */ ],
    "bosses": [ /* gameConfig.BOSSES */ ],
    "powerups": [ /* gameConfig.POWERUPS */ ],
    "balance": { "diff": { /* … */ }, "coin": { /* … */ } }
  },
  "assets": [
    { "key": "bg_neon", "url": "content/assets/bg_neon.png", "hash": "sha256-…", "bytes": 480000 }
  ],
  "notice": { "id": "n42", "title": "신규 보스!", "body": "…", "endsAt": "2026-08-01T00:00:00Z" }
}
```

### 3-2. `ContentManager` (신설 제안)
책임: manifest fetch · 버전 비교 · 에셋 다운로드/캐시 · URL(또는 blob) 리졸브.

```
BootScene → ContentManager.resolve(key)
  1) 동봉 기본팩(baseline)으로 항상 부팅 보장
  2) (온라인) manifest fetch(짧은 timeout)
  3) contentVersion 이 캐시보다 최신 → 바뀐 에셋/설정만 다운로드
       → Cache API / IndexedDB 저장(hash 무결성 검증)
  4) 이후 실행부터 캐시 사용 / 오프라인이면 캐시→기본팩 폴백
```
- BootScene의 `assetUrl(path)`를 `ContentManager.url(key)` 로 교체하면 이식이 쉽다.
- 캐시 저장소: 이미지/오디오 blob은 **Cache API**, 설정/버전은 **IndexedDB**(또는 localStorage).

### 3-3. 버전 전략
- **appVersion**(셸, 드물게 변경) vs **contentVersion**(콘텐츠, 자주 변경) 분리.
- `minAppVersion` 게이트: 콘텐츠가 신버전 앱을 요구하면 "앱 업데이트 안내".
- 실패/오프라인 폴백은 **항상** 준비(게임은 멈추지 않는다).

---

## 4. ③ Backend — 정보교환 / 공지 (단계적)

| 단계 | 방식 | 얻는 것 |
|------|------|---------|
| **A. 무서버** | CDN의 정적 `notice.json`·`config.json` | 인게임 **공지** · 리모트 설정 / 피처 플래그 |
| **B. 서버** | Cloudflare Workers + D1 / Node + DB / Firebase | **랭킹 · 클라우드 세이브 · 이벤트 · 공지 CRUD** |
| **C. 푸시** | Web Push / FCM · APNs(Capacitor) | 앱 미실행 중에도 **공지 푸시** |

### 4-1. `NoticeService` (신설 제안)
- 부팅 시 `notice`(정적 JSON 또는 API) 조회 → **홈 화면 배너/모달**로 표시.
- "본 적 없는 공지만" 노출: 마지막으로 본 `noticeId`를 `SaveData`에 저장.

### 4-2. 통신 원칙
- **오프라인 우선**: 서버 호출은 짧은 timeout + 실패 시 캐시/스킵.
- 쓰기(점수 등록·세이브 동기화)는 **큐잉 후 재시도**(온라인 복귀 시 flush).
- 개인정보/보안: 세이브 위변조 방지(서버 검증), API 키 노출 주의.

### 4-3. 추천 스택
- 서버리스·저비용: **Cloudflare Workers + D1(SQLite)** 또는 **Firebase**(빠른 시작).
- 정적 무서버 단계는 현재 **GitHub Pages**의 `content/`·`notice.json`으로 즉시 가능.

---

## 5. 단계별 로드맵

| Phase | 내용 | 결과물 |
|------|------|--------|
| **0** | PWA화 (서비스워커·매니페스트·아이콘) | 설치형·오프라인 실행 |
| **1** | 콘텐츠 외부화 + `ContentManager` + 캐시 | 스테이지/보스/에셋 **OTA 업데이트** |
| **2** | 정적 공지/리모트 설정(무서버) + `NoticeService` | 인게임 **공지** · 긴급 밸런스 조정 |
| **3** | 백엔드 API(랭킹·세이브·푸시) | 서버 정보교환 · 라이브 이벤트 |
| **4** | Capacitor/Tauri 네이티브 배포 | 스토어/데스크톱 설치형 |

각 Phase는 **독립적**이며 앞 단계 없이도 부분 채택 가능(예: PWA만, 공지만).

---

## 6. 작업 체크리스트 (요약)

- [ ] `vite-plugin-pwa` 추가 · 아이콘/매니페스트 · SW 캐시 전략
- [ ] `gameConfig`의 콘텐츠 값 → `content` 스키마로 분리
- [ ] `content/manifest.json`(+에셋) CDN 배포 파이프라인
- [ ] `ContentManager`(fetch·버전비교·캐시·리졸브) + BootScene 로더 연동
- [ ] baseline 콘텐츠팩 동봉(오프라인/최초 실행 보장)
- [ ] `NoticeService` + 홈 공지 UI + 본 공지 기록
- [ ] (선택) 백엔드 API: 랭킹/세이브/공지 CRUD/푸시
- [ ] (선택) Capacitor/Tauri 패키징

---

## 7. 주의사항

- **오프라인 우선 불변식**: 원격 자원 실패가 게임 실행을 막으면 안 된다.
- **대용량 에셋**: 현재 이미지 에셋 ~35MB. OTA·PWA 캐시 전 **PNG 압축/webp 변환** 권장.
- **버전 호환**: 콘텐츠 스키마 변경 시 `contentVersion`·`minAppVersion`으로 안전하게.
- **보안**: 클라이언트 값(점수 등)은 신뢰 금지 — 랭킹은 서버 검증 필요.

---

_문의/라이선스: [Coreline-ai](https://github.com/coreline-ai) · [LICENSE.md](../LICENSE.md)_
