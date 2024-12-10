let obj_data = {};
let itemMap = {};
let selectedTab = null;

if (!window.createElement) throw 'domUtils not loaded!';
if (!window.createSearchableSelect) throw 'searchableSelect not loaded!';
if (!window.modal) throw 'modal not loaded!';
if (!window.getJSON) throw 'fetchUtils.js not loaded!';
if (!window.CalendarPicker) throw 'calendarPicker.js not loaded!';
if (!window.uploadImage) throw 'fileUpload.js not loaded!';
if (!window.EasyMDE) throw 'EasyMDE not loaded!';

function getIdValue(id) {
  return document.getElementById(id).value;
}

function overwriteObjData(newState) {
  obj_data = { ...newState };
  const objDataInput = document.getElementById('obj_data');
  objDataInput.value = encodeURIComponent(JSON.stringify(obj_data));
}

function updateObjData(newState) {
  overwriteObjData({ ...obj_data, ...newState });
}

function bindDataValue(selector, setter) {
  const el = document.querySelector(selector);
  const onInput = () => {
    setter(el.value);
  };
  el.addEventListener('input', onInput);
  onInput();
}


function setupEasyMDE() {
  const textarea = document.querySelector('#body textarea');
  if (textarea) {
    textarea.parentNode.classList.remove('hidden');
    const easyMDE = new EasyMDE({
      element: textarea,
      unorderedListStyle: '-',
      sideBySideFullscreen: true,
      previewRender: (plainText, preview) => {
        renderMarkdown(universe, plainText, { item }).then((html) => {
            preview.innerHTML = html;
        });

        return 'Loading...';
      },
      toolbar: [
        'bold', 'italic', 'heading',
        '|',
        /*'code', 'quote',*/ 'unordered-list', /*'ordered-list',*/
        '|',
        'link', 'image', /*'upload-image',*/
        '|',
        'undo', 'redo',
        '|',
        'preview', 'side-by-side', 'fullscreen',
        '|',
        {
          name: 'guide',
          action: '/help/markdown',
          className: 'fa fa-question-circle',
          title: 'Markdown Guide',
        }
      ],
    });
    easyMDE.codemirror.on('change', () => {
      updateObjData({ body: easyMDE.value() });
    });
    textarea.parentNode.classList.add('hidden');
  }
}


function selectTab(name) {
  if (selectedTab) document.querySelector(`#tabs [data-tab="${selectedTab}"]`).classList.add('hidden');
  if (selectedTab) document.querySelector(`#tabs [data-tab-btn="${selectedTab}"]`).classList.remove('selected');
  document.querySelector(`#tabs [data-tab="${name}"]`).classList.remove('hidden');
  document.querySelector(`#tabs [data-tab-btn="${name}"]`).classList.add('selected');
  selectedTab = name;
}


async function addTab(type, name, force=false) {
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

  const button = createElement('li', {
    attrs: { type: 'button', onclick: () => selectTab(name) },
    classList: ['navbarBtn'],
    dataset: { tabBtn: name },
    children: [createElement('h3', { attrs: {innerText: name}, classList: ['navbarBtnLink', 'navbarText', 'ma-0'] })],
  });

  if (type !== 'body') {
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
      type === 'custom' && customTab(name),
      type === 'lineage' && lineageTab(name),
      type === 'timeline' && await timelineTab(name),
      type === 'gallery' && galleryTab(name),
    ] });
    document.querySelector('#tabs .tabs-content').appendChild(content);
  }
  document.querySelector('#tabs .tabs-buttons').appendChild(button);

  if (!force) {
    selectTab(name);
  }

  if (type !== 'custom') {
    document.querySelector(`#new_tab_type [value="${type}"]`)?.remove();
  }
}

