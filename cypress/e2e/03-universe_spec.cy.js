describe('User spec', () => {
  it('tries to create duplicate universe, sees error messsage', () => {
    cy.login();
    cy.visit('/universes/create');

    cy.get('#title').type('Duplicate Cypress Universe');
    cy.get('#shortname').type('public-cypress-universe');
    cy.get('button').contains('Create Universe').click();
    cy.get('.color-error').contains('universe.shortname must be unique.').should('exist');
  });
});
    