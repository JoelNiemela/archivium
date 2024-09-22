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
    constructor(editor, row) {
      this.editor = editor;
      this.renderedEl = createElement('div', { attrs: { contentEditable: false } });
      this.editor.container.appendChild(this.renderedEl);
      this.currentEl = this.renderedEl;
      this.focused = false;
      
      if (row.src !== '@toc') {
        this.rawEl = createElement('div', { attrs: { contentEditable: 'plaintext-only', innerText: row.src }, classList: ['selected'] });
        this.renderedEl.onclick = (e) => {
          e.stopPropagation();
          this.focus();
        };
        this.rawEl.onclick = (e) => {
          e.stopPropagation();
        };
        this.rawEl.addEventListener(
          'focusout',
          (e) => {
            this.unfocus();
          },
          true,
        );
      }

      row.evaluate(window.contextUniverse.shortname, { item: window.item }).then((data) => {
        this.node = new MarkdownElement({ getElement: () => this.renderedEl }, data);
        this.render();
      });
    }

    async parse(src) {
      const row = parseMarkdown(src).children[0];
      const data = await row.evaluate(window.contextUniverse.shortname, { item: window.item });
      this.node.update(data);
    }

    async focus() {
      if (!this.focused) {
        this.editor.unfocusAll();
        this.rawEl.focus();
        this.editor.container.replaceChild(this.rawEl, this.currentEl);
        this.currentEl = this.rawEl;
        this.focused = true;
      }
    }

    async unfocus() {
      if (this.focused) {
        await this.parse(this.rawEl.innerText);
        this.editor.container.replaceChild(this.renderedEl, this.currentEl);
        this.currentEl = this.renderedEl;
        this.render();
        this.focused = false;
      }
    }

    render() {
      this.node.render();
    }
  } 

  class Editor {
    constructor(container, body) {
      this.container = container;
      this.rows = parseMarkdown(body).children;
      this.nodes = this.rows.map((row) => new EditorRowNode(this, row));
    }

    unfocusAll() {
      this.nodes.forEach(node => node.unfocus());
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
      // window.onclick = () => {
      //   editor.unfocusAll();
      // };
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