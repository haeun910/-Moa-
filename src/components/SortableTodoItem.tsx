import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import TodoItem from './TodoItem';
import type { Todo } from '../types';

interface Props {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  actions?: React.ReactNode;
  autoCompleteSubtasks?: boolean;
  allowSendSubtaskToToday?: boolean;
}

export default function SortableTodoItem({ todo, onEdit, actions, autoCompleteSubtasks, allowSendSubtaskToToday }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/drag">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing opacity-0 group-hover/drag:opacity-100 transition-opacity z-10 touch-none"
      >
        <GripVertical size={14} className="text-gray-300 dark:text-gray-600" />
      </div>
      <div className="pl-5">
        <TodoItem todo={todo} onEdit={onEdit} actions={actions} autoCompleteSubtasks={autoCompleteSubtasks} allowSendSubtaskToToday={allowSendSubtaskToToday} />
      </div>
    </div>
  );
}
