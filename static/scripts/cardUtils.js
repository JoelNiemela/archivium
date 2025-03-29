(() => {
  function goTo(href) {
    window.location.href = href;
  }

  window.addEventListener('load', () => {
    console.log('onload')
    document.querySelectorAll('.card-list .card[data-goto]').forEach(el => {
      console.log(el, el.dataset.goto)
      el.addEventListener('click', () => {
        goTo(el.dataset.goto);
      });

      el.querySelectorAll('[href]').forEach(link => {
        link.addEventListener('click', e => e.stopPropagation());
      })
    });
  });
})();
