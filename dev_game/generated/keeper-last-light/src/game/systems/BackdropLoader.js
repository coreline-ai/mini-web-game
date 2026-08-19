// 스테이지 배경을 **필요할 때** 올린다.
//
// 왜: 배경 1장은 1440x3120 = 디코드 17.1MiB다. 5장이면 85MiB이고, 게임 전체 텍스처의 85%다.
// 이전 판은 Home 진입 직후 남은 4장을 한꺼번에 큐에 넣었다(68MiB 업로드). 첫 화면을 늦추지
// 않으려는 의도였지만, 실제로는 **첫 화면 직후**에 같은 폭발을 옮겨 놓은 것이었다.
//
// 실측(2026-08-19, 24GB 머신 / 스왑 7.49GB 사용 중): 게이트의 브라우저 단계를 반복하면
// visual-layout → scene-composite 인접쌍이 8회 중 3회만 통과했고, 실패는 모두
// `registry still reports "(none)"` — 게임이 아예 부팅하지 못한 것이었다. 단독 실행에서는
// 10/10 통과(1.2~2.0초)이므로 게임 로직이 아니라 **상주 텍스처 총량**이 마진을 먹고 있었다.
//
// 그래서 현재 스테이지 + 다음 스테이지 한 장만 상주시킨다. 캡처·QA는 Home과 스테이지 1만
// 보므로 상주량이 85MiB에서 17~34MiB로 줄고, 실제 플레이에서도 스테이지가 넘어갈 때마다
// 한 장씩만 올린다. 텍스처가 아직 없으면 `GameScene.onStageChange`가 현재 배경을 유지하므로
// (그 가드는 이전 판에도 있었다) 화면이 깨지지 않는다.
export const BACKDROP_IDS = ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'];

export function backdropKey(index) { return `bg_${index}`; }

/** `bg_<index>`가 없으면 로딩을 시작한다. 이미 있거나 범위를 벗어나면 아무 일도 하지 않는다. */
export function ensureBackdrop(scene, index) {
  if (!scene || index < 0 || index >= BACKDROP_IDS.length) return false;
  const key = backdropKey(index);
  if (scene.textures.exists(key)) return false;
  scene.load.image(key, `backgrounds/${BACKDROP_IDS[index]}.webp`);
  scene.load.start();
  return true;
}

/**
 * 선호 키 중 **실제로 올라와 있는** 첫 번째를 준다. 없으면 올라온 배경 중 가장 높은 인덱스,
 * 그것도 없으면 null. GameOver가 전용 배경(bg_3/bg_4)을 기다리지 않고도 배경을 갖게 한다 —
 * 예전에는 전용 배경이 항상 선로드돼 있어서 이 문제가 보이지 않았다.
 */
export function bestLoadedBackdrop(scene, preferred = []) {
  for (const key of preferred) if (scene.textures.exists(key)) return key;
  for (let i = BACKDROP_IDS.length - 1; i >= 0; i -= 1) {
    const key = backdropKey(i);
    if (scene.textures.exists(key)) return key;
  }
  return null;
}
