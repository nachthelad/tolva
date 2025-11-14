from __future__ import annotations

import io
import logging
import re
import unicodedata
from datetime import datetime
from typing import Optional

import pdfplumber
import requests
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("parser")

AMOUNT_PATTERN = re.compile(r"(?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{2})")
HOA_MARKERS = ("MIS EXPENSAS", "EXPENSAS ORDINARIAS", "ESTADO DE CUENTAS Y PRORRATEO")
SPANISH_MONTH_MAP = {
  "ENERO": 1,
  "FEBRERO": 2,
  "MARZO": 3,
  "ABRIL": 4,
  "MAYO": 5,
  "JUNIO": 6,
  "JULIO": 7,
  "AGOSTO": 8,
  "SEPTIEMBRE": 9,
  "SETIEMBRE": 9,
  "OCTUBRE": 10,
  "NOVIEMBRE": 11,
  "DICIEMBRE": 12,
}
MONTH_NUMBER_TO_NAME = {
  1: "ENERO",
  2: "FEBRERO",
  3: "MARZO",
  4: "ABRIL",
  5: "MAYO",
  6: "JUNIO",
  7: "JULIO",
  8: "AGOSTO",
  9: "SEPTIEMBRE",
  10: "OCTUBRE",
  11: "NOVIEMBRE",
  12: "DICIEMBRE",
}

app = FastAPI(title="Bills Parser", version="0.1.0")


class ParseRequest(BaseModel):
  pdf_url: str


class HoaRubro(BaseModel):
  rubroNumber: Optional[int] = None
  label: Optional[str] = None
  total: Optional[float] = None


class HoaDetails(BaseModel):
  buildingCode: Optional[str] = None
  buildingAddress: Optional[str] = None
  unitCode: Optional[str] = None
  unitLabel: Optional[str] = None
  ownerName: Optional[str] = None
  periodLabel: Optional[str] = None
  periodYear: Optional[int] = None
  periodMonth: Optional[int] = None
  firstDueAmount: Optional[float] = None
  secondDueAmount: Optional[float] = None
  totalBuildingExpenses: Optional[float] = None
  totalToPayUnit: Optional[float] = None
  rubros: list[HoaRubro] = Field(default_factory=list)


class ParseResponse(BaseModel):
  text: str
  providerId: Optional[str] = None
  providerNameDetected: Optional[str] = None
  category: Optional[str] = None
  totalAmount: Optional[float] = None
  currency: Optional[str] = None
  issueDate: Optional[str] = None
  dueDate: Optional[str] = None
  periodStart: Optional[str] = None
  periodEnd: Optional[str] = None
  hoaDetails: Optional[HoaDetails] = None


@app.post("/parse", response_model=ParseResponse)
def parse_document(payload: ParseRequest) -> ParseResponse:
  logger.info("Received parse request for %s", payload.pdf_url)
  try:
    response = requests.get(payload.pdf_url, timeout=30)
    response.raise_for_status()
  except requests.RequestException as exc:
    logger.exception("Failed to download PDF")
    raise HTTPException(status_code=502, detail=f"Error downloading PDF: {exc}") from exc

  pdf_bytes = io.BytesIO(response.content)

  try:
    with pdfplumber.open(pdf_bytes) as pdf:
      pages_text = [page.extract_text() or "" for page in pdf.pages]
  except Exception as exc:
    logger.exception("Failed to parse PDF bytes")
    raise HTTPException(status_code=500, detail=f"Error reading PDF: {exc}") from exc

  full_text = "\n".join(pages_text).strip()
  if not full_text:
    raise HTTPException(status_code=422, detail="No text extracted from PDF.")

  hoa_detected = contains_hoa_markers(full_text)
  hoa_details = extract_hoa_details(full_text) if hoa_detected else None

  provider_id, provider_name = detect_provider(full_text)
  if hoa_detected:
    provider_id = "expensas"
    provider_name = "Expensas consorcio"

  category = detect_category(full_text, provider_id, hoa_detected)
  total_amount = (
    hoa_details.totalToPayUnit if hoa_details and hoa_details.totalToPayUnit is not None else extract_total_amount(full_text)
  )
  currency = "ARS" if (total_amount is not None or hoa_detected) else None
  dates = extract_dates(full_text, provider_id)

  logger.info(
    "Parsed document provider=%s category=%s amount=%s due=%s",
    provider_id,
    category,
    total_amount,
    dates.get("dueDate"),
  )

  return ParseResponse(
    text=full_text,
    providerId=provider_id,
    providerNameDetected=provider_name,
    category=category,
    totalAmount=total_amount,
    currency=currency,
    issueDate=dates.get("issueDate"),
    dueDate=dates.get("dueDate"),
    periodStart=dates.get("periodStart"),
    periodEnd=dates.get("periodEnd"),
    hoaDetails=hoa_details,
  )


