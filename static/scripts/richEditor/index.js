if (!window.createElement) throw 'domUtils not loaded!';
if (!window.createSearchableSelect) throw 'searchableSelect not loaded!';

class Node {
  constructor(parent, [type, content, children, attrs], meta={}) {
    this.parent = parent;
    this.type = type;
    this.meta = { ...meta };
    this.attrs = attrs ?? {};

    if (this.type === 'text') this.type = 'span';
    if (this.attrs.id === 'toc') meta.isToc = true;

    this.content = content;
    this.children = children.map(child => new Node(this, child, { ...meta }));
    if ('class' in this.attrs) {
      this.classes = this.attrs.class.split(' ');
      delete this.attrs.class;
    }

    this.element = null;
  }

  getHandle() {
    let hasHandle = {
      p: true,
      li: true,
      aside: true,
      h1: true,
      h2: true,
      h3: true,
      h4: true,
      h5: true,
      h6: true,
    }[this.type];

    hasHandle |= this.attrs.id === 'toc';
    hasHandle &= !this.meta.isToc;

    const offset = (
      this.type === 'li'
    ) ? '-3.5rem' : '-2.5rem';
    const offsetType = this.type === 'aside' ? 'flex-direction: row-reverse; right': 'left';

    if (hasHandle) {
      const innerDiv = createElement('div', { children: [
        createElement('button', { attrs: { innerText: '↓' } }),
        createElement('button', { attrs: { innerText: '↑' } }),
      ]});
      const el = createElement('div', {
        attrs: { style: `${offsetType}: ${offset};` },
        classList: ['editor-handle'],
        children: [ innerDiv ],
      });

      innerDiv.onmouseenter = (e) => {
        console.log('hover')
        this.element?.classList.add('selected');
      };
      innerDiv.onmouseleave = (e) => {
        console.log('hover-end')
        this.element?.classList.remove('selected');
      };

      return el;
    }
  }

  getElement() {
    const children = this.children.map(child => child.getElement());
    const handle = this.getHandle();
    if (handle) children.unshift(handle);
    this.element = createElement(this.type, {
      attrs: { ...this.attrs, innerText: this.content },
      children,
      classList: this.classes,
    });
    return this.element;
  }

  render() {
    this.parent.innerHtml = '';
    this.parent.appendChild(this.getElement());
  }
}

function loadRichEditor(data) {
  const editor = document.getElementById('richEditor');
  if (!editor) throw new Error('Editor div not found!');
  editor.classList.add('markdown');
  const nodes = new Node(editor, data);
  nodes.render();
}