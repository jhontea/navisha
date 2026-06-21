export interface SupportedCurrency {
  code: string
  symbol: string
  name: string
}

export interface SupportedResponse {
  supported: SupportedCurrency[]
}

export interface Rate {
  currency: string
  rate: number
  symbol: string
  fetched_at: string
}

export interface RatesResponse {
  base: string
  rates: Rate[]
}

export interface ConvertResponse {
  from: string
  to: string
  amount: number
  converted_amount: number
  rate: number
}
