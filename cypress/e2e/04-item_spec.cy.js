describe('User spec', () => {
    it('tries to create duplicate item, sees error messsage', () => {
      cy.login();
      cy.visit('/universes/public-cypress-universe/items/create');
  
      cy.get('#title').type('Duplicate Bob');
      cy.get('#shortname').type('bob');
      cy.get('button[type="submit"]').click();
      cy.get('.color-error').contains('item.shortname must be unique within each universe.').should('exist');
    });
  });
      