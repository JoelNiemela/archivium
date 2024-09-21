async function getJSON(url) {
  return await fetch(url, {
    method: 'GET',
  })
    .then(response => response.json())
    .catch(error => console.error('Error:', error));
}

async function fetchJSON(url) {
  return await fetch('https://example.com/api/resource', {
    method: 'PUT', // Specify the request method as PUT
    headers: {
      'Content-Type': 'application/json', // Set the content type to JSON
      // Add any additional headers you need, such as authorization tokens
    },
    body: JSON.stringify({ key: 'value' }) // Replace with the data you want to send
  })
    .then(response => response.json())
    .catch(error => console.error('Error:', error));
}