def detect_provider(text: str) -> tuple[Optional[str], Optional[str]]:
  normalized = text.upper()
  providers = [
    ("EDESUR", "edesur", "EDESUR S.A."),
    ("AYSA", "aysa", "AySA"),
    ("AGUA Y SANEAMIENTO", "aysa", "AySA"),
    ("METROGAS", "metrogas", "MetroGAS"),
    ("TELECENTRO", "telecentro", "Telecentro"),
    ("VISA", "visa", "Visa"),
    ("MASTERCARD", "mastercard", "Mastercard"),
  ]

  for keyword, provider_id, provider_name in providers:
    if keyword in normalized:
      if provider_id == "visa" and "RESUMEN DE CUENTA" not in normalized:
        continue
      return provider_id, provider_name

  return None, None


def detect_category(text: str, provider_id: Optional[str], hoa_detected: bool = False) -> Optional[str]:
  if hoa_detected:
    return "hoa"
  if provider_id in {"edesur", "aysa", "metrogas", "telecentro"}:
    return "service"
  if provider_id in {"visa", "mastercard"}:
    return "credit_card"
  return "other"


def extract_total_amount(text: str) -> Optional[float]:
  keyword_pattern = re.compile(
    r"(TOTAL\s*A\s+PAGAR|TOTAL\s*PAGAR|TOTAL\s*A\s+ABONAR|IMPORTE\s+TOTAL|TOTAL\s+\w*\s+PAGAR|TOTAL\s+\w*\s+ABONAR)",
    re.IGNORECASE,
  )
  for match in keyword_pattern.finditer(text):
    snippet = text[match.start() : match.end() + 80]
    amount_match = AMOUNT_PATTERN.search(snippet)
    if amount_match:
      amount = parse_monetary_value(amount_match.group(0))
      if amount is not None:
        return amount

  # Fallback: take the first monetary value in the doc
  fallback_match = AMOUNT_PATTERN.search(text)
  if fallback_match:
    return parse_monetary_value(fallback_match.group(0))

  return None


