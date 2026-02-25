import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export type ParsedCfdi = {
  uuid: string;
  fecha: string;
  rfcEmisor: string;
  rfcReceptor: string;
  total: number;
  moneda: string | null;
};

export function parseCfdiXml(xml: string): ParsedCfdi | null {
  const o = parser.parse(xml);

  const c = o["cfdi:Comprobante"] ?? o["Comprobante"];
  if (!c) return null;

  const total = Number(c["@_Total"] ?? c["@_total"] ?? 0);
  const fecha = String(c["@_Fecha"] ?? c["@_fecha"] ?? "");
  const moneda = c["@_Moneda"] ?? c["@_moneda"] ?? null;

  const emisor = c["cfdi:Emisor"] ?? c["Emisor"];
  const receptor = c["cfdi:Receptor"] ?? c["Receptor"];

  const rfcEmisor = String(emisor?.["@_Rfc"] ?? emisor?.["@_rfc"] ?? "");
  const rfcReceptor = String(receptor?.["@_Rfc"] ?? receptor?.["@_rfc"] ?? "");

  const complemento = c["cfdi:Complemento"] ?? c["Complemento"];
  const tfd = complemento?.["tfd:TimbreFiscalDigital"] ?? complemento?.["TimbreFiscalDigital"];
  const uuid = String(tfd?.["@_UUID"] ?? tfd?.["@_uuid"] ?? "");

  if (!uuid) return null;
  return { uuid, fecha, rfcEmisor, rfcReceptor, total, moneda };
}