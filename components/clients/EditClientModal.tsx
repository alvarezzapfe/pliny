// components/clients/EditClientModal.tsx
"use client";

import * as React from "react";

type Client = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Cliente a editar (lo pasas desde la página / tabla)
  client: Client | null;

  // Útil para refrescar lista / cerrar modal con datos actualizados
  onUpdated?: (updated: Client) => void;
};

export default function EditClientModal({
  open,
  onOpenChange,
  client,
  onUpdated,
}: Props) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  // Cuando cambie el cliente o se abra el modal, precargamos campos
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setSuccess(null);

    setName(client?.name ?? "");
    setEmail(client?.email ?? "");
    setPhone(client?.phone ?? "");
  }, [open, client]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!client?.id) {
      setError("No hay cliente seleccionado para editar.");
      return;
    }
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    try {
      setLoading(true);

      // Ideal: endpoint /api/clients/[id] con PUT o PATCH
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || "No se pudo actualizar el cliente.");
        return;
      }

      // data debería devolver el cliente actualizado
      const updated: Client = data?.client ?? data;

      setSuccess("Cliente actualizado.");
      onUpdated?.(updated);

      // Cierra el modal
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.message || "Error inesperado.");
    } finally {
      setLoading(false);
    }
  }

  // Modal muy simple (sin shadcn). Si tú ya usas componentes UI, lo adapto.
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Editar cliente</h2>
            <p className="text-sm text-gray-600">
              Actualiza la información del cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              placeholder="Ej. MAS AIR SA de CV"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              placeholder="correo@empresa.com"
              type="email"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Teléfono</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring"
              placeholder="+52 55 1234 5678"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {success}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
              disabled={loading}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="rounded-xl bg-black px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}