def extract_dates(text: str, provider_id: Optional[str]) -> dict[str, Optional[str]]:
  heuristic_dates: dict[str, Optional[str]] = {}
  flags = re.IGNORECASE | re.DOTALL

  def capture(pattern: str) -> Optional[str]:
    match = re.search(pattern, text, flags)
    if match:
      return match.group(1)
    return None

  def to_iso(date_str: Optional[str]) -> Optional[str]:
    if not date_str:
      return None
    try:
      return datetime.strptime(date_str, "%d/%m/%Y").strftime("%Y-%m-%d")
    except ValueError:
      return None

  if provider_id == "metrogas":
    due = capture(r"FECHA\s+DE\s+VENCIMIENTO[:\s]*([0-9]{2}/[0-9]{2}/[0-9]{4})")
    if not due:
      due = capture(r"([0-9]{2}/[0-9]{2}/[0-9]{4})\s*(?:\r?\n)?\s*FECHA\s+DE\s+VENCIMIENTO")
    emission = capture(r"FECHA\s+DE\s+EMISI[ÓO]N[:\s]*([0-9]{2}/[0-9]{2}/[0-9]{4})")
    period_match = re.search(
      r"PERIODO\s+DE\s+LIQUIDACI[ÓO]N[:\s]*(\d{2}/\d{2}/\d{4})\s*A\s*(\d{2}/\d{2}/\d{4})", text, flags
    )
    heuristic_dates["dueDate"] = to_iso(due)
    heuristic_dates["issueDate"] = to_iso(emission)
    if period_match:
      heuristic_dates["periodStart"] = to_iso(period_match.group(1))
      heuristic_dates["periodEnd"] = to_iso(period_match.group(2))

  if provider_id == "edesur":
    due_first = capture(r"1[º°]\s*Vencimiento:\s*([0-9]{2}/[0-9]{2}/[0-9]{4})")
    due_second = capture(r"2[º°]\s*Vencimiento:\s*([0-9]{2}/[0-9]{2}/[0-9]{4})")
    heuristic_dates["dueDate"] = to_iso(due_first or due_second)

  date_pattern = re.compile(r"\b(\d{2}/\d{2}/\d{4})\b")
  found = []
  for match in date_pattern.finditer(text):
    try:
      found.append(datetime.strptime(match.group(1), "%d/%m/%Y"))
    except ValueError:
      continue

  if not found:
    return {}

  found.sort()
  earliest = found[0]
  latest = found[-1]
  middle_index = len(found) // 2
  issue = found[middle_index]
  period_end = found[-2] if len(found) > 1 else None

  def fmt(value: Optional[datetime]) -> Optional[str]:
    return value.strftime("%Y-%m-%d") if value else None

  fallback_dates = {
    "periodStart": fmt(earliest),
    "dueDate": fmt(latest),
    "periodEnd": fmt(period_end),
    "issueDate": fmt(issue),
  }

  result = fallback_dates.copy()
  for key, value in heuristic_dates.items():
    if value:
      result[key] = value

  return result


def contains_hoa_markers(text: str) -> bool:
  normalized = text.upper()
  return any(marker in normalized for marker in HOA_MARKERS)


def parse_monetary_value(raw_value: Optional[str]) -> Optional[float]:
  if not raw_value:
    return None
  cleaned = raw_value.strip().replace("$", "").replace("\u00a0", "").replace("\u202f", "")
  cleaned = re.sub(r"\s+", "", cleaned)
  cleaned = re.sub(r"[^0-9,.-]", "", cleaned)
  if not cleaned:
    return None
  negative = cleaned.startswith("-")
  if negative:
    cleaned = cleaned[1:]
  last_comma = cleaned.rfind(",")
  last_dot = cleaned.rfind(".")
  if last_comma != -1 and last_dot != -1:
    decimal_sep = "," if last_comma > last_dot else "."
  elif "," in cleaned:
    decimal_sep = ","
  elif "." in cleaned:
    decimal_sep = "."
  else:
    decimal_sep = ""

  digits = cleaned.replace(".", "").replace(",", "")
  if not digits:
    return None
  if decimal_sep:
    split_index = cleaned.rfind(decimal_sep)
    integer_part = cleaned[:split_index].replace(".", "").replace(",", "") or "0"
    fractional_part = cleaned[split_index + 1 :] or "00"
    normalized = f"{integer_part}.{fractional_part}"
  else:
    normalized = digits

  try:
    value = float(normalized)
    return -value if negative else value
  except ValueError:
    return None


