export type NavItem = {
  title: string;
  href: string;
  match?: "exact" | "prefix";
};

export const NAV: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", match: "exact" },
  { title: "Datos", href: "/dashboard/datos", match: "prefix" },
  { title: "Solicitudes", href: "/dashboard/solicitudes", match: "prefix" },
  { title: "Documentos", href: "/dashboard/documentos", match: "prefix" },
  { title: "Clientes", href: "/dashboard/clientes", match: "prefix" },
  { title: "Ajustes", href: "/dashboard/ajustes", match: "prefix" },
];