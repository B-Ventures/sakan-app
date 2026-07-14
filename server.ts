import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Dynamic Firebase Config Loading
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  let firebaseConfig = {};
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
  } catch (err) {
    console.error("Failed to read firebase-applet-config.json:", err);
  }

  const appFirebase = initializeApp(firebaseConfig);
  const db = (firebaseConfig as any).firestoreDatabaseId
    ? getFirestore(appFirebase, (firebaseConfig as any).firestoreDatabaseId)
    : getFirestore(appFirebase);

  // Dynamic Web App Manifest serving to reflect custom tenant branding instantly!
  app.get("/manifest.json", async (req, res) => {
    try {
      const configDoc = await getDoc(doc(db, "system_configs", "landing_page_config"));
      const config = configDoc.exists() ? configDoc.data() : null;

      const siteName = config?.siteName || "bProp";
      const shortName = config?.siteLogoAbbrev || siteName.slice(0, 10);
      const logoUrl = config?.siteLogoUrl || "https://img.icons8.com/color/512/000000/building.png";

      res.setHeader("Content-Type", "application/json");
      res.json({
        "id": "/",
        "scope": "/",
        "name": `${siteName} Building Payments & Expenses Tracker`,
        "short_name": shortName,
        "description": "Secure building property management, tenant Rent Ledger, statements and expenses manager.",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#0B0F19",
        "theme_color": "#2563eb",
        "orientation": "portrait",
        "icons": [
          {
            "src": logoUrl,
            "sizes": "192x192",
            "type": "image/png"
          },
          {
            "src": logoUrl,
            "sizes": "512x512",
            "type": "image/png"
          }
        ]
      });
    } catch (err) {
      console.error("Failed to generate dynamic manifest, serving fallback static manifest:", err);
      try {
        const fallbackPath = path.join(process.cwd(), "public", "manifest.json");
        if (fs.existsSync(fallbackPath)) {
          return res.sendFile(fallbackPath);
        }
      } catch (innerErr) {}
      res.status(500).json({ error: "Failed to generate manifest" });
    }
  });

  // API Route: Create Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { buildingId, itemType, itemId, priceId, successUrl, cancelUrl, dynamicPrice } = req.body;
      
      if (!priceId && !dynamicPrice) {
        return res.status(400).json({ error: "Price ID or Dynamic Price is required." });
      }

      // Fetch stripe config from firestore
      const stripeDoc = await getDoc(doc(db, "system_configs", "stripe_config"));
      if (!stripeDoc.exists()) {
        return res.status(400).json({ error: "Stripe configuration not found in Firestore." });
      }
      const stripeConfig = stripeDoc.data();
      if (!stripeConfig.isEnabled || stripeConfig.checkoutRedirectType !== "hosted_checkout") {
        return res.status(400).json({ error: "Hosted Stripe Checkout is currently disabled in system settings." });
      }
      if (!stripeConfig.secretKey) {
        return res.status(400).json({ error: "Stripe Secret Key is missing in admin configuration." });
      }

      // Prepare Stripe Checkout Session POST parameters
      const params = new URLSearchParams();
      
      if (dynamicPrice) {
        params.append("line_items[0][price_data][currency]", "usd");
        params.append("line_items[0][price_data][product_data][name]", dynamicPrice.name || "SaaS Subscription");
        params.append("line_items[0][price_data][unit_amount]", Math.round(dynamicPrice.amount * 100).toString());
        if (itemType === "plan") {
          params.append("line_items[0][price_data][recurring][interval]", dynamicPrice.interval || "month");
        }
      } else {
        params.append("line_items[0][price]", priceId);
      }
      
      params.append("line_items[0][quantity]", "1");
      params.append("mode", itemType === "plan" ? "subscription" : "payment");
      params.append("success_url", successUrl);
      params.append("cancel_url", cancelUrl);
      
      // Store transaction context in Stripe metadata
      params.append("metadata[buildingId]", buildingId);
      params.append("metadata[itemType]", itemType);
      params.append("metadata[itemId]", itemId);

      console.log(`[Stripe Backend] Creating checkout session for building ${buildingId}, plan ${itemId}...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 seconds timeout

      let stripeRes;
      try {
        stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${stripeConfig.secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: params.toString(),
          signal: controller.signal
        });
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError') {
          console.error("[Stripe Backend] Request timed out contacting api.stripe.com");
          return res.status(504).json({ error: "Connection to Stripe timed out. Please verify your internet connection, or confirm that your secret key is valid." });
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      const sessionData = await stripeRes.json() as any;
      console.log(`[Stripe Backend] Response status: ${stripeRes.status}`);

      if (!stripeRes.ok) {
        console.error("[Stripe Backend] Stripe Session Creation Error:", sessionData);
        return res.status(stripeRes.status).json({ error: sessionData.error?.message || "Stripe session creation failed." });
      }

      console.log(`[Stripe Backend] Checkout session created successfully! URL: ${sessionData.url}`);
      res.json({ id: sessionData.id, url: sessionData.url });
    } catch (error: any) {
      console.error("Internal Server Error in create-checkout-session:", error);
      res.status(500).json({ error: error.message || "Internal server error." });
    }
  });

  // API Route: Verify Stripe Checkout Session
  app.get("/api/verify-checkout-session", async (req, res) => {
    try {
      const { session_id } = req.query;
      if (!session_id) {
        return res.status(400).json({ error: "Session ID is required." });
      }

      const stripeDoc = await getDoc(doc(db, "system_configs", "stripe_config"));
      if (!stripeDoc.exists()) {
        return res.status(400).json({ error: "Stripe configuration not found in Firestore." });
      }
      const stripeConfig = stripeDoc.data();
      if (!stripeConfig.secretKey) {
        return res.status(400).json({ error: "Stripe Secret Key is missing in admin configuration." });
      }

      const stripeRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${stripeConfig.secretKey}`
        }
      });

      const sessionData = await stripeRes.json() as any;
      if (!stripeRes.ok) {
        console.error("Stripe Session Verification Error:", sessionData);
        return res.status(stripeRes.status).json({ error: sessionData.error?.message || "Stripe verification failed." });
      }

      const isPaid = sessionData.payment_status === "paid" || sessionData.status === "complete";
      res.json({
        paid: isPaid,
        buildingId: sessionData.metadata?.buildingId,
        itemType: sessionData.metadata?.itemType,
        itemId: sessionData.metadata?.itemId,
        amountTotal: sessionData.amount_total ? sessionData.amount_total / 100 : 0
      });
    } catch (error: any) {
      console.error("Internal Server Error in verify-checkout-session:", error);
      res.status(500).json({ error: error.message || "Internal server error." });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
