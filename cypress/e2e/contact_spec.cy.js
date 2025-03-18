describe('Contacts spec', () => {
  it('sends some contact requests', () => {
    cy.login('testuser');
    cy.get('.navbar').contains('Contacts').click();
    
    for (const user of ['writer', 'reader', 'commenter']) {
      cy.get('#username').type(`test${user}`);
      cy.contains('Add Contact').click();
    }
  });

  it('rejects contact request from admin, then sends a request back', () => {
    cy.login('testuser');
    cy.get('.navbar').contains('Contacts').click();

    cy.intercept('PUT', '/api/contacts').as('reject');
    cy.get('.card [data-user="testadmin"]').contains('Reject').click();
    cy.wait('@reject');


    cy.get('#username').type('testadmin');
    cy.contains('Add Contact').click();
  });

  it('logs in as the other users and accepts the contact requests', () => {
    for (const user of ['writer', 'reader', 'commenter', 'admin']) {
      cy.login(`test${user}`);
      cy.get('.navbar').contains('Contacts').click();
      cy.get('.card [data-user="testuser"]').contains('Accept').click();
    }
  });

  it('sees the requests are accepted, then removes them', () => {
    cy.login('testuser');
    cy.get('.navbar').contains('Contacts').click();

    for (const user of ['writer', 'reader', 'commenter', 'admin']) {
      cy.get('.card').contains(`test${user}`).should('exist');
      
      cy.intercept('DELETE', '/api/contacts').as('remove');
      cy.get(`.card [data-user="test${user}"]`).contains('Remove').click();
      cy.wait('@remove');

      cy.contains(`test${user}`).should('not.exist');
    }
  });

  it('logs in as admin, sends a contact request and sees it is pending', () => {
    cy.login('testadmin');
    cy.get('.navbar').contains('Contacts').click();

    cy.intercept('POST', '/api/contacts').as('request');
    cy.get('#username').type('testuser');
    cy.contains('Add Contact').click();
    cy.wait('@request');

    cy.get('.card').should('contain', 'testuser').and('contain', 'Pending');
  });
});
