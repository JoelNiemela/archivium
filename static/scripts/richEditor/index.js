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
    } else {
      this.classes = [];
    }

    this.element = null;
  }

  move(steps) {
    const index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
    this.parent.children.splice(index + steps, 0, this);
    this.parent.render();
  }

  addBelow() {
    const index = this.parent.children.indexOf(this);
    this.parent.children.splice(index + 1, 0, new Node(this.parent, ['p', '', [], {}], { ...this.meta }));
    this.parent.render();
  }

  getHandle() {
    let hasHandle = {
      p: true,
      li: true,
      aside: true,
      div: true,
      h1: true,
      h2: true,
      h3: true,
      h4: true,
      h5: true,
      h6: true,
    }[this.type];

    hasHandle |= this.attrs.id === 'toc';
    hasHandle &= !this.meta.isToc;

    if (this.type === 'div' && this.attrs.id !== 'toc') {
      hasHandle &= this.classes.includes('img-container');
    }

    const offset = (
      this.type === 'li'
    ) ? '-4.25rem' : '-3.25rem';
    const offsetType = this.type === 'aside' ? 'flex-direction: row-reverse; right': 'left';

    if (hasHandle) {
      const innerDiv = createElement('div', { children: [
        createElement('button', { attrs: { innerText: '+', onclick: this.addBelow.bind(this) } }),
        createElement('button', { attrs: { innerText: '↑', onclick: this.move.bind(this, -1) } }),
        createElement('button', { attrs: { innerText: '↓', onclick: this.move.bind(this, 1) } }),
      ]});
      const el = createElement('div', {
        attrs: { style: `${offsetType}: ${offset};` },
        classList: ['editor-handle'],
        children: [ innerDiv ],
      });

      innerDiv.onmouseenter = (e) => {
        this.element?.classList.add('selected');
      };
      innerDiv.onmouseleave = (e) => {
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
    const prevEl = this.element;
    console.log()
    if (prevEl) this.parent.element.replaceChild(this.getElement(), prevEl);
    else this.parent.element.appendChild(this.getElement());
    console.log(prevEl, this.element)
  }
}

function loadRichEditor(data) {
  const editor = document.getElementById('richEditor');
  if (!editor) throw new Error('Editor div not found!');
  editor.classList.add('markdown');
  const nodes = new Node({ element: editor }, data);
  nodes.render();
}