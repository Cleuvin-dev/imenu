/**
 * Seed idempotente de demonstração (docs/14_SEED_E_DEMONSTRACAO.md).
 *
 * Roda fora do Next.js (via `tsx`), então não pode importar módulos com
 * `import "server-only"` (o pacote nem está instalado — só o bundler do
 * Next sabe resolvê-lo; ver status/IMPLEMENTATION_STATUS.md). Por isso este
 * arquivo cria seu próprio cliente admin em vez de reaproveitar
 * `lib/supabase/admin.ts`, e lê `.env.local` manualmente em vez de
 * `lib/env`.
 *
 * Uso:
 *   npm run seed            — cria/atualiza os dados demo (seguro repetir)
 *   npm run seed -- --reset — apaga os dados demo (só os com prefixo
 *                              "seed-"/slug "*-demo" deste script) e recria
 *
 * Nunca roda se APP_ENV=production (proibido em produção, docs/14 §1).
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database-types";
import { slugify } from "@/modules/catalog/domain/slug";

function loadDotEnvLocal(): void {
  const path = ".env.local";
  if (!existsSync(path)) return;
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnvLocal();

if (process.env.APP_ENV === "production") {
  console.error("Seed proibido: APP_ENV=production (docs/14 §1). Abortando sem tocar no banco.");
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Seed exige NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local " +
      "(ver bloqueio documentado em status/IMPLEMENTATION_STATUS.md — só o dono do produto " +
      "consegue obter a service role key no painel do Supabase).",
  );
  process.exit(1);
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Toda conta/estabelecimento deste seed usa este prefixo — nunca colide com contas de demonstração informais já existentes (ex.: owner-cantina@imenu.demo, D-026). */
const SEED_EMAIL_DOMAIN = "@imenu.demo";
const SEED_SLUGS = ["bistro-vermelho-demo", "cafe-azul-demo", "padaria-suspensa-demo"] as const;
const SEED_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "SeedDemo!2026";

const RESET = process.argv.includes("--reset");

type MemberRole = Database["public"]["Enums"]["member_role"];

