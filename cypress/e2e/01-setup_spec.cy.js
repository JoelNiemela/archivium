describe('User spec', () => {
  before(() => {
    cy.clearCookies();
  });

  it('vists home page, follows link to create an account', () => {
    cy.visit('/');

    cy.get('.navbarBtnLink').contains('Log In').should('have.attr', 'href', '/login');
    cy.get('.navbarBtnLink').contains('Create Account').should('have.attr', 'href', '/signup?page=%2Funiverses%2Fcreate').click();

    // Fill in signup form
    cy.get('#username').type('cypressuser');
    cy.get('#email').type(`cypressuser@archivium.net`);
    cy.get('#password').type('cypressuser');

    cy.get('button').contains('Sign Up').click();

    cy.get('h2').contains('New Universe').should('exist');
  });

  it('creates new universes', () => {
    cy.login();

    // Create public universe
    cy.visit('/universes/create');

    cy.get('h2').contains('New Universe').should('exist');

    cy.get('#title').type('Public Cypress Universe');
    cy.get('#shortname').type('public-cypress-universe');
    cy.get('#visibility').select('public');
    cy.get('#discussion_enabled').select('disabled');
    cy.get('#discussion_open').select('disabled');

    cy.get('button').contains('Create Universe').click();

    cy.get('h1').contains('Public Cypress Universe').should('exist');

    // Create private universe
    cy.visit('/universes/create');

    cy.get('h2').contains('New Universe').should('exist');

    cy.get('#title').type('Private Cypress Universe');
    cy.get('#shortname').type('private-cypress-universe');
    cy.get('#visibility').select('private');
    cy.get('#discussion_enabled').select('disabled');
    cy.get('#discussion_open').select('disabled');

    cy.get('button').contains('Create Universe').click();

    cy.get('h1').contains('Private Cypress Universe').should('exist');
  });

  it('creates a character in the public universe', () => {
    cy.login();
    cy.visit('/universes/public-cypress-universe');

    cy.get('.item-type a').contains('Characters').parent().get('.cardBtn').contains('New').click();
  });
});
    