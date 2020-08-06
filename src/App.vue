<template>
  <div id="app">
    <h1 style="max-width: 800px;">
      Многострочный виджет с тремя брейкпоинтами с использованием Intersection Observer API.
    </h1>

    <h3>Условия для виджета:</h3>
    <ul>
      <li>Мобильный брейкпоинт (320px-767px): 2 строки, 2 столбца, отступ между строками 10px</li>
      <li>Планшет (768px - 1023px): 3 строки, 2 столбца, отступ между строками 20px</li>
      <li>Десктоп (1024px - ∞): 4 строки, 3 столбца, отступ между строками 30px</li>
      <li>
        Рекомендации загружаются 1 раз на любом брейкпоинте с запасом.
        Лишние рекомендации скрываются стилями
      </li>
    </ul>

    <h3>Кратко о реализации:</h3>

    <ul>
      <li>Для каждой строки высчитываеся процент попадания во viewport</li>
      <li>Все события под отправку помечаются флагом isSended со значением false</li>
      <li>Метод отправки событий вызывается с троттлингом в 2 секунды</li>
      <li>У отправленных событий флагу isSended выставляется значение true</li>
      <li>
        При смене брейкпоинта пересчитываются данные
        по расположению рекомендаций в строках виджета
      </li>
    </ul>

    <p>Для тестирования нужно открыть консоль разработчика и проскроллить страницу до виджета.</p>

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
          <a href="/" class="widget__recommendation">
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
/* eslint-disable object-curly-newline */
import { LoremIpsum } from 'lorem-ipsum';
import WidgetObserver from '@/widgetObserver';

const lorem = new LoremIpsum({
  wordsPerSentence: {
    max: 10,
    min: 4,
  },
});

const WIDGET_ID = 'aiturec-widget';
const BREAKPOINTS = [
  { rowsCount: 2, columnsCount: 2, rowsIndents: 10, width: 0 },
  { rowsCount: 3, columnsCount: 2, rowsIndents: 20, width: 769 },
  { rowsCount: 4, columnsCount: 3, rowsIndents: 30, width: 1024 },
];
const ITEMS = [...Array(12).keys()].map(i => ({
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
      breakpoints: BREAKPOINTS,
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
    grid-template-columns: repeat(2, 1fr);
    grid-column-gap: 16px;
    grid-row-gap: 10px;
    margin: 0;
    padding: 0;
    list-style-type: none;
    border: 1px solid #2c3e50;

    @media (min-width: 768px) {
      grid-row-gap: 20px;
    }

    @media (min-width: 1024px) {
      grid-template-columns: repeat(3, 1fr);
      grid-row-gap: 30px;
    }
  }

  &__item {
    &:nth-child(n + 5) {
      display: none;
    }

    @media (min-width: 768px) {
      &:nth-child(n + 5) {
        display: block;
      }

      &:nth-child(n + 7) {
        display: none;
      }
    }

    @media (min-width: 1024px) {
      &:nth-child(n + 7) {
        display: block;
      }
    }
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
