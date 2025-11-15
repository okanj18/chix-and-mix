import { Handler, HandlerEvent } from '@netlify/functions';
import { db } from './db';

const DATA_KEY = 'appState';

const handler: Handler = async (event: HandlerEvent) => {
  try {
    if (event.httpMethod === 'GET') {
      const data = await db.get(DATA_KEY);
      if (!data) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'No data found' }),
        };
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      };
    }

    if (event.httpMethod === 'POST') {
      if (!event.body) {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'No body provided' }),
        };
      }
      const dataToSave = JSON.parse(event.body);
      await db.set(DATA_KEY, dataToSave);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Data saved successfully' }),
      };
    }

    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error: errorMessage }),
    };
  }
};

export { handler };