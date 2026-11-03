import React, { useRef, useCallback, useState } from 'react';

export function useResizable(initialSize, minSize = 100, maxSize = 2000) {
  const [size, setSize] = useState(initialSize);
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = useCallback((e) => {
    isDragging.current = true;
    startPos.current = e.clientX;
    startSize.current = size;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev) => {
      if (!isDragging.current) return;
      const delta = ev.clientX - startPos.current;
      const newSize = Math.max(minSize, Math.min(maxSize, startSize.current + delta));
      setSize(newSize);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [size, minSize, maxSize]);

  return { size, onMouseDown };
}

export function useVerticalResizable(initialSize, minSize = 80, maxSize = 800) {
  const [size, setSize] = useState(initialSize);
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startSize = useRef(0);

  const onMouseDown = useCallback((e) => {
    isDragging.current = true;
    startPos.current = e.clientY;
    startSize.current = size;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev) => {
      if (!isDragging.current) return;
      const delta = ev.clientY - startPos.current;
      const newSize = Math.max(minSize, Math.min(maxSize, startSize.current + delta));
      setSize(newSize);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [size, minSize, maxSize]);

  return { size, onMouseDown };
}

export default function ResizableDivider({ direction = 'horizontal', onMouseDown }) {
  const isHorizontal = direction === 'horizontal';
  return (
    <div
      onMouseDown={onMouseDown}
      className={`flex-shrink-0 ${
        isHorizontal
          ? 'w-1.5 cursor-col-resize hover:bg-sky-500/20 active:bg-sky-500/40'
          : 'h-1.5 cursor-row-resize hover:bg-sky-500/20 active:bg-sky-500/40'
      } transition-colors`}
      style={{ backgroundColor: 'rgba(35, 48, 74, 0.3)' }}
    />
  );
}
