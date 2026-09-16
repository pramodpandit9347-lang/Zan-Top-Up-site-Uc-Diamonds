module.exports = function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.RAZORPAY_KEY_ID) {
    return response.status(500).json({ error: "Razorpay is not configured" });
  }

  return response.status(200).json({ key_id: process.env.RAZORPAY_KEY_ID });
};
