function toggleFilter(key, value) {
  const url = new URL(window.location);
  if (url.searchParams.has(key) && url.searchParams.get(key) === value) {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }
  history.pushState(null, '', url);
  location.reload();
}

window.addEventListener('load', () => {
  document.querySelectorAll('.filter').forEach((filter) => {
    filter.onclick = (e) => {
      e.stopPropagation();
      console.log(filter.dataset)
      toggleFilter(filter.dataset.filterKey, filter.dataset.filterValue);
    };
  });
});