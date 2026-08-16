// uiDirection.js — 이 게임의 UI 아트 디렉션 (계약 §2.0.26).
//
// 규격(버튼 크기 토큰·첫 플레이 5요소·required ID)은 모든 게임이 공유하고, 표현은 게임마다
// 달라야 한다. 이 선언이 그 표현의 단일 원본이며, 씬이 여기서 값을 읽는다.
//
// 이 게임의 은유는 **경기장 전광판과 팀 시트**다. 정보는 가운데 정렬된 문단이 아니라
// 좌측 라벨 / 우측 값의 기록지처럼 놓이고, 버튼은 유니폼 번호판처럼 각지고 두껍다.
// 앞 게임(brass-signal-plaque / centered-stack / solid-fill-rounded)과 셋 다 다르다.

export const UI_DIRECTION = Object.freeze({
  layoutMetaphor: 'stadium-scoreboard',
  homeComposition: 'team-sheet-rows',
  buttonForm: 'jersey-number-plate',
  typeScale: 'condensed-display',
  motionSignature: 'slide-from-touchline',
});

// 표현을 코드가 실제로 참조하는 지점. 선언만 바꾸고 화면이 안 바뀌면 장식이 된다.
export const HOME_LAYOUT = Object.freeze({
  // 팀 시트: 위쪽에 큰 타이틀 바, 그 아래 좌우 정렬 행이 쌓이고, 행동은 맨 아래 나란히.
  titleBarY: 0.115,
  sheetTopY: 0.30,
  rowGap: 0.052,
  actionRowY: 0.845,
  railX: 0.12,        // 좌측 라벨 기준선
  valueX: 0.88,       // 우측 값 기준선
});

export const BUTTON_FORM = Object.freeze({
  // 유니폼 번호판: 각진 모서리, 두꺼운 외곽, 라벨은 넓은 자간
  cornerRadius: 0,
  strokeRatio: 0.075,
  labelLetterSpacing: 3,
});

export default UI_DIRECTION;