async function findOrCreateUser(emailLocal: string, displayName: string): Promise<string> {
  const email = `seed-${emailLocal}${SEED_EMAIL_DOMAIN}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (!createError && created.user) {
    return created.user.id;
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(`Não foi possível criar nem localizar o usuário ${email}: ${createError?.message}`);
  }
  return profile.id;
}

async function upsertEstablishmentMember(establishmentId: string, userId: string, role: MemberRole): Promise<void> {
  const { error } = await admin
    .from("establishment_members")
    .upsert(
      { establishment_id: establishmentId, user_id: userId, role, is_active: true },
      { onConflict: "establishment_id,user_id" },
    );
  if (error) throw new Error(`establishment_members upsert falhou (${role}): ${error.message}`);
}

async function upsertPlatformAdmin(userId: string, role: Database["public"]["Enums"]["platform_role"]): Promise<void> {
  const { error } = await admin
    .from("platform_admins")
    .upsert({ user_id: userId, role, is_active: true }, { onConflict: "user_id" });
  if (error) throw new Error(`platform_admins upsert falhou: ${error.message}`);
}

async function upsertEstablishment(input: {
  slug: string;
  legalName: string;
  tradeName: string;
  city: string;
  stateCode: string;
}): Promise<string> {
  const { data, error } = await admin
    .from("establishments")
    .upsert(
      {
        slug: input.slug,
        legal_name: input.legalName,
        trade_name: input.tradeName,
        city: input.city,
        state_code: input.stateCode,
        timezone: "America/Sao_Paulo",
        currency: "BRL",
        is_active: true,
        accepting_orders: true,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`establishments upsert falhou (${input.slug}): ${error?.message}`);
  return data.id;
}

async function upsertTable(establishmentId: string, name: string): Promise<string> {
  const { data, error } = await admin
    .from("dining_tables")
    .upsert({ establishment_id: establishmentId, name, is_active: true }, { onConflict: "establishment_id,name" })
    .select("id")
    .single();
  if (error || !data) throw new Error(`dining_tables upsert falhou (${name}): ${error?.message}`);
  return data.id;
}

async function findOrCreateCategory(establishmentId: string, name: string, sortOrder: number): Promise<string> {
  const { data: existing } = await admin
    .from("categories")
    .select("id")
    .eq("establishment_id", establishmentId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("categories")
    .insert({ establishment_id: establishmentId, name, sort_order: sortOrder, is_active: true })
    .select("id")
    .single();
  if (error || !data) throw new Error(`categories insert falhou (${name}): ${error?.message}`);
  return data.id;
}

type ProductSeed = {
  categoryId: string;
  name: string;
  shortDescription: string;
  ingredients?: string[];
  allergens?: string[];
  basePriceCents: number;
  status: Database["public"]["Enums"]["product_status"];
  isAvailable: boolean;
};

async function upsertProduct(establishmentId: string, input: ProductSeed): Promise<string> {
  const slug = slugify(input.name);
  const { data, error } = await admin
    .from("products")
    .upsert(
      {
        establishment_id: establishmentId,
        category_id: input.categoryId,
        name: input.name,
        slug,
        short_description: input.shortDescription,
        ingredients: input.ingredients ?? [],
        allergens: input.allergens ?? [],
        base_price_cents: input.basePriceCents,
        status: input.status,
        is_available: input.isAvailable,
        published_at: input.status === "published" ? new Date().toISOString() : null,
      },
      { onConflict: "establishment_id,slug" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`products upsert falhou (${input.name}): ${error?.message}`);
  return data.id;
}

async function findOrCreateOptionGroup(
  establishmentId: string,
  name: string,
  minSelect: number,
  maxSelect: number,
): Promise<string> {
  const { data: existing } = await admin
    .from("option_groups")
    .select("id")
    .eq("establishment_id", establishmentId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("option_groups")
    .insert({ establishment_id: establishmentId, name, min_select: minSelect, max_select: maxSelect, is_active: true })
    .select("id")
    .single();
  if (error || !data) throw new Error(`option_groups insert falhou (${name}): ${error?.message}`);
  return data.id;
}

async function findOrCreateOption(
  establishmentId: string,
  optionGroupId: string,
  name: string,
  priceDeltaCents: number,
): Promise<string> {
  const { data: existing } = await admin
    .from("options")
    .select("id")
    .eq("option_group_id", optionGroupId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("options")
    .insert({ establishment_id: establishmentId, option_group_id: optionGroupId, name, price_delta_cents: priceDeltaCents })
    .select("id")
    .single();
  if (error || !data) throw new Error(`options insert falhou (${name}): ${error?.message}`);
  return data.id;
}

async function attachOptionGroupToProduct(establishmentId: string, productId: string, optionGroupId: string): Promise<void> {
  const { error } = await admin
    .from("product_option_groups")
    .upsert(
      { establishment_id: establishmentId, product_id: productId, option_group_id: optionGroupId },
      { onConflict: "product_id,option_group_id" },
    );
  if (error) throw new Error(`product_option_groups upsert falhou: ${error.message}`);
}

async function findOrCreatePlan(input: {
  code: string;
  name: string;
  priceCents: number;
  limits: Record<string, number>;
}): Promise<string> {
  const { data: existing } = await admin.from("plans").select("id").eq("code", input.code).maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("plans")
    .insert({ code: input.code, name: input.name, price_cents: input.priceCents, limits: input.limits, is_active: true })
    .select("id")
    .single();
  if (error || !data) throw new Error(`plans insert falhou (${input.code}): ${error?.message}`);
  return data.id;
}

async function upsertSubscription(
  establishmentId: string,
  planId: string,
  input: {
    status: Database["public"]["Enums"]["subscription_status"];
    currentPeriodStart: string;
    currentPeriodEnd: string;
    graceUntil?: string | null;
    suspendedAt?: string | null;
    suspensionReason?: Database["public"]["Enums"]["suspension_reason"] | null;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("subscriptions")
    .upsert(
      {
        establishment_id: establishmentId,
        plan_id: planId,
        status: input.status,
        current_period_start: input.currentPeriodStart,
        current_period_end: input.currentPeriodEnd,
        grace_until: input.graceUntil ?? null,
        suspended_at: input.suspendedAt ?? null,
        suspension_reason: input.suspensionReason ?? null,
      },
      { onConflict: "establishment_id" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`subscriptions upsert falhou: ${error?.message}`);
  return data.id;
}

async function upsertInvoice(
  establishmentId: string,
  subscriptionId: string,
  input: {
    periodStart: string;
    periodEnd: string;
    amountCents: number;
    status: Database["public"]["Enums"]["invoice_status"];
    dueAt: string;
    paidAt?: string | null;
  },
): Promise<string> {
  const { data, error } = await admin
    .from("invoices")
    .upsert(
      {
        establishment_id: establishmentId,
        subscription_id: subscriptionId,
        reference_period_start: input.periodStart,
        reference_period_end: input.periodEnd,
        amount_cents: input.amountCents,
        status: input.status,
        issued_at: input.periodStart,
        due_at: input.dueAt,
        paid_at: input.paidAt ?? null,
      },
      { onConflict: "subscription_id,reference_period_start,reference_period_end" },
    )
    .select("id")
    .single();
  if (error || !data) throw new Error(`invoices upsert falhou: ${error?.message}`);
  return data.id;
}

async function ensurePayment(
  establishmentId: string,
  invoiceId: string,
  recordedBy: string,
  amountCents: number,
  paidAt: string,
): Promise<void> {
  const { data: existing } = await admin.from("payments").select("id").eq("invoice_id", invoiceId).maybeSingle();
  if (existing) return;

  const { error } = await admin.from("payments").insert({
    establishment_id: establishmentId,
    invoice_id: invoiceId,
    amount_cents: amountCents,
    status: "confirmed",
    method: "pix",
    paid_at: paidAt,
    recorded_by: recordedBy,
  });
  if (error) throw new Error(`payments insert falhou: ${error.message}`);
}

async function resetSeedData(): Promise<void> {
  console.log("Removendo dados demo anteriores (--reset)...");
  const { error: establishmentsError } = await admin.from("establishments").delete().in("slug", [...SEED_SLUGS]);
  if (establishmentsError) throw new Error(`Falha ao remover estabelecimentos demo: ${establishmentsError.message}`);

  const { data: seedProfiles } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", `seed-%${SEED_EMAIL_DOMAIN}`);

  for (const profile of seedProfiles ?? []) {
    const { error } = await admin.auth.admin.deleteUser(profile.id);
    if (error) console.warn(`Aviso: não foi possível remover o usuário ${profile.email}: ${error.message}`);
  }
  console.log(`Removidos: ${SEED_SLUGS.length} estabelecimentos demo e ${seedProfiles?.length ?? 0} contas demo.`);
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}
function dateOnlyFromNow(days: number): string {
  return daysFromNow(days).slice(0, 10);
}

async function main(): Promise<void> {
  if (RESET) {
    await resetSeedData();
  }

  console.log("Criando planos...");
  const planEssencial = await findOrCreatePlan({
    code: "essencial",
    name: "Essencial",
    priceCents: 9900,
    limits: { products: 100, tables: 30, members: 5, media_storage_mb: 2048 },
  });

  console.log("Criando administradores da plataforma demo...");
  const superAdminId = await findOrCreateUser("superadmin", "Super Admin (seed)");
  await upsertPlatformAdmin(superAdminId, "super_admin");
  const supportId = await findOrCreateUser("support", "Suporte (seed)");
  await upsertPlatformAdmin(supportId, "platform_support");

  // ---------------------------------------------------------------------
  // Bistrô Vermelho Demo — tenant principal (docs/14 §2-4)
  // ---------------------------------------------------------------------
  console.log("Criando Bistrô Vermelho Demo...");
  const bistroId = await upsertEstablishment({
    slug: "bistro-vermelho-demo",
    legalName: "Bistrô Vermelho Demo LTDA",
    tradeName: "Bistrô Vermelho Demo",
    city: "Belo Horizonte",
    stateCode: "MG",
  });

  const bistroOwner = await findOrCreateUser("owner-bistro", "Owner Bistrô (seed)");
  const bistroManager = await findOrCreateUser("manager-bistro", "Manager Bistrô (seed)");
  const bistroMenuEditor = await findOrCreateUser("menu-editor-bistro", "Editor de Cardápio Bistrô (seed)");
  const bistroKitchen = await findOrCreateUser("kitchen-bistro", "Cozinha Bistrô (seed)");
  const bistroCashier = await findOrCreateUser("cashier-bistro", "Caixa Bistrô (seed)");
  const bistroViewer = await findOrCreateUser("viewer-bistro", "Visualizador Bistrô (seed)");
  await upsertEstablishmentMember(bistroId, bistroOwner, "owner");
  await upsertEstablishmentMember(bistroId, bistroManager, "manager");
  await upsertEstablishmentMember(bistroId, bistroMenuEditor, "menu_editor");
  await upsertEstablishmentMember(bistroId, bistroKitchen, "kitchen");
  await upsertEstablishmentMember(bistroId, bistroCashier, "cashier");
  await upsertEstablishmentMember(bistroId, bistroViewer, "viewer");

  await upsertTable(bistroId, "Mesa 01");
  await upsertTable(bistroId, "Mesa 02");
  await upsertTable(bistroId, "Varanda 01");

  const catHamburgueres = await findOrCreateCategory(bistroId, "Hambúrgueres", 0);
  const catPorcoes = await findOrCreateCategory(bistroId, "Porções", 1);
  const catBebidas = await findOrCreateCategory(bistroId, "Bebidas", 2);

  const classico = await upsertProduct(bistroId, {
    categoryId: catHamburgueres,
    name: "Clássico da Casa",
    shortDescription: "Pão brioche, carne bovina, queijo, alface, tomate e molho da casa.",
    ingredients: ["pão brioche", "carne bovina", "queijo", "alface", "tomate", "molho da casa"],
    allergens: ["glúten", "leite"],
    basePriceCents: 2490,
    status: "published",
    isAvailable: true,
  });
  const pontoCarne = await findOrCreateOptionGroup(bistroId, "Ponto da carne", 1, 1);
  await findOrCreateOption(bistroId, pontoCarne, "Malpassado", 0);
  await findOrCreateOption(bistroId, pontoCarne, "Ao ponto", 0);
  await findOrCreateOption(bistroId, pontoCarne, "Bem-passado", 0);
  await attachOptionGroupToProduct(bistroId, classico, pontoCarne);
  const adicionais = await findOrCreateOptionGroup(bistroId, "Adicionais", 0, 2);
  await findOrCreateOption(bistroId, adicionais, "Bacon", 400);
  await findOrCreateOption(bistroId, adicionais, "Queijo extra", 300);
  await attachOptionGroupToProduct(bistroId, classico, adicionais);

  await upsertProduct(bistroId, {
    categoryId: catHamburgueres,
    name: "Veggie Crocante",
    shortDescription: "Hambúrguer vegetal, salada e molho.",
    allergens: ["glúten"],
    basePriceCents: 2790,
    status: "published",
    isAvailable: true,
  });

  const batata = await upsertProduct(bistroId, {
    categoryId: catPorcoes,
    name: "Batata Especial",
    shortDescription: "Porção de batata frita da casa.",
    basePriceCents: 1800,
    status: "published",
    isAvailable: false, // esgotado, de propósito (docs/14 §4)
  });
  const tamanho = await findOrCreateOptionGroup(bistroId, "Tamanho", 1, 1);
  await findOrCreateOption(bistroId, tamanho, "Pequena", 0);
  await findOrCreateOption(bistroId, tamanho, "Grande", 800);
  await attachOptionGroupToProduct(bistroId, batata, tamanho);

  const refri = await upsertProduct(bistroId, {
    categoryId: catBebidas,
    name: "Refrigerante Lata",
    shortDescription: "Lata 350ml.",
    basePriceCents: 700,
    status: "published",
    isAvailable: true,
  });
  const sabor = await findOrCreateOptionGroup(bistroId, "Sabor", 1, 1);
  await findOrCreateOption(bistroId, sabor, "Cola", 0);
  await findOrCreateOption(bistroId, sabor, "Guaraná", 0);
  await findOrCreateOption(bistroId, sabor, "Cola Zero", 0);
  await attachOptionGroupToProduct(bistroId, refri, sabor);

  await upsertProduct(bistroId, {
    categoryId: catBebidas,
    name: "Água Mineral",
    shortDescription: "500ml, com ou sem gás.",
    basePriceCents: 500,
    status: "published",
    isAvailable: true,
  });

  // Rascunho — nunca deve aparecer no cardápio público (docs/14 §4).
  await upsertProduct(bistroId, {
    categoryId: catPorcoes,
    name: "Sobremesa Secreta",
    shortDescription: "Ainda não revelada.",
    basePriceCents: 1500,
    status: "draft",
    isAvailable: true,
  });

  const bistroSubscription = await upsertSubscription(bistroId, planEssencial, {
    status: "active",
    currentPeriodStart: daysFromNow(-15),
    currentPeriodEnd: daysFromNow(15),
  });
  const bistroInvoice = await upsertInvoice(bistroId, bistroSubscription, {
    periodStart: dateOnlyFromNow(-15),
    periodEnd: dateOnlyFromNow(15),
    amountCents: 9900,
    status: "paid",
    dueAt: daysFromNow(-10),
    paidAt: daysFromNow(-12),
  });
  await ensurePayment(bistroId, bistroInvoice, superAdminId, 9900, daysFromNow(-12));

  // ---------------------------------------------------------------------
  // Café Azul Demo — segundo tenant, past_due com prazo adicional (docs/14 §5-6)
  // ---------------------------------------------------------------------
  console.log("Criando Café Azul Demo...");
  const cafeId = await upsertEstablishment({
    slug: "cafe-azul-demo",
    legalName: "Café Azul Demo LTDA",
    tradeName: "Café Azul Demo",
    city: "São Paulo",
    stateCode: "SP",
  });

  const cafeOwner = await findOrCreateUser("owner-cafe", "Owner Café Azul (seed)");
  const cafeManager = await findOrCreateUser("manager-cafe", "Manager Café Azul (seed)");
  await upsertEstablishmentMember(cafeId, cafeOwner, "owner");
  await upsertEstablishmentMember(cafeId, cafeManager, "manager");

  await upsertTable(cafeId, "Mesa 01");

  const catCafes = await findOrCreateCategory(cafeId, "Cafés", 0);
  await upsertProduct(cafeId, {
    categoryId: catCafes,
    name: "Espresso",
    shortDescription: "Café espresso tradicional.",
    basePriceCents: 900,
    status: "published",
    isAvailable: true,
  });
  await upsertProduct(cafeId, {
    categoryId: catCafes,
    name: "Cappuccino",
    shortDescription: "Espresso, leite vaporizado e espuma.",
    allergens: ["leite"],
    basePriceCents: 1200,
    status: "published",
    isAvailable: true,
  });

  const cafeSubscription = await upsertSubscription(cafeId, planEssencial, {
    status: "past_due",
    currentPeriodStart: daysFromNow(-40),
    currentPeriodEnd: daysFromNow(-10),
    graceUntil: daysFromNow(5), // prazo adicional futuro — serviço continua liberado (docs/09 §4)
  });
  await upsertInvoice(cafeId, cafeSubscription, {
    periodStart: dateOnlyFromNow(-40),
    periodEnd: dateOnlyFromNow(-10),
    amountCents: 9900,
    status: "overdue",
    dueAt: daysFromNow(-10),
  });

  // ---------------------------------------------------------------------
  // Padaria Suspensa Demo — terceiro tenant opcional, já suspenso (docs/14 §6)
  // ---------------------------------------------------------------------
  console.log("Criando Padaria Suspensa Demo...");
  const padariaId = await upsertEstablishment({
    slug: "padaria-suspensa-demo",
    legalName: "Padaria Suspensa Demo LTDA",
    tradeName: "Padaria Suspensa Demo",
    city: "Curitiba",
    stateCode: "PR",
  });
  const padariaOwner = await findOrCreateUser("owner-padaria", "Owner Padaria (seed)");
  await upsertEstablishmentMember(padariaId, padariaOwner, "owner");

  const padariaSubscription = await upsertSubscription(padariaId, planEssencial, {
    status: "suspended",
    currentPeriodStart: daysFromNow(-60),
    currentPeriodEnd: daysFromNow(-30),
    suspendedAt: daysFromNow(-25),
    suspensionReason: "overdue",
  });
  await upsertInvoice(padariaId, padariaSubscription, {
    periodStart: dateOnlyFromNow(-60),
    periodEnd: dateOnlyFromNow(-30),
    amountCents: 9900,
    status: "overdue",
    dueAt: daysFromNow(-30),
  });

  console.log("\nSeed concluído. Contas de demonstração (senha única, ver SEED_DEMO_PASSWORD):");
  console.log(`  senha: ${SEED_PASSWORD}`);
  console.log("  seed-superadmin@imenu.demo (super_admin)");
  console.log("  seed-support@imenu.demo (platform_support)");
  console.log("  seed-owner-bistro@imenu.demo / seed-manager-bistro@imenu.demo / seed-menu-editor-bistro@imenu.demo /");
  console.log("  seed-kitchen-bistro@imenu.demo / seed-cashier-bistro@imenu.demo / seed-viewer-bistro@imenu.demo");
  console.log("  seed-owner-cafe@imenu.demo / seed-manager-cafe@imenu.demo");
  console.log("  seed-owner-padaria@imenu.demo");
  console.log("\nPara limpar e recriar: npm run seed -- --reset");
}

main().catch((error) => {
  console.error("Seed falhou:", error);
  process.exit(1);
});
