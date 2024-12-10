if (!window.createElement) throw 'domUtils.js not loaded!';

(function() {
  const modals = {};

  function modal(id, children, show=false) {
    if (id in modals) removeModal(id);
    if (!(children instanceof Array)) children = [children];
    const newModal = createElement('div', { attrs: {
      id,
      onclick: () => hideModal(id),
    }, classList: ['modal', 'hidden'], children: [
      createElement('div', { classList: ['modal-content'], attrs: {onclick: (e) => e.stopPropagation()}, children }),
    ] });
    modals[id] = newModal;
    if (show) showModal(id);
    return newModal;
  }

  function showModal(id) {
    modals[id].classList.remove('hidden');
  }

  function hideModal(id) {
    modals[id].classList.add('hidden');
  }

  function removeModal(id) {
    modals[id].remove();
  }

  function loadModal(id, show=false) {
    const modalEl = document.getElementById(id);
    modalEl.classList.add('modal', 'hidden');
    modalEl.addEventListener('click', () => hideModal(id));
    const content = modalEl.children;
    modalEl.innerHTML = '';
    modalEl.appendChild(createElement('div', { classList: ['modal-content'], attrs: {onclick: (e) => e.stopPropagation()}, children: content }));
    if (show) showModal(id);
  }

  window.modal = modal;
  window.showModal = showModal;
  window.hideModal = hideModal;
  window.removeModal = removeModal;
  window.loadModal = loadModal;
})();
