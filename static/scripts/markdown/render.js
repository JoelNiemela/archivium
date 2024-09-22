class MarkdownElement {
  constructor(parent, data, meta={}) {
    this.parent = parent;
    this.update(data, meta);
  }
  
  update([type, content, children, attrs], meta={}) {
    this.type = type;
    this.attrs = attrs ?? {};
    this.dataset = {};
    for (const key in this.attrs) {
      if (key.startsWith('data-')) {
        this.dataset[key.replace('data-', '')] = this.attrs[key];
        delete this.attrs[key];
      }
    }
    this.meta = { ...meta };

    if (this.type === 'text') this.type = 'span';
    if (this.attrs.id === 'toc') meta.isToc = true;
    if (this.type === 'a') meta.isLink = true;

    this.content = content;
    this.children = children.map(child => new this.constructor(this, child, { ...meta }));

    if ('class' in this.attrs) {
      this.classes = this.attrs.class.split(' ');
      delete this.attrs.class;
    } else {
      this.classes = [];
    }

    this.element = null;
    this.handle = null;
  }

  makeElement() {
    const children = this.children.map(child => child.makeElement());
    this.element = createElement(this.type, {
      attrs: { ...this.attrs, innerText: this.content },
      dataset: this.dataset,
      children,
      classList: this.classes,
    });

    return this.element;
  }

  getElement() {
    return this.element;
  }

  render() {
    const prevEl = this.element;
    if (prevEl) this.parent.getElement().replaceChild(this.makeElement(), prevEl);
    else this.parent.getElement().appendChild(this.makeElement());
  }
}

function loadMarkdown(container, universeShortname, body, ctx, frmt) {
  parseMarkdown(body).evaluate(universeShortname, ctx, frmt).then(data => {
    container.classList.add('markdown');
    const nodes = new MarkdownElement({ getElement: () => container }, data);
    nodes.render();
  });
}