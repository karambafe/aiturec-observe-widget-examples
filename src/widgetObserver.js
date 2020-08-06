/*
  Документация по Intersection Observer API https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  Для использования на публичных сайтах рекомендуется использовать полифилл https://github.com/w3c/IntersectionObserver/tree/master/polyfill
  В данном проекте полифилл подключен в файле main.js
*/
import throttle from 'lodash/throttle';

import getRows from './helpers/getRows';
import getElementViewedPercent from './helpers/getElementViewedPercent';
import getCurrentBreakpoint from './helpers/getCurrentBreakpoint';

const LOG_TITLE = '[Widget Observer]:';

export default class WidgetObserver {
  constructor({ items, widgetId, breakpoints }) {
    this.items = items;
    this.widgetId = widgetId;
    this.breakpoints = breakpoints;

    // Для последующих расчетов высоты лучше брать список с рекомендациями, а не весь виджет
    this.widgeListElement = document.querySelector(`#${widgetId} ul`);

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
    /*
      Массив рекомендаций с разбивкой по строкам.
      Содержит threshold для каждой строки и массив itemId.

      Имеет вид:
      rows = [
        rowNumber: 1, threshold: 0.12, itemsIds: ['item_id_1', 'item_id_2', 'item_id_3'],
        rowNumber: 2, threshold: 0.33, itemsIds: ['item_id_4', 'item_id_5', 'item_id_6'],
      ];
    */
    this.rows = null;

    // leading: false позволяет отменить первый моментальный вызов переданной функции
    this.sendEvents = throttle(this.sendEvents.bind(this), 2000, { leading: false });
    this.handleScroll = throttle(this.handleScroll.bind(this), 100, { leading: false });
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
    console.log(`${LOG_TITLE} call init`);

    if (!this.widgeListElement || typeof this.widgeListElement === 'undefined') {
      console.error(`${LOG_TITLE} Not found DOM element for widget list`);
      return;
    }

    if (!this.currentBreakpoint) {
      console.error(`${LOG_TITLE} Not found settings for current breakpoint`);
      return;
    }
    console.log(`${LOG_TITLE} currentBreakpoint`, this.currentBreakpoint);

    const { height: widgetListHeight } = this.widgeListElement.getBoundingClientRect();
    if (!widgetListHeight) {
      console.error(`${LOG_TITLE} Failed to get height for widget list element`);
      return;
    }

    this.rows = getRows({
      widgetListHeight,
      rowsCount: this.currentBreakpoint.rowsCount,
      columnsCount: this.currentBreakpoint.columnsCount,
      rowsIndents: this.currentBreakpoint.rowsIndents,
      items: this.items,
    });

    if (!this.rows || !this.rows.length) {
      console.error(`${LOG_TITLE} Failed to get data for rows`);
      return;
    }

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
    const windowHeight = window.innerHeight;
    if (widgetListHeight > windowHeight && widgetListHeight / windowHeight > 1.3) {
      console.log(`${LOG_TITLE} use scroll handler`);
      console.log(`${LOG_TITLE} percents`, this.rows.map(row => row.percent));
      window.addEventListener('scroll', this.handleScroll);
      this.handleScroll();
    } else {
      console.log(`${LOG_TITLE} use Intersection Observer API`);
      this.createIntersectionObserver();
    }

    window.addEventListener('resize', this.handleResize);
  }

  createIntersectionObserver() {
    const threshold = [0.01, ...this.rows.map(row => row.threshold)];
    console.log(`${LOG_TITLE} threshold`, threshold);

    const options = {
      root: null,
      rootMargin: '0px',
      threshold,
    };

    const callback = (entries) => {
      entries.forEach((entry) => {
        console.log(`${LOG_TITLE} isIntersecting`, entry.isIntersecting);
        console.log(`${LOG_TITLE} intersectionRatio`, entry.intersectionRatio);
        if (!entry.isIntersecting || !entry.intersectionRatio) return;

        if (entry.intersectionRatio > 0.01 && (!this.events || !this.events[this.widgetId])) {
          // Добавляем событие показа виджета, если элемент со списком показался во viewport
          this.events = {
            ...this.events,
            [this.widgetId]: { type: 'w_show', widgetId: this.widgetId, isSended: false },
          };
        }

        if (!this.rows || !this.rows.length) return;
        /*
          Для каждой строки проверяем соответствие
          вычисленного для нее threshold
          и вернувшегося из коллбека intersectionRatio
        */
        this.rows.forEach((row) => {
          if (entry.intersectionRatio <= row.threshold) return;
          if (!row.itemsIds.length) return;

          row.itemsIds.forEach((itemId) => {
            // Если это событие уже есть в объекте events,
            // то повторное добавление не требуется
            if (this.events && this.events[itemId]) return;

            // Добавляем новое событие просмотра рекомендации с isSended: false
            this.events = {
              ...this.events,
              [itemId]: { type: 'i_show', itemId, isSended: false },
            };
          });
        });

        // Если есть неотправленные события, то вызываем метод их отправки
        if (this.eventsForSend.length) this.sendEvents();
      });
    };

    this.intersectionObserver = new IntersectionObserver(callback, options);
    this.intersectionObserver.observe(this.widgeListElement);
  }

