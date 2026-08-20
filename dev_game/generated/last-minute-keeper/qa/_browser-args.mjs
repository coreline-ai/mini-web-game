// QA 어댑터의 헤드리스 브라우저 실행 인자 — 한 곳에서 정한다.
//
// 왜: 이전에는 어댑터마다 `--use-gl=swiftshader`를 하드코딩했다. 그 경로는 최신 Chromium에서
// 대체된 것이고, 실측(2026-08-20)에서 간헐적으로 **Phaser 게임 루프가 시작되지 않는** 실패를
// 냈다. 실패 시점 진단: `rafTicks=725 loop=stopped frame=0` — 브라우저는 프레임을 발행하는데
// 엔진 루프가 0프레임이었다(TextureManager 준비 신호 미도달). 게임 코드로는 닫을 수 없다.
//
// 생성기 도구에서 두 경로를 비교했다: `--use-gl` 9/10 vs `--use-angle` 22/22(픽셀 검사 12/12).
// 그래서 ANGLE을 기본으로 쓰고, 비교 수단을 없애지 않기 위해 되돌릴 스위치를 남긴다.
//   GAME_QA_GL=gl → 옛 경로
export function browserLaunchArgs() {
  const mode = String(process.env.GAME_QA_GL || 'angle').toLowerCase();
  const gl = mode === 'gl' ? ['--use-gl=swiftshader'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  return [...gl, '--disable-gpu-sandbox', '--no-sandbox'];
}
