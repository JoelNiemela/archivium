if (!window.modal) throw 'modal not loaded!';
if (!window.getJSON) throw 'fetchUtils.js not loaded!';
if (!window.createElement) throw 'domUtils.js not loaded!';

function uploadImage(container, callback) {
  const imageInput = createElement('input', { attrs: { type: 'file', accept: 'image/*', required: true } });

  container.appendChild(modal('upload-image-modal', [
    createElement('div', { classList: ['sheet', 'd-flex', 'flex-col', 'gap-1', 'align-center'], children: [
      createElement('h2', { attrs: {
        innerText: 'Upload Image',
      } }),
      imageInput,
      createElement('button', { attrs: {
        type: 'button',
        innerText: T('Upload'), 
        onclick: async () => {
          const image = imageInput.files[0];
          const response = await postFormData('/upload', { image });
          const data = await response.json();
          callback(data.insertId);
          removeModal('upload-image-modal');
        },
      } }),
    ] }),
  ], true));
}
