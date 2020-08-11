/*
  Документация по Intersection Observer API https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  Для использования на публичных сайтах рекомендуется использовать полифилл https://github.com/w3c/IntersectionObserver/tree/master/polyfill
  В данном проекте полифилл подключен в файле main.js
*/
import throttle from 'lodash/throttle';

import getCurrentBreakpoint from './helpers/getCurrentBreakpoint';
import {
  logInfo,
  logError,
  logGroup,
  logGroupEnd,
} from './helpers/logger';

export default class WidgetObserver {
  constructor({ items, widgetId, breakpoints }) {
    this.items = items;
    this.widgetId = widgetId;
    this.breakpoints = breakpoints;

    // Для последующих расчетов высоты лучше брать список с рекомендациями, а не весь виджет
    this.widgetListElement = document.querySelector(`#${widgetId} ul`);
    this.widgetListItemsElements = this.widgetListElement.querySelectorAll('a');

    this.intersectionObserver = null;
    this.currentBreakpoint = getCurrentBreakpoint(breakpoints);

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
    this.handleResize = throttle(this.handleResize.bind(this), 500, { leading: false });
  }

  // массив рекомендаций, который нужно отправить
  get eventsForSend() {
    if (!this.events) return [];

    return Object
      .keys(this.events)
      .map(key => this.events && this.events[key])
      .filter(item => !item.isSended);
  }

  // подсчитываем все события с флагом isSended: true
  get eventsSendedCount() {
    if (!this.events) return 0;
    return Object
      .keys(this.events)
      .map(key => this.events && this.events[key])
      .filter(item => item.isSended)
      .length;
  }

  // количество рекомендаций для текущего брейкпоинта
  get itemsCountForCurrentBreakpoint() {
    if (!this.currentBreakpoint) return 0;

    const maxItems = this.currentBreakpoint.rowsCount * this.currentBreakpoint.columnsCount;
    return this.items.slice(0, maxItems).length || 0;
  }

  init() {
    logInfo('call init');

    if (!this.widgetListElement || typeof this.widgetListElement === 'undefined') {
      logError('Not found DOM element for widget list');
      return;
    }

    if (!this.currentBreakpoint) {
      logError('Not found settings for current breakpoint');
      return;
    }
    logInfo('currentBreakpoint', this.currentBreakpoint);

    this.addResizeObserver();
    this.addIntersectionObserver();

    /*
      Логика текущего примера построена на вычислении высоты всего списка с рекомендациями
      и вычислении относительно нее процента просмотра для каждой строки.

      Intersection Observer лучше с точки зрения перфоманса,
      но с учетом текущей логики не всегда будет работать корректно.
      Если высота списка с рекомендациями (например 1000px) существенно больше
      высоты окна (300px) и список с рекомендациями находится полностью во viewport,
      то коллбек обсервера вызовется один раз, а дальше на протяжении 700px
      проскролливания вызываться не будет.
      Из-за этого нельзя точно понять какие строки уже были просмотрены, а какие нет.

      В данном случае проблема решается таким образом:
      если отношение высоты списка с рекомендациями к высоте экрана больше 1.3,
      то идет подписка на событие скролла и вычисление процента просмотра виджета,
      в обратном случае используется Intersection Observer с корректировкой значений threshold.
    */
  }

  addResizeObserver() {
    logInfo('call addResizeObserver');
    if (!this.breakpoints || this.breakpoints.length <= 1) return;
    window.addEventListener('resize', this.handleResize);
  }

  addIntersectionObserver() {
    logInfo('call addIntersectionObserver');

    const { height: widgetListHeight } = this.widgetListElement.getBoundingClientRect();
    if (!widgetListHeight) {
      logError('Failed to get height for widget list element');
      return;
    }

    const windowHeight = window.innerHeight;
    const { rowsCount, rowsIndents } = this.currentBreakpoint;
    // При текущей верстке высота строк примерно одинаковая,
    // поэтому высоту элемента можно посчитать как высоту одной строки
    const widgetListItemHeight = Math
      .floor((widgetListHeight - (rowsCount - 1 * rowsIndents) / rowsCount));
    // Корректировка threshold в случае когда высота элемента больше высоты окна
    const threshold = windowHeight > widgetListItemHeight
      ? 1
      : windowHeight / widgetListItemHeight;

    const options = {
      root: null,
      rootMargin: '0px',
      // 0.5 - если 50% от высоты элемента показалось в области видимости,
      // то будет вызван коллбек Intersection Observer
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
          this.intersectionObserver.unobserve(entry.target);
          return;
        }

        // Добавляем новое событие показа рекомендации на отправку
        // и снимаем с элемента наблюдателя
        this.events = {
          ...this.events,
          [itemId]: { type: 'i_show', itemId, isSended: false },
        };
        if (this.intersectionObserver) this.intersectionObserver.unobserve(entry.target);
        logInfo('add an event "i_show" to the object "events" and call unobserve for this element');
        logGroupEnd();

        // Если есть неотправленные события, то вызываем метод их отправки
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

  handleResize() {
    logInfo('call handleResize');
    /*
      Основная логика:
      - Высчитываем брейкпоинт для нового размера окна
      - Если брекйпоинт изменился, то нужно пересчитать размеры и положение строк
      - Записываем в контекст данные по новому брейкпоинту
      - Объект events обнулять не нужно,
        так как там хранятся данные по отправленным и неотправленным событиям
     */
    const newBreakpoint = getCurrentBreakpoint(this.breakpoints);

    if (!newBreakpoint) {
      logError('Not found settings for new breakpoint');
      return;
    }

    // Если это тот же брейкпоинт, то ничего не делаем
    if (JSON.stringify(newBreakpoint) === JSON.stringify(this.currentBreakpoint)) return;
    // Если кол-во рекомендаций у нового брейкпоинта меньше, чем было уже отправлено
    // то ничего не делаем
    if (newBreakpoint.rowsCount * newBreakpoint.columnsCount <= this.eventsSendedCount) return;

    logInfo('newCurrentBreakpoint', newBreakpoint);
    this.currentBreakpoint = newBreakpoint;

    // На случай, если рейсаз произошел сразу или еще не все события отправлены
    this.removeIntersectionObserver();
    this.addIntersectionObserver();
  }

  sendEvents() {
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
    logGroup('call sendEvents');
    logInfo('events for send', events);

    // После нужно пометить отправленные события флагом isSended со значением true
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
    // то нужно удалить всех наблюдателей
    if (this.eventsSendedCount === this.items.length + 1) {
      logInfo('all events for all breakpoints sent');
      this.removeIntersectionObserver();
      this.removeResizeObserver();
      logGroupEnd();
      return;
    }

    // Если отправлены все возможные события для текущего брейкпоинта,
    // то нужно удалить наблюдатель за виджетом
    if (this.eventsSendedCount === this.itemsCountForCurrentBreakpoint + 1) {
      logInfo('all events for current breakpoint sent');
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

  removeResizeObserver() {
    logInfo('call removeResizeObserver');
    if (!this.breakpoints || this.breakpoints.length <= 1) return;
    window.removeEventListener('resize', this.handleResize);
  }

  destroy() {
    logInfo('call destroy');

    this.events = null;
    this.removeIntersectionObserver();
    this.removeResizeObserver();
  }
}
