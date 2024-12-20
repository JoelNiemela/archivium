const timelineEvents = 7;

describe('Item spec', () => {
  beforeEach(() => {
    cy.login('testadmin');
  });

  it('tries to create duplicate item, sees error messsage', () => {
    cy.visit('/universes/public-test-universe/items/create');

    cy.get('#title').type('Duplicate Character');
    cy.get('#shortname').clear().type('test-character');
    cy.get('button[type="submit"]').click();
    cy.get('.color-error').contains('item.shortname must be unique within each universe.').should('exist');
  });

  it('adds a link from the test character to the test event, then follows it', () => {
    cy.visit('/universes/public-test-universe/items/test-character?tab=body');
    cy.get('#action-bar').contains('Edit').click();

    cy.get('#body textarea').then(editor => {
      const oldContent = editor.val();

      cy.get('#body textarea').clear();
      cy.get('#body textarea').type('Here is a [test link](@test-event).');
      cy.get('#save-btn').click();

      cy.get('[data-tab="body"]').should('contain', 'Here is a test link.');
      cy.get('[data-tab="body"] a').contains('test link').click();

      cy.get('h1').contains('Test Event').should('exist');
      cy.url().should('include', '/universes/public-test-universe/items/test-event');

      cy.visit('/universes/public-test-universe/items/test-character/edit');
      cy.get('#body textarea').clear();
      cy.get('#body textarea').type(oldContent);
      cy.get('#save-btn').click();
    });
  });

  it('adds an event to the timline, then removes it', () => {
    cy.visit('/universes/public-test-universe/items/test-timeline?tab=timeline');
    cy.get('.timeline>.flex-col').children().should('have.length', timelineEvents);
    cy.get('#action-bar').contains('Edit').click();

    cy.get('.tabs-buttons').contains('Timeline').click();
    cy.get('#new_event_title').type('Cypress Event');
    cy.get('#new_event_time').siblings('button').click();
    cy.get('#time-picker-new_event_time input').first().type('2004');
    cy.get('#time-picker-new_event_time button').click();
    cy.get('[data-tab="Timeline"] button').contains('Create New Event').click();
    cy.get(`#${timelineEvents}_event_time`).siblings('input').should('have.value', 'Cypress Event');
    cy.get('#save-btn').click();

    cy.visit('/universes/public-test-universe/items/test-timeline?tab=timeline');
    cy.get('.timeline>.flex-col').children().should('have.length', timelineEvents + 1);
    cy.get('.timeline>.flex-col>div').first().should('contain', 'January 1st 2004, 0:00 — Cypress Event');
    cy.get('#action-bar').contains('Edit').click();

    cy.get('.tabs-buttons').contains('Timeline').click();
    cy.get(`#${timelineEvents}_event_time`).siblings('button').contains('Remove').click();
    cy.get('#save-btn').click();

    cy.visit('/universes/public-test-universe/items/test-timeline?tab=timeline');
    cy.get('.timeline>.flex-col').children().should('have.length', timelineEvents);
  });

  // TODO Reenable this and the following test once #73 is fixes
  // it('adds an event to an item, then imports it to the timeline', () => {
  //   cy.visit('/universes/public-test-universe/items/test-event/edit');

  //   cy.get('.tabs-buttons').contains('Timeline').click();
  //   cy.get('#new_event_title').type('Cypress Event');
  //   cy.get('#new_event_time').siblings('button').click();
  //   cy.get('#time-picker-new_event_time input').first().type('2007');
  //   cy.get('#time-picker-new_event_time button').click();
  //   cy.get('[data-tab="Timeline"] button').contains('Create New Event').click();
  //   cy.get('#save-btn').click();

  //   cy.visit('/universes/public-test-universe/items/test-timeline/edit');

  //   cy.get('.tabs-buttons').contains('Timeline').click();
  //   cy.get('[data-tab="Timeline"] button').contains('Import Event').click();
  //   cy.get('#import-event-item').siblings('input').type('Test Event');
  //   cy.get('#import-event-item').siblings('div').find('div').filter(':visible').first().click();
  //   cy.get('#import-event-event').siblings('input').type('Cypress Event');
  //   cy.get('#import-event-event').siblings('div').find('div').filter(':visible').first().click();
  //   cy.get('#import-event button').contains('Import').click();
  //   cy.get('#save-btn').click();

  //   cy.visit('/universes/public-test-universe/items/test-timeline?tab=timeline');
  //   cy.get('.timeline>.flex-col').children().should('have.length', timelineEvents + 1);
  //   cy.get('.timeline>.flex-col>div').first().should('contain', 'January 1st 2007, 0:00 — Cypress Event of Test Event');
  // });

  // it('deletes the event and sees that it is removed from the timeline that imported it as well', () => {
  //   cy.visit('/universes/public-test-universe/items/test-event/edit');

  //   cy.get('.tabs-buttons').contains('Timeline').click();
  //   cy.get('input').filter((k, el) => el.value === 'Cypress Event').siblings('button').contains('Remove').click();
  //   cy.get('#save-btn').click();

  //   cy.visit('/universes/public-test-universe/items/test-timeline?tab=timeline');
  //   cy.get('.timeline>.flex-col').children().should('have.length', timelineEvents);
  //   cy.get('.timeline>.flex-col>div').first().should('not.contain', 'January 1st 2007, 0:00 — Cypress Event of Test Event');
  // });

  it('goes to create a new item, sees that the correct type is preselected', () => {
    cy.visit('/universes/public-test-universe');

    cy.get('.item-type a').contains('Characters').parent().parent().parent().find('.cardBtn').contains('New').click();-

    cy.get('h2').contains('New Item for Public Test Universe').should('exist');

    cy.get('#title').type('Cypress Character');
    cy.get('#shortname').should('have.text', 'cypress-character');
    cy.get('select#item_type option:selected').should('have.text', 'Character');

    // TODO Don't actually create the item unil #70 is added.
    // cy.get('button[type="submit"]').click();
  });
});
