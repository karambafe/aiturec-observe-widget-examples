<template>
  <div id="app">
    <h1 style="max-width: 800px;">
      Многострочный виджет с использованием Intersection Observer API.
    </h1>

    <h3>Условия для виджета:</h3>
    <ul>
      <li>На всех брейкпоинтах имеет одинаковый вид</li>
      <li>Состоит из четырех строк и трех столбцов</li>
      <li>Отступы между строками 20px</li>
    </ul>

    <h3>Кратко о реализации:</h3>

    <ul>
      <li>
        Для каждой рекомендации добавляется наблюдатель
        попадания во viewport (Intersection Observer)
      </li>
      <li>
        При срабатывании коллбека наблюдателя рекомендации, добавляется новое событие на отправку
        co значением false, а сам наблюдатель с рекомендации снимается
      </li>
      <li>Метод отправки событий вызывается с троттлингом в 2 секунды</li>
      <li>У отправленных событий выставляется значение true</li>
      <li>Если отправлены все события, то снимаются наблюдатели со всех рекомендаций.</li>
    </ul>

    <p>
      Для тестирования нужно открыть консоль разработчика
      (лучше в отдельном окне браузера, так как консоль codesanbox
      не поддерживет группировку логов)
      и проскроллить страницу до виджета.
    </p>

    <div
      :id="WIDGET_ID"
      class="widget"
    >
      <h3 class="widget__title">Читайте также:</h3>

      <ul class="widget__list">
        <li
          v-for="item in ITEMS"
          :key="item.item_id"
          class="widget__item"
        >
          <a
            href="/"
            class="widget__recommendation"
            :data-item-id="item.item_id"
            onclick="return false;"
          >
            <span
              class="widget__recommendation-image"
              :style="{ backgroundImage: `url(${item.image_url})` }"
            />
            <span class="widget__recommendation-title">{{ item.title }}</span>
           </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
import { LoremIpsum } from 'lorem-ipsum';
import WidgetObserver from '@/widgetObserver';

const lorem = new LoremIpsum({
  wordsPerSentence: {
    max: 10,
    min: 4,
  },
});

const WIDGET_ID = 'aiturec-widget';
const ROWS_COUNT = 4;
const COLUMNS_COUNT = 3;
const ROWS_INDENTS = 20;
const ITEMS = [...Array(ROWS_COUNT * COLUMNS_COUNT).keys()].map(i => ({
  item_id: String(i + 1),
  title: lorem.generateSentences(1),
  image_url: `https://picsum.photos/300/300?random=${i + 1}`,
}));

export default {
  name: 'app',
  data: () => ({
    ITEMS,
    WIDGET_ID,
  }),
  mounted() {
    this.widgetObserver = new WidgetObserver({
      widgetId: WIDGET_ID,
      items: ITEMS,
      rowsCount: ROWS_COUNT,
      columnsCount: COLUMNS_COUNT,
      rowsIndents: ROWS_INDENTS,
    });
    this.widgetObserver.init();
  },
  beforeDestroy() {
    this.widgetObserver.destroy();
  },
};
</script>

<style lang="scss">
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  max-width: 800px;
  margin: 0 auto;
  padding: 8px;
}

.widget {
  margin-top: 80vh;
  margin-bottom: 100vh;

  &__title {
    margin-bottom: 10px;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-column-gap: 16px;
    grid-row-gap: 20px;
    margin: 0;
    padding: 0;
    list-style-type: none;
    border: 1px solid #2c3e50;
  }

  &__recommendation {
    color: #2c3e50;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__recommendation-image {
    display: block;
    width: 100%;
    height: 150px;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
  }
}
</style>
