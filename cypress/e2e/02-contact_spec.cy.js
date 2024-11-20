describe('Contacts spec', () => {
  it('logs in as admin and sends some cotact requests', () => {
    cy.login('cypressadmin');
    cy.get('.navbar').contains('Contacts').click();
    
    for (const user of ['user', 'writer', 'reader', 'commenter']) {
      cy.get('#username').type(`cypress${user}`);
      cy.contains('Add Contact').click();
    }
  });

  it('logs in as cypressuser and rejects the request, then sents a request back', () => {
    cy.login('cypressuser');
    cy.get('.navbar').contains('Contacts').click();
    cy.get('.card [data-user="cypressadmin"]').contains('Reject').click();
    cy.get('#username').type('cypressadmin');
    cy.contains('Add Contact').click();
  });

  it('logs in as the other users and accepts the contact requests', () => {
    for (const user of ['writer', 'reader', 'commenter']) {
      cy.login(`cypress${user}`);
      cy.get('.navbar').contains('Contacts').click();
      cy.get('.card [data-user="cypressadmin"]').contains('Accept').click();
    }
  });

  it('logs in as admin, sees the requests are accepted, then accepts the request from cypressuser', () => {
    cy.login('cypressadmin');
    cy.get('.navbar').contains('Contacts').click();

    for (const user of ['writer', 'reader', 'commenter']) {
      cy.get('.card').contains(`cypress${user}`).should('exist');
    }

    cy.get('.card [data-user="cypressuser"]').contains('Accept').click();
    cy.get('.card').contains('cypressuser').should('exist');
  });

  it('logs in as cypressuser and removes admin as a contact', () => {
    cy.login('cypressuser');
    cy.get('.navbar').contains('Contacts').click();
    cy.get('.card [data-user="cypressadmin"]').contains('Remove').click();
    cy.contains('cypressadmin').should('not.exist');
  });
});
      