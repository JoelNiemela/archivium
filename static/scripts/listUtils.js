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
  
  const url = new URL(window.location);
  if (url.searchParams.has('sort')) {
    document.getElementById('sort').value = url.searchParams.get('sort');
    document.getElementById('sort_order').value = url.searchParams.get('sort_order');
  }

  const handleSort = () => {
    const url = new URL(window.location);
    url.searchParams.set('sort', document.getElementById('sort').value);
    url.searchParams.set('sort_order', document.getElementById('sort_order').value);
    history.pushState(null, '', url);
    location.reload();
  };
  document.getElementById('sort').onchange = handleSort;
  document.getElementById('sort_order').onchange = handleSort;
});
