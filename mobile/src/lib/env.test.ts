import { apiConfig } from "./api";

describe("apiConfig", () => {
  it("has a usable API base URL", () => {
    expect(apiConfig.baseUrl).toMatch(/\/api\/v1$/);
  });
});
