# 독립 검토 — preview-exit-cleanup

- reviewer: `production-pass-receipt-qa` (기계 판정) + 실패 재현 대조군
- 판정: `PASS`

## 검토자가 실제로 확인한 것

1. **결함이 코드로 설명된다.** `run()`은 `process.exit(result.status)`를 부르고, 브라우저 게이트는
   프리뷰를 띄운 `try` 안에서 그 헬퍼로 불린다. `process.exit()`은 `finally`를 건너뛴다 —
   추론이 아니라 언어 규칙이다.
2. **재현했다.** `--viewports 1x1`로 visual-layout을 실패시킨 뒤 4325에 vite(pid 54331)가 남았다.
3. **수정 후 사라졌다.** 같은 명령을 다시 돌려 exit 1을 받고, 4325 점유가 없음을 확인했다.
4. **정상 경로를 망치지 않는다.** 훅은 이미 죽은 자식에는 아무 일도 하지 않는다
   (`preview.exitCode !== null || previewDead` 가드). graceful `stopPreview()`는 그대로 남아 있고,
   훅은 그 밖의 경로만 덮는다.
5. **판정 소유권 불변.** 실패는 여전히 실패다. 이 task는 종료 시 정리만 추가한다.

## 남는 위험

`SIGKILL`로 프로세스 그룹을 끝내므로 프리뷰가 임시 파일을 정리할 기회를 얻지 못한다.
`vite preview`는 dist를 읽기만 하고 쓰지 않으므로 잃을 것이 없다. 정상 경로에서는 SIGTERM이
먼저 가고, 이 훅은 그 뒤에 남은 것만 처리한다.
