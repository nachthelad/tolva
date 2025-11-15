export const CATEGORY_OPTIONS = [
  { value: "electricity", label: "Electricity" },
  { value: "water", label: "Water" },
  { value: "gas", label: "Gas" },
  { value: "internet", label: "Internet / Mobile" },
  { value: "hoa", label: "Home / HOA" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
] as const

export type CategoryValue = (typeof CATEGORY_OPTIONS)[number]["value"]

const CATEGORY_SET = new Set(CATEGORY_OPTIONS.map((option) => option.value))

const PROVIDER_KEYWORDS: Array<{ value: CategoryValue; keywords: string[] }> = [
  { value: "electricity", keywords: ["edesur", "edenor", "epec", "electric"] },
  { value: "water", keywords: ["aysa", "agua", "aguas"] },
  { value: "gas", keywords: ["metrogas", "naturgy", "gas"] },
  { value: "internet", keywords: ["telecentro", "fibertel", "cablevision", "personal", "claro", "movistar", "internet"] },
  { value: "hoa", keywords: ["expensa", "consorcio", "administracion"] },
  { value: "credit_card", keywords: ["visa", "mastercard", "amex", "american express"] },
]

export function normalizeCategory(
  providerId?: string | null,
  rawCategory?: string | null,
  providerName?: string | null,
): CategoryValue {
  const normalizedCategory = normalizeValue(rawCategory)
  if (normalizedCategory && CATEGORY_SET.has(normalizedCategory as CategoryValue)) {
    return normalizedCategory as CategoryValue
  }

  const searchValues = [providerId, providerName, rawCategory].map((value) => normalizeValue(value))
  for (const { value, keywords } of PROVIDER_KEYWORDS) {
    if (keywords.some((keyword) => searchValues.some((search) => search && search.includes(keyword)))) {
      return value
    }
  }

  if (normalizedCategory === "service" || normalizedCategory === "services") {
    return "other"
  }

  return "other"
}

function normalizeValue(value?: string | null): string | null {
  if (!value) return null
  return value.trim().toLowerCase()
}
