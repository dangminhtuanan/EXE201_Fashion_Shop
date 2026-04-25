const AIBehaviorLog = require("../models/AIBehaviorLog");
const AIRecommendation = require("../models/AIRecommendation");
const ChatbotLog = require("../models/ChatbotLog");
const Product = require("../models/Product");

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || "gemini-2.0-flash,gemini-1.5-flash")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

function escapeRegex(value) {
  return value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

function getSearchTokens(value) {
  const stopWords = new Set([
    "ban",
    "ben",
    "cho",
    "co",
    "cua",
    "dep",
    "gi",
    "goi",
    "hay",
    "khong",
    "minh",
    "mot",
    "nao",
    "nhe",
    "phu",
    "san",
    "toi",
    "tu",
    "van",
    "voi",
    "y",
  ]);

  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopWords.has(token))
    .slice(0, 8);
}

function getIntentTokens(tokens) {
  const productTypeTokens = [
    "ao",
    "khoac",
    "hoodie",
    "somi",
    "so",
    "mi",
    "vay",
    "dam",
    "quan",
    "jean",
    "cotton",
    "bomber",
  ];

  return tokens.filter((token) => productTypeTokens.includes(token));
}

function getProductSearchText(product) {
  const category =
    typeof product.category === "object" && product.category !== null
      ? `${product.category.name || ""} ${product.category.slug || ""}`
      : "";

  return normalizeText(
    [
      product.name,
      product.description,
      product.brand,
      product.material,
      product.gender,
      category,
      ...(product.colors || []),
      ...(product.sizes || []),
    ].join(" ")
  );
}

function scoreProduct(product, question) {
  const tokens = getSearchTokens(question);
  const haystack = getProductSearchText(product);
  const productTokens = new Set(haystack.split(/[^a-z0-9]+/).filter(Boolean));
  const normalizedQuestion = normalizeText(question);
  const normalizedName = normalizeText(product.name);
  const nameTokens = new Set(normalizedName.split(/[^a-z0-9]+/).filter(Boolean));
  const intentTokens = getIntentTokens(tokens);
  let score = 0;

  if (intentTokens.length > 0 && !intentTokens.every((token) => productTokens.has(token))) {
    return 0;
  }

  if (normalizedName && normalizedQuestion.includes(normalizedName)) {
    score += 12;
  }

  for (const token of tokens) {
    if (nameTokens.has(token)) {
      score += 6;
    } else if (productTokens.has(token)) {
      score += 2;
    }
  }

  if (product.isFeatured) score += 0.5;
  if (product.averageRating) score += Math.min(product.averageRating, 5) / 10;
  if (product.sold) score += Math.min(product.sold, 100) / 200;

  return score;
}

function buildKeywordFilter(keyword) {
  const filter = { isActive: true, stock: { $gt: 0 } };

  if (keyword) {
    const tokens = getSearchTokens(keyword);
    const patterns = tokens.length > 0 ? tokens : [keyword];

    filter.$or = patterns.flatMap((token) => {
      const pattern = new RegExp(escapeRegex(token), "i");

      return [{ name: pattern }, { description: pattern }, { brand: pattern }, { material: pattern }];
    });
  }

  return filter;
}

