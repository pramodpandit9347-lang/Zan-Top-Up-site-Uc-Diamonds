const Razorpay = require("razorpay");

function razorpayClient() {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  const amount = Number(request.body && request.body.amount);
  const currency = request.body && request.body.currency;
  const receipt = request.body && request.body.receipt;

  if (!Number.isInteger(amount) || amount < 100) {
    return response.status(400).json({ error: "Amount must be at least 100 paise" });
  }
  if (currency !== "INR" || typeof receipt !== "string" || !receipt.trim()) {
    return response.status(400).json({ error: "Currency and receipt are required" });
  }
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return response.status(500).json({ error: "Razorpay is not configured" });
  }

  try {
    const order = await razorpayClient().orders.create({
      amount: amount,
      currency: currency,
      receipt: receipt.trim().slice(0, 40)
    });

    return response.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    const status = error.statusCode === 401 || error.status === 401 ? 401 : 500;
    return response.status(status).json({
      error: status === 401 ? "Razorpay authentication failed" : "Unable to create payment order"
    });
  }
};
