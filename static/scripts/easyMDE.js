if (!window.EasyMDE) throw 'EasyMDE not loaded!';

function setupEasyMDE(selector, renderContext = {}, extraSettings = {}) {
  const { universe, context } = renderContext;
  const textarea = document.querySelector(selector);
  if (textarea) {
    return new EasyMDE({
      element: textarea,
      unorderedListStyle: '-',
      sideBySideFullscreen: true,
      autoRefresh: { delay: 300 },
      previewRender: (plainText, preview) => {
        renderMarkdown(universe, plainText, context).then((html) => {
            preview.innerHTML = html;
        });

        return 'Loading...';
      },
      toolbar: [
        'bold', 'italic', 'heading',
        '|',
        /*'code', 'quote',*/ 'unordered-list', /*'ordered-list',*/
        '|',
        'link', 'image', /*'upload-image',*/
        '|',
        'undo', 'redo',
        '|',
        'preview', 'side-by-side', 'fullscreen',
        '|',
        {
          name: 'guide',
          action: '/help/markdown',
          className: 'fa fa-question-circle',
          title: 'Markdown Guide',
        }
      ],
      ...extraSettings,
    });
  }
}
