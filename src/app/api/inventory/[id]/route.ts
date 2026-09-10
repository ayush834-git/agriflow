import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { updateInventory, deleteInventory, findInventoryById } from "@/lib/inventory/store";
import { findUserByClerkId } from "@/lib/users/store";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await findInventoryById(id);
    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Inventory item not found." },
        { status: 404 }
      );
    }

    try {
      const session = await auth();
      if (session.userId) {
        const user = await findUserByClerkId(session.userId);
        if (user && item.ownerUserId && item.ownerUserId !== user.id) {
          return NextResponse.json(
            { ok: false, error: "Forbidden: You do not own this inventory item." },
            { status: 403 }
          );
        }
      }
    } catch {
      // Unauthenticated
    }

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
    const item = await findInventoryById(id);
    if (!item) {
      return NextResponse.json(
        { ok: false, error: "Inventory item not found." },
        { status: 404 }
      );
    }

    try {
      const session = await auth();
      if (session.userId) {
        const user = await findUserByClerkId(session.userId);
        if (user && item.ownerUserId && item.ownerUserId !== user.id) {
          return NextResponse.json(
            { ok: false, error: "Forbidden: You do not own this inventory item." },
            { status: 403 }
          );
        }
      }
    } catch {
      // Unauthenticated
    }

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