function customTab(name) {
  return createElement('div', { children: [
    createElement('div', { classList: ['keyPairs'] }),
    createElement('button', { attrs: {
      type: 'button',
      innerText: 'Add New Key',
      onclick: () => addKeyValuePair(name, getIdValue(`${name}-new_key`)),
    } }),
    createElement('input', { attrs: { id: `${name}-new_key` } }),
  ] });
}

function lineageTab(name) {
  return createElement('div', { children: [
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
        ] })
      )),
    ] }),
    createElement('div', { children: [
      createElement('button', { attrs: {
        type: 'button',
        innerText: 'Add New Parent',
        onclick: () => {
          const val = getIdValue('new_parent');
          const data = [getIdValue('new_parent_other_data') || null, getIdValue('new_parent_self_data') || null];
          if (!val) return;
          const newState = { ...obj_data };
          if (!('parents' in newState.lineage)) newState.lineage.parents = {};
          newState.lineage.parents[val] = data;
          updateObjData(newState);
          resetTabs(name);
        },
      } }),
      createSearchableSelect('new_parent', itemMap),
      createElement('input', { attrs: { id: 'new_parent_self_data', placeholder: T('Child Title') } }),
      createElement('input', { attrs: { id: 'new_parent_other_data', placeholder: T('Parent Title') } }),
    ] }),
    createElement('div', { children: [
      createElement('button', { attrs: {
        type: 'button',
        innerText: 'Add New Child',
        onclick: () => {
          const val = getIdValue('new_child');
          const data = [getIdValue('new_child_other_data') || null, getIdValue('new_child_self_data') || null];
          if (!val) return;
          const newState = { ...obj_data };
          if (!('children' in newState.lineage)) newState.lineage.children = {};
          newState.lineage.children[val] = data;
          updateObjData(newState);
          resetTabs(name);
        },
      } }),
      createSearchableSelect('new_child', itemMap),
      createElement('input', { attrs: { id: 'new_child_self_data', placeholder: T('Parent Title') } }),
      createElement('input', { attrs: { id: 'new_child_other_data', placeholder: T('Child Title') } }),
    ] }),
  ] });
}

async function timelineTab(name) {
  return createElement('div', { children: [
    createElement('h4', { attrs: { innerText: T('Events') } }),
    ...(obj_data.timeline.events ?? []).sort((a, b) => a.time > b.time ? 1 : -1).map((event, i) => (
      createElement('div', { children: [
        ...(event.imported ? [
          createElement('span', { attrs: { innerText: `${event.title ? `${event.title} of ` : ``}${event.src}: ${event.time}` } }),
        ] : [
          createElement('input', { attrs: { value: event.title, placeholder: T('Title'), oninput: ({ target }) => {
            const newState = { ...obj_data };
            newState.timeline.events[i].title = target.value;
            updateObjData(newState);
          } } }),
          createElement('input', { attrs: { id: `${i}_event_time`, value: event.time, placeholder: T('Time'), type: 'number', oninput: ({ target }) => {
            const newState = { ...obj_data };
            newState.timeline.events[i].time = Math.round(Number(target.value));
            updateObjData(newState);
          }, onchange: ({ target }) => {
            target.value = Math.round(Number(target.value));
            resetTabs(name);
          } } }),
          ...timePickerModal(`${i}_event_time`, () => {
            const input = document.getElementById(`${i}_event_time`);
            input.oninput({ target: input });
          }),
        ]),
        createElement('button', { attrs: {
          type: 'button',
          innerText: T('Remove'),
          onclick: () => {
            const newState = { ...obj_data };
            newState.timeline.events.splice(i, 1);
            updateObjData(newState);
            resetTabs(name);
          },
        } }),
      ] })
    )),
    createElement('br'),
    createElement('h4', { attrs: { innerText: T('Add Events') } }),
    createElement('div', { classList: ['d-flex', 'flex-col', 'gap-1', 'pa-1', 'align-start'], children: [
      createElement('div', { children: [
        createElement('b', { attrs: { innerText: `${T('Title')}: ` } }),
        createElement('input', { attrs: { id: 'new_event_title' } }),
      ]}),
      createElement('div', { children: [
        createElement('b', { attrs: { innerText: `${T('Time')}: ` } }),
        createElement('input', { attrs: { id: 'new_event_time', type: 'number', onchange: ({ target }) => {
          target.value = Math.round(Number(target.value));
        } } }),
        ...timePickerModal('new_event_time'),
      ]}),
      createElement('button', { attrs: {
        type: 'button',
        innerText: T('Create New Event'),
        onclick: () => {
          const newState = { ...obj_data };
          const title = getIdValue('new_event_title');
          if (!title && newState.timeline.events?.some(({ title }) => !title)) {
            alert('Only one untitled event allowed per item!');
            return;
          }
          if (!newState.timeline.events) newState.timeline.events = [];
          newState.timeline.events.push({ title, time: getIdValue('new_event_time'), imported: false });
          updateObjData(newState);
          resetTabs(name);
        },
      } }),
    ] }),
    createElement('br'),
    createElement('div', { children: [
      ...(await importEventModal(([selectedItem, selectedEvent]) => {
        const newState = { ...obj_data };
        if (newState.timeline.imports?.some(({ item, event }) => selectedItem === item && selectedEvent === event)) return;
        if (!newState.timeline.imports) newState.timeline.imports = [];
        if (!newState.timeline.events) newState.timeline.events = [];
        newState.timeline.events.push({ ...selectedEvent, imported: true, src: selectedItem.title, srcId: selectedItem.id });
        newState.timeline.imports.push([selectedItem, selectedEvent]);
        updateObjData(newState);
        resetTabs(name);
      })),
    ] }),
  ] });
}

