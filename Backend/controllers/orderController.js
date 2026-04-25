const CartItem = require("../models/CartItem");
const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const User = require("../models/User");
const { isStaffRole } = require("../middleware/roleMiddleware");

function canAccessOrder(req, order) {
  return isStaffRole(req.user?.role) || String(order.user._id || order.user) === String(req.user.id);
}

async function buildItemsFromRequest(userId, bodyItems) {
  const sourceItems = [];

  if (Array.isArray(bodyItems) && bodyItems.length > 0) {
    for (const item of bodyItems) {
      const productId = item.productId || item.product;
      const quantity = Math.max(Number(item.quantity) || 1, 1);
      const product = await Product.findOne({ _id: productId, isActive: true });

      if (!product) {
        throw new Error("Product not found");
      }

      sourceItems.push({
        product,
        quantity,
        size: item.size || "",
        color: item.color || "",
      });
    }

    return { sourceItems, shouldClearCart: false };
  }

  const cartItems = await CartItem.find({ user: userId }).populate("product");
  for (const cartItem of cartItems) {
    if (!cartItem.product || cartItem.product.isActive === false) {
      continue;
    }

    sourceItems.push({
      product: cartItem.product,
      quantity: cartItem.quantity,
      size: cartItem.size || "",
      color: cartItem.color || "",
    });
  }

  return { sourceItems, shouldClearCart: true };
}

async function restoreOrderStock(order) {
  for (const item of order.items) {
    const product = await Product.findById(item.product);
    if (product) {
      await product.updateStock(item.quantity, "increase");
    }
  }
}

exports.createOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { sourceItems, shouldClearCart } = await buildItemsFromRequest(req.user.id, req.body.items);

    if (sourceItems.length === 0) {
      return res.status(400).json({ message: "Order items are required" });
    }

    const orderItems = [];
    for (const item of sourceItems) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({ message: `${item.product.name} stock is not enough` });
      }

      orderItems.push({
        product: item.product._id,
        name: item.product.name,
        image: item.product.images?.[0] || "",
        size: item.size,
        color: item.color,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity,
      });
    }

    const customerName = req.body.customerName || user.username;
    const phone = req.body.phone || user.phone;
    const address = req.body.address || user.address;

    if (!customerName || !phone || !address) {
      return res.status(400).json({ message: "Customer name, phone and address are required" });
    }

    const totalAmount = orderItems.reduce((total, item) => total + item.subtotal, 0);
    const order = await Order.create({
      user: req.user.id,
      items: orderItems,
      customerName,
      phone,
      address,
      note: req.body.note || "",
      totalAmount,
      paymentStatus: "pending",
    });

    for (const item of sourceItems) {
      await item.product.updateStock(item.quantity, "decrease");
    }

    const paymentProvider = req.body.paymentProvider || "cod";
    const payment = await Payment.create({
      order: order._id,
      user: req.user.id,
      provider: paymentProvider,
      amount: totalAmount,
      status: "pending",
    });

    order.payment = payment._id;
    await order.save();

    if (shouldClearCart) {
      await CartItem.deleteMany({ user: req.user.id });
    }

    await order.populate([
      { path: "user", select: "username email phone address role" },
      { path: "items.product", select: "name slug images price" },
      { path: "payment" },
    ]);

    res.status(201).json({ message: "Create order successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Cannot create order", error: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate("items.product", "name slug images price")
      .populate("payment")
      .sort({ createdAt: -1 });

    res.json({ message: "Get my orders successfully", orders });
  } catch (error) {
    res.status(500).json({ message: "Cannot get orders", error: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    const orders = await Order.find(filter)
      .populate("user", "username email phone address role")
      .populate("items.product", "name slug images price")
      .populate("payment")
      .sort({ createdAt: -1 });

    res.json({ message: "Get orders successfully", orders });
  } catch (error) {
    res.status(500).json({ message: "Cannot get orders", error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "username email phone address role")
      .populate("items.product", "name slug images price")
      .populate("payment");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!canAccessOrder(req, order)) {
      return res.status(403).json({ message: "Permission denied" });
    }

    res.json({ message: "Get order successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Cannot get order", error: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const previousStatus = order.status;
    if (status) {
      order.status = status;
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    if (
      status === "cancelled" &&
      !["cancelled", "refunded"].includes(previousStatus)
    ) {
      await restoreOrderStock(order);
    }

    await order.save();
    await order.populate([
      { path: "user", select: "username email phone address role" },
      { path: "items.product", select: "name slug images price" },
      { path: "payment" },
    ]);

    res.json({ message: "Update order successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Cannot update order", error: error.message });
  }
};

exports.cancelMyOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!["pending", "confirmed"].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled" });
    }

    await restoreOrderStock(order);
    order.status = "cancelled";
    order.paymentStatus = order.paymentStatus === "paid" ? "refunded" : "unpaid";
    await order.save();

    res.json({ message: "Cancel order successfully", order });
  } catch (error) {
    res.status(500).json({ message: "Cannot cancel order", error: error.message });
  }
};
