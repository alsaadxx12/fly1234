"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiProxy = exports.flightProxy = exports.onExchangeRateCreate = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
// Initialize admin app
admin.initializeApp();
const corsHandler = (0, cors_1.default)({ origin: true });
exports.onExchangeRateCreate = functions.firestore
    .document("exchange_rates/{rateId}")
    .onCreate(async (snapshot, context) => {
    const newData = snapshot.data();
    const newRate = newData.rate;
    // Get previous rate to compare (optional, but good for message)
    const ratesColl = admin.firestore().collection("exchange_rates");
    const prevRatesQuery = await ratesColl
        .orderBy("created_at", "desc")
        .limit(2)
        .get();
    let prevRate = 0;
    if (prevRatesQuery.docs.length > 1) {
        prevRate = prevRatesQuery.docs[1].data().rate;
    }
    const isIncrease = newRate > prevRate;
    const change = Math.abs(newRate - prevRate);
    const title = "تحديث سعر الصرف 💱";
    const body = `تم تحديث سعر الصرف إلى ${newRate.toLocaleString('en-US')} دينار. ${prevRate > 0 ? `(${isIncrease ? 'ارتفع' : 'انخفض'} بمقدار ${change})` : ''}`;
    // Fetch all employees with FCM tokens
    const employeesSnapshot = await admin.firestore().collection("employees").get();
    const tokens = [];
    employeesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken && data.isActive !== false) {
            tokens.push(data.fcmToken);
        }
    });
    if (tokens.length === 0)
        return null;
    const message = {
        notification: {
            title,
            body,
        },
        tokens: tokens,
        webpush: {
            notification: {
                icon: "/pwa-192x192.png",
                badge: "/pwa-192x192.png",
                click_action: "/",
            },
        },
    };
    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`Successfully sent ${response.successCount} notifications`);
        // Optional: cleanup invalid tokens
        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.log("Failed tokens:", failedTokens);
        }
    }
    catch (error) {
        console.error("Error sending push notifications:", error);
    }
    return null;
});
exports.flightProxy = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        var _a, _b, _c;
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
            const config = {
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
            const apiResponse = await (0, axios_1.default)(config);
            response.status(200).json(apiResponse.data);
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error("Axios error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                response.status(((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || 500).json({
                    message: "Error proxying request",
                    error: ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message,
                });
            }
            else {
                console.error("Unknown error:", error);
                response.status(500).json({ message: "An unknown error occurred" });
            }
        }
    });
});
exports.apiProxy = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        var _a, _b;
        const { endpoint, method = 'POST', data, params, token } = request.body;
        if (!endpoint) {
            response.status(400).json({ message: "Missing 'endpoint' in request body" });
            return;
        }
        try {
            const config = {
                method: method || "POST",
                url: endpoint,
                data: data || params,
                headers: {
                    "Content-Type": "application/json",
                },
                timeout: 25000
            };
            if (token) {
                config.headers["Authorization"] = `Bearer ${token}`;
            }
            const apiResponse = await (0, axios_1.default)(config);
            response.status(200).json(apiResponse.data);
        }
        catch (error) {
            const status = ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) || 500;
            response.status(status).json(((_b = error.response) === null || _b === void 0 ? void 0 : _b.data) || { message: error.message });
        }
    });
});
//# sourceMappingURL=index.js.map