def extract_hoa_details(text: str) -> Optional[HoaDetails]:
  if not contains_hoa_markers(text):
    return None

  lines = [line.strip() for line in text.splitlines() if line.strip()]
  building_code = extract_building_code(text)
  building_address = extract_building_address(text)
  unit_code, unit_label, owner_name = extract_unit_info(lines)
  period_label, period_year, period_month = parse_period_data(text)
  first_due, second_due = extract_first_and_second_due(lines)
  total_to_pay = extract_total_to_pay(lines) or first_due
  total_building = extract_total_building_expenses(text)
  rubros = extract_rubros(lines)

  if not unit_code or not period_year or not period_month or total_to_pay is None:
    return None

  normalized_label = period_label or f"{MONTH_NUMBER_TO_NAME.get(period_month, f'{period_month:02d}')}/{period_year}"

  return HoaDetails(
    buildingCode=building_code,
    buildingAddress=building_address,
    unitCode=unit_code,
    unitLabel=unit_label,
    ownerName=owner_name,
    periodLabel=normalized_label,
    periodYear=period_year,
    periodMonth=period_month,
    firstDueAmount=first_due,
    secondDueAmount=second_due,
    totalBuildingExpenses=total_building,
    totalToPayUnit=total_to_pay,
    rubros=[HoaRubro(**rubro) for rubro in rubros],
  )


def extract_building_code(text: str) -> Optional[str]:
  match = re.search(r"CODIGO\s+INTERNO[:\s]+([0-9\-]+)", text, re.IGNORECASE)
  if match:
    return match.group(1).strip()
  return None


def build_loose_pattern(label: str) -> str:
  parts = []
  for char in label:
    if char.isspace():
      parts.append(r"\s+")
    else:
      parts.append(re.escape(char) + r"\s*")
  return "".join(parts)


def clean_inline_value(value: Optional[str]) -> Optional[str]:
  if not value:
    return None
  cleaned = value
  cleaned = re.sub(r"C\s*\.\s*U\s*\.\s*I\s*\.\s*T\s*\..*", "", cleaned, flags=re.IGNORECASE)
  cleaned = re.sub(r"CUIT.*", "", cleaned, flags=re.IGNORECASE)
  cleaned = re.sub(r"MAIL.*", "", cleaned, flags=re.IGNORECASE)
  cleaned = re.sub(r"TEL.*", "", cleaned, flags=re.IGNORECASE)
  cleaned = cleaned.replace(" .", ".")
  cleaned = re.sub(r"\s+", " ", cleaned)
  cleaned = cleaned.strip(" :.-")
  return cleaned or None


def extract_building_address(text: str) -> Optional[str]:
  labels = [
    "DOMICILIO DEL CONSORCIO",
    "DOMICILIO DEL EDIFICIO",
    "DIRECCION DEL CONSORCIO",
    "DIRECCION DEL EDIFICIO",
    "DOMICILIO",
    "DIRECCION",
  ]
  for label in labels:
    pattern = re.compile(build_loose_pattern(label) + r":?\s*(.+)", re.IGNORECASE)
    match = pattern.search(text)
    if match:
      candidate = clean_inline_value(match.group(1))
      if candidate:
        return candidate
  return None


def extract_unit_info(lines: list[str]) -> tuple[Optional[str], Optional[str], Optional[str]]:
  pattern = re.compile(r"^(\d{3,5})\s*\|\s*([^|]+)\|\s*([^|]+)$")
  for line in lines[:80]:
    sanitized = line.replace("�", "º")
    match = pattern.match(sanitized)
    if match:
      unit_code = match.group(1).strip()
      unit_label = clean_inline_value(match.group(2))
      owner_name = clean_inline_value(match.group(3))
      return unit_code, unit_label, owner_name
  return None, None, None


def find_amount_strings(line: str) -> list[str]:
  values: list[str] = []
  for match in AMOUNT_PATTERN.finditer(line):
    following = line[match.end() :].strip()
    if following.startswith("%"):
      continue
    values.append(match.group(0))
  return values


