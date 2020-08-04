/*
  Документация по Intersection Observer API https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  Для использования на публичных сайтах рекомендуется использовать полифилл https://github.com/w3c/IntersectionObserver/tree/master/polyfill
  В данном проекте полифилл подключен в файле main.js
*/

const LOG_TITLE = '[Widget Observer]:';

export default class WidgetObserver {
  constructor({
    items, widgetId,
    rowsCount, columnsCount, rowsIndents,
  }) {
    this.items = items;
    this.widgetId = widgetId;
    this.rowsCount = rowsCount;
    this.columnsCount = columnsCount;
    this.rowsIndents = rowsIndents;

    // Для последующих расчетов высоты лучше брать список с рекомендациями, а не весь виджет
    this.widgeListElement = document.querySelector(`#${widgetId} ul`);

    this.intersectionObserver = null;

    this.events = null;
    this.rows = null;
  }

  init() {
    console.log(`${LOG_TITLE} call init`);

    if (!this.widgeListElement || typeof this.widgeListElement === 'undefined') {
      console.error(`${LOG_TITLE} Not found DOM element for widget list`);
      return;
    }

    /*
      Intersection Observer в intersectionRatio возвращает процент
      попадания элемента во viewport относительно высоты элемента.
      Если высота элемента больше высоты viewport,
      то есть вероятность, что коллбек просто не сработает.
      Для такого случая нужно высчитать высоту списка с рекомендациями
      и скорректировать threshold.
    */
    const { height } = this.widgeListElement.getBoundingClientRect();
    if (!height) {
      console.error(`${LOG_TITLE} Failed to get height for widget list element`);
      return;
    }

    const thresholdCoef = window.innerHeight > height
      ? 1
      : window.innerHeight / height;

    const options = {
      root: null,
      rootMargin: '0px',
      // 50% процентов от высоты списка с рекомендациями с дополнительной коррекцией
      threshold: 0.5 * thresholdCoef,
    };

    const callback = (entries) => {
      entries.forEach((entry) => {
        console.log(`${LOG_TITLE} isIntersecting`, entry.isIntersecting);
        console.log(`${LOG_TITLE} intersectionRatio`, entry.intersectionRatio);
        if (!entry.isIntersecting || !entry.intersectionRatio) return;

        this.sendEvents();
      });
    };

    this.intersectionObserver = new IntersectionObserver(callback, options);
    this.intersectionObserver.observe(this.widgeListElement);
  }

  sendEvents() {
    // В данном случае можно сразу сформировать массив из события `w_show` и трех событий `i_show`
    const events = [
      { type: 'w_show' },
      ...this.items.map(item => ({ type: 'i_show', itemId: item.item_id })),
    ];
    /*
      И отправить их за один раз.

      aiturec('event', 'w_events', {
        widgetId: this.widget,
        events,
      });
    */
    console.log(`${LOG_TITLE} sendEvents`, events);

    // После отправки массива событий необходимо остановить наблюдение за списком рекомендаций
    this.destroy();
  }

  destroy() {
    console.log(`${LOG_TITLE} call destroy`);
    if (this.intersectionObserver && this.widgeListElement) {
      this.intersectionObserver.unobserve(this.widgeListElement);
      this.intersectionObserver = null;
    }
  }
}
