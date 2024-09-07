
const { ADDR_PREFIX } = require('../config');
const api = require('../api');

class MarkdownNode {
  constructor(type, content, attrs={}) {
    this.type = type;
    this.content = content;
    this.attrs = attrs;
    this.children = [];
    this.parent = null;
  }

  addChild(node) {
    this.children.push(node);
    node.parent = this;
    return node;
  }

  addChildren(nodes) {
    for (const node of nodes) {
      this.addChild(node);
    }
  }

  hasChildren() {
    return this.children.length > 0;
  }

  lastChild() {
    return this.hasChildren() ? this.children[this.children.length-1] : null;
  }

  innerText() {
    return `${this.content ?? ''}${this.children.map(child => child.innerText()).join('')}`;
  }

  async evaluate(currentUniverse) {
    const classList = this.attrs?.class?.split(' ') ?? [];
    if (this.type === 'a') {
      classList.push('link');
      classList.push('link-animated');
    }
    if ('href' in this.attrs && this.attrs.href[0] === '@') {
      let [universe, itemHash] = this.attrs.href.substring(1).split('/');
      if (universe) {
        if (!itemHash) {
          itemHash = universe;
          universe = currentUniverse;
        }
        const [item, _] = itemHash.split('#');
        this.attrs.href = `${ADDR_PREFIX}/universes/${universe}/items/${itemHash}`;
        this.attrs['data-universe'] = universe;
        this.attrs['data-item'] = item;
        if (!(await api.item.exists(universe, item))) {
          classList.push('link-broken');
        }
      }
    }
    this.attrs.class = classList.join(' ');
    return [this.type, this.content, await Promise.all(this.children.map(tag => tag.evaluate(currentUniverse))), this.attrs];
  }
}

class Line {
  constructor(text) {
    this.text = text;
    this.index = 0;
  }

  next() {
    return this.text[this.index++];
  }

  peek(n=0) {
    return this.text[this.index+n];
  }

  hasNext() {
    return this.index < this.text.length;
  }

  reset(index) {
    this.index = index;
  }
}

function parseInline(line) {
  const nodes = [];
  let chunk = '';
  while (line.hasNext()) {
    const char = line.next();
    if (char === '\\') {
      chunk += line.next();
    } else if (char === '*' && line.peek() === '*') {
      nodes.push(new MarkdownNode('text', chunk));
      chunk = '';
      let boldChunk = '';
      const escaped = `${char}${line.next()}`
      let stars = 2;
      while (stars > 0 && line.hasNext()) {
        if (line.peek() === '*') {
          if (line.peek(1) !== '*' && stars === 2) stars += 1;
          else stars -= 1;
        } 
        if (stars >= 2) boldChunk += line.next();
        else line.next();
      }
      const boldNode = new MarkdownNode(
        stars === 0 ? 'b' : 'text',
        stars === 0 ? '' : escaped,
      );
      nodes.push(boldNode);
      boldNode.addChildren(parseInline(new Line(boldChunk)));
    } else if (char === '*') {
      nodes.push(new MarkdownNode('text', chunk));
      chunk = '';
      let italicsChunk = '';
      let stars = 1;
      while (stars > 0 && line.hasNext()) {
        if (line.peek() === '*') {
          if (line.peek(1) === '*' && stars === 1) {
            stars += 2;
            italicsChunk += line.next();
          }
          else stars -= 1;
        } 
        if (stars >= 1) italicsChunk += line.next();
        else line.next();
      }
      const italicsNode = new MarkdownNode(
        stars === 0 ? 'i' : 'text',
        stars === 0 ? '' : char,
      );
      nodes.push(italicsNode);
      italicsNode.addChildren(parseInline(new Line(italicsChunk)));
    } else if (char === '[') {
      const resetIndex = line.index;
      nodes.push(new MarkdownNode('text', chunk));
      chunk = '';
      while (!(line.peek() === ']' && line.peek(-1) !== '\\') && line.hasNext()) {
        chunk += line.next();
      }
      if (line.next() === ']' && line.next(1) === '(') {
        const lineNodes = parseInline(new Line(chunk));
        chunk = '';
        while (line.peek() !== ')' && line.hasNext()) {
          chunk += line.next();
        }
        if (line.next() === ')') {
          const linkNode = new MarkdownNode('a', '', { href: chunk });
          nodes.push(linkNode);
          linkNode.addChildren(lineNodes);
          chunk = '';
        } else {
          chunk = '[';
          line.reset(resetIndex);
        }
      } else {
        chunk = '[';
        line.reset(resetIndex);
      }
    } else {
      chunk += char;
    }
  }
  nodes.push(new MarkdownNode('text', chunk));

  return nodes;
}

