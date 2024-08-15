function createSearchableSelect(id, options, onselect) {
    const input = createElement('input');
    const optionsContainer = createElement('div', { classList: ['options-container'], children: [
        ...Object.keys(options).map(option => (
            createElement('div', { attrs: { value: option, innerText: options[option] } })
        )),
    ] });
    const select = createElement('div', { attrs: { id }, classList: ['searchable-select'], children: [
        input,
        optionsContainer,
    ] });

    input.addEventListener('input', function() {
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

    optionsContainer.querySelectorAll('div').forEach(function(option) {
        option.addEventListener('click', function() {
            input.value = this.innerText;
            optionsContainer.style.display = 'none';
        });
    });
    
    return select;
}
