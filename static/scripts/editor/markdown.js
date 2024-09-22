/**
 * Enhanced Markdown Editor
 * 
 * Built as a middle ground between the original markdown editor and the problematic rich editor.
 */

if (!window.createElement) throw 'domUtils.js not loaded!';
if (!window.createSearchableSelect) throw 'searchableSelect.js not loaded!';
if (!window.parseMarkdown) throw 'markdown/parse.js not loaded!';
if (!MarkdownElement) throw 'markdown/render.js not loaded!';

(function() {
  class EditorRowNode {
    constructor(container, data) {
      this.rowEl = createElement('div', { attrs: { contentEditable: true } });
      this.node = new MarkdownElement({ getElement: () => this.rowEl }, data);
      container.appendChild(this.rowEl);
      this.rowEl.addEventListener(
        'focusin',
        (e) => {
          e.target.classList.add('selected');
        },
        true,
      );
      this.rowEl.addEventListener(
        'focusout',
        (e) => {
          e.target.classList.remove('selected');
          e.target.ondeselect && e.target.ondeselect();
        },
        true,
      );
    }

    render() {
      this.node.render();
      const el = this.node.getElement();
      // el.
    }
  } 

  class Editor {
    constructor(container, body) {
      this.container = container;
      this.rows = parseMarkdown(body).children;
      this.nodes = [];
    }

    async render() {
      const rowData = await Promise.all(this.rows.map(row => row.evaluate(window.contextUniverse.shortname, { item: window.item })));
      this.nodes = rowData.map((row) => new EditorRowNode(this.container, row));
      for (const node of this.nodes) {
        node.render();
      }
    }
  }

  async function loadEditor(universe, body) {
    
    const saves = [];
    function save() {
      console.log('SAVE')
    }

    window.contextUniverse = universe;
    const editorDiv = document.getElementById('editor');
    if (editorDiv) {
      editorDiv.classList.add('markdown');
      editorDiv.classList.add('rich-editor');
      const editor = new Editor(editorDiv, body);
      editor.render();
      saves.push(() => {
        const markdown = editor.export().trim();
        window.item.obj_data.body = markdown;
      });
    } else {
      console.warn('Editor div not found!');
    }
  }
  window.loadEditor = loadEditor;
})();