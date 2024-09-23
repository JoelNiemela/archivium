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
    constructor(editor, row, insertAfter=null) {
      this.editor = editor;
      this.renderedEl = createElement('div', { attrs: { contentEditable: false } });
      if (insertAfter) {
        insertAfter.currentEl.insertAdjacentElement('afterend', this.renderedEl);
      } else {
        this.editor.container.appendChild(this.renderedEl);
      }
      this.currentEl = this.renderedEl;
      this.focused = false;
      
      if (row.src !== '@toc') {
        this.src = row.src;
        this.rawEl = createElement('div', { attrs: { contentEditable: 'plaintext-only', innerText: this.src }, classList: ['selected'] });

        this.renderedEl.onclick = (e) => {
          e.stopPropagation();
          this.editor.select(this, e.shiftKey);
        };

        this.rawEl.onclick = (e) => {
          console.log('click')
          e.stopPropagation();
        };

        this.rawEl.addEventListener('input', (e) => {
            this.setSrc(this.rawEl.innerText, false);
        });
        
        this.rawEl.addEventListener('focusout', (e) => {
            this.unfocus();
        }, true);
      }

      row.evaluate(window.contextUniverse.shortname, { item: window.item }).then((data) => {
        this.node = new MarkdownElement({ getElement: () => this.renderedEl }, data);
        this.render();
      });
    }

    getSrc() {
      return this.src;
    }

    setSrc(src, reset=true) {
      this.src = src;
      if (reset) this.rawEl.innerText = this.src;
    }

    async parse(src) {
      const rows = parseMarkdown(src).children;
      let refNode = this;
      rows.splice(1).forEach(row => {
        refNode = this.editor.addBelow(refNode, row);
      })
      const row = rows[0];
      if (!row) return false;
      this.setSrc(row.src);
      const data = await row.evaluate(window.contextUniverse.shortname, { item: window.item });
      this.node.update(data);
      return true;
    }

    async focus() {
      if (!this.focused) {
        this.rawEl.focus();
        this.editor.container.replaceChild(this.rawEl, this.currentEl);
        this.currentEl = this.rawEl;
        this.focused = true;
      }
    }

    async unfocus() {
      if (this.focused) {
        const notEmpty = await this.parse(this.getSrc());
        if (notEmpty) {
          try {
            this.editor.container.replaceChild(this.renderedEl, this.currentEl);
            this.currentEl = this.renderedEl;
            this.render();
            this.focused = false;
          } catch (err) {}
        } else {
          this.editor.delete(this);
        }
      }
    }

    render() {
      this.node.render();
    }

    remove() {
      this.currentEl = null;
      this.renderedEl.remove();
      this.rawEl.remove();
    }
  } 

  class Editor {
    constructor(container, body) {
      this.container = container;
      const rows = parseMarkdown(body).children;
      this.nodes = rows.map((row) => new EditorRowNode(this, row));
      this.selected = null;
    }

    select(node, multi) {
      if (multi && this.selected) {
        const diff = this.nodes.indexOf(node) - this.nodes.indexOf(this.selected)
        const dist = Math.abs(diff);
        const dir = Math.sign(diff);
        let start = this.nodes.indexOf(this.selected);
        for (let i = 0; i < dist; i++) {
          const curNode = this.nodes[start + dir];
          const newSrc = dir > 0 ? `${this.selected.getSrc()}\n\n${curNode.getSrc()}` : `${curNode.getSrc()}\n\n${this.selected.getSrc()}`;
          this.selected.setSrc(newSrc);
          this.delete(curNode);
          if (dir < 0) start--;
        }
      } else {
        this.unfocusAll();
        this.selected = node;
        this.selected.focus();
      }
    }

    addBelow(node, row) {
      const i = this.nodes.indexOf(node);
      const newNode = new EditorRowNode(this, row, node);
      this.nodes.splice(i + 1, 0, newNode);
      return newNode;
    }

    delete(node) {
      const i = this.nodes.indexOf(node);
      this.nodes.splice(i, 1);
      node.remove();
    }

    unfocusAll() {
      this.selected = null;
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
      editorDiv.classList.add('md-editor');
      const editor = new Editor(editorDiv, body);
      editorDiv.onmousedown = (e) => e.stopPropagation();
      window.onmousedown = () => {
        editor.unfocusAll();
      };
      window.editorObj = editor;
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