describe('Note spec', () => {
  it('visits item, sees that notes tab is disabled and enables it', () => {
    cy.logout();

    cy.visit('/universes/public-test-universe/items/test-article');
    cy.get('#tabBtns [data-tab=notes]').should('not.exist');

    cy.login('testadmin');

    cy.visit('/universes/public-test-universe/items/test-article');
    cy.get('#tabBtns [data-tab=notes]').should('have.text', 'Notes (Hidden)');
    cy.get('#action-bar').contains('Edit').click();

    cy.get('#edit #notes').parent().click();
    cy.get('#preview-btn').click();
  });

  it('note author visits item, sees both item notes', () => {
    cy.login('testwriter');
    cy.visit('/universes/public-test-universe/items/test-article?tab=notes');
    cy.get('#note-list').children().should('have.length', 2);
  });

  it('note author visits notes page, sees all four notes', () => {
    cy.login('testwriter');
    cy.visit('/notes');
    cy.get('#note-list').children().should('have.length', 4);
  });

  it('other user visits item, sees only the public note', () => {
    cy.login('testreader');
    cy.visit('/universes/public-test-universe/items/test-article?tab=notes');
    cy.get('#note-list').children().should('have.length', 1);
    cy.get('#note-list').get('h2').should('have.text', 'Public Article Note');
  });

  it('other user visits notes page, sees no notes', () => {
    cy.login('testreader');
    cy.visit('/notes');
    cy.get('#note-list').children().should('have.length', 0);
  });

  it('links note to an item, sees the note on that item\'s notes page', () => {
    cy.login('testwriter');
    cy.visit('/notes');
    cy.get('#note-list').contains('Public Test Note').click();

    cy.get('#note-control-tabs .edit').click();
    cy.get('#note-items input').first().type('Test Character');
    cy.get('.options-container .option').filter(':visible').click();
    cy.get('#save').click();

    cy.get('#note-items-list').children().should('have.length', 1);
    cy.get('#note-items-list').contains('Test Character').click();

    cy.get('#tabBtns').contains('Notes (Hidden)').click();
    cy.get('#note-list').children().should('have.length', 1);
    cy.get('#note-list').get('h2').should('have.text', 'Public Test Note');
  });

  it('unlinks the note, no longer sees it on that item\'s notes page', () => {
    cy.login('testwriter');
    cy.visit('/notes');
    cy.get('#note-list').contains('Public Test Note').click();

    cy.get('#note-control-tabs .edit').click();
    cy.get('#note-items-edit').contains('Test Character').siblings('a').contains('delete').click();
    cy.get('#save').click();

    cy.get('#note-items-list').children().should('have.length', 0);

    cy.visit('/universes/public-test-universe/items/test-character');
    cy.get('#tabBtns [data-tab=notes]').should('not.exist');
  });

  it('disables notes tab again', () => {
    cy.login('testadmin');

    cy.visit('/universes/public-test-universe/items/test-article');
    cy.get('#tabBtns [data-tab=notes]').should('have.text', 'Notes');
    cy.get('#action-bar').contains('Edit').click();

    cy.get('#edit #notes').parent().click();
    cy.get('#preview-btn').click();

    cy.get('#tabBtns [data-tab=notes]').should('have.text', 'Notes (Hidden)');
    cy.get('#action-bar').contains('Edit').click();

    cy.logout();

    cy.visit('/universes/public-test-universe/items/test-article');
    cy.get('#tabBtns [data-tab=notes]').should('not.exist');
  });

  it('adds a tag to the note', () => {
    cy.login('testwriter');
    cy.visit('/notes');
    cy.get('#note-list').contains('Public Test Note').click();

    cy.get('#note-control-tabs .edit').click();
    cy.get('#note_tags').type(' cypress')
    cy.get('#save').click();

    cy.get('#note-controls .preview .tags').should('contain', '#cypress');
  });

  it('tries filtering notes by the tag', () => {
    cy.login('testwriter');
    cy.visit('/notes');
    cy.get('#note-list .tags a').contains('cypress').click();

    cy.get('#note-list').children().filter(':visible').should('have.length', 1);
    cy.get('#note-list').get('h2').filter(':visible').should('have.text', 'Public Test Note');
  });

  it('removes the tag from the note', () => {
    cy.login('testwriter');
    cy.visit('/notes');
    cy.get('#note-list').contains('Public Test Note').click();

    cy.get('#note-control-tabs .edit').click();
    cy.get('#note_tags').clear();
    cy.get('#note_tags').type('{ctrl}a{backspace}test public');
    cy.get('#save').click();

    cy.get('#note-controls .preview .tags').should('not.contain', '#cypress');
  });
});
