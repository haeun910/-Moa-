import type { Todo, Settings } from '../types';

// 설정 화면의 "목록 표시" 옵션(정렬 기준 / 완료 항목 숨기기 / 카테고리별 표시 여부)을
// 저장소·홈 화면 목록에 공통으로 적용하기 위한 헬퍼.
export function applyListDisplaySettings(
  todos: Todo[],
  settings: Pick<Settings, 'listSortBy' | 'hideCompleted' | 'hiddenCategoryIds'>
): Todo[] {
  let result = todos;

  if (settings.hideCompleted) {
    result = result.filter(t => !t.completed);
  }
  if (settings.hiddenCategoryIds.length > 0) {
    result = result.filter(t => !t.categoryId || !settings.hiddenCategoryIds.includes(t.categoryId));
  }

  if (settings.listSortBy === 'date') {
    // 목록 안에서는 date가 다 같거나(홈=선택한 날짜) 다 없어서(저장소) 실제 달력 날짜로는
    // 정렬 의미가 없어, 등록된 순서(생성일)를 "날짜순"으로 사용함
    result = [...result].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } else if (settings.listSortBy === 'name') {
    result = [...result].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  }
  // 'manual'이면 드래그로 정한 sort_order 순서(=todos 배열 순서)를 그대로 유지

  return result;
}
