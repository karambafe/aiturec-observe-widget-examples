<template>
  <div id="app">
    <h1 style="max-width: 800px;">
      Виджет в одну строку с использованием Intersection Observer API
    </h1>

    <div class="widget">
      <h3 class="widget__title">Читайте также:</h3>

      <ul class="widget__list">
        <li
          v-for="item in items"
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
const items = [
  { item_id: '1', title: 'Lorem ipsum dolor sit amet', image_url: 'https://picsum.photos/300/300?random=1' },
  { item_id: '2', title: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit', image_url: 'https://picsum.photos/300/300?random=2' },
  { item_id: '3', title: 'Lorem ipsum dolor sit amet, consectetur ', image_url: 'https://picsum.photos/300/300?random=3' },
];

export default {
  name: 'app',
  data: () => ({ items }),
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

  &__title {
    margin-bottom: 10px;
  }

  &__list {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-column-gap: 16px;
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
    padding-top: 100%;
    background-size: cover;
    background-repeat: no-repeat;
  }
}
</style>
