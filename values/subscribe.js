// Netlify serverless function — subscribes an email to a Sendfox list
// Deployed at: /.netlify/functions/subscribe

exports.handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { email, listId } = body;

  if (!email || !listId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'email and listId required' }) };
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email address' }) };
  }

  const apiKey = process.env.SENDFOX_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  try {
    const response = await fetch('https://api.sendfox.com/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        email,
        lists: [parseInt(listId)]
      })
    });

    const data = await response.json();

    // 200 = created, 422 = already exists (both are fine for us)
    if (response.ok || response.status === 422) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: response.status,
      body: JSON.stringify({ error: data.message || 'Signup failed' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Network error' })
    };
  }
};
