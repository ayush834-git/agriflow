import { NextResponse } from "next/server";
import { updateInventory, deleteInventory } from "@/lib/inventory/store";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const inventory = await updateInventory(id, body);
    
    return NextResponse.json({ ok: true, inventory });
  } catch (error) {
    console.error("Failed to update inventory:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to update inventory item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteInventory(id);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete inventory:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to delete inventory item" },
      { status: 500 }
    );
  }
}
