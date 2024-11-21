describe('Anonymous user spec', () => {
  before(() => {
    cy.clearCookies();
  });

  it('vists unprotected pages, and ', () => {
    cy.visit('/');

    cy.get('.navbarBtnLink').contains('Log In').should('have.attr', 'href', '/login');
    cy.get('.navbarBtnLink').contains('Create Account').should('have.attr', 'href', '/signup?page=%2Funiverses%2Fcreate');
  });
});
  