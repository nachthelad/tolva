export type ProviderSeed = {
  id: string
  name: string
  category: "utilities" | "telecom" | "credit_card"
  aliases: string[]
}

export const PROVIDERS: ProviderSeed[] = [
  {
    id: "edesur",
    name: "Edesur",
    category: "utilities",
    aliases: ["Edesur", "EDESUR S.A."],
  },
  {
    id: "aysa",
    name: "AySA",
    category: "utilities",
    aliases: ["AySA", "AGUA Y SANEAMIENTO", "Aysa"],
  },
  {
    id: "metrogas",
    name: "Metrogas",
    category: "utilities",
    aliases: ["Metrogas", "METROGAS S.A."],
  },
  {
    id: "telecentro",
    name: "Telecentro",
    category: "telecom",
    aliases: ["Telecentro"],
  },
  {
    id: "visa",
    name: "Visa Credit Card",
    category: "credit_card",
    aliases: ["VISA", "Resumen de Cuenta"],
  },
  {
    id: "mastercard",
    name: "Mastercard",
    category: "credit_card",
    aliases: ["MASTERCARD"],
  },
]
