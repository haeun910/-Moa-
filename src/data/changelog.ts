// 앱 업데이트 이력. 배포할 때마다 맨 위에 새 항목을 추가하고 APP_VERSION을 올려주세요.
// 설정 > 앱 정보에서 이 버전 번호와 아래 changes 목록이 그대로 보여집니다.
export interface ChangelogEntry {
  version: string;
  date: string; // 'YYYY-MM-DD'
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.1.0',
    date: '2026-09-09',
    changes: [
      '태블릿에서 홈 달력이 화면을 꽉 채우도록 반응형 개선',
      '새 버전이 있을 때 안내 토스트 표시',
      '저장소 · 보드 · 디데이 · 목표 화면 사용성 개선',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-06-28',
    changes: [
      '할 일, 일정, 메모, 목표 관리 기능 출시',
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
