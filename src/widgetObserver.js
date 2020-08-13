/*
  Документация по Intersection Observer API https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  Для использования на публичных сайтах рекомендуется использовать полифилл https://github.com/w3c/IntersectionObserver/tree/master/polyfill
  В данном проекте полифилл подключен в файле main.js
*/

/*
  Самое оптимальное решением с точки зрения производительности -
  установить Intersection Observer (IO) на весь список рекомендаций и рассчитать
  массив пороговых значений строк, при которых будет вызываться коллбек.

  Но это не подойдет для случаев, когда высота списка рекомендаций больше высоты окна,
  потому что IO высчитывает процент попадания элемента во viewport.
  Например, высота списка с рекомендациями 1000px, а высота окна - 300px,
  массив пороговых значений для трех строк - [0.2, 0.5, 0.8].
  Коллбек IO вызовется один раз в случае, когда пользователь увидел ~210px списка с рекомендациями
  (пороговое значение 0.2), а для пороговых значений 0.5 и 0.8 вызываться не будет, так как
  максимальный процент пересечения такого списка с viewport будет 300 / 1000 * 100% = 30%.
  Таким образом, понять когда пользователь увидел вторую и третью строки будет очень сложно.

  В данном примере приводится более универсальное решение
  с добавлением IO для всех рекомендаций по отдельности.
  Пороговое значение устанавливается в 0.5 (пользователь увидел 50% рекомендации),
  а для случая, когда размер рекомендации больше размера окна,
  высчитывается дополнительный корректировочный коэффициент.

  После добавления события показа рекомендации (i_show) выполняется снятие наблюдателя,
  чтобы исключить лишние вызывы коллбеков IO.
*/
import throttle from 'lodash/throttle';