function galleryTab(name) {
  return createElement('div', { children: [
    createElement('div', { classList: ['item-gallery', 'd-flex', 'gap-4', 'flex-wrap'], children: [
      ...(obj_data.gallery.imgs ?? []).map(img => img ?? {}).map(({ id, url, label }, i) => (       
        createElement('div', { classList: [], children: [
          createElement('div', { classList: ['d-flex', 'gap-1'], attrs: { style: 'height: 8rem;' }, children: [
            createElement('img', { attrs: { src: url, alt: label, style: { height: '2rem' } } }),
            createElement('div', { classList: ['d-flex', 'flex-col'], children: [
              createElement('button', { attrs: {
                type: 'button',
                innerText: T('Remove Image'),
                onclick: () => {
                  const newState = { ...obj_data };
                  newState.gallery.imgs.splice(i, 1);
                  updateObjData(newState);
                  resetTabs(name);
                },
              } }),
              createElement('input', { attrs: { value: label ?? '', placeholder: 'Label', onchange: ({ target }) => {
                const newState = { ...obj_data };
                newState.gallery.imgs[i].label = target.value;
                updateObjData(newState);
              } } }),
              createElement('a', { classList: ['link', 'link-animated', 'align-self-start'], attrs: {
                href: `/api/universes/${universe}/items/${item.shortname}/gallery/images/${id}?download=1`,
                innerText: T('Download'),
              } }),
            ] }),
          ] }),
        ] })
      )),
    ] }),
    createElement('button', { attrs: {
      type: 'button',
      innerText: 'Upload Image',
      onclick: () => {
        uploadImage(`/api/universes/${universe}/items/${item.shortname}/gallery`, document.body, async (newId, newName) => {
          const url = `/api/universes/${universe}/items/${item.shortname}/gallery/images/${newId}`;
          if (!url) return;
          const newState = { ...obj_data };
          if (!('imgs' in newState.gallery)) newState.gallery.imgs = [];
          newState.gallery.imgs.push({ id: newId, url, name: newName });
          updateObjData(newState);
          resetTabs(name);
        });
      },
    } }),
  ] });
}

