const ROW_HEIGHT_PERCENT_COEF = 0.5;

export default function getRows({
  widgetListHeight,
  rowsCount,
  columnsCount,
  rowsIndents,
  items,
}) {
  const itemsIds = items.map(item => item.item_id);

  const rowIndentPercent = Math.floor((rowsIndents / widgetListHeight) * 100);
  const rowHeightPercent = Math.floor((100 - rowIndentPercent * (rowsCount - 1)) / rowsCount);

  /*
      Intersection Observer в intersectionRatio возвращает процент
      попадания элемента во viewport относительно высоты элемента.
      Если высота элемента больше высоты viewport,
      то есть вероятность, что коллбек просто не сработает.
      Для такого случая нужно высчитать высоту списка с рекомендациями
      и скорректировать threshold.
    */
  const thresholdCoef = window.innerHeight > widgetListHeight
    ? 1
    : window.innerHeight / widgetListHeight;

  const rows = [];
  for (let i = 0; i < rowsCount; i += 1) {
    const currentRowHeightPercent = rowHeightPercent * ROW_HEIGHT_PERCENT_COEF;
    // Вычисляется высота предыдущих строк с учетом отступа + половина высоты текущей строки
    const percent = (currentRowHeightPercent + rowHeightPercent * i) + rowIndentPercent * i;

    rows.push({
      rowNumber: i + 1,
      threshold: (percent / 100) * thresholdCoef,
      itemsIds: itemsIds.slice(i * columnsCount, i * columnsCount + columnsCount),
    });
  }

  return rows;
}
