import * as functions from "firebase-functions";
import axios from "axios";
import cors from "cors";

const corsHandler = cors({ origin: true });

export const flightProxy = functions.https.onRequest((request, response) => {
  corsHandler(request, response, async () => {
    if (request.method !== "POST") {
      response.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { endpoint, token, params } = request.body;

      if (!endpoint) {
        response.status(400).json({ message: "Missing 'endpoint' in request body" });
        return;
      }

      // Construct the request to the external API
      const config: any = {
        method: "POST", // The external API expects POST
        url: endpoint,
        data: params,
        headers: {
          "Content-Type": "application/json",
        },
      };

      // Add Authorization header if token is provided
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }

      const apiResponse = await axios(config);

      response.status(200).json(apiResponse.data);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Axios error:", error.response?.data || error.message);
        response.status(error.response?.status || 500).json({
          message: "Error proxying request",
          error: error.response?.data || error.message,
        });
      } else {
        console.error("Unknown error:", error);
        response.status(500).json({ message: "An unknown error occurred" });
      }
    }
  });
});
