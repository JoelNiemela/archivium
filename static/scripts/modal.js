if (!window.createElement) throw 'domUtils.js not loaded!';

(function() {
  const modals = {};

  function modal(id, children) {
    if (id in modals) modals[id].remove();
    if (!(children instanceof Array)) children = [children];
    const newModal = createElement('div', { attrs: {
      id,
      onclick: () => hideModal(id),
    }, classList: ['modal', 'hidden'], children: [
      createElement('div', { classList: ['modal-content'], attrs: {onclick: (e) => e.stopPropagation()}, children }),
    ] });
    modals[id] = newModal;
    return newModal;
  }

  function showModal(id) {
    modals[id].classList.remove('hidden');
  }

  function hideModal(id) {
    modals[id].classList.add('hidden');
  }

  window.modal = modal;
  window.showModal = showModal;
  window.hideModal = hideModal;
})();
