(function () {
  'use strict';

  var API_URL = 'http://localhost:8000/chat';

  function sendMessage(message) {
    console.log('Sending request...');
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message })
    })
    .then(function (response) {
      if (!response.ok) throw new Error('API error: ' + response.status);
      return response.json();
    })
    .then(function (data) {
      console.log('Received response...');
      return { text: data.response || '', analysis: data.analysis || null };
    })
    .catch(function (err) {
      console.error('[AI Service]', err);
      return { text: 'ResolveOne AI is currently unavailable. Please try again later.', analysis: null };
    });
  }

  window.AIService = {
    sendMessage: sendMessage
  };
})();
