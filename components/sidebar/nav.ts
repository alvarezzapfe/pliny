export type NavItemId =
  | "dashboard"
  | "datos"
  | "cartera"
  | "solicitudes"
  | "clientes"
  | "ajustes";

export type NavItem = {
  id: NavItemId;
  title: string;
  href: string;
  match?: "exact" | "prefix";
};

export const NAV: NavItem[] = [
  { id: "dashboard",   title: "Dashboard",   href: "/dashboard",            match: "exact" },
  { id: "datos",       title: "Datos",       href: "/dashboard/datos",      match: "prefix" },
  { id: "cartera",     title: "Cartera",     href: "/dashboard/cartera",    match: "prefix" },
  { id: "solicitudes", title: "Solicitudes", href: "/dashboard/solicitudes",match: "prefix" },
  { id: "clientes",    title: "Empresas",    href: "/dashboard/clientes",   match: "prefix" },
  { id: "ajustes",     title: "Ajustes",     href: "/dashboard/ajustes",    match: "prefix" },
];