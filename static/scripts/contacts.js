async function addContact(username) {
  await fetch('/api/contacts', {
      method: 'POST',
      headers: {
      'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
  });
  window.location.reload();
}