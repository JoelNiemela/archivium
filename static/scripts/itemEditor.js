let obj_data = {};
let itemMap = {};
let selectedTab = null;

if (!window.createElement) throw 'domUtils not loaded!';
if (!window.createSearchableSelect) throw 'searchableSelect not loaded!';

function getIdValue(id) {
  return document.getElementById(id).value;
}

function updateObjData(newState) {
  obj_data = { ...obj_data, ...newState };
  const objDataInput = document.getElementById('obj_data');
  objDataInput.value = encodeURIComponent(JSON.stringify(obj_data));
}

function bindDataValue(selector, setter) {
  const el = document.querySelector(selector);
  el.onchange = () => {
    setter(el.value);
  };
  el.onchange();
}


function createBody() {
  updateObjData({ body: '' });
  document.querySelector('#body').appendChild(createElement('textarea'));
  bindDataValue('#body textarea', (body) => updateObjData({ body }));
  document.querySelector('#body button').remove();
}


function selectTab(name) {
  if (selectedTab) document.querySelector(`#tabs [data-tab="${selectedTab}"]`).classList.add('hidden');
  document.querySelector(`#tabs [data-tab="${name}"]`).classList.remove('hidden');
  selectedTab = name;
}


function addTab(type, name, force=false) {
  if (!('tabs' in obj_data)) obj_data.tabs = {};
  if (!name || (name in obj_data.tabs && !force)) return;

  if (!force) {
    const newState = {...obj_data};
    if (type === 'custom') newState.tabs[name] = {};
    else {
      if (!(type in newState)) newState[type] = {};
      newState[type].title = name;
    }
    updateObjData(newState);
  }

  const button = createElement('button', {
    attrs: {
      type: 'button',
      innerText: name,
      onclick: () => selectTab(name),
    },
    dataset: { tabBtn: name },
  });
  document.querySelector('#tabs .tabs-buttons').appendChild(button);

  const content = createElement('div', { classList: ['hidden'], dataset: { tab: name }, children: [
    createElement('button', { attrs: {
      type: 'button',
      innerText: 'Delete Tab',
      onclick: () => {
        if (type !== 'custom') {
          updateObjData({ [type]: {} });
        }
        removeTab(name);
      },
    } }),
    createElement('h3', { attrs: { innerText: name } }),
    type === 'custom' && createElement('div', { children: [
      createElement('div', { classList: ['keyPairs'] }),
      createElement('button', { attrs: {
        type: 'button',
        innerText: 'Add New Key',
        onclick: () => addKeyValuePair(name, getIdValue(`${name}-new_key`)),
      } }),
      createElement('input', { attrs: { id: `${name}-new_key` } }),
    ] }),
    type === 'lineage' && createElement('div', { children: [
      createElement('div', { classList: ['item-parents'], children: [
        createElement('h4', { attrs: { innerText: 'Parents' } }),
        ...Object.keys(obj_data.lineage.parents ?? {}).map((shortname) => (
          createElement('div', { children: [
            createElement('button', { attrs: {
              type: 'button',
              innerText: itemMap[shortname] ?? shortname,
              onclick: () => {
                const newState = { ...obj_data };
                delete newState.lineage.parents[shortname];
                updateObjData(newState);
                resetTabs(name);
              },
            } }),
            obj_data.lineage.parents[shortname][0]
              && createElement('span', { attrs: { innerText: obj_data.lineage.parents[shortname][0] } }),
            obj_data.lineage.parents[shortname][1]
              && createElement('span', { attrs: { innerText: obj_data.lineage.parents[shortname][1] } }),
          ] })
        )),
      ] }),
      createElement('div', { classList: ['item-children'], children: [
        createElement('h4', { attrs: { innerText: 'Children' } }),
        ...Object.keys(obj_data.lineage.children ?? {}).map((shortname) => (
          createElement('div', { children: [
            createElement('button', { attrs: {
              type: 'button',
              innerText: itemMap[shortname],
              onclick: () => {
                const newState = { ...obj_data };
                delete newState.lineage.children[shortname];
                updateObjData(newState);
                resetTabs(name);
              },
            } }),
            obj_data.lineage.children[shortname][0]
              && createElement('span', { attrs: { innerText: obj_data.lineage.children[shortname][0] } }),
            obj_data.lineage.children[shortname][1]
              && createElement('span', { attrs: { innerText: obj_data.lineage.children[shortname][1] } }),
          ] })
        )),
      ] }),
      createElement('div', { children: [
        createElement('button', { attrs: {
          type: 'button',
          innerText: 'Add New Parent',
          onclick: () => {
            const val = getIdValue('new_parent');
            const data = [getIdValue('new_parent_self_data') || null, getIdValue('new_parent_other_data') || null];
            if (!val) return;
            const newState = { ...obj_data };
            if (!('parents' in newState.lineage)) newState.lineage.parents = {};
            newState.lineage.parents[val] = data;
            updateObjData(newState);
            resetTabs(name);
          },
        } }),
        createSearchableSelect('new_parent', itemMap),
        createElement('input', { attrs: { id: 'new_parent_self_data' } }),
        createElement('input', { attrs: { id: 'new_parent_other_data' } }),
      ] }),
      createElement('div', { children: [
        createElement('button', { attrs: {
          type: 'button',
          innerText: 'Add New Child',
          onclick: () => {
            const val = getIdValue('new_child');
            const data = [getIdValue('new_child_self_data') || null, getIdValue('new_child_other_data') || null];
            if (!val) return;
            const newState = { ...obj_data };
            if (!('children' in newState.lineage)) newState.lineage.children = {};
            newState.lineage.children[val] = data;
            updateObjData(newState);
            resetTabs(name);
          },
        } }),
        createSearchableSelect('new_child', itemMap),
        createElement('input', { attrs: { id: 'new_child_self_data' } }),
        createElement('input', { attrs: { id: 'new_child_other_data' } }),
      ] }),
    ] }),
    type === 'gallery' && createElement('div', { children: [
      createElement('div', { classList: ['item-gallery', 'd-flex', 'gap-4', 'flex-wrap'], children: [
        ...(obj_data.gallery.imgs ?? []).map(({ url, label }, i) => (       
          createElement('div', { classList: [], children: [
            createElement('div', { classList: ['d-flex'], attrs: { style: 'height: 8rem;' }, children: [
              createElement('button', { attrs: {
                type: 'button',
                innerText: T('Remove Image'),
                onclick: () => {
                  const newState = { ...obj_data };
                  delete newState.gallery.imgs[i];
                  updateObjData(newState);
                  resetTabs(name);
                },
              } }),
              createElement('img', { attrs: { src: url, alt: label, style: { height: '2rem' } } }),
            ] }),
            label && createElement('span', { attrs: { innerText: label } }),
          ] })
        )),
      ] }),
      createElement('button', { attrs: {
        type: 'button',
        innerText: 'Add New Key',
        onclick: () => {
          const url = getIdValue('new_gallery_image');
          const label = getIdValue('new_gallery_image_label');
          if (!url) return;
          const newState = { ...obj_data };
          if (!('imgs' in newState.gallery)) newState.gallery.imgs = [];
          newState.gallery.imgs.push({ url, label });
          updateObjData(newState);
          resetTabs(name);
        },
      } }),
      createElement('input', { attrs: { id: 'new_gallery_image', placeholder: T('Image URL') } }),
      createElement('input', { attrs: { id: 'new_gallery_image_label', placeholder: `${T('Image Label')} (${T('Optional')})` } }),
    ] }),
  ] });
  document.querySelector('#tabs .tabs-content').appendChild(content);

  if (!force) {
    selectTab(name);
  }

  if (type !== 'custom') {
    document.querySelector(`#new_tab_type [value="${type}"]`)?.remove();
  }
}