let eventItems = {};
let eventItemShorts = {};
let eventMap = {};
let fetchedEvents = false;
async function importEventModal(callback) {
  if (!fetchedEvents) {
    const events = await getJSON(`/api/universes/${universe}/events`);
    for (const { src_id, src_title, src_shortname, event_title, abstime } of events) {
      if (!(src_id in eventMap)) {
        eventMap[src_id] = [];
        eventItems[src_id] = src_title;
        eventItemShorts[src_id] = src_shortname;
      }
      eventMap[src_id].push([src_shortname, src_title, src_id, event_title, abstime ]);
    }
    console.log(eventMap, eventItems, eventItemShorts)
    fetchedEvents = true;
  }
  let selectedItem;
  const itemSelect = createSearchableSelect('import-event-item', eventItems, (value) => {
    selectedItem = { id: value, title: eventItems[value], shortname: eventItemShorts[value] };
    const events = eventMap[value].reduce((acc, [,,, key], i) => ({ ...acc, [i]: key || 'Default' }), {});
    eventSelect.setOptions(events);
    eventSelect.classList.remove('hidden');
  });
  let selectedEvent;
  const eventSelect = createSearchableSelect('import-event-event', eventItems, (value) => {
    const [,,, title, time] = (eventMap[selectedItem.id] ?? {})[value];
    selectedEvent = { title, time };
  });
  eventSelect.classList.add('hidden');
  return [
    modal('import-event', [
      createElement('div', { classList: ['sheet', 'd-flex', 'flex-col', 'gap-1'], children: [
        itemSelect,
        eventSelect,
        createElement('button', { attrs: {
          type: 'button',
          innerText: T('Import'), 
          onclick: () => {
            callback([selectedItem, selectedEvent]);
          },
        } }),
      ] }),
    ]),
    createElement('button', { attrs: {
      type: 'button',
      innerText: T('Import Event'), 
      onclick: () => {
        showModal('import-event');
      },
    } })
  ];
}

function timePickerModal(id, callback) {
  const cp = new CalendarPicker();
  return [
    modal(`time-picker-${id}`, [
      createElement('div', { classList: ['sheet', 'd-flex', 'flex-col', 'gap-1'], children: [
        ...cp.fields,
        createElement('button', { attrs: {
          type: 'button',
          innerText: T('Select'), 
          onclick: () => {
            document.getElementById(id).value = cp.getAbsTime();
            hideModal(`time-picker-${id}`);
            if (callback) callback();
          },
        } }),
      ] }),
    ]),
    createElement('button', { attrs: {
      type: 'button',
      innerHTML: '&#x1F4C5;', 
      onclick: () => {
        cp.setTime(Number(document.getElementById(id).value));
        showModal(`time-picker-${id}`);
      },
    } })
  ];
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
      createElement('input', { attrs: { id: inputId, name: inputId, value: startValue, oninput: () => updateKeyValue(tabName, key) } }),
    ] })
  );
}


async function resetTabs(toSelect=null) {
  document.querySelector('#tabs .tabs-buttons').innerHTML = '';
  document.querySelector('#tabs .tabs-content').innerHTML = '';
  const bodyTabName = 'Main Text';
  document.querySelector('#body').dataset.tab = bodyTabName;
  let firstTab = ('body' in obj_data) ? bodyTabName : null;
  if ('body' in obj_data) await addTab('body', bodyTabName, true);
  for (const type of ['lineage', 'location', 'timeline', 'gallery', 'comments']) {
    if (type in obj_data) {
      if (!firstTab) firstTab = type;
      await addTab(type, obj_data[type].title, true);
    }
  }
  if ('tabs' in obj_data) {
    for (const name in obj_data.tabs) {
      if (!firstTab) firstTab = name;
      await addTab('custom', name, true);
      for (const key in obj_data.tabs[name]) {
        addKeyValuePair(name, key, obj_data.tabs[name][key], true);
      }
    }
  }
  selectedTab = null;
  if (toSelect || firstTab) selectTab(toSelect ?? firstTab);
}
