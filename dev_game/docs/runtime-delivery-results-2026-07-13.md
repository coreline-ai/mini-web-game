# Runtime Asset Delivery Results — 2026-07-13

`implement_20260713_110501.md`의 10게임 runtime delivery/HQ/production-tree 구현 결과다. `Before dist`는 migration 전 baseline build, `After dist`는 migration 후 동일 Vite build의 실제 파일 byte 합계다.

## 프로젝트별 결과

| 프로젝트 | 주요 구현 | Runtime files / bytes / budget | Before dist | After dist | 절감 | HQ |
|---|---|---:|---:|---:|---:|---:|
| `bullseye-rush` | HQ 5파일 최적화, strict allowlist | 16 / 9,728,843 / 10MiB | 15,853,741 | 11,242,064 | 4,611,677 | 오류 6→0 |
| `castle-archer` | `_source`, standalone enemy, scaffold 제외 | 28 / 18,421,397 / 21MiB | 37,419,410 | 19,945,304 | 17,474,106 | PASS |
| `jungle-arcshot` | stage-3 최적화, `_source` 제외 | 20 / 11,288,427 / 12MiB | 21,763,904 | 12,802,782 | 8,961,122 | 오류 2→0 |
| `market-panic` | active image 22개 production tree 이동 | 27 / 2,977,701 / 8MiB | 19,602,205 | 6,601,255 | 13,000,950 | PASS |
| `meteor-dash` | active image 13개 production tree 이동 | 18 / 1,764,964 / 3MiB | 3,291,808 | 3,279,017 | 12,791 | PASS |
| `parcel-sort-rush` | raw/sheets 제외, 36 logical→33 physical dedupe | 33 / 10,251,290 / 12MiB | 25,236,584 | 11,779,491 | 13,457,093 | PASS |
| `road-stream-racer` | references 제외, loader/manifest 36개 정렬 | 36 / 23,409,532 / 25MiB | 41,285,361 | 24,941,267 | 16,344,094 | PASS |
| `rush-lane-racer` | active image 25개 production tree 이동, physics 회귀 자동화 | 30 / 16,575,353 / 18MiB | 18,124,512 | 18,099,600 | 24,912 | PASS |
| `sky-archer` | active image 13개 production tree 이동 | 18 / 8,061,840 / 9MiB | 9,584,314 | 9,573,009 | 11,305 | PASS |
| `target-shooter-rush` | raw/legacy/crosshair 제외, shared texture dedupe | 12 / 7,802,656 / 9.5MiB | 18,880,712 | 9,321,919 | 9,558,793 | PASS |
| **합계** |  | **238 files / 110,282,003B** | **211,042,551** | **127,585,708** | **83,456,843 (39.55%)** | **10/10 PASS** |

## 공통 계약 결과

- 10개 게임 모두 `publicDir: false`, canonical package-local helper, `assetLayout`, 양수 `runtimeBudgetBytes`, 명시적 `delivery`를 사용한다.
- dev server와 build는 동일 manifest allowlist를 사용한다.
- `dist/runtime-asset-manifest.json`은 physical runtime file을 한 번만 기록하고 source/dist SHA-256을 검증한다.
- `_source`, `references`, `imagegen`, `raw`, `sheets`, scaffold SVG와 README는 원본으로 보존하되 runtime delivery에서 제외했다.
- production-tree 이동 대상 4게임의 active image 73개는 이동 전후 SHA-256이 모두 동일하다.
- 10개 spec의 `1080x1920`, `scaleMode: fit`을 유지했다.
- imagegen `promptHash`, `rawPath`, `sourceSheet`, `referenceAssets`와 게임별 provenance를 보존했다.

## 검증 결과

| Gate | 결과 |
|---|---:|
| 10게임 build | 10/10 PASS |
| dist-runtime file-set/SHA/budget | 10/10 PASS |
| production-demo | 10/10 PASS |
| image-quality | 10/10 PASS |
| HQ screen quality | 10/10 PASS |
| visible canvas smoke | 10/10 PASS, canvas `1080x1920`, console/page error 0 |
| visual-layout | 10/10 PASS at `390x844,430x932,1080x1920` |
| scene-composite + pixel inspection | 10/10 PASS at `390x844,430x932,1080x1920` |
| Rush five-position physics regression | PASS, 5/5 collected, player `118x118`, coin `66x66` |

Browser QA는 전역 최대 동시성 2로 실행했다. 신규 전용 screen art와 exact-FHD background 재생성은 기존 에셋이 품질 게이트를 통과했고 실제 artifact가 확인되지 않아 수행하지 않았다.

## CI

- push/PR: foundation QA 후 10게임 build, dist-runtime, production-demo, image, HQ matrix
- `rush-lane-racer`: matrix에서 five-position physics regression 추가
- 매일 `03:00 KST`와 수동 실행: 최대 동시성 2의 전체 production gate matrix
