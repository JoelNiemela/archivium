let obj_data = {};
let selectedTab = null;

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

function createElement(type, options) {
  const { attrs, classList, dataset, children } = options;
  const el = document.createElement(type);
  for (const attr in attrs ?? {}) {
    el[attr] = attrs[attr];
  }
  for (const key in dataset ?? {}) {
    el.dataset[key] = dataset[key];
  }
  for (const cl of classList ?? []) {
    el.classList.add(cl);
  }
  for (const child of children ?? []) {
    el.appendChild(child);
  }
  return el;
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
    createElement('h3', { attrs: { innerText: name } }),
    createElement('button', { attrs: { type: 'button', innerText: 'Delete Tab', onclick: () => removeTab(name) } }),
    createElement('div', { classList: ['keyPairs'] }),
    createElement('button', { attrs: {
      type: 'button',
      innerText: 'Add New Key',
      onclick: () => addKeyValuePair(name, getIdValue(`${name}-new_key`)),
    } }),
    createElement('input', { attrs: { id: `${name}-new_key` } }),
  ] });
  document.querySelector('#tabs .tabs-content').appendChild(content);

  if (!force) {
    const newState = {...obj_data};
    newState.tabs[name] = {};
    updateObjData(newState);
    selectTab(name);
  }

  if (type !== 'custom') {
    document.querySelector(`#new_tab_type [value="${type}"]`).remove();
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
  const newState = {...obj_data};
  if (!('tabs' in newState)) newState.tabs = {};
  if (!(tabName in newState.tabs)) newState.tabs[tabName] = {};
  if (!(key in newState.tabs[tabName])) newState.tabs[tabName][key] = value;
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


function resetTabs() {
  document.querySelector(`#tabs .tabs-buttons`).innerHTML = '';
  document.querySelector(`#tabs .tabs-content`).innerHTML = '';
  let firstTab = null;
  for (const name in obj_data.tabs) {
    if (!firstTab) firstTab = name;
    addTab('custom', name, true);
    for (const key in obj_data.tabs[name]) {
      addKeyValuePair(name, key, obj_data.tabs[name][key], true);
    }
  }
  selectedTab = null;
  if (firstTab) selectTab(firstTab);
}