const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;
const WINDOW_SIZE = 10;
const VALID_IDS = ['p', 'f', 'e', 'r'];
const BASE_URL = 'http://20.244.56.144/evaluation-service';
const AUTH_TOKEN = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzQ0MjA5MTAwLCJpYXQiOjE3NDQyMDg4MDAsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6ImUwOGNjM2I1LWFjNzMtNDcyZC05MjY1LTZlZGIwMDhlOWM0OSIsInN1YiI6InZpc2hudXN1ZGVyc29ubTEwNDguc3NlQHNhdmVldGhhLmNvbSJ9LCJlbWFpbCI6InZpc2hudXN1ZGVyc29ubTEwNDguc3NlQHNhdmVldGhhLmNvbSIsIm5hbWUiOiJ2aXNobnUgc3VkZXJzb24gbSIsInJvbGxObyI6IjE5MjIyMTA0OCIsImFjY2Vzc0NvZGUiOiJWbUdSanQiLCJjbGllbnRJRCI6ImUwOGNjM2I1LWFjNzMtNDcyZC05MjY1LTZlZGIwMDhlOWM0OSIsImNsaWVudFNlY3JldCI6IlFUVGtqU0ZUQ0pyZlRGa1UifQ.15_b948QG2bm_7E4iTuB9ZtwggBveS31SvVFWTWlS9E';
app.set('json spaces', 0); 

let numberWindow = [];

app.get('/numbers/:numberid', async (req, res) => {
  const { numberid } = req.params;

  if (!VALID_IDS.includes(numberid)) {
    return res.status(400).json({ error: 'Invalid number ID' });
  }

  const url = `${BASE_URL}/${convertId(numberid)}`;
  const windowPrevState = [...numberWindow];

  try {
    const response = await Promise.race([
      axios.get(url, {
        headers: {
          Authorization: AUTH_TOKEN
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 500))
    ]);

    if (response?.data?.numbers) {
      const newNumbers = response.data.numbers;

      for (const num of newNumbers) {
        if (!numberWindow.includes(num)) {
          numberWindow.push(num);
          if (numberWindow.length > WINDOW_SIZE) {
            numberWindow.shift(); 
          }
        }
      }
    }

    const avg = calculateAverage(numberWindow);

    return res.json({
      windowPrevState,
      windowCurrState: numberWindow,
      numbers: response?.data?.numbers || [],
      avg: avg
    });

  } catch (error) {
    return res.status(200).json({
      windowPrevState,
      windowCurrState: numberWindow,
      avg: calculateAverage(numberWindow),
      note: 'Partial response due to timeout or error.'
    });
  }
});

function convertId(id) {
  switch (id) {
    case 'p': return 'primes';
    case 'f': return 'fibo';
    case 'e': return 'even';
    case 'r': return 'rand';
    default: return '';
  }
}

function calculateAverage(numbers) {
  if (numbers.length === 0) return 0;
  const sum = numbers.reduce((acc, val) => acc + val, 0);
  return parseFloat((sum / numbers.length).toFixed(2));
}

app.listen(PORT, () => {
  console.log(`🔢 Average Calculator service running at http://localhost:${PORT}`);
});
