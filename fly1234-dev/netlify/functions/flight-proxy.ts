import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import axios from 'axios';

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const { endpoint, token, params } = JSON.parse(event.body || '{}');

    if (!endpoint) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing 'endpoint' in request body" }),
      };
    }
    
    // Construct the request to the external API
    const config = {
      method: 'POST',
      url: endpoint,
      data: params,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    
    const response = await axios(config);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(response.data),
    };
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error:', error.response?.data || error.message);
      return {
        statusCode: error.response?.status || 500,
        body: JSON.stringify({ 
          message: 'Error proxying request',
          error: error.response?.data || error.message
        }),
      };
    }

    console.error('Unknown error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'An unknown error occurred' }),
    };
  }
};

export { handler };
