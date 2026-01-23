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
exports.usersProxy = exports.flightProxy = void 0;
const functions = __importStar(require("firebase-functions"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const form_data_1 = __importDefault(require("form-data"));
const corsHandler = (0, cors_1.default)({ origin: true });
exports.flightProxy = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        var _a, _b, _c;
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { endpoint, token, params, useFormData } = request.body;
            if (!endpoint) {
                response.status(400).json({ message: "Missing 'endpoint' in request body" });
                return;
            }
            // Construct the request to the external API
            let config;
            if (useFormData) {
                // Create FormData for multipart/form-data requests
                const formData = new form_data_1.default();
                // Add all params to FormData
                if (params) {
                    Object.keys(params).forEach((key) => {
                        formData.append(key, params[key]);
                    });
                }
                config = {
                    method: "POST",
                    url: endpoint,
                    data: formData,
                    headers: Object.assign({}, formData.getHeaders()),
                };
            }
            else {
                // Use JSON for regular requests
                config = {
                    method: "POST",
                    url: endpoint,
                    data: params,
                    headers: {
                        "Content-Type": "application/json",
                    },
                };
            }
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
// Export usersProxy as an alias to flightProxy for backward compatibility
exports.usersProxy = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        var _a, _b, _c;
        if (request.method !== "POST") {
            response.status(405).send("Method Not Allowed");
            return;
        }
        try {
            const { endpoint, token, params, useFormData, method = "POST" } = request.body;
            if (!endpoint) {
                response.status(400).json({ ok: false, error: "Missing 'endpoint' in request body" });
                return;
            }
            // Get token from Authorization header (preferred) or from body (backward compatibility)
            // Authorization header format: "Bearer <token>"
            const authHeader = request.headers.authorization || request.headers.Authorization;
            // Handle both string and string[] types
            const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
            const tokenFromHeader = authHeaderStr && typeof authHeaderStr === 'string' && authHeaderStr.startsWith('Bearer ')
                ? authHeaderStr.substring(7)
                : null;
            const finalToken = tokenFromHeader || token;
            // Validate that we have a token (from header or body)
            if (!finalToken) {
                response.status(400).json({ ok: false, error: "Missing token." });
                return;
            }
            // Construct the request to the external API
            let config;
            if (useFormData || endpoint.includes('/api/export')) {
                // Create FormData for multipart/form-data requests
                const formData = new form_data_1.default();
                // Add all params to FormData
                if (params) {
                    Object.keys(params).forEach((key) => {
                        formData.append(key, params[key]);
                    });
                }
                // Get FormData headers first (includes content-type and boundary)
                const formDataHeaders = formData.getHeaders();
                // Build headers object - Authorization MUST be in headers, not body
                config = {
                    method: method || "POST",
                    url: endpoint,
                    data: formData,
                    headers: Object.assign(Object.assign({}, formDataHeaders), (finalToken ? { "Authorization": `Bearer ${finalToken}` } : {})),
                };
                // Log headers for debugging (excluding token for security)
                console.log('FormData Request Headers:', {
                    endpoint,
                    hasAuth: !!finalToken,
                    tokenSource: tokenFromHeader ? 'header' : (token ? 'body' : 'none'),
                    contentType: formDataHeaders['content-type'],
                    headersKeys: Object.keys(config.headers)
                });
            }
            else {
                // Use JSON for regular requests
                config = {
                    method: method || "POST",
                    url: endpoint,
                    data: params,
                    headers: Object.assign({ "Content-Type": "application/json" }, (finalToken ? { "Authorization": `Bearer ${finalToken}` } : {})),
                };
                // Log headers for debugging
                console.log('JSON Request Headers:', {
                    endpoint,
                    hasAuth: !!finalToken,
                    tokenSource: tokenFromHeader ? 'header' : (token ? 'body' : 'none'),
                    contentType: config.headers["Content-Type"]
                });
            }
            const apiResponse = await (0, axios_1.default)(config);
            response.status(200).json({ ok: true, data: apiResponse.data });
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                console.error("Axios error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                response.status(((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) || 500).json({
                    ok: false,
                    message: "Error proxying request",
                    error: ((_c = error.response) === null || _c === void 0 ? void 0 : _c.data) || error.message,
                });
            }
            else {
                console.error("Unknown error:", error);
                response.status(500).json({ ok: false, message: "An unknown error occurred" });
            }
        }
    });
});
//# sourceMappingURL=index.js.map