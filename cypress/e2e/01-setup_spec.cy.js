describe('Setup', () => {
  before(() => {
    cy.clearCookies();
  });

  it('vists home page, follows link to create accounts', () => {
    for (const user of ['user', 'admin', 'writer', 'reader', 'commenter']) {
      cy.visit('/');
  
      cy.get('.navbarBtnLink').contains('Log In').should('have.attr', 'href', '/login');
      cy.get('.navbarBtnLink').contains('Create Account').should('have.attr', 'href', '/signup?page=%2Funiverses%2Fcreate').click();
  
      // Fill in signup form
      cy.get('#username').type(`cypress${user}`);
      cy.get('#email').type(`cypress${user}@archivium.net`);
      cy.get('#password').type(`cypress${user}`);
  
      cy.get('button[type="submit"]').click();
  
      cy.get('h2').contains('New Universe').should('exist');

      cy.logout();
    }
  });

  it('creates new universes', () => {
    cy.login('cypressadmin');

    // Create public universe
    cy.visit('/universes/create');

    cy.get('h2').contains('New Universe').should('exist');

    cy.get('#title').type('Public Cypress Universe');
    cy.get('#shortname').type('public-cypress-universe');
    cy.get('#visibility').select('public');
    cy.get('#discussion_enabled').select('disabled');
    cy.get('#discussion_open').select('disabled');

    cy.get('button[type="submit"]').click();

    cy.get('h1').contains('Public Cypress Universe').should('exist');

    // Create private universe
    cy.visit('/universes/create');

    cy.get('h2').contains('New Universe').should('exist');

    cy.get('#title').type('Private Cypress Universe');
    cy.get('#shortname').type('private-cypress-universe');
    cy.get('#visibility').select('private');
    cy.get('#discussion_enabled').select('disabled');
    cy.get('#discussion_open').select('disabled');

    cy.get('button[type="submit"]').click();

    cy.get('h1').contains('Private Cypress Universe').should('exist');
  });

  it('creates a character "bob" in the public universe', () => {
    cy.login('cypressadmin');
    cy.visit('/universes/public-cypress-universe');

    cy.get('.item-type a').contains('Characters').parent().parent().parent().find('.cardBtn').contains('New').click();

    cy.get('h2').contains('New Item for Public Cypress Universe').should('exist');

    cy.get('#title').type('Bob');
    cy.get('#shortname').type(`bob`);
    cy.get('select#item_type option:selected').should('have.text', 'Character');

    cy.get('button[type="submit"]').click();
  });
});
    