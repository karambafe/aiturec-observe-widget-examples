const LOG_TITLE = '[Widget Observer]:';

export default class WidgetObserver {
  constructor({ items, widgetId }) {
    this.items = items;
    this.widgetId = widgetId;

    // Для последующих расчетов высоты лучше брать список с рекомендациями, а не весь виджет
    this.widgeListElement = document.querySelector(`#${widgetId} ul`);

    this.intersectionObserver = null;
  }

  init() {
    console.log(`${LOG_TITLE} call init`);

    if (!this.widgeListElement || typeof this.widgeListElement === 'undefined') {
      console.error('Not found DOM element');
      return;
    }

    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5,
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
    const events = [
      { type: 'w_show' },
      ...this.items.map(item => ({ type: 'i_show', itemId: item.item_id })),
    ];
    console.log(`${LOG_TITLE} sendEvents`, events);

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
