import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import SortableTodoItem from './SortableTodoItem';
import { useApp } from '../context/AppContext';
import type { Todo } from '../types';

interface Props {
  todos: Todo[];
  onEdit: (todo: Todo) => void;
  getActions?: (todo: Todo) => React.ReactNode;
  autoCompleteSubtasks?: boolean;
  allowSendSubtaskToToday?: boolean;
  completeMovesToToday?: boolean;
  // 저장소에서만: 할 일을 다른 할 일의 "가운데"에 끌어다 놓으면 세부 할일로 합쳐짐
  enableMergeToSubtask?: boolean;
}

export default function TodoList({ todos, onEdit, getActions, autoCompleteSubtasks, allowSendSubtaskToToday, completeMovesToToday, enableMergeToSubtask }: Props) {
  const { reorderTodos, updateTodo, deleteTodo } = useApp();

  // 드래그로 정렬한 순서를 컴포넌트 로컬 state(localOrder)에 따로 보관했었는데,
  // 그 뒤로 항목이 추가/변경돼도 이 로컬 state는 갱신되지 않아서 새 항목이 화면에서
  // 보이지 않고 사라진 것처럼 되는 버그가 있었음. reorderTodos가 이미 context의
  // todos 상태를 정렬된 순서로 동기 반영하므로, 항상 props로 받은 todos를 그대로 사용.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    if (enableMergeToSubtask) {
      const activeTodo = todos.find(t => t.id === active.id);
      const targetTodo = todos.find(t => t.id === over.id);
      const activeRect = active.rect.current.translated;
      if (activeTodo && targetTodo && activeRect && over.rect.height > 0) {
        const relativeCenter = (activeRect.top + activeRect.height / 2 - over.rect.top) / over.rect.height;
        if (relativeCenter > 0.25 && relativeCenter < 0.75) {
          const mergedSubtasks = [
            ...targetTodo.subtasks,
            { id: `merge-${Date.now()}-title`, title: activeTodo.title, completed: activeTodo.completed },
            ...activeTodo.subtasks.map((s, i) => ({ id: `merge-${Date.now()}-${i}`, title: s.title, completed: s.completed })),
          ];
          updateTodo(targetTodo.id, { subtasks: mergedSubtasks });
          deleteTodo(activeTodo.id);
          return;
        }
      }
    }

    const ids = todos.map(t => t.id);
    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    const newIds = arrayMove(ids, oldIndex, newIndex);
    reorderTodos(newIds);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
        {todos.map(todo => (
          <SortableTodoItem key={todo.id} todo={todo} onEdit={onEdit} actions={getActions?.(todo)} autoCompleteSubtasks={autoCompleteSubtasks} allowSendSubtaskToToday={allowSendSubtaskToToday} completeMovesToToday={completeMovesToToday} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
