export default function getCurrentBreakpoint(breakpoints) {
  if (!breakpoints.length) return null;
  if (breakpoints.length === 1) return breakpoints[0];

  const windowWidth = window.innerWidth;

  /*
    1. Сортируем все брейпоинты по ширине
    2. Добавляем для каждого minWidth и maxWidth для определения текущего брейкпоинта
    3. Высчитываем количество рекомендаций count, которые будут видны пользователю
  */
  return breakpoints
    .sort((current, next) => current.width - next.width)
    .map((breakpoint, index) => ({
      ...breakpoint,
      width: breakpoint.width,
      count: breakpoint.columnsCount * breakpoint.rowsCount,
      minWidth: breakpoint.width,
      maxWidth: index === breakpoints.length - 1
        ? 100000
        : breakpoints[index + 1].width - 1,
    }))
    .find(item => item.minWidth <= windowWidth && windowWidth <= item.maxWidth) || null;
}
