const randomValue = Math.random().toString(36).substring(2, 8);
const username = `user_${randomValue}`;
const email = `test_${randomValue}@example.com`;

describe('User spec', () => {
  before(() => {
    cy.clearCookies();
  });

  it('vists home page, follows link to create an account', () => {
    cy.visit('/');

    cy.get('.navbarBtnLink').contains('Log In').should('have.attr', 'href', '/login');
    cy.get('.navbarBtnLink').contains('Create Account').should('have.attr', 'href', '/signup?page=%2Funiverses%2Fcreate').click();

    // Fill in signup form
    cy.get('#username').type(username);
    cy.get('#email').type(email);
    cy.get('#password').type(username);

    cy.contains('Sign Up').click();
  });
});
    