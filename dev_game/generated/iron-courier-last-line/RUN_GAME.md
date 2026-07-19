# IRON COURIER: LAST LINE 실행 방법

## 가장 쉬운 실행

macOS Finder에서 `게임실행.command`를 더블클릭합니다.

- 최초 실행 시 필요한 패키지를 자동 설치합니다.
- 최신 프로덕션 빌드를 만든 뒤 브라우저에서 게임을 엽니다.
- 실행 주소: <http://127.0.0.1:5195>
- 실행 중 표시되는 터미널을 닫거나 `Ctrl+C`를 누르면 서버가 종료됩니다.

## 터미널 실행

```bash
cd /Volumes/Eprojects/project_202606/game-dd/dev_game/generated/iron-courier-last-line
npm run play:production
```

개발 모드는 다음 명령으로 실행합니다.

```bash
npm run play
```
