// 앱 업데이트 이력. 배포할 때마다 맨 위에 새 항목을 추가하고 APP_VERSION을 올려주세요.
// 설정 > 앱 정보에서 이 버전 번호와 아래 changes 목록이 그대로 보여집니다.
export interface ChangelogEntry {
  version: string;
  date: string; // 'YYYY-MM-DD'
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.0',
    date: '2026-09-09',
    changes: [
      '저장소: "오늘로" 이동한 할 일은 저장소 목록에서 바로 사라지도록 수정',
      '저장소: 하위 항목 중 원하는 것만 골라서 오늘로 이동 가능 (전체 이동도 그대로 지원)',
      '홈 화면: 날짜를 누르면 뜨는 목록이 카테고리별로 묶여서 표시',
      '홈 화면: 달력 아래 저장소 드래그 영역 제거 (저장소 페이지의 "오늘로" 버튼 사용)',
      'PC · 태블릿 화면 위주로 계속 다듬는 중 (모바일 화면 개선은 다음에 이어서 진행)',
    ],
  },
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
