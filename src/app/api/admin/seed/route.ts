import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

// Development-only seed endpoint
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    // Categories
    const categories = await Promise.all([
      prisma.category.upsert({ where: { slug: "popcorn" }, create: { name: "Popcorn", slug: "popcorn", icon: "🍿", sortOrder: 1 }, update: {} }),
      prisma.category.upsert({ where: { slug: "beverages" }, create: { name: "Beverages", slug: "beverages", icon: "🥤", sortOrder: 2 }, update: {} }),
      prisma.category.upsert({ where: { slug: "snacks" }, create: { name: "Snacks", slug: "snacks", icon: "🍟", sortOrder: 3 }, update: {} }),
      prisma.category.upsert({ where: { slug: "meals" }, create: { name: "Meals", slug: "meals", icon: "🍔", sortOrder: 4 }, update: {} }),
      prisma.category.upsert({ where: { slug: "combos" }, create: { name: "Combos", slug: "combos", icon: "🎉", sortOrder: 5 }, update: {} }),
    ]);

    const [popcorn, beverages, snacks, meals, combos] = categories;

    // Menu items
    const menuData = [
      { categoryId: popcorn.id, name: "Butter Popcorn", description: "Rich buttery movie-style popcorn", basePrice: 210, isVeg: true, isFeatured: true, sortOrder: 1 },
      { categoryId: popcorn.id, name: "Caramel Popcorn", description: "Sweet glazed caramel popcorn", basePrice: 250, isVeg: true, isFeatured: false, sortOrder: 2 },
      { categoryId: popcorn.id, name: "Cheese Popcorn", description: "Sharp cheddar dusted popcorn", basePrice: 230, isVeg: true, isFeatured: false, sortOrder: 3 },
      { categoryId: beverages.id, name: "Coca-Cola (L)", description: "Ice cold classic Coke", basePrice: 150, isVeg: true, isFeatured: true, sortOrder: 1 },
      { categoryId: beverages.id, name: "Mango Smoothie", description: "Fresh Alphonso mango blend", basePrice: 180, isVeg: true, isFeatured: false, sortOrder: 2 },
      { categoryId: beverages.id, name: "Fresh Lime Soda", description: "Sweet or salted, freshly squeezed", basePrice: 120, isVeg: true, isFeatured: false, sortOrder: 3 },
      { categoryId: snacks.id, name: "Loaded Nachos", description: "With salsa, sour cream and jalapeños", basePrice: 280, isVeg: true, isFeatured: true, sortOrder: 1 },
      { categoryId: snacks.id, name: "Masala Fries", description: "Crispy fries with signature masala", basePrice: 199, isVeg: true, isFeatured: false, sortOrder: 2 },
      { categoryId: meals.id, name: "Paneer Tikka Burger", description: "Grilled paneer in a brioche bun", basePrice: 299, isVeg: true, isFeatured: true, sortOrder: 1 },
      { categoryId: meals.id, name: "Margherita Pizza Slice", description: "Classic tomato and mozzarella", basePrice: 220, isVeg: true, isFeatured: false, sortOrder: 2 },
      { categoryId: combos.id, name: "Movie Night Combo", description: "Large popcorn + 2 drinks + nachos", basePrice: 499, isVeg: true, isFeatured: true, sortOrder: 1 },
      { categoryId: combos.id, name: "Solo Snack Box", description: "Medium popcorn + drink + fries", basePrice: 349, isVeg: true, isFeatured: false, sortOrder: 2 },
    ];

    for (const item of menuData) {
      await prisma.menuItem.upsert({
        where: { id: `seed-${slugify(item.name)}` },
        create: { id: `seed-${slugify(item.name)}`, ...item },
        update: item,
      });
    }

    // Theaters
    const theater1 = await prisma.theater.upsert({
      where: { slug: "pvr-forum-mall-bengaluru" },
      create: {
        name: "PVR Forum Mall",
        slug: "pvr-forum-mall-bengaluru",
        address: "Forum Mall, Koramangala",
        city: "Bengaluru",
        state: "Karnataka",
        phone: "+91 80 4014 2222",
        settings: { create: { taxRate: 5, packagingFee: 10, deliveryEtaMin: 12 } },
      },
      update: {},
    });

    const theater2 = await prisma.theater.upsert({
      where: { slug: "inox-mantri-square-bengaluru" },
      create: {
        name: "INOX Mantri Square",
        slug: "inox-mantri-square-bengaluru",
        address: "Mantri Square Mall, Malleshwaram",
        city: "Bengaluru",
        state: "Karnataka",
        settings: { create: { taxRate: 5, packagingFee: 10, deliveryEtaMin: 15 } },
      },
      update: {},
    });

    // Screens and seats for theater1
    const screensData = [
      { theaterId: theater1.id, name: "Audi 1", number: 1, capacity: 120 },
      { theaterId: theater1.id, name: "Audi 2 — 4DX", number: 2, capacity: 60 },
      { theaterId: theater2.id, name: "Screen 1", number: 1, capacity: 100 },
      { theaterId: theater2.id, name: "Screen 2", number: 2, capacity: 80 },
    ];

    for (const screenData of screensData) {
      const screen = await prisma.screen.upsert({
        where: { theaterId_number: { theaterId: screenData.theaterId, number: screenData.number } },
        create: screenData,
        update: {},
      });

      // Create 8 rows × 12 seats
      const rows = ["A", "B", "C", "D", "E", "F", "G", "H"];
      for (const row of rows) {
        for (let num = 1; num <= 12; num++) {
          const label = `${row}${num}`;
          const seat = await prisma.seat.upsert({
            where: { screenId_row_number: { screenId: screen.id, row, number: num } },
            create: { screenId: screen.id, row, number: num, label },
            update: {},
          });
          await prisma.qRCode.upsert({
            where: { seatId: seat.id },
            create: {
              seatId: seat.id,
              theaterId: screenData.theaterId,
              screenId: screen.id,
              metadata: { seatLabel: label, screenName: screen.name },
            },
            update: {},
          });
        }
      }
    }

    // Sample coupon
    await prisma.coupon.upsert({
      where: { code: "WELCOME20" },
      create: {
        code: "WELCOME20",
        type: "PERCENTAGE",
        value: 20,
        minOrderAmt: 200,
        maxDiscount: 100,
        usageLimit: 100,
      },
      update: {},
    });

    return NextResponse.json({ success: true, message: "Database seeded successfully" });
  } catch (err) {
    console.error("[POST /api/admin/seed]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
