function createSearchableSelect(id, options, onchange) {
  const input = createElement('input');
  const valueInput = createElement('input', { attrs: { id, hidden: true } });
  const optionsContainer = createElement('div', { classList: ['options-container'], children: [
    ...Object.keys(options).map(option => (
      createElement('div', { attrs: { value: option, innerText: options[option] } })
    )),
  ] });
  const select = createElement('div', { classList: ['searchable-select'], children: [
    input,
    valueInput,
    optionsContainer,
  ] });

  select.setOptions = (options) => {
    optionsContainer.innerHTML = '';
    for (const key in options) {
      optionsContainer.appendChild(createElement('div', { attrs: { value: key, innerText: options[key] } }));
    }
    setupListeners();
  };

  input.addEventListener('input', function() {
    valueInput.value = '';
    let filter = this.value.toLowerCase();
    let options = optionsContainer.querySelectorAll('div');
    options.forEach(function(option) {
      if (option.innerText.toLowerCase().includes(filter)) {
        option.style.display = '';
      } else {
        option.style.display = 'none';
      }
    });
  });

  input.addEventListener('focus', function() {
    optionsContainer.style.display = 'block';
  });

  input.addEventListener('blur', function() {
    setTimeout(function() { // Timeout to allow click event to register
      optionsContainer.style.display = 'none';
    }, 200);
  });

  function setupListeners() {
    optionsContainer.querySelectorAll('div').forEach(function(option) {
      option.addEventListener('click', function() {
        valueInput.value = this.value;
        if (onchange) onchange(this.value);
        input.value = this.innerText;
        optionsContainer.style.display = 'none';
      });
    });
  }
  setupListeners();
  
  return select;
}
