if (!window.createElement) throw 'domUtils not loaded!';
if (!window.createSearchableSelect) throw 'searchableSelect not loaded!';

function serializeElement(element) {

  if (element.nodeType === 1) {
    const children = [];
    const attrs = {};

    for (let attr of element.attributes) {
      attrs[attr.name] = attr.value;
    }

    for (const child of element.childNodes) {
      children.push(serializeElement(child));
    }

    return [element.tagName.toLowerCase(), children.length ? '' : element.innerText, children, attrs];
  } else {
    return ['text', element.nodeValue, [], {}];
  }

}

class Node {
  constructor(parent, data, meta={}) {
    this.parent = parent;
    this.update(data, meta);
  }
  
  update([type, content, children, attrs], meta={}) {
    this.type = type;
    this.attrs = attrs ?? {};
    this.meta = { ...meta };

    if (this.type === 'text') this.type = 'span';
    if (this.attrs.id === 'toc') meta.isToc = true;
    if (this.type === 'a') meta.isLink = true;

    this.content = content;
    this.children = children.map(child => new Node(this, child, { ...meta }));

    if ('class' in this.attrs) {
      this.classes = this.attrs.class.split(' ');
      delete this.attrs.class;
    } else {
      this.classes = [];
    }

    this.element = null;
    this.handle = null;
  }

  getHref() {
    if (!this.attrs.href) return '';
    if ('data-universe' in this.attrs) {
      if ('data-item' in this.attrs) {
        if (this.attrs['data-universe'] === window.universe) return `@${this.attrs['data-item']}`;
        else return `@${this.attrs['data-universe']}/${this.attrs['data-item']}`;
      }
    }
  }

  export() {
    if (this.type === 'img') {
      const isAlone = this.parent.classes.includes('img-container');
      let suf = isAlone ? '' : '@';
      let pref = isAlone ? '\n' : '';
      if (this.attrs.raw) return `${pref}@img ${this.attrs.raw.args.join(' ')}${suf}`;
      else return `![${this.attrs.alt}](${this.attrs.src})`;
    } else if (this.attrs.id === 'toc') {
      return `\n@toc`;
    } else {
      const content = this.children.map(child => child.export()).join('') + (this.content ?? '');
      const surround = {
        b: '**',
        i: '*',
      }[this.type] ?? '';
      const pref = {
        ul: '\n',
        p: '\n',
        h1: '\n# ',
        h2: '\n## ',
        h3: '\n### ',
        h4: '\n#### ',
        h5: '\n##### ',
        h6: '\n###### ',
        aside: '\n@aside\n',
        li: '\n- ',
        a: '[',
      }[this.type] ?? '';
      const suf = {
        p: '\n',
        aside: '\n\n@aside-end\n',
        a: `](${this.getHref()})`,
      }[this.type] ?? '';
      let result = `${pref}${surround}${content}${surround}${suf}`;
      return result;
    }
  }

  save() {
    this.parent.save();
  }

  move(steps) {
    const index = this.parent.children.indexOf(this);
    this.parent.children.splice(index, 1);
    this.parent.children.splice(index + steps, 0, this);
    this.parent.render();
    this.save();
  }

  addBelow() {
    const index = this.parent.children.indexOf(this);
    this.parent.children.splice(index + 1, 0, new Node(this.parent, ['p', '', [], {}], { ...this.meta }));
    this.parent.render();
  }

  isInline() {
    return !({
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
    }[this.type]);
  }

  getHandle() {
    let hasHandle = !this.isInline();

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
        attrs: { style: `${offsetType}: ${offset};`, contentEditable: false },
        classList: ['editor-handle'],
        children: [ innerDiv ],
      });

      innerDiv.onmouseenter = (e) => {
        this.innerEl?.classList.add('selected');
      };
      innerDiv.onmouseleave = (e) => {
        this.innerEl?.classList.remove('selected');
      };

      return el;
    }
  }

  isEditable() {
    return !({
      ul: true,
      div: true,
      aside: true,
      a: true,
      // span: this.meta.isLink,
    }[this.type] || this.attrs.id === 'toc' || this.meta.isToc);
  }

  makeElement() {
    const children = this.children.map(child => child.makeElement());
    const handle = this.getHandle();
    const innerEl = createElement(this.type, {
      attrs: { ...this.attrs, innerText: this.content, contentEditable: this.isEditable()/* && 'plaintext-only'*/ },
      children,
      classList: this.classes,
    });

    if (this.isEditable()) {
      innerEl.ondeselect = () => {
        this.parent.render();
        this.save();
      };

      innerEl.oninput = () => {
        this.update(serializeElement(innerEl), this.meta);
        console.log(this)
      };
    }

    if (handle) {
      this.handle = handle;
      this.innerEl = innerEl;
      this.element = createElement('div', { children: [ handle, innerEl ]});
    }
    else this.element = innerEl;
    return this.element;
  }

  getElement() {
    return this.innerEl ?? this.element;
  }

  postRender() {
    if (this.handle) {
      const { marginTop, paddingTop, marginRight } = window.getComputedStyle(this.innerEl);
      this.handle.style.top = `calc(${marginTop ?? 0} + ${paddingTop ?? 0})`;
      if (this.handle.style.right) {
        this.handle.style.right = `calc(${this.handle.style.right} + ${marginRight ?? 0})`;
      }
    }
    this.children.forEach(child => child.postRender());
  }

  render() {
    const prevEl = this.element;
    if (prevEl) this.parent.getElement().replaceChild(this.makeElement(), prevEl);
    else this.parent.getElement().appendChild(this.makeElement());
    this.postRender();
  }
}

function loadRichEditor(universe, data) {

  function save() {
    console.log('SAVE');
    const markdown = nodes.export().trim();
    window.item.obj_data.body = markdown;
  }

  window.universe = universe;
  const editor = document.getElementById('richEditor');
  if (!editor) throw new Error('Editor div not found!');
  editor.classList.add('markdown');
  const nodes = new Node({ getElement: () => editor, save }, data);
  nodes.render();

  editor.addEventListener(
    'focusin',
    (e) => {
      e.target.classList.add('selected');
    },
    true,
  );
  editor.addEventListener(
    'focusout',
    (e) => {
      e.target.classList.remove('selected');
      e.target.ondeselect && e.target.ondeselect();
    },
    true,
  );
}