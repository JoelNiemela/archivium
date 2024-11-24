describe('User spec', () => {
  it('vists home page while logged out, follows link to create account', () => {
    cy.logout();
    cy.visit('/');

    cy.get('.navbarBtnLink').contains('Log In').should('have.attr', 'href', '/login');
    cy.get('.navbarBtnLink').contains('Create Account').should('have.attr', 'href', '/signup?page=%2Funiverses%2Fcreate').click();

    // Fill in signup form
    cy.get('#username').type(`cypressuser`);
    cy.get('#email').type(`cypressuser@archivium.net`);
    cy.get('#password').type(`cypressuser`);

    // TODO Don't actually create new user until #26 is fixed
    // cy.get('button[type="submit"]').click();

    // cy.get('h2').contains('New Universe').should('exist');
  });
});
      