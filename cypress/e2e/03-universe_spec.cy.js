describe('Universe spec', () => {
  beforeEach(() => {
    cy.login('cypressadmin');
  });

  // it('tries to create duplicate universe, sees error messsage', () => {
  //   cy.visit('/universes/create');

  //   cy.get('#title').type('Duplicate Cypress Universe');
  //   cy.get('#shortname').type('public-cypress-universe');
  //   cy.get('button[type="submit"]').click();
  //   cy.get('.color-error').contains('universe.shortname must be unique.').should('exist');
  // });

  // it('edits the public universe title and types', () => {
  //   cy.visit('/universes/public-cypress-universe');

  //   cy.get('#info-bar').contains('Edit').click();

  //   cy.get('#title').clear().type('Alternate Title');

  //   // Remove all 9 item types
  //   for (let i = 0; i < 9; i++) {
  //     cy.get('#cats button').contains('Remove').click();
  //   }

  //   cy.get('#save-btn').click();

  //   // Confirm that title has been changed and that all item types have been removed
  //   cy.get('h1').contains('Private Cypress Universe').should('not.exist');
  //   cy.get('h1').contains('Alternate Title').should('exist');
  //   cy.get('.tabs [data-tab=items]').should('have.text', 'No item types have been defined yet — go to the edit page to add some.');

  //   cy.get('#info-bar').contains('Edit').click();

  //   // Add a new item type
  //   cy.contains('Add type').parent().as('newType');
  //   cy.get('@newType').find('[name=title]').type('test');
  //   cy.get('@newType').find('[name=titlePl]').type('tests');
  //   cy.get('@newType').find('button').click();
  //   cy.get('#save-btn').click();

  //   // Confirm that the new type exists
  //   cy.get('.item-type a').contains('Tests').should('exist');
  // });

  // it('restores the original title and types for the public universe', () => {
  //   cy.visit('/universes/public-cypress-universe');

  //   cy.get('#info-bar').contains('Edit').click();

  //   cy.get('#title').clear().type('Public Cypress Universe');
  //   cy.get('#cats button').contains('Reset to default types').click();

  //   cy.get('#save-btn').click();
  // });

  it('adds an author to the public universe', () => {
    cy.visit('/universes/public-cypress-universe');
    cy.get('#info-bar').contains('Set Permissions').click();
    cy.get('form').contains('cypresswriter').parent().find('select').select('3');
    cy.get('#breadcrumbs').contains('Public Cypress Universe').click();

    cy.get('#tabBtns').contains('Authors').click();
    cy.get('.tabs [data-tab=authors] .card').contains('cypresswriter').should('exist');
  });

  it('adds an author and a reader to the private universe', () => {
    cy.visit('/universes/private-cypress-universe');
    cy.get('#info-bar').contains('Set Permissions').click();
    cy.intercept('POST', '/universes/private-cypress-universe/permissions').as('perms');
    cy.get('form').contains('cypresswriter').parent().find('select').select('3');
    cy.wait('@perms');
    cy.get('form').contains('cypressreader').parent().find('select').select('1');
    cy.get('#breadcrumbs').contains('Private Cypress Universe').click();

    cy.get('#tabBtns').contains('Authors').click();
    cy.get('.tabs [data-tab=authors] .card').contains('cypresswriter').should('exist');
    cy.get('#tabBtns').contains('Viewers').click();
    cy.get('.tabs [data-tab=viewers] .card').contains('cypressreader').should('exist');
  });
});
    