def extract_first_and_second_due(lines: list[str]) -> tuple[Optional[float], Optional[float]]:
  first_due: Optional[float] = None
  second_due: Optional[float] = None
  pay_pattern = re.compile(r"A\s*PAGAR\s+A\s*PAGAR", re.IGNORECASE)

  for line in lines:
    if pay_pattern.search(line):
      candidates = find_amount_strings(line)
      if len(candidates) >= 2:
        first_due = parse_monetary_value(candidates[0])
        second_due = parse_monetary_value(candidates[1])
        break

  if first_due is None:
    for line in lines:
      if "1ER" in line.upper():
        candidates = find_amount_strings(line)
        if candidates:
          first_due = parse_monetary_value(candidates[-1])
          break

  if second_due is None:
    for line in lines:
      if "2DO" in line.upper():
        candidates = find_amount_strings(line)
        if candidates:
          second_due = parse_monetary_value(candidates[-1])
          break

  return first_due, second_due


def extract_total_to_pay(lines: list[str]) -> Optional[float]:
  for line in lines:
    simplified = line.replace(" ", "").upper()
    if simplified.startswith("TOTALAPAGAR") or "TOTALAPAGAR" in simplified:
      candidates = find_amount_strings(line)
      if candidates:
        amount = parse_monetary_value(candidates[-1])
        if amount is not None:
          return amount
  return None


def extract_total_building_expenses(text: str) -> Optional[float]:
  for match in re.finditer(r"TOTAL\s+DE\s+GASTOS.*", text, re.IGNORECASE):
    line = match.group(0)
    candidates = find_amount_strings(line)
    if candidates:
      amount = parse_monetary_value(candidates[-1])
      if amount is not None:
        return amount
  return None


def extract_rubros(lines: list[str]) -> list[dict[str, Optional[object]]]:
  rubros: list[dict[str, Optional[object]]] = []
  label_map: dict[int, str] = {}
  header_pattern = re.compile(r"^(\d{1,2})\s+([A-ZÁÉÍÓÚÜÑ0-9 .,'/-]+)$")
  total_pattern = re.compile(r"TOTAL\s+RUBRO\s+(\d+)", re.IGNORECASE)

  for line in lines:
    normalized = " ".join(line.split())
    header_match = header_pattern.match(normalized)
    if header_match:
      number = int(header_match.group(1))
      label_map[number] = header_match.group(2).strip(" .:-")
      continue

    total_match = total_pattern.search(line)
    if total_match:
      number = int(total_match.group(1))
      candidates = find_amount_strings(line)
      if not candidates:
        continue
      rubros.append(
        {
          "rubroNumber": number,
          "label": label_map.get(number, f"Rubro {number}"),
          "total": parse_monetary_value(candidates[-1]),
        }
      )

  unique: list[dict[str, Optional[object]]] = []
  seen: set[tuple[Optional[int], Optional[str]]] = set()
  for rubro in rubros:
    key = (rubro.get("rubroNumber"), rubro.get("label"))
    if key in seen:
      continue
    seen.add(key)
    unique.append(rubro)
  return unique


def parse_period_data(text: str) -> tuple[Optional[str], Optional[int], Optional[int]]:
  normalized = text.upper()
  expensas_match = re.search(r"EXPENSAS[^\n]{0,120}?([A-ZÁÉÍÓÚÜÑ]+/\d{4})", normalized, re.IGNORECASE)
  if expensas_match:
    token = expensas_match.group(1).strip()
    if "/" in token:
      month_token, year_str = token.split("/", 1)
      month = month_from_token(month_token)
      if month and year_str.isdigit():
        label = f"{MONTH_NUMBER_TO_NAME.get(month, month_token)}/{year_str}"
        return label, int(year_str), month

  periodo_match = re.search(r"PERIODO[:\s]+(\d{1,2})/(\d{4})", normalized, re.IGNORECASE)
  if periodo_match:
    month = int(periodo_match.group(1))
    year = int(periodo_match.group(2))
    label = f"{MONTH_NUMBER_TO_NAME.get(month, f'{month:02d}')}/{year}"
    return label, year, month

  return None, None, None


def month_from_token(token: str) -> Optional[int]:
  cleaned = strip_accents(token.upper()).replace(".", "")
  return SPANISH_MONTH_MAP.get(cleaned)


def strip_accents(value: str) -> str:
  normalized = unicodedata.normalize("NFD", value)
  return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