function parseMarkdown(text) {
  const root = new MarkdownNode('div', '', { class: 'markdown' });
  let toc;
  let maxTocDepth;
  let curParagraph = new MarkdownNode('p');
  let curList = [null, -1];
  let curTocList = [null, -1];

  const lines = text.split('\n');
  for (const line of lines) {
    // console.log(line)
    const trimmedLine = line.trimStart();
    if (line[0] === '#') {
      let headingLvl = 0;
      while (line[headingLvl] === '#') headingLvl++;
      let j = headingLvl;
      let id;
      if (line[headingLvl] === '(') {
        while (line[j] !== ')' && j < line.length) j++;
        id = line.substring(headingLvl+1, j);
        j++;
      }
      if (line[j] === ' ') {
        const heading = root.addChild(new MarkdownNode(`h${headingLvl}`));
        heading.addChildren(parseInline(new Line(line.substring(j+1))));
        if (!id) {
          id = heading.innerText().toLowerCase().replaceAll(' ', '-');
        }
        heading.attrs.id = id;
        if (!toc) continue;
        if (maxTocDepth && headingLvl > maxTocDepth) continue;
        const [lastListNode, lastHeadingLvl] = curTocList;
        if (headingLvl > lastHeadingLvl) {
          const lastListItem = lastListNode ? (lastListNode.lastChild() ?? lastListNode.addChild(new MarkdownNode('li'))) : null;
          const newListNode = (lastListItem ?? toc).addChild(new MarkdownNode('ol'));
          curTocList = [newListNode, headingLvl];
        } else if (headingLvl < lastHeadingLvl) {
          let newListNode = lastListNode;
          for (i = 0; i < lastHeadingLvl - headingLvl; i++) {
            if (newListNode.parent.parent.type === 'ol') newListNode = newListNode.parent.parent;
            else break;
          }
          curTocList = [newListNode, headingLvl];
        }
        const [curListNode] = curTocList;
        curListNode.addChild(new MarkdownNode('li'));
        const tocLink = new MarkdownNode('a', heading.innerText(), { href: `#${id}` });
        curListNode.lastChild().addChild(tocLink);
      }
    } else if (trimmedLine[0] === '@') {
      const [cmd, ...args] = trimmedLine.substring(1).split(' ');
      console.log(cmd, args)
      if (cmd === 'toc') {
        toc = root.addChild(new MarkdownNode('div', '', { id: 'toc' }));
        toc.addChild(new MarkdownNode('h3', 'Table of Contents'));
        if (args.length >= 1) maxTocDepth = args[0];
      }
    } else if (trimmedLine[0] === '-' && trimmedLine[1] === ' ') {
      const indent = (line.length - trimmedLine.length) / 2;
      const [lastListNode, lastIndent] = curList;
      if (indent > lastIndent) {
        const lastListItem = lastListNode ? (lastListNode.lastChild() ?? lastListNode.addChild(new MarkdownNode('li'))) : null;
        const newListNode = (lastListItem ?? root).addChild(new MarkdownNode('ul'));
        curList = [newListNode, indent];
      } else if (indent < lastIndent) {
        let newListNode = lastListNode;
        for (i = 0; i < lastIndent - indent; i++) newListNode = newListNode.parent.parent;
        curList = [newListNode, indent];
      }
      const [curListNode] = curList;
      curListNode.addChild(new MarkdownNode('li'));
      curListNode.lastChild().addChildren(parseInline(new Line(trimmedLine.substring(2))));
    } else if (trimmedLine === '') {
      if (curParagraph.hasChildren()) root.addChild(curParagraph);
      curParagraph = new MarkdownNode('p');
      curList = [null, -1];
    } else {
      curParagraph.addChildren(parseInline(new Line(line), root));
    }
  }
  root.addChild(curParagraph);

  return root;
}

module.exports = {
  parseMarkdown,
};
