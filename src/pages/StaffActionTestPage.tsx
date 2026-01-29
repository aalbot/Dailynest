"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, UserPlus, Edit, Trash2 } from "lucide-react";
import { dataProvider } from "@/data"; // your Firebase data provider

/* =====================================================
   TYPES
   ===================================================== */

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier?: "Standard" | "Gold" | "VIP";
  status?: "Active" | "Inactive";
  totalOrders?: number;
  joinDate?: string;
};

type ActionResult<T = any> = {
  status: "success" | "cancelled" | "error";
  data?: T;
  feedback?: string;
};

type ActionResolver = (result: ActionResult) => void;

/* =====================================================
   ACTION REQUEST BUS
   ===================================================== */

const actionRequestBus = {
  resolver: null as ActionResolver | null,
  request(): Promise<ActionResult> {
    return new Promise((resolve) => {
      actionRequestBus.resolver = resolve;
    });
  },
  resolve(result: ActionResult) {
    actionRequestBus.resolver?.(result);
    actionRequestBus.resolver = null;
  },
};

/* =====================================================
   PAGE COMPONENT
   ===================================================== */

export default function CustomerActionTestPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState<Partial<Customer>>({
    name: "",
    email: "",
    phone: "",
    tier: "Standard",
    status: "Active",
  });
  const [loading, setLoading] = useState(false);

  /* =====================================================
     FETCH / OBSERVE DATA
  ===================================================== */
  useEffect(() => {
    const unsub = dataProvider.observe("customers").subscribe((v) => {
      setCustomers(Object.values(v || {}));
    });
    return () => unsub();
  }, []);

  /* =====================================================
     ACTION HANDLERS
  ===================================================== */

  const openCreate = async () => {
    setForm({ name: "", email: "", phone: "", tier: "Standard", status: "Active" });
    setEditing(null);
    setModalOpen(true);
    const result = await actionRequestBus.request();
    console.log("Create Result:", result);
  };

  const openEdit = async (customer: Customer) => {
    setForm({ ...customer });
    setEditing(customer);
    setModalOpen(true);
    const result = await actionRequestBus.request();
    console.log("Edit Result:", result);
  };

  const save = async () => {
    if (!form.name || !form.email) {
      toast.error("Name and Email are required");
      return;
    }

    setLoading(true);

    try {
      const id = editing?.id || dataProvider.generateKey("customers");
      const payload: Customer = {
        id,
        ...form,
        status: form.status || "Active",
        tier: form.tier || "Standard",
        totalOrders: form.totalOrders || 0,
        joinDate: form.joinDate || new Date().toISOString(),
      };

      await dataProvider.update("customers", { [id]: payload });
      toast.success(editing ? "Customer updated" : "Customer added");

      actionRequestBus.resolve({ status: "success", data: payload });
      setModalOpen(false);
    } catch (error) {
      toast.error("Failed to save customer");
      actionRequestBus.resolve({ status: "error", feedback: "Save failed" });
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    actionRequestBus.resolve({ status: "cancelled", feedback: "User cancelled" });
    setModalOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    try {
      await dataProvider.remove(`customers/${id}`);
      toast.success("Customer removed");
    } catch (error) {
      toast.error("Failed to remove customer");
    }
  };

  /* =====================================================
     UI LAYER
  ===================================================== */

  const filtered = useMemo(() => customers, [customers]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users size={28} /> Customer Action Bus
        </h1>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <UserPlus size={16} /> Add Customer
        </Button>
      </div>

      {/* Customer List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <Card key={c.id} className="rounded-xl shadow-sm">
            <CardHeader>
              <CardTitle>{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Email: {c.email}</p>
              <p>Phone: {c.phone}</p>
              <p>Tier: {c.tier}</p>
              <p>Status: {c.status}</p>
              <div className="flex justify-end gap-2 mt-2">
                <Button size="icon" variant="outline" onClick={() => openEdit(c)}>
                  <Edit size={16} />
                </Button>
                <Button size="icon" variant="destructive" onClick={() => remove(c.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 col-span-full mt-8">No customers yet</p>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={cancel}>
        <DialogContent className="max-w-md rounded-2xl p-6">
          <DialogTitle>{editing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <div className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={form.name || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                value={form.email || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Tier</Label>
              <div className="flex gap-2">
                {(["Standard", "Gold", "VIP"] as const).map((t) => (
                  <Button
                    key={t}
                    variant={form.tier === t ? "default" : "outline"}
                    onClick={() => setForm((prev) => ({ ...prev, tier: t }))}
                    className="grow font-bold"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 flex gap-2">
            <Button onClick={cancel} variant="outline" className="grow">
              Cancel
            </Button>
            <Button onClick={save} className="grow" disabled={loading}>
              {loading ? "Processing..." : editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* =====================================================
   HELPER FUNCTION TO CALL ACTION FROM ANYWHERE
  ===================================================== */

export async function requestCustomerAction(
  mode: "create" | "edit",
  customer?: Customer
): Promise<ActionResult<Customer>> {
  if (mode === "create") {
    actionRequestBus.resolver = null; // ensure clean state
  }
  if (mode === "edit" && customer) {
    actionRequestBus.resolver = null;
  }
  return actionRequestBus.request();
}