import {
  logInfo,
  logError,
  logGroup,
  logGroupEnd,
} from './logger';

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
    this.widgetListElement = document.querySelector(`#${widgetId} ul`);
    this.widgetListItemsElements = this.widgetListElement.querySelectorAll('a');

    this.intersectionObserver = null;

    /*
      Объект с событиями, которые необходимо отправить или уже отправлены.

      Имеет вид:
      events = {
        key1: type: 'w_show', widgetId: 'widget_id', isSended: true,
        key2: type: 'i_show', itemId: 'item_id', isSended: false,
      };
    */
    this.events = null;

    // leading: false позволяет отменить первый моментальный вызов переданной функции
    this.sendEvents = throttle(this.sendEvents.bind(this), 2000, { leading: false });
  }

  // массив рекомендаций, который нужно отправить
  get eventsForSend() {
    if (!this.events) return [];

    return Object
      .keys(this.events)
      .map(key => this.events && this.events[key])
      .filter(item => !item.isSended);
  }

  // Подсчитываем все события с флагом isSended: true
  get eventsSendedCount() {
    if (!this.events) return 0;
    return Object
      .keys(this.events)
      .map(key => this.events && this.events[key])
      .filter(item => item.isSended)
      .length;
  }

  init() {
    logInfo('call init');

    if (!this.widgetListElement || typeof this.widgetListElement === 'undefined') {
      logError('Not found DOM element for widget list');
      return;
    }

    this.addIntersectionObserver();
  }

  addIntersectionObserver() {
    logInfo('call addIntersectionObserver');

    const { height: widgetListHeight } = this.widgetListElement.getBoundingClientRect();
    if (!widgetListHeight) {
      logError('Failed to get height for widget list element');
      return;
    }

    const windowHeight = window.innerHeight;
    // При текущей верстке высота строк примерно одинаковая,
    // поэтому высоту рекомендации можно посчитать как высоту одной строки
    const widgetListItemHeight = Math
      .floor((widgetListHeight - (this.rowsCount - 1 * this.rowsIndents) / this.rowsCount));
    // Корректировка threshold в случае когда высота элемента больше высоты окна
    const threshold = windowHeight > widgetListItemHeight
      ? 1
      : windowHeight / widgetListItemHeight;

    const options = {
      root: null,
      rootMargin: '0px',
      // 0.5 - если 50% от высоты элемента показалось в области видимости,
      // то будет вызван коллбек IO
      threshold: threshold * 0.5,
    };
    logInfo('threshold for each list item', threshold * 0.5);

    const callback = (entries) => {
      entries.forEach((entry) => {
        logGroup('Intersection Observer callback');
        logInfo('target', entry.target);
        logInfo('isIntersecting', entry.isIntersecting);
        logInfo('intersectionRatio', entry.intersectionRatio);
        if (!entry.isIntersecting || !entry.intersectionRatio) {
          logGroupEnd();
          return;
        }

        if (!this.events || !this.events[this.widgetId]) {
          // Добавляем событие показа виджета, если элемент со списком показался во viewport
          this.events = {
            ...this.events,
            [this.widgetId]: { type: 'w_show', widgetId: this.widgetId, isSended: false },
          };
        }

        const itemId = entry.target.getAttribute('data-item-id');
        if (!itemId) {
          logGroupEnd();
          return;
        }

        // Если это событие уже есть в объекте events (например после смены брейкпоинта),
        // то можно сразу удалить наблюдатель
        if (this.events && this.events[itemId] && this.intersectionObserver) {
          logInfo('the event "i_show" for this element already exists in the object "events". Calling unobserve');
          logGroupEnd();
          if (this.intersectionObserver) this.intersectionObserver.unobserve(entry.target);
          return;
        }

        // Добавляем новое событие показа рекомендации на отправку
        // и снимаем с элемента наблюдатель
        this.events = {
          ...this.events,
          [itemId]: { type: 'i_show', itemId, isSended: false },
        };
        if (this.intersectionObserver) this.intersectionObserver.unobserve(entry.target);
        logInfo('add an event "i_show" to the object "events" and call unobserve for this element');
        logGroupEnd();

        // Если есть неотправленные события,
        // то вызываем метод их отправки не чаще, чем раз в 2 секунды
        if (this.eventsForSend.length) this.sendEvents();
      });
    };

    if (!this.widgetListItemsElements || !this.widgetListItemsElements.length) {
      logError('Failed to get array elements');
      this.removeIntersectionObserver();
      return;
    }

    this.intersectionObserver = new IntersectionObserver(callback, options);
    this.widgetListItemsElements.forEach((element) => {
      this.intersectionObserver.observe(element);
    });
  }


  sendEvents() {
    logGroup('call sendEvents');
    // Убираем из массива неотправленных событий лишние данные
    const events = this.eventsForSend.map(eventForSend => ({
      type: eventForSend.type,
      // Для события `i_show` требуется передать itemId
      ...(eventForSend.itemId && { itemId: eventForSend.itemId }),
    }));
    /*
      И отправляем их

      aiturec('event', 'w_events', {
        widgetId: this.widgetId,
        events,
      });
    */
    logInfo('events for send', events);

    // После этого нужно пометить отправленные события флагом isSended со значением true
    const senededEvents = this.eventsForSend.reduce((sum, current) => ({
      ...sum,
      [current.itemId || current.widgetId]: {
        ...current,
        isSended: true,
      },
    }), this.events);

    this.events = {
      ...this.events,
      ...senededEvents,
    };

    logInfo('events object', this.events);

    // Если отправлены события для всех рекомендаций и событие показа виджета,
    // то нужно остановить наблюдение за виджетом
    if (this.eventsSendedCount === this.items.length + 1) {
      logInfo('all events for all breakpoints sent');
      this.removeIntersectionObserver();
    }

    logGroupEnd();
  }

  removeIntersectionObserver() {
    logInfo('call removeIntersectionObserver');
    if (!this.intersectionObserver) return;
    // Метод disconnect позволяет снять наблюдение со всех элементов сразу,
    // но имеет плохую поддержку
    if (this.intersectionObserver.disconnect) this.intersectionObserver.disconnect();
    else {
      if (!this.intersectionObserverElements) return;
      this.intersectionObserverElements.forEach((element) => {
        this.intersectionObserver.unobserve(element);
      });
    }
    this.intersectionObserver = null;
  }

  destroy() {
    logInfo('call destroy');

    this.events = null;
    this.widgetListElement = null;
    this.widgetListItemsElements = null;

    this.removeIntersectionObserver();
  }
}