  handleScroll() {
    if (!this.widgeListElement) return;
    if (!this.rows || !this.rows.length) return;

    const windowHeight = window.innerHeight;
    const scroll = window.scrollY || window.pageYOffset;

    const { height, top } = this.widgeListElement.getBoundingClientRect();
    const viewedPercent = getElementViewedPercent({
      viewportTop: scroll,
      viewportBottom: scroll + windowHeight,
      elementTop: scroll + top,
      elementBottom: scroll + top + height,
    });

    if (!viewedPercent) return;
    console.log(`${LOG_TITLE} viewedPercent`, viewedPercent);
    if (viewedPercent > 1 && (!this.events || !this.events[this.widgetId])) {
      // Добавляем событие показа виджета, если элемент со списком показался во viewport
      this.events = {
        ...this.events,
        [this.widgetId]: { type: 'w_show', widgetId: this.widgetId, isSended: false },
      };
    }

    /*
      Для каждой строки проверяем соответствие
      вычисленного для нее процента просмотра
      и общего процента просмотра виджета
    */
    this.rows.forEach((row) => {
      if (viewedPercent <= row.percent) return;
      if (!row.itemsIds.length) return;
      row.itemsIds.forEach((itemId) => {
        // Если это событие уже есть в объекте events,
        // то повторное добавление не требуется
        if (this.events && this.events[itemId]) return;

        // Добавляем новое событие просмотра рекомендации с isSended: false
        this.events = {
          ...this.events,
          [itemId]: { type: 'i_show', itemId, isSended: false },
        };
      });
    });

    // Если есть неотправленные события, то вызываем метод их отправки
    if (this.eventsForSend.length) this.sendEvents();
  }

  handleResize() {
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
      console.error(`${LOG_TITLE} Not found settings for new breakpoint`);
      return;
    }

    // Если это тот же брейкпоинт, то ничего не делаем
    if (JSON.stringify(newBreakpoint) === JSON.stringify(this.currentBreakpoint)) return;

    const { height: widgetListHeight } = this.widgeListElement.getBoundingClientRect();
    if (!widgetListHeight) {
      console.error(`${LOG_TITLE} Failed to get height for widget list element`);
      return;
    }

    this.rows = getRows({
      widgetListHeight,
      rowsCount: newBreakpoint.rowsCount,
      columnsCount: newBreakpoint.columnsCount,
      rowsIndents: newBreakpoint.rowsIndents,
      items: this.items,
    });
    console.log(`${LOG_TITLE} newCurrentBreakpoint`, newBreakpoint);
    this.currentBreakpoint = newBreakpoint;

    if (this.intersectionObserver) {
      this.intersectionObserver.unobserve(this.widgeListElement);
      this.intersectionObserver = null;

      this.createIntersectionObserver();
    } else {
      this.handleScroll();
    }

    /*
      В данном примере все обработчики будут удалены только в  случае,
      если отправлено максимальное кол-во рекомендаций для брейкпоинта 1024px - ∞,
      что может негативно сказаться пользователях с мобильных устройств и планшетов.

      В качестве дальнейшей оптимизации можно проверять
      отправлены ли все событиях в рамках текущего брейкпоинта.
      Если да, то удалять обработчики для события scroll/снимать наблюдение за виджетом.
      При смене брейкпоинта делать дополнительные проверки и,
      в случае необходимости, добавлять обработчики заново.
    */
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
    console.log(`${LOG_TITLE} call sendEvents`, events);

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

    console.log(`${LOG_TITLE} events object`, this.events);

    // Если отправлены события для всех рекомендаций и событие показа виджета,
    // то нужно остановить наблюдение за виджетом
    if (this.eventsSendedCount === this.items.length + 1) {
      console.log(`${LOG_TITLE} all events sent`);
      this.destroy();
    }
  }

  destroy() {
    console.log(`${LOG_TITLE} call destroy`);
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('resize', this.handleResize);

    if (this.intersectionObserver && this.widgeListElement) {
      this.intersectionObserver.unobserve(this.widgeListElement);
      this.intersectionObserver = null;
    }
  }
}
