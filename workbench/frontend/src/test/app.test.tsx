import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "@/App";

/** 401 from /api/me must render the login screen. */
describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url.includes("/api/me")) {
          return new Response(JSON.stringify({ detail: "Not authenticated" }), { status: 401 });
        }
        return new Response(JSON.stringify({}), { status: 200 });
      })
    );
  });

  it("renders the login screen when unauthenticated", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <App />
      </QueryClientProvider>
    );
    expect(await screen.findByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Session password/i)).toBeInTheDocument();
  });
});