function removeTab(name) {
  const newState = {...obj_data};
  delete newState.tabs[name];
  updateObjData(newState);
  if (Object.keys(newState.tabs).length > 0) {
    selectTab(Object.keys(newState.tabs)[0]);
  } else {
    selectedTab = null;
  }
  document.querySelector(`#tabs [data-tab="${name}"]`).remove();
  document.querySelector(`#tabs [data-tab-btn="${name}"]`).remove();
}


function updateKeyValue(tabName, key) {
  const inputId = `tab-${tabName}-${key}`;
  const value = document.getElementById(inputId).value;
  const newState = { ...obj_data };
  if (!('tabs' in newState)) newState.tabs = {};
  if (!(tabName in newState.tabs)) newState.tabs[tabName] = {};
  newState.tabs[tabName][key] = value;
  updateObjData(newState);
}


function addKeyValuePair(tabName, key, startValue='', force=false) {
  if (!key || !tabName || !(tabName in obj_data.tabs) || (key in obj_data.tabs[tabName] && !force)) return;
  const inputId = `tab-${tabName}-${key}`;
  document.querySelector(`#tabs [data-tab="${tabName}"] .keyPairs`).appendChild(
    createElement('div', { children: [
      createElement('label', { attrs: { innerText: key, for: inputId } }),
      createElement('input', { attrs: { id: inputId, name: inputId, value: startValue, onchange: () => updateKeyValue(tabName, key) } }),
    ] })
  );
}


function resetTabs(toSelect=null) {
  document.querySelector(`#tabs .tabs-buttons`).innerHTML = '';
  document.querySelector(`#tabs .tabs-content`).innerHTML = '';
  let firstTab = null;
  for (const type of ['lineage', 'location', 'chronology', 'gallery']) {
    if (type in obj_data) {
      addTab(type, obj_data[type].title, true);
    }
  }
  if ('tabs' in obj_data) {
    for (const name in obj_data.tabs) {
      if (!firstTab) firstTab = name;
      addTab('custom', name, true);
      for (const key in obj_data.tabs[name]) {
        addKeyValuePair(name, key, obj_data.tabs[name][key], true);
      }
    }
  }
  selectedTab = null;
  if (firstTab || toSelect) selectTab(toSelect ?? firstTab);
}