function cleanBotAnswer(answer) {
  return answer
    .replace(/\*\*/g, "")
    .replace(/^[\s-]*\d+\.\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function findRelevantProducts(question, limit) {
  const tokens = getSearchTokens(question);
  const filter = buildKeywordFilter(question);
  let candidates = [];

  if (tokens.length > 0) {
    candidates = await Product.find(filter)
      .populate("category", "name slug")
      .sort({ isFeatured: -1, averageRating: -1, sold: -1, createdAt: -1 })
      .limit(40);
  }

  const scoredProducts = candidates
    .map((product) => ({
      product,
      score: scoreProduct(product, question),
    }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, limit)
    .map((item) => item.product);

  if (scoredProducts.length > 0) {
    return scoredProducts;
  }

  return Product.find({ isActive: true, stock: { $gt: 0 } })
    .populate("category", "name slug")
    .sort({ isFeatured: -1, averageRating: -1, sold: -1, createdAt: -1 })
    .limit(limit);
}

function summarizeProducts(products) {
  return products
    .map((product, index) => {
      const category =
        typeof product.category === "object" && product.category !== null
          ? product.category.name
          : "";

      return [
        `${index + 1}. ${product.name}`,
        category ? `Danh muc: ${category}` : "",
        product.brand ? `Thuong hieu: ${product.brand}` : "",
        product.price ? `Gia: ${product.price.toLocaleString("vi-VN")} VND` : "",
        product.colors?.length ? `Mau: ${product.colors.join(", ")}` : "",
        product.sizes?.length ? `Size: ${product.sizes.join(", ")}` : "",
        product.description ? `Mo ta: ${product.description.slice(0, 220)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .join("\n");
}

function extractGeminiText(data) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  return text || "Toi chua tao duoc cau tra loi phu hop luc nay.";
}

async function generateWithModel(model, prompt, apiKey) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${GEMINI_API_URL}/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 700,
        },
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || "Gemini request failed";
      const error = new Error(message);
      error.statusCode = response.status;
      error.providerStatusCode = response.status;
      error.model = model;
      throw error;
    }

    return {
      answer: cleanBotAnswer(extractGeminiText(data)),
      model,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("Missing GEMINI_API_KEY");
    error.statusCode = 503;
    error.code = "MISSING_GEMINI_API_KEY";
    throw error;
  }

  const models = [GEMINI_MODEL, ...GEMINI_FALLBACK_MODELS].filter(
    (model, index, list) => model && list.indexOf(model) === index
  );
  let lastError;

  for (const model of models) {
    try {
      return await generateWithModel(model, prompt, apiKey);
    } catch (error) {
      lastError = error;

      if (![429, 500, 502, 503, 504].includes(error.statusCode)) {
        throw error;
      }
    }
  }

  throw lastError;
}

exports.createBehaviorLog = async (req, res) => {
  try {
    const log = await AIBehaviorLog.create({
      user: req.user?.id || null,
      product: req.body.productId || req.body.product || null,
      action: req.body.action || "other",
      keyword: req.body.keyword || "",
      metadata: req.body.metadata || {},
    });

    res.status(201).json({ message: "Create behavior log successfully", log });
  } catch (error) {
    res.status(500).json({ message: "Cannot create behavior log", error: error.message });
  }
};

exports.createChatbotLog = async (req, res) => {
  try {
    const { question, answer = "", intent = "general", metadata = {} } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const log = await ChatbotLog.create({
      user: req.user?.id || null,
      question,
      answer,
      intent,
      metadata,
    });

    res.status(201).json({ message: "Create chatbot log successfully", log });
  } catch (error) {
    res.status(500).json({ message: "Cannot create chatbot log", error: error.message });
  }
};

exports.chatWithGemini = async (req, res) => {
  try {
    const question = (req.body.question || req.body.message || "").trim();

    if (!question) {
      return res.status(400).json({ message: "Question is required" });
    }

    const limit = Math.min(Math.max(Number(req.body.limit) || 4, 1), 8);
    const products = await findRelevantProducts(question, limit);

    const productContext = products.length
      ? summarizeProducts(products)
      : "Khong co san pham nao trong database phu hop de goi y.";
    const prompt = [
      "Ban la tro ly mua sam cho website thoi trang.",
      "Tra loi bang tieng Viet co dau, ngan gon, than thien, tap trung tu van san pham.",
      "Khong dung markdown, khong dung dau **, khong lap lai danh sach theo kieu danh so.",
      "Frontend se hien thi card san pham rieng, nen cau tra loi chi can 1-2 cau tom tat ly do goi y.",
      "Chi dua ra thong tin dua tren danh sach san pham duoc cung cap. Neu khong du thong tin, hay noi ro va hoi them nhu cau.",
      "Neu co san pham phu hop, nhac den toi da 2 ten san pham noi bat va ly do ngan gon.",
      "",
      `Cau hoi khach hang: ${question}`,
      "",
      "San pham trong database:",
      productContext,
    ].join("\n");

    const geminiResult = await callGemini(prompt);
    const answer = geminiResult.answer;

    await ChatbotLog.create({
      user: req.user?.id || null,
      question,
      answer,
      intent: "gemini_chat",
      metadata: {
        model: geminiResult.model,
        productIds: products.map((product) => product._id),
      },
    });

    res.json({
      message: "Chat successfully",
      answer,
      model: geminiResult.model,
      products,
    });
  } catch (error) {
    const statusCode = error.statusCode || (error.name === "AbortError" ? 504 : 500);

    res.status(statusCode).json({
      message:
        error.code === "MISSING_GEMINI_API_KEY"
          ? "Gemini API key is not configured"
          : [429, 500, 502, 503, 504].includes(statusCode)
          ? "Gemini is temporarily unavailable, please try again"
          : "Cannot process AI chat",
      error: error.message,
      model: error.model,
    });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 30);
    const filter = buildKeywordFilter(req.query.q || "");
    const input = {
      category: req.query.category || null,
      q: req.query.q || null,
      source: "api",
    };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const products = await Product.find(filter)
      .populate("category", "name slug")
      .sort({ isFeatured: -1, averageRating: -1, sold: -1, createdAt: -1 })
      .limit(limit);

    if (req.user?.id && products.length > 0) {
      await AIRecommendation.create({
        user: req.user.id,
        algorithm: "popular_category_rating",
        input,
        products: products.map((product, index) => ({
          product: product._id,
          score: products.length - index,
          reason: product.isFeatured ? "featured_product" : "popular_product",
        })),
      });
    }

    res.json({ message: "Get recommendations successfully", products });
  } catch (error) {
    res.status(500).json({ message: "Cannot get recommendations", error: error.message });
  }
};

exports.getBehaviorLogs = async (req, res) => {
  try {
    const logs = await AIBehaviorLog.find({})
      .populate("user", "username email role")
      .populate("product", "name slug")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ message: "Get behavior logs successfully", logs });
  } catch (error) {
    res.status(500).json({ message: "Cannot get behavior logs", error: error.message });
  }
};

exports.getChatbotLogs = async (req, res) => {
  try {
    const logs = await ChatbotLog.find({})
      .populate("user", "username email role")
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ message: "Get chatbot logs successfully", logs });
  } catch (error) {
    res.status(500).json({ message: "Cannot get chatbot logs", error: error.message });
  }
};
