import { api } from "@/lib/api"
import type {
  ConvertResponse,
  RatesResponse,
  SupportedResponse,
} from "./types"

export const currencyApi = {
  supported: () => api.get<SupportedResponse>("/currency/supported"),

  rates: (base: string) =>
    api.get<RatesResponse>("/currency/rates", { params: { base } }),

  convert: (from: string, to: string, amount: number) =>
    api.get<ConvertResponse>("/currency/convert", {
      params: { from, to, amount: String(amount) },
    }),
}
