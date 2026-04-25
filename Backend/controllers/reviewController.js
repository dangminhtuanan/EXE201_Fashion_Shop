const Order = require("../models/Order");
const Product = require("../models/Product");
const Review = require("../models/Review");
const { isStaffRole } = require("../middleware/roleMiddleware");

async function updateProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { product: productId, isVisible: true } },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const product = await Product.findById(productId);
  if (!product) return;

  if (stats.length === 0) {
    product.averageRating = 0;
    product.reviewCount = 0;
  } else {
    product.averageRating = Math.round(stats[0].averageRating * 10) / 10;
    product.reviewCount = stats[0].reviewCount;
  }

  await product.save();
}

exports.getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      isVisible: true,
    })
      .populate("user", "username avatar")
      .sort({ createdAt: -1 });

    res.json({ message: "Get reviews successfully", reviews });
  } catch (error) {
    res.status(500).json({ message: "Cannot get reviews", error: error.message });
  }
};

exports.createReview = async (req, res) => {
  try {
    const { productId, rating, comment = "", orderId = null } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ message: "Product and rating are required" });
    }

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (orderId) {
      const order = await Order.findOne({ _id: orderId, user: req.user.id });
      const boughtProduct = order?.items?.some((item) => String(item.product) === String(productId));
      if (!order || !boughtProduct) {
        return res.status(400).json({ message: "Order is invalid for this review" });
      }
    }

    const review = await Review.create({
      user: req.user.id,
      product: productId,
      order: orderId,
      rating: Number(rating),
      comment,
    });

    await updateProductRating(product._id);
    await review.populate("user", "username avatar");

    res.status(201).json({ message: "Create review successfully", review });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ message: "You already reviewed this product" });
    }
    res.status(500).json({ message: "Cannot create review", error: error.message });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (!isStaffRole(req.user?.role) && String(review.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "Permission denied" });
    }

    if (req.body.rating !== undefined) review.rating = Number(req.body.rating);
    if (req.body.comment !== undefined) review.comment = req.body.comment;
    if (req.body.isVisible !== undefined && isStaffRole(req.user?.role)) {
      review.isVisible = Boolean(req.body.isVisible);
    }

    await review.save();
    await updateProductRating(review.product);
    await review.populate("user", "username avatar");

    res.json({ message: "Update review successfully", review });
  } catch (error) {
    res.status(500).json({ message: "Cannot update review", error: error.message });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (!isStaffRole(req.user?.role) && String(review.user) !== String(req.user.id)) {
      return res.status(403).json({ message: "Permission denied" });
    }

    const productId = review.product;
    await review.deleteOne();
    await updateProductRating(productId);

    res.json({ message: "Delete review successfully" });
  } catch (error) {
    res.status(500).json({ message: "Cannot delete review", error: error.message });
  }
};
