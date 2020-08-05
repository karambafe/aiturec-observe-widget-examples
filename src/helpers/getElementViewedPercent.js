export default function getElementViewedPercent({
  viewportTop,
  viewportBottom,
  elementTop,
  elementBottom,
}) {
  const isIntersect = viewportTop < elementBottom && viewportBottom > elementTop;
  if (!isIntersect) return 0;

  // Если element во viewport и его нижняя граница выше
  // нижней границы viewport, то он просмотрен на 100%
  if (elementBottom < viewportBottom) return 100;

  const elementHeight = elementBottom - elementTop;

  // element полностью отображается в viewport
  if (elementTop > viewportTop && elementBottom < viewportBottom) return 100;

  // Часть element скрыта сверху viewport
  if (elementTop < viewportTop && elementBottom < viewportBottom) {
    return Math.round(((elementBottom - viewportTop) / elementHeight) * 100);
  }

  // Часть element скрыта снизу viewport
  if (elementTop > viewportTop && elementBottom > viewportBottom) {
    return Math.round(((viewportBottom - elementTop) / elementHeight) * 100);
  }

  // 1. elementHeight >= viewportHeight
  // 2. element заполняет всю обасть viewport
  if (elementTop <= viewportTop && elementBottom >= viewportBottom) {
    return Math.round(((viewportBottom - elementTop) / elementHeight) * 100);
  }

  return 0;
}
