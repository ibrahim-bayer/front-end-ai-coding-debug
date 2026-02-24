// This script runs in the MAIN world (same JS context as the page).
// It intercepts fetch/XHR for request/response data, console calls, and runtime errors.
// It communicates with the ISOLATED content script via CustomEvent on document.

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_start",
  world: "MAIN",
  main() {
    const EVENT_NAME = "chrome2code-event";
    const MAX_BODY = 1024;

    function post(event: Record<string, unknown>): void {
      try {
        document.dispatchEvent(
          new CustomEvent(EVENT_NAME, { detail: JSON.stringify(event) }),
        );
      } catch {
        // Fail silently
      }
    }

    function truncate(text: string | undefined | null): string | undefined {
      if (!text) return undefined;
      if (text.length <= MAX_BODY) return text;
      return text.substring(0, MAX_BODY) + "... [truncated]";
    }

    function headersToRecord(headers: Headers): Record<string, string> {
      const result: Record<string, string> = {};
      headers.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    function serializeBody(body: BodyInit | null | undefined): string | undefined {
      if (!body) return undefined;
      if (typeof body === "string") return truncate(body);
      if (body instanceof URLSearchParams) return truncate(body.toString());
      if (body instanceof FormData) {
        const parts: string[] = [];
        body.forEach((value, key) => {
          parts.push(`${key}=${typeof value === "string" ? value : "[File]"}`);
        });
        return truncate(parts.join("&"));
      }
      try {
        return truncate(JSON.stringify(body));
      } catch {
        return "[non-serializable body]";
      }
    }

    // --- Fetch interception ---
    const originalFetch = window.fetch.bind(window);

    window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const startTime = Date.now();
      const method = init?.method?.toUpperCase() ?? "GET";
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const requestBody = serializeBody(init?.body);
      const requestHeaders: Record<string, string> = {};
      if (init?.headers) {
        const h = new Headers(init.headers);
        h.forEach((v, k) => { requestHeaders[k] = v; });
      }

      let response: Response;
      try {
        response = await originalFetch(input, init);
      } catch (err) {
        // Network error (CORS, timeout, DNS failure)
        post({
          category: "network",
          type: method,
          timestamp: new Date().toISOString(),
          url,
          status: 0,
          statusText: (err as Error).message ?? "Network Error",
          requestBody,
          requestHeaders: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
          duration: Date.now() - startTime,
        });
        throw err;
      }

      // Only capture failed requests (4xx/5xx)
      if (response.status >= 400) {
        let responseBody: string | undefined;
        try {
          // Clone to avoid consuming the body
          responseBody = truncate(await response.clone().text());
        } catch {
          responseBody = "[could not read response body]";
        }

        post({
          category: "network",
          type: method,
          timestamp: new Date().toISOString(),
          url,
          status: response.status,
          statusText: response.statusText,
          requestBody,
          requestHeaders: Object.keys(requestHeaders).length > 0 ? requestHeaders : undefined,
          response: responseBody,
          responseHeaders: headersToRecord(response.headers),
          duration: Date.now() - startTime,
        });
      }

      return response;
    };

    // --- XMLHttpRequest interception ---
    const OriginalXHR = window.XMLHttpRequest;
    const originalOpen = OriginalXHR.prototype.open;
    const originalSend = OriginalXHR.prototype.send;
    const originalSetRequestHeader = OriginalXHR.prototype.setRequestHeader;

    OriginalXHR.prototype.open = function (method: string, url: string | URL, ...rest: unknown[]) {
      (this as XMLHttpRequest & { _c2c_method: string; _c2c_url: string; _c2c_start: number; _c2c_headers: Record<string, string> })._c2c_method = method.toUpperCase();
      (this as XMLHttpRequest & { _c2c_url: string })._c2c_url = typeof url === "string" ? url : url.href;
      (this as XMLHttpRequest & { _c2c_headers: Record<string, string> })._c2c_headers = {};
      return originalOpen.call(this, method, url, ...(rest as [boolean, string?, string?]));
    };

    OriginalXHR.prototype.setRequestHeader = function (name: string, value: string) {
      const xhr = this as XMLHttpRequest & { _c2c_headers: Record<string, string> };
      if (xhr._c2c_headers) xhr._c2c_headers[name] = value;
      return originalSetRequestHeader.call(this, name, value);
    };

    OriginalXHR.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
      const xhr = this as XMLHttpRequest & {
        _c2c_method: string;
        _c2c_url: string;
        _c2c_start: number;
        _c2c_headers: Record<string, string>;
      };
      xhr._c2c_start = Date.now();
      const requestBody = typeof body === "string" ? truncate(body) : undefined;

      this.addEventListener("loadend", function () {
        if (this.status >= 400) {
          post({
            category: "network",
            type: xhr._c2c_method,
            timestamp: new Date().toISOString(),
            url: xhr._c2c_url,
            status: this.status,
            statusText: this.statusText,
            requestBody,
            requestHeaders: Object.keys(xhr._c2c_headers).length > 0 ? xhr._c2c_headers : undefined,
            response: truncate(this.responseText),
            duration: Date.now() - xhr._c2c_start,
          });
        }
      });

      this.addEventListener("error", function () {
        post({
          category: "network",
          type: xhr._c2c_method,
          timestamp: new Date().toISOString(),
          url: xhr._c2c_url,
          status: 0,
          statusText: "Network Error",
          requestBody,
          requestHeaders: Object.keys(xhr._c2c_headers).length > 0 ? xhr._c2c_headers : undefined,
          duration: Date.now() - xhr._c2c_start,
        });
      });

      return originalSend.call(this, body);
    };

    // --- Error capture ---
    window.addEventListener("error", (e) => {
      post({
        category: "error",
        type: e.error?.constructor?.name ?? "Error",
        timestamp: new Date().toISOString(),
        message: e.message,
        stack: e.error?.stack,
      });
    });

    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason;
      post({
        category: "error",
        type: reason?.constructor?.name ?? "UnhandledRejection",
        timestamp: new Date().toISOString(),
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
      });
    });

    // --- Console capture ---
    const originalLog = console.log.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalError = console.error.bind(console);

    console.log = function (...args: unknown[]) {
      post({
        category: "console",
        type: "log",
        timestamp: new Date().toISOString(),
        message: args.map(String).join(" "),
      });
      originalLog(...args);
    };

    console.warn = function (...args: unknown[]) {
      post({
        category: "console",
        type: "warn",
        timestamp: new Date().toISOString(),
        message: args.map(String).join(" "),
      });
      originalWarn(...args);
    };

    console.error = function (...args: unknown[]) {
      const message = args.map(String).join(" ");
      post({
        category: "console",
        type: "error",
        timestamp: new Date().toISOString(),
        message,
      });
      post({
        category: "error",
        type: "ConsoleError",
        timestamp: new Date().toISOString(),
        message,
      });
      originalError(...args);
    };
  },
});
